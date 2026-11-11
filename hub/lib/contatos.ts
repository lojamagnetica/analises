"use client";

// Contatos da CS com as lojas: registrar uma conversa a qualquer hora (sem precisar de alerta) e ver a linha do tempo de cada loja.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import type { Anexo } from "@/lib/conversas";

export const CANAIS = ["WhatsApp", "Ligação", "Reunião", "Presencial", "Outro"] as const;
export type Canal = (typeof CANAIS)[number];
export type LojaOpcao = { id: string; loja: string; acompanhada: boolean };
export type Contato = { id: string; portal_id: string; tipo: string; feito_em: string; feito_por: string | null; resumo: string | null; precisa_ajuda: boolean; proximo_passo: string | null; proximo_em: string | null; canal: string | null; arquivos: Anexo[] };
export type ItemLinha = { quando: string; tipo: "contato" | "combinado" | "conversa"; titulo: string; texto: string | null; ajuda?: boolean; arquivos?: Anexo[]; extra?: string };

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

export async function buscarLojas(): Promise<LojaOpcao[]> {
  const { data } = await sb().from("portais").select("id, loja, cs_acompanha, tipo").eq("ativo", true).order("loja");
  return ((data ?? []) as { id: string; loja: string; cs_acompanha: boolean; tipo: string }[]).filter((p) => p.tipo !== "Curso").map((p) => ({ id: p.id, loja: p.loja, acompanhada: !!p.cs_acompanha }))
    .sort((a, b) => Number(b.acompanhada) - Number(a.acompanhada) || a.loja.localeCompare(b.loja));
}

/** O resumo do dia: contatos de hoje e as lojas acompanhadas há mais tempo sem conversa registrada. */
export async function buscarResumo(lojas: LojaOpcao[]) {
  const inicioHoje = new Date(`${hoje()}T00:00:00-03:00`).toISOString();
  const { data } = await sb().from("cs_contatos").select("portal_id, feito_em").gte("feito_em", new Date(Date.now() - 60 * 86_400_000).toISOString()).order("feito_em", { ascending: false });
  const linhas = (data ?? []) as { portal_id: string; feito_em: string }[];
  const hojeN = linhas.filter((c) => c.feito_em >= inicioHoje);
  const ultimo = new Map<string, string>();
  linhas.forEach((c) => { if (!ultimo.has(c.portal_id)) ultimo.set(c.portal_id, c.feito_em); });
  const lojasHoje = new Set(hojeN.map((c) => c.portal_id));
  const parados = lojas.filter((l) => l.acompanhada).map((l) => ({ l, dias: ultimo.has(l.id) ? Math.floor((Date.now() - new Date(ultimo.get(l.id) as string).getTime()) / 86_400_000) : null }))
    .filter((x) => x.dias === null || x.dias >= 7).sort((a, b) => (b.dias ?? 999) - (a.dias ?? 999));
  return { contatosHoje: hojeN.length, lojasHoje: lojasHoje.size, parados };
}

export type NovoContato = { portalId: string; resumo: string; canal: Canal; precisaAjuda: boolean; proximoPasso: string; proximoEm: string; arquivos: Anexo[] };
/** Registra o contato e, se houver próximo passo com data, deixa um lembrete para a própria pessoa. */
export async function registrarContato(c: NovoContato, por: { id: string; nome: string }, comLembrete: boolean) {
  await ok(sb().from("cs_contatos").insert({
    portal_id: c.portalId, tipo: "geral", ref: hoje(), feito_em: new Date().toISOString(), feito_por: por.nome, resumo: c.resumo.trim() || null,
    precisa_ajuda: c.precisaAjuda, proximo_passo: c.proximoPasso.trim() || null, proximo_em: c.proximoEm || null, canal: c.canal, arquivos: c.arquivos,
  }));
  if (comLembrete && c.proximoPasso.trim()) {
    await ok(sb().from("equipe_lembretes").insert({ portal_id: c.portalId, texto: c.proximoPasso.trim(), quando: c.proximoEm || somarDias(hoje(), 1), responsavel: por.id, criado_por: por.nome }));
  }
}

/** A linha do tempo de uma loja: contatos, combinados e (para quem entra nas conversas) as conversas internas, do mais novo para o mais antigo. */
export async function linhaDoTempo(portalId: string, comConversas: boolean): Promise<ItemLinha[]> {
  const [{ data: ct }, { data: cb }, cv] = await Promise.all([
    sb().from("cs_contatos").select("*").eq("portal_id", portalId).order("feito_em", { ascending: false }).limit(100),
    sb().from("loja_combinados").select("texto, quem, prazo, status, origem, created_at, feito_em").eq("portal_id", portalId).order("created_at", { ascending: false }).limit(50),
    comConversas ? sb().from("equipe_conversas").select("texto, autor_nome, tipo, created_at, arquivos").eq("portal_id", portalId).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
  ]);
  const itens: ItemLinha[] = [];
  ((ct ?? []) as Contato[]).forEach((c) => itens.push({ quando: c.feito_em, tipo: "contato", titulo: `${c.canal ?? "Conversa"}${c.feito_por ? ` · ${c.feito_por}` : ""}`, texto: [c.resumo, c.proximo_passo ? `Próximo passo: ${c.proximo_passo}${c.proximo_em ? ` (${c.proximo_em.split("-").reverse().slice(0, 2).join("/")})` : ""}` : null].filter(Boolean).join("\n") || null, ajuda: c.precisa_ajuda, arquivos: c.arquivos ?? [] }));
  ((cb ?? []) as { texto: string; quem: string; prazo: string | null; status: string; origem: string; created_at: string; feito_em: string | null }[]).forEach((c) => itens.push({ quando: c.status === "feito" && c.feito_em ? c.feito_em : c.created_at, tipo: "combinado", titulo: c.status === "feito" ? "Combinado cumprido" : "Combinado", texto: c.texto, extra: c.prazo ? `prazo ${c.prazo.split("-").reverse().slice(0, 2).join("/")}` : undefined }));
  ((cv.data ?? []) as { texto: string; autor_nome: string | null; tipo: string; created_at: string; arquivos: Anexo[] }[]).forEach((m) => itens.push({ quando: m.created_at, tipo: "conversa", titulo: `Conversa da equipe · ${m.autor_nome ?? ""}`, texto: m.texto || null, arquivos: m.arquivos ?? [] }));
  return itens.sort((a, b) => b.quando.localeCompare(a.quando));
}
