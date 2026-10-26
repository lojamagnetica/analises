"use client";

// Fechamento de caixa: os números de cada dia da loja e o que o Resultado do mês calcula com eles.
// PA = peças ÷ vendas · TKM (ticket médio) = faturamento ÷ vendas · PM (preço médio) = faturamento ÷ peças. TKM = PA × PM.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje, moeda } from "@/lib/formato";
import { MESES, type Respostas } from "@/lib/conteudo";

export const FORMAS = [
  { chave: "pix", nome: "Pix" },
  { chave: "credito", nome: "Crédito" },
  { chave: "debito", nome: "Débito" },
  { chave: "dinheiro", nome: "Dinheiro" },
  { chave: "crediario", nome: "Crediário" },
] as const;
export type Forma = (typeof FORMAS)[number]["chave"];
/** Reais por forma de pagamento (só as que tiveram valor). */
export type Pagamentos = Partial<Record<Forma, number>>;

/** Um dia de uma vendedora (pessoa_id null = outras vendas: a dona, o online). */
export type LinhaVendedora = { pessoa_id: string | null; nome: string; faturamento: number; vendas: number; pecas: number };

export type Caixa = {
  id: string; loja: string | null; dia: string; faturamento: number; vendas: number; pecas: number; obs: string | null;
  pagamentos: Pagamentos | null; vendedoras: LinhaVendedora[] | null;
};
export type NovoCaixa = Omit<Caixa, "id"> & { id?: string };

/** Peças por atendimento ideal do método. */
export const PA_IDEAL = 2.5;

// ───── Meses ("2026-10") ─────

const dois = (n: number) => String(n).padStart(2, "0");
export const mesDeHoje = () => hoje().slice(0, 7);
export const mesValido = (v: string | null | undefined): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export function somarMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${dois((t % 12) + 1)}`;
}
export function fimDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return `${mes}-${dois(new Date(Date.UTC(a, m, 0)).getUTCDate())}`;
}
export function nomeMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}
/** "2026-10-24" → "sáb". */
export const diaDaSemana = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" }).format(new Date(`${d}T12:00:00Z`)).replace(".", "");

// ───── Banco ─────

const sb = () => supabaseBrowser();

export async function buscarCaixa(portalId: string, mes: string) {
  const { data } = await sb().from("loja_caixa").select("id, loja, dia, faturamento, vendas, pecas, obs, pagamentos, vendedoras")
    .eq("portal_id", portalId).gte("dia", `${mes}-01`).lte("dia", fimDoMes(mes))
    .order("dia", { ascending: false }).order("loja");
  return (data ?? []).map((l) => ({ ...l, faturamento: Number(l.faturamento), vendas: Number(l.vendas), pecas: Number(l.pecas) })) as Caixa[];
}

/** Com id corrige o dia; sem id lança (se o dia já tem fechamento daquela loja, troca pelos números novos). */
export async function salvarCaixa(portalId: string, c: NovoCaixa) {
  const linha = {
    portal_id: portalId, loja: c.loja || null, dia: c.dia,
    faturamento: c.faturamento, vendas: c.vendas, pecas: c.pecas, obs: c.obs?.trim().slice(0, 500) || null,
    pagamentos: c.pagamentos && Object.keys(c.pagamentos).length ? c.pagamentos : null,
    vendedoras: c.vendedoras?.length ? c.vendedoras : null,
  };
  const { error } = c.id
    ? await sb().from("loja_caixa").update(linha).eq("id", c.id)
    : await sb().from("loja_caixa").upsert(linha, { onConflict: "portal_id,loja,dia" });
  if (error) throw new Error(error.code === "23505" ? "Já tem um fechamento neste dia para esta loja. Corrija aquele dia na lista." : error.message);
}

export async function removerCaixa(id: string) {
  const { error } = await sb().from("loja_caixa").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ───── Contas (sem banco, dá para testar) ─────

/** "18.000,50", "18000.5" ou "R$ 180" → número (vazio ou inválido = null). */
export function numeroDe(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/[R$\s]/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t);
  return Number.isFinite(n) ? n : null;
}

/** Soma das formas de pagamento (0 se nenhuma foi informada). */
export const somaPagamentos = (p: Pagamentos | null | undefined) => FORMAS.reduce((s, f) => s + (p?.[f.chave] ?? 0), 0);

/** Total de cada forma no período. */
export function somarPagamentos(lista: Pick<Caixa, "pagamentos">[]): Pagamentos {
  const t: Pagamentos = {};
  for (const c of lista) for (const f of FORMAS) {
    const v = c.pagamentos?.[f.chave];
    if (v) t[f.chave] = (t[f.chave] ?? 0) + v;
  }
  return t;
}

/** Total de cada vendedora no período (pela pessoa; "outras vendas" juntas). */
export function somarVendedoras(lista: Pick<Caixa, "vendedoras">[]) {
  const t = new Map<string, LinhaVendedora & { dias: number }>();
  for (const c of lista) for (const v of c.vendedoras ?? []) {
    const k = v.pessoa_id ?? "outras";
    const a = t.get(k) ?? { ...v, faturamento: 0, vendas: 0, pecas: 0, dias: 0 };
    a.faturamento += v.faturamento; a.vendas += v.vendas; a.pecas += v.pecas; a.dias += v.vendas > 0 ? 1 : 0; a.nome = v.nome;
    t.set(k, a);
  }
  return [...t.values()];
}

/** O fechamento do dia em texto de WhatsApp, para mandar para a dona ou para o grupo da loja. */
export function mensagemCaixa(c: Omit<Caixa, "id">, loja: string, mes: { faturamento: number; dias: number; meta: number | null }) {
  const i = indicadores({ faturamento: c.faturamento, vendas: c.vendas, pecas: c.pecas, dias: 1 });
  const ind = (x: { faturamento: number; vendas: number; pecas: number }) => {
    const k = indicadores({ ...x, dias: 1 });
    return k.pa != null ? `PA ${fmtPa(k.pa)} · TKM ${moeda(k.tkm!)}` : "";
  };
  const [, m, d] = c.dia.split("-");
  const linhas = [
    `📊 *Fechamento de caixa · ${loja}${c.loja ? ` · ${c.loja}` : ""}*`,
    `${diaDaSemana(c.dia)}, ${d}/${m}`,
    "",
    `💰 Faturamento: *${moeda(c.faturamento)}*`,
    `🛍️ ${c.vendas} ${c.vendas === 1 ? "venda" : "vendas"} · ${c.pecas} ${c.pecas === 1 ? "peça" : "peças"}`,
    i.pa != null ? `PA ${fmtPa(i.pa)} · Ticket ${moeda(i.tkm!)} · Preço médio ${moeda(i.pm!)}` : "",
  ];
  const vs = (c.vendedoras ?? []).filter((v) => v.faturamento || v.vendas);
  if (vs.length) {
    linhas.push("", "👥 *Por vendedora*");
    for (const v of vs) linhas.push(`• ${v.nome}: ${moeda(v.faturamento)} · ${v.vendas} ${v.vendas === 1 ? "venda" : "vendas"}${ind(v) ? ` · ${ind(v)}` : ""}`);
  }
  if (c.pagamentos && Object.keys(c.pagamentos).length) {
    linhas.push("", "💳 *Formas de pagamento*", FORMAS.filter((x) => c.pagamentos?.[x.chave]).map((x) => `${x.nome} ${moeda(c.pagamentos![x.chave]!)}`).join(" · "));
  }
  linhas.push("", `📅 *No mês:* ${moeda(mes.faturamento)} em ${mes.dias} ${mes.dias === 1 ? "dia" : "dias"}`);
  if (mes.meta) linhas.push(`🎯 Meta ${moeda(mes.meta)} · ${Math.round((mes.faturamento / mes.meta) * 100)}% · ${mes.faturamento >= mes.meta ? "meta batida! 🎉" : `faltam ${moeda(mes.meta - mes.faturamento)}`}`);
  if (c.obs) linhas.push("", `📝 ${c.obs}`);
  return linhas.filter((l, n, a) => l !== "" || (n > 0 && a[n - 1] !== "")).join("\n").trim();
}

export type Totais = { faturamento: number; vendas: number; pecas: number; dias: number };
export type Indicadores = Totais & { pa: number | null; tkm: number | null; pm: number | null };

export function somar(lista: Pick<Caixa, "dia" | "faturamento" | "vendas" | "pecas">[]): Totais {
  return {
    faturamento: lista.reduce((s, c) => s + c.faturamento, 0),
    vendas: lista.reduce((s, c) => s + c.vendas, 0),
    pecas: lista.reduce((s, c) => s + c.pecas, 0),
    dias: new Set(lista.map((c) => c.dia)).size,
  };
}

export function indicadores(t: Totais): Indicadores {
  return {
    ...t,
    pa: t.vendas > 0 ? t.pecas / t.vendas : null,
    tkm: t.vendas > 0 ? t.faturamento / t.vendas : null,
    pm: t.pecas > 0 ? t.faturamento / t.pecas : null,
  };
}

/** O lançamento entra no filtro? ("" = todas as lojas). */
export const daLoja = (c: { loja: string | null }, filtro: string) => !filtro || c.loja === filtro;

export type PmEstoque = { valor: number; estimado: boolean; calculado: boolean };

/** Preço médio do estoque, da etapa 8 da Personalização: pm_estoque ou, sem ele, valor_estoque ÷ pecas_estoque. */
export function pmDoEstoque(r: Respostas | undefined): PmEstoque | null {
  if (!r) return null;
  const st = (c: string) => r[`${c}__st`];
  const ler = (c: string) => (st(c) === "nao_tenho" ? null : numeroDe(r[c]));
  const pm = ler("pm_estoque");
  if (pm != null && pm > 0) return { valor: pm, estimado: st("pm_estoque") === "estimado", calculado: false };
  const valor = ler("valor_estoque");
  const pecas = ler("pecas_estoque");
  if (valor != null && pecas != null && valor > 0 && pecas > 0) {
    return { valor: valor / pecas, estimado: st("valor_estoque") === "estimado" || st("pecas_estoque") === "estimado", calculado: true };
  }
  return null;
}

/** PA com uma casa, como a loja lê ("1,8"). */
export const fmtPa = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const umaCasa = (n: number) => Math.round(n * 10) / 10;
/** Ganho em reais arredondado para ler fácil (7.743 → 7.700). */
export function arredondarGanho(v: number) {
  if (v >= 1000) return Math.round(v / 100) * 100;
  if (v >= 100) return Math.round(v / 10) * 10;
  return Math.round(v);
}

export type Foco = {
  tipo: "pa" | "pm";
  /** Valor de hoje e para onde vai (PA ou PM). */
  de: number; para: number;
  tkmHoje: number; tkmNovo: number;
  /** Aumento do TKM (0,39 = +39%). */
  pct: number;
  /** Reais a mais no mês, com o mesmo número de vendas. */
  ganho: number;
};
export type Diagnostico = {
  paOk: boolean;
  /** null = sem preço médio do estoque para comparar. */
  pmOk: boolean | null;
  tkmIdeal: number | null;
  tkmOk: boolean | null;
  /** Do maior para o menor ganho. */
  focos: Foco[];
  /** Com PA e PM no ideal ao mesmo tempo. */
  ganhoTotal: number | null;
};

export function diagnosticar(i: Indicadores, pmEstoque: number | null): Diagnostico | null {
  if (i.pa == null || i.tkm == null || i.pm == null) return null;
  const { pa, tkm, pm, vendas } = i;
  const paOk = umaCasa(pa) >= PA_IDEAL;
  const pmOk = pmEstoque == null ? null : Math.round(pm) >= Math.round(pmEstoque);
  const tkmIdeal = pmEstoque == null ? null : pmEstoque * PA_IDEAL;
  const focos: Foco[] = [];
  const foco = (tipo: Foco["tipo"], de: number, para: number, tkmNovo: number) =>
    focos.push({ tipo, de, para, tkmHoje: tkm, tkmNovo, pct: tkmNovo / tkm - 1, ganho: (tkmNovo - tkm) * vendas });
  // Mais peças por venda, no mesmo preço médio.
  if (!paOk) foco("pa", pa, PA_IDEAL, PA_IDEAL * pm);
  // Vender no preço médio do estoque, com o mesmo PA.
  if (pmOk === false && pmEstoque != null) foco("pm", pm, pmEstoque, pa * pmEstoque);
  focos.sort((a, b) => b.ganho - a.ganho);
  return {
    paOk, pmOk, tkmIdeal, focos,
    tkmOk: tkmIdeal == null ? null : Math.round(tkm) >= Math.round(tkmIdeal),
    ganhoTotal: tkmIdeal == null ? null : Math.max(0, (tkmIdeal - tkm) * vendas),
  };
}

/** A frase do impacto em reais. mesFechado = o mês já acabou (senão o ganho é só dos dias lançados). */
export function fraseFoco(f: Foco, mesFechado: boolean) {
  const pct = `+${Math.round(f.pct * 100)}%`;
  const fim = mesFechado
    ? `Com o seu número de vendas, isso dá +${moeda(arredondarGanho(f.ganho))} no mês.`
    : `Só com as vendas lançadas até agora, isso já dá +${moeda(arredondarGanho(f.ganho))} neste mês.`;
  if (f.tipo === "pa") {
    return `Seu TKM hoje é ${moeda(f.tkmHoje)}. Só levando o PA de ${fmtPa(f.de)} para ${fmtPa(f.para)}, com o mesmo preço médio, ele vai para ${moeda(f.tkmNovo)} (${pct}). ${fim}`;
  }
  return `Seu preço médio vendido é ${moeda(f.de)} e o do estoque é ${moeda(f.para)}. Vendendo no preço médio do estoque, com o mesmo PA, o TKM vai de ${moeda(f.tkmHoje)} para ${moeda(f.tkmNovo)} (${pct}). ${fim}`;
}
