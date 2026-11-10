"use client";

// Lista da vez: o que a equipe faz pelo link pessoal (sem entrar no Hub) e o que a gestora vê e ajusta.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { BASE } from "@/lib/config";
import type { Atend } from "@/lib/vez-calculo";

export type FilaItem = { pessoa_id: string; nome: string; status: "fila" | "atendendo"; chegou_em: string; ordem_em: string };
export type MissaoDia = { id: string; texto: string; feito: boolean };
export type Painel = {
  pessoa: { id: string; nome: string; loja: string };
  hoje: string;
  fila: FilaItem[];
  atend: Atend[];
  missoes: MissaoDia[];
  mes: { faturamento: number; vendas: number; pecas: number; ate: string | null } | null;
  plano: { meta_loja: number | null; ajustes: Record<string, number>; vendedoras: string[] };
  mural: { pa: number; tkm: number | null };
};

const sb = () => supabaseBrowser();

export const vezAbrir = async (token: string) => ((await sb().rpc("vez_painel", { p_token: token })).data as Painel | null) ?? null;
export const vezEntrar = (token: string) => sb().rpc("vez_entrar", { p_token: token });
export const vezSair = (token: string) => sb().rpc("vez_sair", { p_token: token });
export const vezPassar = (token: string) => sb().rpc("vez_passar", { p_token: token });
export const vezAtender = (token: string) => sb().rpc("vez_atender", { p_token: token });
export const vezEncerrar = (token: string, resultado: "vendeu" | "nao_vendeu", motivo: string, cliente: string) =>
  sb().rpc("vez_encerrar", { p_token: token, p_resultado: resultado, p_motivo: motivo, p_cliente: cliente });
export const vezCorrigir = (token: string, id: string, resultado: "vendeu" | "nao_vendeu", motivo: string) =>
  sb().rpc("vez_corrigir", { p_token: token, p_id: id, p_resultado: resultado, p_motivo: motivo });
export const vezMissaoMarcar = (token: string, id: string, feito: boolean) => sb().rpc("vez_missao_marcar", { p_token: token, p_id: id, p_feito: feito });

/** O link pessoal da equipe (abre no celular, sem login). */
export const linkDaVez = (origem: string, token: string) => `${origem}${BASE}/vez?t=${token}`;

// ───── Gestão (logada) ─────

export type PessoaVez = { id: string; nome: string; funcao: string | null; loja: string | null; vez_token: string };
export type MissaoGestao = { id: string; dia: string; pessoa_id: string; texto: string; feito: boolean; feito_em: string | null };
export type AtendGestao = Atend & { dia: string; loja: string };

/** loja = null: todas as lojas do portal (portal de uma loja só); com mais de uma loja, a loja em foco. */
export async function buscarVezDoDia(portalId: string, loja: string | null, dia: string) {
  let qf = sb().from("loja_vez_fila").select("pessoa_id, loja, status, chegou_em, ordem_em").eq("portal_id", portalId).eq("dia", dia);
  let qa = sb().from("loja_vez_atend").select("id, pessoa_id, nome, inicio_em, fim_em, resultado, motivo, cliente, fora_da_vez, dia, loja").eq("portal_id", portalId).eq("dia", dia);
  if (loja !== null) { qf = qf.eq("loja", loja); qa = qa.eq("loja", loja); }
  const [f, a, m, e] = await Promise.all([
    qf,
    qa.order("inicio_em"),
    sb().from("loja_missao_dia").select("id, dia, pessoa_id, texto, feito, feito_em").eq("portal_id", portalId).eq("dia", dia).order("created_at"),
    sb().from("loja_equipe").select("id, nome, funcao, loja, vez_token").eq("portal_id", portalId).eq("ativo", true).order("nome"),
  ]);
  return {
    fila: (f.data ?? []) as { pessoa_id: string; loja: string; status: "fila" | "atendendo"; chegou_em: string; ordem_em: string }[],
    atend: (a.data ?? []) as AtendGestao[], missoes: (m.data ?? []) as MissaoGestao[], equipe: (e.data ?? []) as PessoaVez[],
  };
}

export const tirarDaFila = (portalId: string, loja: string, dia: string, pessoaId: string) =>
  sb().from("loja_vez_fila").delete().eq("portal_id", portalId).eq("loja", loja).eq("dia", dia).eq("pessoa_id", pessoaId);
export const atendEditar = (id: string, campos: { resultado: "vendeu" | "nao_vendeu" | null; motivo: string }) => sb().from("loja_vez_atend").update(campos).eq("id", id);
export const atendExcluir = (id: string) => sb().from("loja_vez_atend").delete().eq("id", id);
export const missaoAdicionar = (portalId: string, dia: string, pessoas: string[], texto: string) =>
  sb().from("loja_missao_dia").insert(pessoas.map((pessoa_id) => ({ portal_id: portalId, dia, pessoa_id, texto })));
export const missaoExcluir = (id: string) => sb().from("loja_missao_dia").delete().eq("id", id);
export const novoLinkDaPessoa = (id: string) => sb().from("loja_equipe").update({ vez_token: crypto.randomUUID() }).eq("id", id);

export const hojeVez = hoje;
