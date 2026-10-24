"use client";

// Anotações de atendimento de cada cliente (só a equipe vê).
import { supabaseBrowser } from "@/lib/supabase/client";

export type Anotacao = { id: string; texto: string; por_nome: string | null; created_at: string };

export async function listarAnotacoes(portalId: string) {
  const { data } = await supabaseBrowser().from("cliente_anotacoes").select("id, texto, por_nome, created_at").eq("portal_id", portalId).order("created_at", { ascending: false }).limit(200);
  return (data ?? []) as Anotacao[];
}

export async function criarAnotacao(portalId: string, texto: string, porNome: string) {
  const limpo = texto.trim().slice(0, 8000);
  if (!limpo) throw new Error("Escreva a anotação.");
  const { error } = await supabaseBrowser().from("cliente_anotacoes").insert({ portal_id: portalId, texto: limpo, por_nome: porNome });
  if (error) throw new Error(error.message);
}

export async function apagarAnotacao(id: string) {
  await supabaseBrowser().from("cliente_anotacoes").delete().eq("id", id);
}
