"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import { maisVendidos } from "@/lib/lista-vendas";
import type { DiaLido } from "@/lib/lista-vendas";

const sb = () => supabaseBrowser();

/** Troca os itens vendidos dos dias lidos (de uma loja) pelos do relatório novo. */
export async function salvarItens(portalId: string, loja: string, dias: DiaLido[]) {
  const datas = dias.map((d) => d.dia);
  if (!datas.length) return;
  const { error: e1 } = await sb().from("loja_caixa_itens").delete().eq("portal_id", portalId).eq("loja", loja).in("dia", datas);
  if (e1) throw new Error(e1.message);
  const linhas = dias.flatMap((d) => d.itens.map((i) => ({ portal_id: portalId, loja, dia: d.dia, venda: i.venda, vendedora: i.vendedora, codigo: i.codigo, produto: i.produto, qtd: i.qtd, total: i.total })));
  for (let k = 0; k < linhas.length; k += 500) {
    const { error } = await sb().from("loja_caixa_itens").insert(linhas.slice(k, k + 500));
    if (error) throw new Error(error.message);
  }
}

/** Os mais vendidos de um período (todas as lojas do portal ou só uma). */
export async function maisVendidosDoPeriodo(portalId: string, de: string, ate: string, loja = "") {
  let q = sb().from("loja_caixa_itens").select("produto, qtd, total").eq("portal_id", portalId).gte("dia", de).lte("dia", ate).limit(5000);
  if (loja) q = q.eq("loja", loja);
  const { data } = await q;
  const itens = (data ?? []).map((i) => ({ produto: i.produto as string, qtd: Number(i.qtd), total: Number(i.total) }));
  return { total: itens.length, lista: maisVendidos(itens, 10) };
}
