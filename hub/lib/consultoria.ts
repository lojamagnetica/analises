// Portal de Consultoria: os meses, as frentes, as entregas mês a mês e as ações da quinzena.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";

export type MesConsultoria = { mes: string; nome: string; foco: string };
export type Frente = { n: number; nome: string; oque: string };
export type DadosConsultoria = {
  duracao: number;
  inicio: string;
  fim: string;
  cidade?: string;
  instagram?: string[];
  meses: MesConsultoria[];
  encerramento?: string;
  visita?: string;
  frentes: Frente[];
  como: { titulo: string; texto: string }[];
};
export type Entrega = { id: string; ordem: number; mes: string; frente: number; entrega: string; status: string; material_url: string | null; loja: string | null };
export type Acao = { id: string; acao: string; quem: string | null; prazo: string | null; tipo: string; status: string; obs: string | null; loja: string | null };

export const STATUS_ENTREGA = ["A fazer", "Em andamento", "Entregue"];
export const STATUS_ACAO = ["A fazer", "Fazendo", "Feito"];

export async function buscarConsultoria(portalId: string) {
  const sb = supabaseBrowser();
  const [{ data: c }, { data: entregas }, { data: acoes }] = await Promise.all([
    sb.from("consultoria").select("dados").eq("portal_id", portalId).maybeSingle(),
    sb.from("consultoria_entregas").select("id, ordem, mes, frente, entrega, status, material_url, loja").eq("portal_id", portalId).order("ordem"),
    sb.from("consultoria_acoes").select("id, acao, quem, prazo, tipo, status, obs, loja").eq("portal_id", portalId).order("prazo", { nullsFirst: false }),
  ]);
  return {
    dados: (c?.dados as DadosConsultoria | undefined) ?? null,
    entregas: (entregas ?? []) as Entrega[],
    acoes: (acoes ?? []) as Acao[],
  };
}

/** Em que mês da consultoria estamos (1 = mês do início). Passa da duração no mês de encerramento. */
export function mesDaConsultoria(inicio: string) {
  const [a, m] = inicio.split("-").map(Number);
  const [ha, hm] = hoje().split("-").map(Number);
  return (ha - a) * 12 + (hm - m) + 1;
}

export async function entregaStatus(id: string, status: string) {
  if (!STATUS_ENTREGA.includes(status)) return;
  await supabaseBrowser().from("consultoria_entregas").update({ status }).eq("id", id);
}

/** Em portais com mais de uma loja: de qual loja é o item (null = das duas). */
export async function mudarLoja(tabela: "consultoria_entregas" | "consultoria_acoes", id: string, loja: string | null) {
  await supabaseBrowser().from(tabela).update({ loja }).eq("id", id);
}

/** O item aparece no filtro escolhido? ("" = todas as lojas; item sem loja = das duas). */
export const daLoja = (item: { loja: string | null }, filtro: string) => !filtro || !item.loja || item.loja === filtro;

export async function entregaRemover(id: string) {
  await supabaseBrowser().from("consultoria_entregas").delete().eq("id", id);
}

export async function acaoStatus(id: string, status: string) {
  if (!STATUS_ACAO.includes(status)) return;
  await supabaseBrowser().from("consultoria_acoes").update({ status }).eq("id", id);
}

export const classeStatus = (s: string) =>
  s === "Entregue" || s === "Feito" ? "feito" : s === "Em andamento" || s === "Fazendo" ? "andamento" : "espera";
