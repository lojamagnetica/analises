"use client";

// A leitura da semana: toda segunda às 12h o Hub monta o rascunho de cada loja com os números (o agente);
// a Camilla revisa à tarde e publica. Cada publicação guarda o par rascunho → versão final para o agente aprender.
import { fimDoMes } from "@/lib/caixa";
import { hoje } from "@/lib/formato";
import { buscarPlano, metaDoPlano } from "@/lib/plano-mes";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Acao = { t: string; feita: boolean };
export type Rascunho = { texto: string; acoes: string[]; para_camilla?: string; agente?: boolean };
export type Leitura = {
  id: string; portal_id: string; semana: string; texto: string; acoes: Acao[]; autor_nome: string; updated_at: string;
  rascunho: Rascunho | null; publicada: boolean; publicada_em: string | null;
};

/** A segunda-feira da semana de uma data (fuso de Recife). */
export function semanaDe(data = hoje()) {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const somaDias = (data: string, n: number) => { const d = new Date(`${data}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const sb = () => supabaseBrowser();

/** Para a loja: a leitura publicada desta semana ou, se ainda não tem, a da semana passada.
 *  Para a equipe: também a desta semana em rascunho. */
export async function buscarLeitura(portalId: string, equipe: boolean) {
  const esta = semanaDe();
  const { data } = await sb().from("loja_leituras").select("*").eq("portal_id", portalId).gte("semana", somaDias(esta, -7)).order("semana", { ascending: false });
  const todas = (data ?? []) as Leitura[];
  const publicada = todas.find((l) => l.publicada) ?? null;
  const dessaSemana = todas.find((l) => l.semana === esta) ?? null;
  return { leitura: publicada, publicadaNestaSemana: publicada?.semana === esta, rascunho: equipe && dessaSemana && !dessaSemana.publicada ? dessaSemana : null };
}

/** Publica para a loja e guarda o exemplo (o que o Hub sugeriu → o que a Camilla publicou). */
export async function publicarLeitura(portalId: string, texto: string, acoes: Acao[], autor: string, rascunho: Rascunho | null) {
  const semana = semanaDe();
  const { error } = await sb().from("loja_leituras").upsert(
    { portal_id: portalId, semana, texto: texto.trim(), acoes, autor_nome: autor, publicada: true, publicada_em: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: "portal_id,semana" });
  if (error) throw new Error(error.message);
  if (rascunho) {
    await sb().from("leitura_exemplos").insert({ portal_id: portalId, semana, rascunho, final: { texto: texto.trim(), acoes: acoes.map((a) => a.t) } });
  }
}
export async function despublicar(id: string) {
  const { error } = await sb().from("loja_leituras").update({ publicada: false }).eq("id", id);
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

/** Pede o rascunho ao agente (uma loja ou todas). */
export async function montarRascunho(alvo: { portal_id: string } | { todas: true }) {
  const { data, error } = await sb().functions.invoke("leitura-rascunho", { body: alvo });
  if (error) throw new Error("Não deu para montar o rascunho agora. Tente de novo em instantes.");
  if ((data as { erro?: string })?.erro) throw new Error((data as { erro: string }).erro);
  return data as { ok?: boolean; agente?: boolean; lojas?: number };
}

/** Os números para a equipe ler antes de escrever: a semana e o mês no caixa, e a meta do mês. */
export async function numerosDaLoja(portalId: string) {
  const mes = hoje().slice(0, 7);
  const semana = semanaDe();
  const passada = somaDias(semana, -7);
  const [{ data: caixa }, plano] = await Promise.all([
    sb().from("loja_caixa").select("dia, faturamento").eq("portal_id", portalId).gte("dia", [passada, `${mes}-01`].sort()[0]).lte("dia", fimDoMes(mes)),
    buscarPlano(portalId, mes).catch(() => null),
  ]);
  const linhas = (caixa ?? []) as { dia: string; faturamento: number }[];
  const soma = (f: (d: string) => boolean) => linhas.filter((c) => f(c.dia)).reduce((s, c) => s + Number(c.faturamento), 0);
  // Sem caixa lançado: os números da semana que a loja mandou.
  const informados = await buscarNumerosSemana(portalId, passada);
  return {
    informados,
    semanaPassada: soma((d) => d >= passada && d < semana) || Number(informados?.faturamento ?? 0),
    noMes: soma((d) => d >= `${mes}-01`),
    diasLancados: new Set(linhas.filter((c) => c.dia >= passada && c.dia < semana).map((c) => c.dia)).size,
    meta: plano ? metaDoPlano(plano.dados) : null,
  };
}

// ───── Números da semana (loja que não lança o caixa no Hub) ─────

export type NumerosSemana = { portal_id: string; semana: string; faturamento: number; vendas: number; pecas: number; obs: string };
/** A semana que a loja informa: a passada (segunda). */
export const semanaPassada = () => somaDias(semanaDe(), -7);

export async function buscarNumerosSemana(portalId: string, semana = semanaPassada()) {
  const { data } = await sb().from("loja_numeros_semana").select("*").eq("portal_id", portalId).eq("semana", semana).maybeSingle();
  return (data as NumerosSemana | null) ?? null;
}
export async function salvarNumerosSemana(n: NumerosSemana) {
  const { error } = await sb().from("loja_numeros_semana").upsert({ ...n, updated_at: new Date().toISOString() }, { onConflict: "portal_id,semana" });
  if (error) throw new Error(error.message);
}

/** Dias da semana atual (segunda a sábado) com e sem caixa lançado. */
export async function caixaDaSemana(portalId: string) {
  const semana = semanaDe();
  const { data } = await sb().from("loja_caixa").select("dia").eq("portal_id", portalId).gte("dia", semana);
  const lancados = new Set((data ?? []).map((c) => c.dia as string));
  const h = hoje();
  return [0, 1, 2, 3, 4, 5].map((i) => { const d = somaDias(semana, i); return { dia: d, lancado: lancados.has(d), passou: d < h, hoje: d === h }; });
}
