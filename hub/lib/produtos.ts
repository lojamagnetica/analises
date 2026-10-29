"use client";

// Produtos da empresa: cada um com a sua área (estrutura, valor, entregáveis, materiais de apresentação e venda, projetos).
// Os que já vendemos e os que estão em construção ou só na ideia.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Material = { titulo: string; link: string; tipo: "apresentacao" | "venda" | "apoio" | "outro" };
export type Projeto = { titulo: string; status: "ideia" | "fazendo" | "feito"; prazo: string; obs: string };
export type Ficha = {
  tema?: string; ponto_a?: string; ponto_b?: string; formato?: string; duracao?: string;
  para_quem?: string; nao_e_para?: string; pilares?: string; encontros?: string;
  hot_seat?: string; tutorias?: string; area_membros?: string; desafio?: string;
  apoio?: string; bonus?: string; preco_parcelado?: string; condicoes?: string;
};
export type Produto = {
  id: string; nome: string; categoria: string; tipo: string; status: Status; preco: number | null; plataforma: string;
  plano_id: string | null; resumo: string; ficha: Ficha; materiais: Material[]; projetos: Projeto[]; ordem: number; updated_at: string;
};
export type Status = "ativo" | "construcao" | "ideia" | "pausado";

export const STATUS: { v: Status; rotulo: string; selo: string }[] = [
  { v: "ativo", rotulo: "À venda", selo: "feito" },
  { v: "construcao", rotulo: "Em construção", selo: "andamento" },
  { v: "ideia", rotulo: "Ideia", selo: "espera" },
  { v: "pausado", rotulo: "Fora de venda", selo: "erro" },
];
export const CATEGORIAS = ["Mentoria", "Consultoria", "Curso", "Comunidade", "Treinamento", "Evento", "Outro"];
export const TIPOS = ["High-ticket", "Recorrente", "Único"];
export const TIPOS_MATERIAL: { v: Material["tipo"]; rotulo: string }[] = [
  { v: "apresentacao", rotulo: "Apresentação" },
  { v: "venda", rotulo: "Venda" },
  { v: "apoio", rotulo: "Material de apoio" },
  { v: "outro", rotulo: "Outro" },
];

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

export async function listarProdutos(): Promise<Produto[]> {
  const { data, error } = await sb().from("produtos").select("*").order("ordem").order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []) as Produto[];
}
export async function lerProduto(id: string): Promise<Produto | null> {
  const { data } = await sb().from("produtos").select("*").eq("id", id).maybeSingle();
  return (data as Produto | null) ?? null;
}
export async function criarProduto(nome: string, status: Status): Promise<string> {
  const { data, error } = await sb().from("produtos").insert({ nome: nome.trim(), status, ordem: 99 }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
export const salvarProduto = (id: string, p: Partial<Produto>) =>
  ok(sb().from("produtos").update({ ...p, updated_at: new Date().toISOString() }).eq("id", id));
export const excluirProduto = (id: string) => ok(sb().from("produtos").delete().eq("id", id));
