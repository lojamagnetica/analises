// Meu estúdio: espaço particular de quem tem o acesso liberado (roteiros, produtos, ideias). Só o dono vê.
import { supabaseBrowser } from "@/lib/supabase/client";

export type DocEstudio = {
  id: string;
  projeto: string;
  tipo: string;
  titulo: string;
  ref: string | null;
  ordem: number;
  status: string;
  conteudo: string;
  atualizado_em: string;
};

export const STATUS_ESTUDIO = ["Rascunho", "Revisar", "Pronto para gravar", "Gravado"];
export const TIPOS_ESTUDIO = ["Roteiro de aula", "Produto", "Material", "Ideia"];
export const PROJETOS_BASE = ["Método Loja Magnética", "Método Carteira Ativa", "Geral"];

export const classeStatus = (s: string) =>
  s === "Gravado" ? "feito" : s === "Pronto para gravar" ? "andamento" : s === "Revisar" ? "alerta" : "espera";

const sb = () => supabaseBrowser();

export async function listarDocs() {
  const { data, error } = await sb().from("estudio_docs")
    .select("id, projeto, tipo, titulo, ref, ordem, status, atualizado_em").order("projeto").order("ordem").order("titulo");
  if (error) throw new Error(error.message);
  return (data ?? []) as Omit<DocEstudio, "conteudo">[];
}

export async function lerDoc(id: string) {
  const { data, error } = await sb().from("estudio_docs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as DocEstudio | null;
}

export async function criarDoc(d: Partial<DocEstudio> & { titulo: string }) {
  const { data, error } = await sb().from("estudio_docs").insert(d).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function salvarDoc(id: string, d: Partial<Omit<DocEstudio, "id">>) {
  const { error } = await sb().from("estudio_docs").update({ ...d, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function apagarDoc(id: string) {
  const { error } = await sb().from("estudio_docs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
