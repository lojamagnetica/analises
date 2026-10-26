"use client";

// Pautas quentes da semana: escritas pela equipe, liberadas pela Camilla, usadas pela loja na Programação.
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Objetivo, Post } from "@/lib/instagram";

export type Pauta = {
  id: string; semana: string; titulo: string; porque: string; angulo: string; objetivo: Objetivo;
  segmentos: string[]; liberada: boolean; ordem: number; updated_at?: string;
};

const sb = () => supabaseBrowser();
const COLUNAS = "id, semana, titulo, porque, angulo, objetivo, segmentos, liberada, ordem, updated_at";

/** Equipe: todas as pautas da semana (rascunhos e liberadas). */
export async function pautasDaEquipe(semana: string) {
  const { data, error } = await sb().from("pautas").select(COLUNAS).eq("semana", semana).order("ordem").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pauta[];
}

/** Loja: as liberadas da semana mais recente até a semana pedida, que valem para o segmento da loja. */
export async function pautasDaLoja(semana: string, segmento: string | null) {
  const { data } = await sb().from("pautas").select(COLUNAS).eq("liberada", true).lte("semana", semana).order("semana", { ascending: false }).order("ordem").limit(60);
  const todas = ((data ?? []) as Pauta[]).filter((p) => !p.segmentos?.length || (!!segmento && p.segmentos.includes(segmento)));
  const ultima = todas[0]?.semana;
  return todas.filter((p) => p.semana === ultima);
}

export async function buscarPauta(id: string) {
  const { data } = await sb().from("pautas").select(COLUNAS).eq("id", id).maybeSingle();
  return (data ?? null) as Pauta | null;
}

export async function salvarPauta(p: Partial<Pauta> & { semana: string }) {
  const { id, updated_at: _u, ...campos } = p;
  const dados = { ...campos, updated_at: new Date().toISOString() };
  const { error } = id ? await sb().from("pautas").update(dados).eq("id", id) : await sb().from("pautas").insert(dados);
  if (error) throw new Error(error.message);
}

export async function excluirPauta(id: string) {
  const { error } = await sb().from("pautas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

const CTA: Record<Objetivo, string> = {
  Atrair: "Salva este vídeo e manda para uma amiga que precisa ver.",
  Conectar: "Me conta aqui nos comentários: e você, como faz?",
  Vender: "Chama no direct que eu separo para você.",
};

/** O gancho sai da primeira frase do ângulo (ou do título). */
export const ganchoDaPauta = (p: Pick<Pauta, "titulo" | "angulo">) => (p.angulo.split(/(?<=[.!?])\s|\n/)[0] || p.titulo).trim();

/** O post que entra na semana a partir da pauta: gancho, roteiro e legenda montados pelo ângulo. */
export function postDaPauta(p: Pauta, portalId: string, data: string, hora: string) {
  const gancho = ganchoDaPauta(p);
  const cta = CTA[p.objetivo];
  const roteiro = [
    `GANCHO: ${gancho}`,
    `O ASSUNTO: ${p.titulo}${p.porque ? `\n   (por que agora: ${p.porque})` : ""}`,
    `A SUA LOJA NO ASSUNTO: ${p.angulo}\n   (mostre as suas peças, o seu salão ou o seu atendimento)`,
    `CTA: ${cta}`,
  ].join("\n\n");
  const legenda = `${gancho}\n\n${p.angulo}\n\n${cta}`;
  return {
    portal_id: portalId, data, hora, formato: "Reels", objetivo: p.objetivo, tema: p.titulo, gancho, roteiro, legenda, cta,
    origem: "pauta", status: "Roteiro" as Post["status"],
  };
}
