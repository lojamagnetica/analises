"use client";

// Guia de compras (OTB) do Diagnóstico de estoque: o plano de compra da loja para os próximos 6 meses.
// Começa com os números que o Hub já tem (Dados da loja e Fechamento de caixa) e a loja ajusta.
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Respostas } from "@/lib/conteudo";
import { mesDeHoje, numeroDe } from "@/lib/caixa";
import { mesesComVenda, somarMes, type PlanoOtb } from "@/lib/otb-conta";

/** Meses de venda que o estoque final deve cobrir, no padrão do método. */
export const COBERTURA_PADRAO = 3;

const sb = () => supabaseBrowser();
const ler = (r: Respostas | undefined, k: string) => (r?.[`${k}__st`] === "nao_tenho" ? null : numeroDe(r?.[k]));

/** O plano salvo; sem plano, um novo com os números do Hub. */
export async function buscarOtb(portalId: string, loja: string, pers: Map<number, { respostas: Respostas }>) {
  const { data } = await sb().from("loja_otb").select("id, dados, updated_at, updated_by").eq("portal_id", portalId).eq("loja", loja).maybeSingle();
  if (data) return { salvo: true, id: data.id as string, plano: completar(data.dados as Partial<PlanoOtb>), atualizado: data.updated_at as string, por: data.updated_by as string | null };
  return { salvo: false, id: null, plano: await planoInicial(portalId, loja, pers), atualizado: null, por: null };
}

const completar = (d: Partial<PlanoOtb>): PlanoOtb => ({
  inicio: d.inicio ?? mesDeHoje(), estoque_inicial: Number(d.estoque_inicial) || 0, markup: Number(d.markup) || 2,
  cobertura: Number(d.cobertura) || COBERTURA_PADRAO, vendas: d.vendas ?? {}, pedidos: d.pedidos ?? [],
});

/** Venda planejada: o mesmo mês do ano passado no Fechamento de caixa; sem ele, o faturamento médio dos Dados da loja. */
export async function planoInicial(portalId: string, loja: string, pers: Map<number, { respostas: Respostas }>): Promise<PlanoOtb> {
  const markup = ler(pers.get(4)?.respostas, "markup") || 2;
  const estoqueVenda = ler(pers.get(8)?.respostas, "valor_estoque") ?? 0;
  const media = ler(pers.get(1)?.respostas, "faturamento_medio") ?? 0;
  const inicio = mesDeHoje();
  const meses = mesesComVenda({ inicio, cobertura: COBERTURA_PADRAO });
  const de = `${somarMes(inicio, -12)}-01`, ate = `${somarMes(meses[meses.length - 1], -11)}-01`;
  let q = sb().from("loja_caixa").select("dia, faturamento").eq("portal_id", portalId).gte("dia", de).lt("dia", ate);
  if (loja) q = q.eq("loja", loja);
  const { data } = await q;
  const porMes: Record<string, number> = {};
  (data ?? []).forEach((c) => { const m = somarMes(String(c.dia).slice(0, 7), 12); porMes[m] = (porMes[m] ?? 0) + (Number(c.faturamento) || 0); });
  return {
    inicio, markup, cobertura: COBERTURA_PADRAO, pedidos: [],
    estoque_inicial: Math.round(estoqueVenda / markup),
    vendas: Object.fromEntries(meses.map((m) => [m, Math.round(porMes[m] || media)])),
  };
}

export async function salvarOtb(portalId: string, loja: string, plano: PlanoOtb, porNome: string) {
  const { error } = await sb().from("loja_otb").upsert({ portal_id: portalId, loja, dados: plano, updated_at: new Date().toISOString(), updated_by: porNome }, { onConflict: "portal_id,loja" });
  if (error) throw new Error(error.message);
}

/** Recomeçar: apaga o plano salvo e volta para os números do Hub. */
export async function apagarOtb(id: string) {
  const { error } = await sb().from("loja_otb").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const novoPedido = (mes: string) => ({ id: Math.random().toString(36).slice(2, 10), descricao: "", mes, valor: 0 });
