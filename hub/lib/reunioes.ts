"use client";

// Resumo da reunião: o rascunho fica só com a equipe; ao liberar, o texto vai para a ata que a loja lê.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Rascunho = { reuniao_id: string; resumo: string; interno: string; fonte: string; updated_at: string };

const sb = () => supabaseBrowser();

export const MODELO_RESUMO = `O QUE TRAZEMOS DA ANÁLISE
-

CORREÇÕES PENDENTES
-

DIRECIONAMENTOS
- `;

export async function buscarRascunho(reuniaoId: string) {
  const { data } = await sb().from("reunioes_rascunho").select("reuniao_id, resumo, interno, fonte, updated_at").eq("reuniao_id", reuniaoId).maybeSingle();
  return (data ?? null) as Rascunho | null;
}

export async function salvarRascunho(reuniaoId: string, portalId: string, resumo: string, interno: string, fonte: string) {
  const { error } = await sb().from("reunioes_rascunho").upsert({
    reuniao_id: reuniaoId, portal_id: portalId, resumo: resumo.slice(0, 20000), interno: interno.slice(0, 20000), fonte: fonte.slice(0, 300), updated_at: new Date().toISOString(),
  }, { onConflict: "reuniao_id" });
  if (error) throw new Error(error.message);
}

/** Publica o resumo para a loja: o rascunho vira a ata da reunião. */
export async function liberarResumo(reuniaoId: string, resumo: string) {
  const texto = resumo.trim();
  if (!texto) throw new Error("O resumo está vazio.");
  const { error } = await sb().from("reunioes").update({ ata: texto.slice(0, 20000) }).eq("id", reuniaoId);
  if (error) throw new Error(error.message);
}

/** Tira o resumo da loja (volta a ser só rascunho). */
export async function recolherResumo(reuniaoId: string) {
  const { error } = await sb().from("reunioes").update({ ata: null }).eq("id", reuniaoId);
  if (error) throw new Error(error.message);
}
