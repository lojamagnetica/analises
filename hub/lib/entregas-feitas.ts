"use client";

// Histórico de entregas: o registro automático de tudo o que a equipe entregou para a loja (o banco grava ao liberar).
import { supabaseBrowser } from "@/lib/supabase/client";

export type EntregaFeita = { id: string; portal_id: string; tipo: string; titulo: string; link: string | null; entregue_em: string; origem: string };

export async function buscarEntregasFeitas(portalId: string): Promise<EntregaFeita[]> {
  const { data } = await supabaseBrowser().from("loja_entregas").select("id, portal_id, tipo, titulo, link, entregue_em, origem").eq("portal_id", portalId).order("entregue_em", { ascending: false });
  return (data ?? []) as EntregaFeita[];
}
