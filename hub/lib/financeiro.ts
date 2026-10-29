"use client";

// O financeiro da empresa (Nossa empresa, toda a equipe): o que entrou, as despesas fixas e variáveis de cada mês, o lucro e a divisão
// entre os sócios, como na planilha "Controle - Financeiro". As despesas fixas ficam cadastradas e viram lançamento todo mês.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Fixa = {
  id: string; nome: string; categoria: string; valor: number; dia: number | null; recorrencia: "Mensal" | "Trimestral" | "Anual";
  pagador: string; parcelas: number | null; inicio: string | null; ativo: boolean; obs: string;
};
export type Lanc = {
  id: string; mes: string; tipo: "entrada" | "saida"; natureza: "fixa" | "variavel"; descricao: string; categoria: string;
  valor: number; bruto: number | null; pagador: string; parcela: string; dia: number | null; pago: boolean; fixa_id: string | null; obs: string;
};
export type Socio = { nome: string; pct: number };
export type Config = { socios: Socio[]; imposto: number };

export const CATEGORIAS_DESPESA = ["Ferramentas/Software", "Marketing/Tráfego", "Equipe/Pró-labore", "Capacitação", "Infraestrutura", "Impostos", "Outros"];
export const PAGADORES = ["Empresa", "Camilla", "Claudia", "Yan"];

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };
const num = (v: unknown) => Number(v ?? 0);

/** Quantos meses de "de" até "ate" (AAAA-MM). */
export function mesesEntre(de: string, ate: string) {
  const [a1, m1] = de.split("-").map(Number), [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}
export function somaMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export async function buscarFinanceiro(mes: string) {
  const ano = mes.slice(0, 4);
  const [lanc, fixas, cfg, doAno] = await Promise.all([
    sb().from("fin_lancamentos").select("*").eq("mes", mes).order("tipo").order("natureza").order("created_at"),
    sb().from("fin_fixas").select("*").order("ativo", { ascending: false }).order("nome"),
    sb().from("fin_config").select("socios, imposto").eq("id", 1).maybeSingle(),
    sb().from("fin_lancamentos").select("mes, tipo, natureza, valor, bruto").gte("mes", `${ano}-01`).lte("mes", `${ano}-12`),
  ]);
  if (lanc.error) throw new Error(lanc.error.message);
  const n = (l: Lanc) => ({ ...l, valor: num(l.valor), bruto: l.bruto == null ? null : num(l.bruto) });
  return {
    lancs: ((lanc.data ?? []) as Lanc[]).map(n),
    fixas: ((fixas.data ?? []) as Fixa[]).map((f) => ({ ...f, valor: num(f.valor) })),
    config: (cfg.data as Config | null) ?? { socios: [], imposto: 6 },
    ano: (doAno.data ?? []) as { mes: string; tipo: string; natureza: string; valor: number; bruto: number | null }[],
  };
}

/** A parcela de uma despesa fixa naquele mês ("5/12"), "" se não é parcelada, ou null se não cai no mês. */
export function parcelaNoMes(f: Fixa, mes: string): string | null {
  if (!f.ativo) return null;
  const base = f.inicio || mes;
  const n = mesesEntre(base, mes);
  if (n < 0) return null;
  if (f.parcelas) return n < f.parcelas ? `${n + 1}/${f.parcelas}` : null;
  if (f.recorrencia === "Trimestral" && n % 3 !== 0) return null;
  if (f.recorrencia === "Anual" && n % 12 !== 0) return null;
  return f.recorrencia === "Mensal" ? "Mensal" : f.recorrencia;
}

/** Lança no mês as despesas fixas que ainda não estão lá. Devolve quantas entraram. */
export async function lancarFixas(mes: string, fixas: Fixa[], lancs: Lanc[]) {
  const ja = new Set(lancs.map((l) => l.fixa_id).filter(Boolean));
  const novas = fixas.map((f) => ({ f, p: parcelaNoMes(f, mes) })).filter(({ f, p }) => p !== null && !ja.has(f.id))
    .map(({ f, p }) => ({ mes, tipo: "saida", natureza: "fixa", descricao: f.nome, categoria: f.categoria, valor: f.valor, pagador: f.pagador, parcela: p ?? "", dia: f.dia, pago: false, fixa_id: f.id, obs: f.obs }));
  if (novas.length) await ok(sb().from("fin_lancamentos").insert(novas));
  return novas.length;
}

export async function salvarLanc(l: Partial<Lanc> & { mes: string; tipo: Lanc["tipo"]; descricao: string }) {
  const { id, ...resto } = l;
  if (id) await ok(sb().from("fin_lancamentos").update(resto).eq("id", id));
  else await ok(sb().from("fin_lancamentos").insert(resto));
}
export const excluirLanc = (id: string) => ok(sb().from("fin_lancamentos").delete().eq("id", id));
export async function salvarFixa(f: Partial<Fixa> & { nome: string }) {
  const { id, ...resto } = f;
  if (id) await ok(sb().from("fin_fixas").update(resto).eq("id", id));
  else await ok(sb().from("fin_fixas").insert(resto));
}
export const excluirFixa = (id: string) => ok(sb().from("fin_fixas").delete().eq("id", id));
export const salvarConfig = (c: Config) => ok(sb().from("fin_config").upsert({ id: 1, ...c }));

/** O resumo do mês: entrou, saiu (fixas e variáveis), o lucro, a parte de cada sócio e quanto cada um pagou do bolso. */
export function resumo(lancs: Lanc[], config: Config) {
  const soma = (f: (l: Lanc) => boolean, campo: "valor" | "bruto" = "valor") => lancs.filter(f).reduce((s, l) => s + num(campo === "bruto" ? l.bruto ?? l.valor : l.valor), 0);
  const entradas = soma((l) => l.tipo === "entrada");
  const vendas = soma((l) => l.tipo === "entrada", "bruto");
  const fixas = soma((l) => l.tipo === "saida" && l.natureza === "fixa");
  const variaveis = soma((l) => l.tipo === "saida" && l.natureza === "variavel");
  const saidas = fixas + variaveis;
  const lucro = entradas - saidas;
  const pagou: Record<string, number> = {};
  lancs.filter((l) => l.tipo === "saida").forEach((l) => { pagou[l.pagador] = (pagou[l.pagador] ?? 0) + num(l.valor); });
  const socios = config.socios.map((s) => ({ ...s, parte: lucro > 0 ? (lucro * s.pct) / 100 : 0, pagou: pagou[s.nome] ?? 0 }));
  const aPagar = lancs.filter((l) => l.tipo === "saida" && !l.pago).reduce((s, l) => s + num(l.valor), 0);
  return { entradas, vendas, fixas, variaveis, saidas, lucro, socios, pagou, aPagar };
}
