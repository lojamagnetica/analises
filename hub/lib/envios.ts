"use client";

// Envios da loja: quem manda o caixa e os relatórios (em geral o ADM, com o acesso só caixa) confere se os números
// que mandou batem com o sistema. A conferência semanal vale pela segunda-feira da semana; a mensal, pelo mês (AAAA-MM).
import { supabaseBrowser } from "@/lib/supabase/client";
import { somarDias } from "@/lib/acoes-mes";
import { segundaDa } from "@/lib/rotina";
import { type Caixa } from "@/lib/caixa";

export type TipoEnvio = "semanal" | "mensal";
export type Conferencia = { tipo: TipoEnvio; periodo: string; conferido_em: string; por_nome: string | null; obs: string | null };

const sb = () => supabaseBrowser();

/** Segunda a domingo da semana de uma data. */
export const semanaDoDia = (d: string) => { const de = segundaDa(d); return { de, ate: somarDias(de, 6) }; };

/** Os lançamentos do caixa entre duas datas (inclusive), de todas as lojas do portal. */
export async function buscarCaixaPeriodo(portalId: string, de: string, ate: string) {
  const { data } = await sb().from("loja_caixa").select("id, loja, dia, faturamento, vendas, pecas, obs, pagamentos, vendedoras, malinha, cadastros")
    .eq("portal_id", portalId).gte("dia", de).lte("dia", ate).order("dia");
  return (data ?? []).map((l) => ({ ...l, faturamento: Number(l.faturamento), vendas: Number(l.vendas), pecas: Number(l.pecas) })) as Caixa[];
}

export async function buscarConferencia(portalId: string, tipo: TipoEnvio, periodo: string) {
  const { data } = await sb().from("loja_envios").select("tipo, periodo, conferido_em, por_nome, obs").eq("portal_id", portalId).eq("tipo", tipo).eq("periodo", periodo).maybeSingle();
  return (data ?? null) as Conferencia | null;
}

export async function marcarConferido(portalId: string, tipo: TipoEnvio, periodo: string, porNome: string, obs = "") {
  const { error } = await sb().from("loja_envios").upsert(
    { portal_id: portalId, tipo, periodo, por_nome: porNome || null, obs: obs.trim().slice(0, 500) || null, conferido_em: new Date().toISOString() },
    { onConflict: "portal_id,tipo,periodo" },
  );
  if (error) throw new Error("Não deu para salvar a conferência. Tente de novo.");
}

export async function desfazerConferencia(portalId: string, tipo: TipoEnvio, periodo: string) {
  const { error } = await sb().from("loja_envios").delete().eq("portal_id", portalId).eq("tipo", tipo).eq("periodo", periodo);
  if (error) throw new Error("Não deu para desfazer. Tente de novo.");
}

/** Quanto cada vendedora vendeu no período, da maior para a menor (sem as "outras vendas": dona, online). */
export function ranking(lista: Pick<Caixa, "vendedoras">[]) {
  const t = new Map<string, { nome: string; faturamento: number; vendas: number; pecas: number }>();
  for (const c of lista) for (const v of c.vendedoras ?? []) {
    if (!v.pessoa_id) continue;
    const a = t.get(v.pessoa_id) ?? { nome: v.nome, faturamento: 0, vendas: 0, pecas: 0 };
    a.faturamento += v.faturamento; a.vendas += v.vendas; a.pecas += v.pecas; a.nome = v.nome;
    t.set(v.pessoa_id, a);
  }
  return [...t.values()].filter((v) => v.faturamento > 0 || v.vendas > 0).sort((a, b) => b.faturamento - a.faturamento);
}
