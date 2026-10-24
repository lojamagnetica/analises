"use client";

// Gestão estratégica: as análises de estoque, compras, linhas e fornecedores de cada loja.
// A equipe monta a partir dos relatórios do sistema; a loja só vê depois de liberada.
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Indicador, Nivel } from "@/lib/diagnostico";

export type Area = "estoque" | "compras" | "linhas" | "fornecedores";
export type Tabela = { colunas: string[]; linhas: string[][]; destaque?: number };
export type Bloco = { titulo: string; texto: string; tabela?: Tabela; nivel?: Nivel };
export type AcaoGestao = { texto: string; prazo: string; quem: string };
export type AnaliseGestao = {
  resumo: string;
  indicadores: Indicador[];
  blocos: Bloco[];
  acoes: AcaoGestao[];
  data_base: string;
  fontes: string;
};
export type LinhaGestao = { portal_id: string; area: Area; loja: string; ordem: number; status: "rascunho" | "liberada"; dados: Partial<AnaliseGestao>; liberada_em: string | null; updated_at: string };

export const completa = (d: Partial<AnaliseGestao> | undefined): AnaliseGestao => ({
  resumo: "", indicadores: [], blocos: [], acoes: [], data_base: "", fontes: "", ...(d ?? {}),
});

const sb = () => supabaseBrowser();

export async function buscarGestao(portalId: string, area: Area) {
  const { data } = await sb().from("loja_gestao").select("*").eq("portal_id", portalId).eq("area", area).order("ordem").order("loja");
  return (data ?? []) as LinhaGestao[];
}

export async function salvarGestao(portalId: string, area: Area, loja: string, dados: AnaliseGestao) {
  const { error } = await sb().from("loja_gestao")
    .upsert({ portal_id: portalId, area, loja, dados, updated_at: new Date().toISOString() }, { onConflict: "portal_id,area,loja" });
  if (error) throw new Error(error.message);
}

export async function liberarGestao(portalId: string, area: Area, loja: string, liberar: boolean) {
  const { error } = await sb().from("loja_gestao")
    .update({ status: liberar ? "liberada" : "rascunho", liberada_em: liberar ? new Date().toISOString() : null })
    .eq("portal_id", portalId).eq("area", area).eq("loja", loja);
  if (error) throw new Error(error.message);
}

export type RelatorioDrive = { id: string; nome: string; tipo: string; periodo: string | null; url: string; recebido_em: string | null };

/** Relatórios que a loja já mandou e estão no Drive da equipe. */
export async function relatoriosNoDrive(portalId: string) {
  const { data } = await sb().from("loja_relatorios_drive").select("id, nome, tipo, periodo, url, recebido_em").eq("portal_id", portalId).order("tipo").order("nome");
  return (data ?? []) as RelatorioDrive[];
}
