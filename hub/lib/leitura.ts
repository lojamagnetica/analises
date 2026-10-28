"use client";

// A leitura da semana: a equipe olha os números da loja e escreve o que eles mostram e as 3 ações da semana.
// É o "alguém que olhe os relatórios e me direcione" toda semana, sem depender da reunião.
import { fimDoMes } from "@/lib/caixa";
import { hoje } from "@/lib/formato";
import { buscarPlano, metaDoPlano } from "@/lib/plano-mes";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Acao = { t: string; feita: boolean };
export type Leitura = { id: string; portal_id: string; semana: string; texto: string; acoes: Acao[]; autor_nome: string; updated_at: string };

/** A segunda-feira da semana de uma data (fuso de Recife). */
export function semanaDe(data = hoje()) {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const somaDias = (data: string, n: number) => { const d = new Date(`${data}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const sb = () => supabaseBrowser();

/** A leitura desta semana; se ainda não tem, a da semana passada (a loja não fica sem nada na segunda de manhã). */
export async function buscarLeitura(portalId: string) {
  const esta = semanaDe();
  const { data } = await sb().from("loja_leituras").select("*").eq("portal_id", portalId).gte("semana", somaDias(esta, -7)).order("semana", { ascending: false }).limit(1);
  const l = ((data ?? [])[0] as Leitura | undefined) ?? null;
  return { leitura: l, dessaSemana: l?.semana === esta };
}

export async function salvarLeitura(portalId: string, texto: string, acoes: Acao[], autor: string) {
  const { error } = await sb().from("loja_leituras").upsert(
    { portal_id: portalId, semana: semanaDe(), texto: texto.trim(), acoes, autor_nome: autor, updated_at: new Date().toISOString() },
    { onConflict: "portal_id,semana" });
  if (error) throw new Error(error.message);
}
export async function excluirLeitura(id: string) {
  const { error } = await sb().from("loja_leituras").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
export async function marcarAcao(id: string, idx: number, feita: boolean) {
  const { error } = await sb().rpc("leitura_marcar", { p_id: id, p_idx: idx, p_feita: feita });
  if (error) throw new Error(error.message);
}

/** Os números para a equipe ler antes de escrever: a semana e o mês no caixa, e a meta do mês. */
export async function numerosDaLoja(portalId: string) {
  const mes = hoje().slice(0, 7);
  const semana = semanaDe();
  const [{ data: caixa }, plano] = await Promise.all([
    sb().from("loja_caixa").select("dia, faturamento").eq("portal_id", portalId).gte("dia", `${mes}-01`).lte("dia", fimDoMes(mes)),
    buscarPlano(portalId, mes).catch(() => null),
  ]);
  const linhas = (caixa ?? []) as { dia: string; faturamento: number }[];
  const noMes = linhas.reduce((s, c) => s + Number(c.faturamento), 0);
  const naSemana = linhas.filter((c) => c.dia >= semana).reduce((s, c) => s + Number(c.faturamento), 0);
  return { noMes, naSemana, diasLancados: new Set(linhas.map((c) => c.dia)).size, meta: plano ? metaDoPlano(plano.dados) : null };
}
