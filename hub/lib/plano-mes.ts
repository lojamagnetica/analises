"use client";

// PLANEJE AQUI: o plano de ação do mês, montado com a loja no jeito da Camilla planejar.
// 1. Meta: o mesmo mês do ano passado + 20% (a loja pode mudar). 2. O que foi feito no ano passado e se repete.
// 3. Datas especiais. 4. Produtos em destaque. 5. As 4 semanas (foco, conteúdo e exposição). Depois vai para a Camilla.
import { supabaseBrowser } from "@/lib/supabase/client";
import { MESES } from "@/lib/conteudo";
import { fimDoMes, nomeMes, somarMes } from "@/lib/caixa";
import { hoje } from "@/lib/formato";

export const CRESCIMENTO_PADRAO = 20;
/** O plano do mês vai para a Camilla até este dia do mês anterior. */
export const DIA_PRAZO = 20;

export type Resultado = "repetir" | "melhorar" | "trocar";
export const RESULTADOS: { chave: Resultado; nome: string }[] = [
  { chave: "repetir", nome: "Foi bom: repetir" },
  { chave: "melhorar", nome: "Repetir melhorando" },
  { chave: "trocar", nome: "Não foi bom: trocar" },
];
export type AcaoPassada = { titulo: string; resultado: Resultado | ""; obs: string };
export type AcaoNova = { titulo: string; inicio: string; acao_id?: string };
export type DataPlano = { titulo: string; dia: number | null; trabalhar: boolean; acao: string };
export type SemanaPlano = { foco: string; conteudo: string; exposicao: string };
export type DadosPlano = {
  base: number | null;
  base_fonte: string;
  crescimento: number;
  acoes_passadas: AcaoPassada[];
  datas: DataPlano[];
  acoes: AcaoNova[];
  produtos: string[];
  semanas: SemanaPlano[];
  obs: string;
  /** Meta do mês de cada vendedora que a lojista ajustou (id da pessoa → R$). As outras dividem o resto por igual. */
  metas?: Record<string, number>;
};
export type StatusPlano = "rascunho" | "enviado" | "ok" | "ajustar";
export type LinhaPlano = {
  portal_id: string; mes: string; dados: Partial<DadosPlano>; status: StatusPlano;
  enviado_em: string | null; retorno: string | null; retorno_em: string | null; updated_at: string;
};

export const STATUS_PLANO: Record<StatusPlano, { texto: string; classe: string }> = {
  rascunho: { texto: "em montagem", classe: "andamento" },
  enviado: { texto: "com a Camilla", classe: "espera" },
  ok: { texto: "aprovado ✓", classe: "feito" },
  ajustar: { texto: "ajustar", classe: "alerta" },
};

// ───── Datas e contas (sem banco, dá para testar) ─────

export const mesDoPlano = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1];
export { nomeMes, somarMes };
/** Prazo para mandar o plano: dia 20 do mês anterior. */
export const prazoDoPlano = (mes: string) => `${somarMes(mes, -1)}-${DIA_PRAZO}`;

/** As 4 semanas do mês: 1–7, 8–14, 15–21 e 22 até o fim. */
export function semanasDoMes(mes: string) {
  const fim = Number(fimDoMes(mes).slice(8));
  return [[1, 7], [8, 14], [15, 21], [22, fim]].map(([de, ate], i) => ({ n: i + 1, de, ate }));
}
/** Índice (0–3) da semana do mês em que o dia cai. */
export const semanaDoDia = (diaDoMes: number) => Math.min(3, Math.floor((diaDoMes - 1) / 7));

/** Dias de loja aberta entre duas datas (inclusive): todos menos os domingos. */
export function diasDeLoja(de: string, ate: string) {
  let n = 0;
  for (let t = Date.parse(`${de}T12:00:00Z`); t <= Date.parse(`${ate}T12:00:00Z`); t += 86_400_000) if (new Date(t).getUTCDay() !== 0) n++;
  return n;
}

/** A meta de cada vendedora: a que a lojista ajustou; o resto da meta da loja dividido por igual entre as outras. */
export function metasDoTime(meta: number | null, ids: string[], ajustes: Record<string, number> | undefined) {
  const out: Record<string, number> = {};
  if (!meta || !ids.length) return out;
  const fixas = ids.filter((id) => ajustes?.[id] != null);
  const resto = Math.max(0, meta - fixas.reduce((s, id) => s + (ajustes![id] ?? 0), 0));
  const livres = ids.filter((id) => ajustes?.[id] == null);
  for (const id of fixas) out[id] = ajustes![id];
  for (const id of livres) out[id] = Math.round(resto / livres.length);
  return out;
}

export const metaDoPlano = (d: Partial<DadosPlano>) =>
  d.base ? Math.round((d.base * (1 + (d.crescimento ?? CRESCIMENTO_PADRAO) / 100)) / 100) * 100 : null;

export function planoVazio(datas: { dia: number | null; titulo: string }[]): DadosPlano {
  return {
    base: null, base_fonte: "", crescimento: CRESCIMENTO_PADRAO,
    acoes_passadas: [], acoes: [], produtos: [], obs: "",
    datas: datas.map((d) => ({ titulo: d.titulo, dia: d.dia, trabalhar: true, acao: "" })),
    semanas: Array.from({ length: 4 }, () => ({ foco: "", conteudo: "", exposicao: "" })),
  };
}

/** Junta o salvo com o padrão (planos antigos ou incompletos não quebram a tela). */
export function completar(d: Partial<DadosPlano> | undefined, datas: { dia: number | null; titulo: string }[]): DadosPlano {
  const v = planoVazio(datas);
  const semanas = v.semanas.map((s, i) => ({ ...s, ...(d?.semanas?.[i] ?? {}) }));
  // Datas novas do calendário entram; as que a loja já marcou ficam como estão.
  const salvas = d?.datas ?? [];
  const todas = [...salvas, ...v.datas.filter((x) => !salvas.some((s) => s.titulo === x.titulo))];
  return { ...v, ...d, semanas, datas: todas, crescimento: d?.crescimento ?? CRESCIMENTO_PADRAO } as DadosPlano;
}

const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`);

/**
 * Sugestão das 4 semanas a partir do que a loja respondeu: datas que vai trabalhar, ações novas e produtos.
 * Datas comerciais pedem campanha ANTES da data; lançamento tem espera nos stories 3 dias e 1 dia antes.
 */
export function sugerirSemanas(mes: string, d: DadosPlano): SemanaPlano[] {
  const semanas = semanasDoMes(mes);
  const datas = d.datas.filter((x) => x.trabalhar);
  const prods = d.produtos.filter(Boolean);
  const prod = (i: number) => (prods.length ? prods[i % prods.length] : "");
  return semanas.map((s, i) => {
    const naSemana = (dia: number | null) => dia != null && dia >= s.de && dia <= s.ate;
    // A data da semana seguinte já entra na campanha desta.
    const datasAqui = datas.filter((x) => naSemana(x.dia) || (x.dia != null && x.dia > s.ate && x.dia <= s.ate + 7));
    const lancamentos = d.acoes.filter((a) => a.titulo && a.inicio.startsWith(mes) && naSemana(Number(a.inicio.slice(8))));
    const p = prod(i);

    const foco: string[] = [];
    for (const a of lancamentos) foco.push(`Lançamento: ${a.titulo} (começa dia ${Number(a.inicio.slice(8))})`);
    for (const x of datasAqui) foco.push(naSemana(x.dia) ? `${x.titulo}${x.acao ? `: ${x.acao}` : ""}` : `Preparar ${x.titulo} (dia ${x.dia})`);
    // Data sem dia certo (ex.: início da campanha de Natal) entra na última semana.
    if (i === 3) for (const x of datas.filter((x) => x.dia == null)) foco.push(`${x.titulo}${x.acao ? `: ${x.acao}` : ""}`);
    if (!foco.length) {
      if (i === 0) foco.push("Abrir o mês com a meta clara para o time e contato com as clientes da carteira");
      else if (i === 3) foco.push("Reta final da meta: chamar as clientes que ainda não compraram no mês");
      else foco.push(p ? `Destaque: ${p}` : "Carteira Ativa: contato com as clientes da carteira");
    }
    if (p && !foco.some((f) => f.includes(p))) foco.push(`Produto da semana: ${p}`);

    const conteudo: string[] = [];
    // A espera começa 3 dias antes: entra na semana em que a espera começa.
    for (const a of d.acoes.filter((a) => a.titulo && a.inicio.startsWith(mes))) {
      const dia = Number(a.inicio.slice(8));
      if (semanaDoDia(Math.max(1, dia - 3)) === i) conteudo.push(`Stories de espera 3 dias e 1 dia antes de ${a.titulo}, e reels no dia ${dia}.`);
    }
    for (const x of datasAqui) conteudo.push(`Looks para ${x.titulo} antes da data (dia ${x.dia}): do mais básico ao mais arrumado.`);
    if (p) conteudo.push(`Reels de looks com ${p} e prova social de cliente usando.`);
    if (i === 3) conteudo.push("Últimas peças e chamada para a loja: quem ainda não veio no mês.");

    const temas = datasAqui.filter((x) => naSemana(x.dia)).map((x) => x.titulo);
    const exposicao = p || temas.length
      ? `Vitrine e entrada da loja${p ? ` com ${p}` : ""}${temas.length ? `, no clima de ${lista(temas)}` : ""}.`
      : "";
    return { foco: foco.join("\n"), conteudo: conteudo.join("\n"), exposicao };
  });
}

/** O que falta para mandar o plano. */
export function faltaNoPlano(d: DadosPlano) {
  const f: string[] = [];
  if (!metaDoPlano(d)) f.push("a meta do mês");
  if (!d.produtos.filter(Boolean).length) f.push("os produtos em destaque");
  if (d.semanas.some((s) => !s.foco.trim())) f.push("o foco de cada semana");
  return f;
}

// ───── Banco ─────

const sb = () => supabaseBrowser();

export async function buscarPlano(portalId: string, mes: string) {
  const { data } = await sb().from("loja_plano_mes").select("*").eq("portal_id", portalId).eq("mes", mes).maybeSingle();
  return (data ?? null) as LinhaPlano | null;
}

export async function buscarPlanos(portalId: string) {
  const { data } = await sb().from("loja_plano_mes").select("*").eq("portal_id", portalId).order("mes", { ascending: false });
  return (data ?? []) as LinhaPlano[];
}

export async function salvarPlano(portalId: string, mes: string, dados: DadosPlano, status?: StatusPlano) {
  const linha: Record<string, unknown> = { portal_id: portalId, mes, dados, updated_at: new Date().toISOString() };
  if (status) linha.status = status;
  if (status === "enviado") linha.enviado_em = new Date().toISOString();
  const { error } = await sb().from("loja_plano_mes").upsert(linha, { onConflict: "portal_id,mes" });
  if (error) throw new Error(error.message);
}

/** Equipe: "está ok" ou pedir ajuste, com o comentário. */
export async function responderPlano(portalId: string, mes: string, status: "ok" | "ajustar", retorno: string) {
  const { error } = await sb().from("loja_plano_mes")
    .update({ status, retorno: retorno.trim().slice(0, 4000) || null, retorno_em: new Date().toISOString() })
    .eq("portal_id", portalId).eq("mes", mes);
  if (error) throw new Error(error.message);
}

/** Vendas do mesmo mês no ano anterior: do Fechamento de caixa ou, sem ele, da performance do Diagnóstico. */
export async function vendaDoAnoPassado(portalId: string, mes: string): Promise<{ valor: number; fonte: string } | null> {
  const antes = somarMes(mes, -12);
  const [{ data: caixa }, { data: diag }] = await Promise.all([
    sb().from("loja_caixa").select("faturamento").eq("portal_id", portalId).gte("dia", `${antes}-01`).lte("dia", fimDoMes(antes)),
    sb().from("loja_diagnostico").select("dados").eq("portal_id", portalId).eq("status", "liberada"),
  ]);
  const doCaixa = (caixa ?? []).reduce((s, c) => s + Number(c.faturamento), 0);
  if (doCaixa > 0) return { valor: Math.round(doCaixa), fonte: `Fechamento de caixa de ${nomeMes(antes).toLowerCase()}` };
  for (const d of diag ?? []) {
    const meses = (d.dados as { performance?: { meses?: { mes: string; valor: number | null }[] } })?.performance?.meses ?? [];
    const m = meses.find((x) => x.mes === antes && x.valor);
    if (m?.valor) return { valor: Math.round(m.valor), fonte: `Diagnóstico (${nomeMes(antes).toLowerCase()})` };
  }
  return null;
}

/** O mês que a loja deveria estar planejando agora (o próximo) e o plano deste mês, para o Início. */
export function mesesDoInicio() {
  const atual = hoje().slice(0, 7);
  return { atual, proximo: somarMes(atual, 1) };
}
