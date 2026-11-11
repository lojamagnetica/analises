"use client";

// Lojinha de resgate: os pontos da gamificação trocados por mimos (de 100 em 100 pontos). Roupa só pelo voucher de R$ 500.
import { supabaseBrowser } from "@/lib/supabase/client";
import { subirFotoMarca, tirarFotoMarca, urlFotoMarca } from "@/lib/marcas";

const sb = () => supabaseBrowser();

export type Premio = { id: string; nome: string; descricao: string; pontos: number; foto: string | null };
export type PedidoMeu = { id: string; nome: string; pontos: number; status: "pedido" | "entregue"; em: string };
export type DestaqueDoMes = { mes: string; lider: string | null; foto: string | null; loja: string | null; estrelas: number; anterior: { nome: string; mes: string; foto: string | null; loja: string | null } | null };
export type LojinhaDaPessoa = { saldo: number; premios: Premio[]; meus: PedidoMeu[]; destaque?: DestaqueDoMes };

export const fotoDoPremio = (caminho: string | null) => (caminho ? urlFotoMarca(caminho) : null);

// Equipe (link pessoal)
export const vezLojinha = async (token: string) => ((await sb().rpc("vez_lojinha", { p_token: token })).data as LojinhaDaPessoa | null) ?? null;
export const vezResgatar = async (token: string, premio: string) => ((await sb().rpc("vez_resgatar", { p_token: token, p_premio: premio })).data as string | null) ?? "erro";

// Gestão (logada)
export type PremioGestao = Premio & { ativo: boolean };
export type PedidoGestao = { id: string; pessoa_id: string; premio_nome: string; pontos: number; status: "pedido" | "entregue"; created_at: string };

export async function buscarLojinha(portalId: string) {
  const [p, r] = await Promise.all([
    sb().from("loja_premios").select("id, nome, descricao, pontos, foto, ativo").eq("portal_id", portalId).order("pontos").order("nome"),
    sb().from("loja_resgates").select("id, pessoa_id, premio_nome, pontos, status, created_at").eq("portal_id", portalId).order("created_at", { ascending: false }).limit(40),
  ]);
  return { premios: (p.data ?? []) as PremioGestao[], pedidos: (r.data ?? []) as PedidoGestao[] };
}
export async function premioSalvar(portalId: string, id: string | null, d: { nome: string; descricao: string; pontos: number; ativo: boolean; foto: string | null }) {
  const { error } = id ? await sb().from("loja_premios").update(d).eq("id", id) : await sb().from("loja_premios").insert({ ...d, portal_id: portalId });
  if (error) throw new Error(error.message);
}
export async function premioExcluir(p: Premio) {
  if (p.foto) await tirarFotoMarca(p.foto);
  const { error } = await sb().from("loja_premios").delete().eq("id", p.id);
  if (error) throw new Error(error.message);
}
export const fotoDoPremioSubir = subirFotoMarca;
export const pedidoEntregue = (id: string) => sb().from("loja_resgates").update({ status: "entregue", entregue_em: new Date().toISOString() }).eq("id", id);
/** Cancelar o pedido devolve os pontos (o banco tira o lançamento do resgate). */
export const pedidoCancelar = (id: string) => sb().from("loja_resgates").delete().eq("id", id);
