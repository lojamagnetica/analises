"use client";

// Diagnóstico da loja: o resumo vivo de cada loja. A equipe monta a partir dos relatórios e da conversa com a loja;
// a loja só vê depois que a Camilla libera. A performance junta os meses importados com o fechamento de caixa lançado no Hub.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Nivel = "ok" | "atencao" | "critico";
export const NIVEIS: { v: Nivel; rotulo: string }[] = [
  { v: "critico", rotulo: "Crítico" }, { v: "atencao", rotulo: "Atenção" }, { v: "ok", rotulo: "Saudável" },
];
export const classeNivel = (n?: Nivel) => (n === "critico" ? "erro" : n === "atencao" ? "alerta" : n === "ok" ? "feito" : "espera");
export const corNivel = (n?: Nivel) => (n === "critico" ? "var(--red)" : n === "atencao" ? "var(--orange)" : n === "ok" ? "var(--green)" : "var(--line)");
export const rotuloNivel = (n?: Nivel) => NIVEIS.find((x) => x.v === n)?.rotulo ?? "Sem leitura";

export type Mes = { mes: string; valor: number | null; anterior: number | null; meta: number | null };
export type Indicador = { rotulo: string; valor: string; ideal: string; nivel?: Nivel; nota: string };
export type Alerta = { nivel: Nivel; alerta: string; dado: string; acao: string; prazo: string; quem: string };
export type LinhaAbc = { nome: string; pecas: number | null; pct: number | null; curva: "A" | "B" | "C" | ""; faturado: number | null; pm: number | null; faixa: string; estoque: number | null };
export type Marca = { nome: string; participacao: string; parado: string; nivel: Nivel; leitura: string; acao: string };
export type LinhaAtencao = { nome: string; parado: string; nivel: Nivel; leitura: string; desejo: string };
export type Pessoa = { nome: string; funcao: string; nota: string };

export type Diagnostico = {
  data_base: string;
  fontes: string;
  cenario: { resumo: string; objetivo: string; foco: string[] };
  performance: { meses: Mes[]; leitura: string };
  estoque: { indicadores: Indicador[]; leitura: string };
  alertas: Alerta[];
  abc: { titulo: string; coluna: string; nota: string; linhas: LinhaAbc[] };
  marcas: Marca[];
  linhas: LinhaAtencao[];
  equipe: { leitura: string; pessoas: Pessoa[] };
};

export type LinhaDiagnostico = { portal_id: string; loja: string; ordem: number; status: "rascunho" | "liberada"; dados: Partial<Diagnostico>; liberada_em: string | null; updated_at: string };

export const vazio = (): Diagnostico => ({
  data_base: "", fontes: "",
  cenario: { resumo: "", objetivo: "", foco: [] },
  performance: { meses: [], leitura: "" },
  estoque: { indicadores: [], leitura: "" },
  alertas: [],
  abc: { titulo: "Curva ABC das linhas", coluna: "Linha", nota: "", linhas: [] },
  marcas: [],
  linhas: [],
  equipe: { leitura: "", pessoas: [] },
});

/** Completa o que faltar com o vazio, para a tela nunca quebrar com um diagnóstico parcial. */
export function completo(d: Partial<Diagnostico> | undefined): Diagnostico {
  const v = vazio();
  const x = d ?? {};
  return {
    ...v, ...x,
    cenario: { ...v.cenario, ...x.cenario },
    performance: { ...v.performance, ...x.performance },
    estoque: { ...v.estoque, ...x.estoque },
    abc: { ...v.abc, ...x.abc },
    equipe: { ...v.equipe, ...x.equipe },
    alertas: x.alertas ?? [], marcas: x.marcas ?? [], linhas: x.linhas ?? [],
  };
}

const sb = () => supabaseBrowser();

export async function buscarDiagnosticos(portalId: string) {
  const { data } = await sb().from("loja_diagnostico").select("*").eq("portal_id", portalId).order("ordem").order("loja");
  return (data ?? []) as LinhaDiagnostico[];
}

/** Faturamento por mês (AAAA-MM) somado do fechamento de caixa. Filtra pela loja quando há mais de uma. */
export async function caixaPorMes(portalId: string, loja: string, desde: string) {
  let q = sb().from("loja_caixa").select("loja, dia, faturamento").eq("portal_id", portalId).gte("dia", `${desde}-01`);
  if (loja) q = q.eq("loja", loja);
  const { data } = await q;
  const por = new Map<string, number>();
  (data ?? []).forEach((c) => { const m = String(c.dia).slice(0, 7); por.set(m, (por.get(m) ?? 0) + Number(c.faturamento)); });
  return por;
}

export async function salvarDiagnostico(portalId: string, loja: string, dados: Diagnostico) {
  const { error } = await sb().from("loja_diagnostico")
    .upsert({ portal_id: portalId, loja, dados, updated_at: new Date().toISOString() }, { onConflict: "portal_id,loja" });
  if (error) throw new Error(error.message);
}

export async function liberarDiagnostico(portalId: string, loja: string, liberar: boolean) {
  const { error } = await sb().from("loja_diagnostico")
    .update({ status: liberar ? "liberada" : "rascunho", liberada_em: liberar ? new Date().toISOString() : null })
    .eq("portal_id", portalId).eq("loja", loja);
  if (error) throw new Error(error.message);
}

export async function criarDiagnostico(portalId: string, loja: string, ordem: number) {
  const { error } = await sb().from("loja_diagnostico").insert({ portal_id: portalId, loja, ordem, dados: vazio() });
  if (error) throw new Error(error.message);
}

/** "2026-09" → "set/26". */
export function mesCurto(m: string) {
  const [a, n] = m.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(n) - 1] ?? n}/${(a ?? "").slice(2)}`;
}

/** Variação em % (null quando não dá para comparar). */
export const variacao = (a: number | null, b: number | null) => (a != null && b ? ((a - b) / b) * 100 : null);
