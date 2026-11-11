"use client";

// Reuniões gravadas (Tactiq): o agente deixa os rascunhos; a Camilla revisa e aprova. Ao aprovar, os combinados entram na loja,
// o resumo é liberado (se houver reunião no Hub com a data) e o que é da CS vira lembrete dela.
import { supabaseBrowser } from "@/lib/supabase/client";
import { salvarRascunho, liberarResumo } from "@/lib/reunioes";
import { somarDias } from "@/lib/acoes-mes";
import { hoje } from "@/lib/formato";

export type CombinadoRascunho = { texto: string; quem: "loja" | "claudia" | "camilla"; prazo: string | null };
export type ParaClaudia = { texto: string; prazo: string | null };
export type Gravada = {
  id: string; tactiq_id: string; tactiq_url: string | null; portal_id: string | null; titulo: string | null; data: string | null; duracao_min: number | null;
  participantes: string[]; status: "rascunho" | "aprovada" | "descartada" | "sem_loja"; resumo_loja: string | null; interno: string | null;
  combinados: CombinadoRascunho[]; para_claudia: ParaClaudia[]; criado_em: string; decidido_em: string | null; decidido_por: string | null;
};

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

export async function buscarGravadas(): Promise<Gravada[]> {
  const { data } = await sb().from("reunioes_gravadas").select("*").order("data", { ascending: false, nullsFirst: false }).limit(60);
  return (data ?? []) as Gravada[];
}
export const salvarGravada = (g: Gravada) => ok(sb().from("reunioes_gravadas").update({
  portal_id: g.portal_id, resumo_loja: g.resumo_loja, interno: g.interno, combinados: g.combinados, para_claudia: g.para_claudia,
  status: g.portal_id ? (g.status === "sem_loja" ? "rascunho" : g.status) : "sem_loja",
}).eq("id", g.id));
export const descartarGravada = (id: string, por: string) => ok(sb().from("reunioes_gravadas").update({ status: "descartada", decidido_em: new Date().toISOString(), decidido_por: por }).eq("id", id));

/** Aprova: combinados na loja, lembretes da CS e (opcional) resumo liberado. Devolve o que foi feito, para mostrar na tela. */
export async function aprovarGravada(g: Gravada, o: { por: string; liberarResumo: boolean; csId: string | null }) {
  const interna = !g.portal_id;
  // Reunião interna (sem loja): só os lembretes da CS são criados; combinados e resumo precisam de uma loja.
  if (interna && !g.para_claudia.some((c) => c.texto.trim())) throw new Error("Escolha a loja desta reunião (ou deixe itens para a Claudia, se for interna).");
  const feitos: string[] = [];
  const comb = interna ? [] : g.combinados.filter((c) => c.texto.trim());
  if (comb.length) {
    await ok(sb().from("loja_combinados").insert(comb.map((c) => ({ portal_id: g.portal_id, texto: c.texto.trim(), quem: c.quem, prazo: c.prazo || null, origem: "reuniao", criado_por: o.por }))));
    feitos.push(`${comb.length} ${comb.length === 1 ? "combinado" : "combinados"}`);
  }
  const cs = g.para_claudia.filter((c) => c.texto.trim());
  if (cs.length) {
    await ok(sb().from("equipe_lembretes").insert(cs.map((c) => ({ portal_id: g.portal_id, texto: c.texto.trim(), quando: c.prazo || somarDias(hoje(), 1), responsavel: o.csId, criado_por: o.por }))));
    feitos.push(`${cs.length} ${cs.length === 1 ? "lembrete" : "lembretes"} para a CS`);
  }
  if (!interna && g.resumo_loja?.trim()) {
    const de = g.data ? somarDias(g.data, -2) : somarDias(hoje(), -2), ate = g.data ? somarDias(g.data, 2) : hoje();
    const { data: r } = await sb().from("reunioes").select("id, data").eq("portal_id", g.portal_id as string).gte("data", `${de}T00:00:00-03:00`).lte("data", `${ate}T23:59:59-03:00`).order("data");
    const reuniao = (r ?? [])[0] as { id: string } | undefined;
    if (reuniao) {
      await salvarRascunho(reuniao.id, g.portal_id as string, g.resumo_loja, g.interno ?? "", "Tactiq");
      if (o.liberarResumo) { await liberarResumo(reuniao.id, g.resumo_loja); feitos.push("resumo liberado para a loja"); } else feitos.push("resumo no rascunho da reunião");
    } else feitos.push("sem reunião no Hub nessa data: o resumo não foi enviado");
  }
  await ok(sb().from("reunioes_gravadas").update({ status: "aprovada", decidido_em: new Date().toISOString(), decidido_por: o.por }).eq("id", g.id));
  return feitos;
}
