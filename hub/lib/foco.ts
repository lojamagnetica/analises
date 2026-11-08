import { supabaseBrowser } from "@/lib/supabase/client";

export type ContratoFoco = { resultado: string | null; indicador: string | null; de_acordo_em: string | null; curto: string | null; trabalhando: string[] | null };
export type FocoDaLoja = ContratoFoco & { loja: string };

/** O Contrato de Foco da loja em foco (portal com várias lojas); sem contrato da loja, vale o geral da ficha. */
export async function buscarContratoFoco(portalId: string, loja = ""): Promise<ContratoFoco | null> {
  const sb = supabaseBrowser();
  if (loja) {
    const r = await sb.rpc("contrato_foco", { p: portalId, p_loja: loja });
    if (!r.error) return ((r.data ?? []) as ContratoFoco[])[0] ?? null;
  }
  const { data } = await sb.rpc("contrato_foco", { p: portalId });
  return ((data ?? []) as ContratoFoco[])[0] ?? null;
}

export async function aceitarContratoFoco(portalId: string, loja = "") {
  const sb = supabaseBrowser();
  if (loja) {
    const r = await sb.rpc("aceitar_contrato_foco", { p: portalId, p_loja: loja });
    if (!r.error) return;
  }
  const { error } = await sb.rpc("aceitar_contrato_foco", { p: portalId });
  if (error) throw new Error(error.message);
}

/** Equipe: os contratos de cada loja do portal. */
export async function listarFocosDasLojas(portalId: string): Promise<FocoDaLoja[]> {
  const { data, error } = await supabaseBrowser().from("loja_foco").select("loja, resultado, indicador, curto, trabalhando, de_acordo_em").eq("portal_id", portalId);
  if (error) return [];
  return (data ?? []) as FocoDaLoja[];
}

export async function salvarFocoDaLoja(portalId: string, f: { loja: string; resultado: string; indicador: string; curto: string; trabalhando: string[] }) {
  const { error } = await supabaseBrowser().from("loja_foco").upsert({
    portal_id: portalId, loja: f.loja, resultado: f.resultado.trim() || null, indicador: f.indicador.trim() || null,
    curto: f.curto.trim().slice(0, 90) || null, trabalhando: f.trabalhando,
  }, { onConflict: "portal_id,loja" });
  if (error) throw new Error(error.message.includes("loja_foco") ? "O contrato por loja ainda não foi ligado no banco (falta aplicar a migração 0132)." : error.message);
}
