"use client";

// Materiais da consultoria: os documentos entregues à loja, dentro do Hub (texto + anexo opcional).
// A equipe escreve e libera; a loja só vê o que foi liberado (regras do banco).
import { supabaseBrowser } from "@/lib/supabase/client";

export type Material = {
  id: string; portal_id: string; titulo: string; mes: string | null; entrega_id: string | null;
  conteudo: string; arquivo: string | null; liberado: boolean; updated_at: string;
};

const sb = () => supabaseBrowser();
const BALDE = "relatorios";

export async function buscarMateriais(portalId: string): Promise<Material[]> {
  const { data } = await sb().from("consultoria_materiais").select("*").eq("portal_id", portalId).order("created_at");
  return (data ?? []) as Material[];
}

export async function buscarMaterial(id: string): Promise<Material | null> {
  const { data } = await sb().from("consultoria_materiais").select("*").eq("id", id).maybeSingle();
  return (data as Material | null) ?? null;
}

export async function salvarMaterial(m: Partial<Material> & { portal_id: string; titulo: string }) {
  const dados = { ...m, updated_at: new Date().toISOString() };
  const { data, error } = m.id
    ? await sb().from("consultoria_materiais").update(dados).eq("id", m.id).select("id").single()
    : await sb().from("consultoria_materiais").insert(dados).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function excluirMaterial(m: Material) {
  if (m.arquivo) await sb().storage.from(BALDE).remove([m.arquivo]);
  const { error } = await sb().from("consultoria_materiais").delete().eq("id", m.id);
  if (error) throw new Error(error.message);
}

/** Sobe o anexo (planilha, PDF) para a pasta de materiais do portal e devolve o caminho. */
export async function subirAnexo(portalId: string, arquivo: File) {
  const limpo = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);
  const caminho = `${portalId}/materiais/${Date.now()}__${limpo}`;
  const { error } = await sb().storage.from(BALDE).upload(caminho, arquivo, { upsert: false });
  if (error) throw new Error("Não deu para subir o arquivo. Confira a internet e tente de novo.");
  return caminho;
}

export async function abrirAnexo(caminho: string) {
  const { data } = await sb().storage.from(BALDE).createSignedUrl(caminho, 300);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
}

export const nomeDoAnexo = (caminho: string) => caminho.split("/").pop()?.replace(/^\d{13}__/, "") ?? caminho;
