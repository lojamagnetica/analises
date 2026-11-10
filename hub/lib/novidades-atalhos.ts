"use client";

// O que de novo tem para cada atalho do Início (a data da última atualização). Quem abre o atalho "vê" a novidade.
import { supabaseBrowser } from "@/lib/supabase/client";

const sb = () => supabaseBrowser();
const maisNova = (l: (string | null | undefined)[]) => l.filter(Boolean).sort().pop() ?? null;

/** Endereço do atalho → quando foi atualizado pela última vez. Só entra o que tem novidade para a pessoa ver. */
export async function buscarNovidades(portalId: string, equipe: boolean): Promise<Record<string, string>> {
  const [leitura, respostas, plano, reunioes] = await Promise.all([
    // A loja vê a leitura publicada; a equipe, a que está esperando revisão ou publicação.
    sb().from("loja_leituras").select("publicada, publicada_em, updated_at").eq("portal_id", portalId).order("semana", { ascending: false }).limit(2),
    sb().from("solicitacoes").select("updated_at").eq("portal_id", portalId).eq("status", "Respondida").order("updated_at", { ascending: false }).limit(1),
    sb().from("loja_plano_mes").select("retorno_em").eq("portal_id", portalId).not("retorno_em", "is", null).order("retorno_em", { ascending: false }).limit(1),
    sb().from("loja_reunioes").select("created_at").eq("portal_id", portalId).in("tipo", ["analise", "planejamento", "analise_semana"]).order("created_at", { ascending: false }).limit(1),
  ]);
  const l = (leitura.data ?? []) as { publicada: boolean; publicada_em: string | null; updated_at: string }[];
  const n: Record<string, string> = {};
  const dLeitura = equipe ? maisNova(l.filter((x) => !x.publicada).map((x) => x.updated_at)) : maisNova(l.filter((x) => x.publicada).map((x) => x.publicada_em));
  if (dLeitura) n["/leitura"] = dLeitura;
  const r = (respostas.data ?? [])[0] as { updated_at: string } | undefined; if (r) n["/assistente"] = r.updated_at;
  const p = (plano.data ?? [])[0] as { retorno_em: string } | undefined; if (p) n["/planeje/mes"] = p.retorno_em;
  const u = (reunioes.data ?? [])[0] as { created_at: string } | undefined; if (u) n["/consultoria/reunioes"] = u.created_at;
  return n;
}
