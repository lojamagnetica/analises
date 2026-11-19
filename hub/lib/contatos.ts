"use client";

// Contatos da CS com as lojas: registrar uma conversa a qualquer hora (sem precisar de alerta) e ver a linha do tempo de cada loja.
import { rotuloResultado } from "@/lib/contato-resultado";
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import type { Anexo } from "@/lib/conversas";

export const CANAIS = ["WhatsApp", "Ligação", "Reunião", "Presencial", "Outro"] as const;
export type Canal = (typeof CANAIS)[number];
export type LojaOpcao = { id: string; loja: string; acompanhada: boolean };
export type Contato = { id: string; portal_id: string; tipo: string; feito_em: string; feito_por: string | null; resumo: string | null; precisa_ajuda: boolean; proximo_passo: string | null; proximo_em: string | null; canal: string | null; arquivos: Anexo[]; resultado?: string | null; retomar_em?: string | null };
export type ItemLinha = { quando: string; tipo: "contato" | "combinado" | "conversa" | "reuniao" | "entrega"; titulo: string; texto: string | null; ajuda?: boolean; arquivos?: Anexo[]; extra?: string; link?: string | null };

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
  const [{ data: ct }, { data: cb }, cv, { data: rs }, { data: en }, { data: gv }, { data: rr }] = await Promise.all([
    sb().from("cs_contatos").select("*").eq("portal_id", portalId).order("feito_em", { ascending: false }).limit(100),
    sb().from("loja_combinados").select("texto, quem, prazo, status, origem, created_at, feito_em").eq("portal_id", portalId).order("created_at", { ascending: false }).limit(50),
    comConversas ? sb().from("equipe_conversas").select("texto, autor_nome, tipo, created_at, arquivos").eq("portal_id", portalId).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
    // As reuniões que já aconteceram (com o resumo), as entregas feitas e as notas internas das gravações aprovadas.
    sb().from("reunioes").select("id, titulo, data, status, ata").eq("portal_id", portalId).lte("data", new Date().toISOString()).order("data", { ascending: false }).limit(40),
    sb().from("loja_entregas").select("tipo, titulo, link, entregue_em, origem").eq("portal_id", portalId).neq("origem", "reuniao").order("entregue_em", { ascending: false }).limit(60),
    sb().from("reunioes_gravadas").select("titulo, data, criado_em, interno, para_claudia").eq("portal_id", portalId).eq("status", "aprovada").order("criado_em", { ascending: false }).limit(20),
    sb().from("reunioes_rascunho").select("reuniao_id, resumo, interno").eq("portal_id", portalId),
  ]);
  const itens: ItemLinha[] = [];
  ((ct ?? []) as Contato[]).forEach((c) => itens.push({ quando: c.feito_em, tipo: "contato", titulo: `${c.resultado && c.resultado !== "conversei" ? rotuloResultado(c.resultado) : c.canal ?? "Conversa"}${c.feito_por ? ` · ${c.feito_por}` : ""}${c.retomar_em ? ` · volta em ${c.retomar_em.split("-").reverse().slice(0, 2).join("/")}` : ""}`, texto: [c.resumo, c.proximo_passo ? `Próximo passo: ${c.proximo_passo}${c.proximo_em ? ` (${c.proximo_em.split("-").reverse().slice(0, 2).join("/")})` : ""}` : null].filter(Boolean).join("\n") || null, ajuda: c.precisa_ajuda, arquivos: c.arquivos ?? [] }));
  ((cb ?? []) as { texto: string; quem: string; prazo: string | null; status: string; origem: string; created_at: string; feito_em: string | null }[]).forEach((c) => itens.push({ quando: c.status === "feito" && c.feito_em ? c.feito_em : c.created_at, tipo: "combinado", titulo: c.status === "feito" ? "Combinado cumprido" : "Combinado", texto: c.texto, extra: c.prazo ? `prazo ${c.prazo.split("-").reverse().slice(0, 2).join("/")}` : undefined }));
  ((cv.data ?? []) as { texto: string; autor_nome: string | null; tipo: string; created_at: string; arquivos: Anexo[] }[]).forEach((m) => itens.push({ quando: m.created_at, tipo: "conversa", titulo: `Conversa da equipe · ${m.autor_nome ?? ""}`, texto: m.texto || null, arquivos: m.arquivos ?? [] }));
  const rasc = new Map(((rr ?? []) as { reuniao_id: string; resumo: string | null; interno: string | null }[]).map((x) => [x.reuniao_id, x]));
  ((rs ?? []) as { id: string; titulo: string | null; data: string; status: string | null; ata: string | null }[]).forEach((r) => {
    const x = rasc.get(r.id);
    // O resumo que a loja lê (ou o rascunho, se ainda não foi liberado) e as notas internas, que só a equipe vê.
    const partes = [r.ata || (x?.resumo ? `Resumo em rascunho (a loja ainda não vê):\n${x.resumo}` : null), x?.interno ? `Interno (só a equipe vê):\n${x.interno}` : null].filter(Boolean);
    itens.push({ quando: r.data, tipo: "reuniao", titulo: `Reunião com a Camilla · ${r.titulo || "Reunião"}`, texto: partes.join("\n\n") || null, extra: r.ata ? undefined : "resumo ainda não liberado para a loja" });
  });
  ((en ?? []) as { tipo: string; titulo: string; link: string | null; entregue_em: string }[]).forEach((e) => itens.push({ quando: e.entregue_em, tipo: "entrega", titulo: `Entrega · ${e.tipo}`, texto: e.titulo, link: e.link }));
  ((gv ?? []) as { titulo: string | null; data: string | null; criado_em: string; interno: string | null; para_claudia: { texto: string }[] | null }[]).forEach((g) => {
    const cs = (g.para_claudia ?? []).map((c) => c.texto).filter(Boolean);
    const texto = [g.interno, cs.length ? `Para a Claudia acompanhar:\n${cs.map((t) => `- ${t}`).join("\n")}` : null].filter(Boolean).join("\n\n");
    if (texto) itens.push({ quando: g.data ? `${g.data}T12:00:00-03:00` : g.criado_em, tipo: "reuniao", titulo: `O que ficou da reunião (interno) · ${g.titulo ?? ""}`, texto });
  });
  return itens.sort((a, b) => b.quando.localeCompare(a.quando));
}

export type ContatoDoDia = Contato & { loja: string };
/** Tudo o que a equipe registrou hoje (de qualquer loja) e os próximos passos marcados para hoje ou atrasados. */
export async function contatosDoDia(): Promise<{ hoje: ContatoDoDia[]; proximos: ContatoDoDia[] }> {
  const inicioHoje = new Date(`${hoje()}T00:00:00-03:00`).toISOString();
  const [{ data: h }, { data: p }, { data: lojas }] = await Promise.all([
    sb().from("cs_contatos").select("*").gte("feito_em", inicioHoje).order("feito_em", { ascending: false }),
    sb().from("cs_contatos").select("*").not("proximo_passo", "is", null).lte("proximo_em", hoje()).gte("proximo_em", somarDias(hoje(), -14)).order("proximo_em"),
    sb().from("portais").select("id, loja"),
  ]);
  const nome = new Map(((lojas ?? []) as { id: string; loja: string }[]).map((l) => [l.id, l.loja]));
  const com = (x: Contato[]) => x.map((c) => ({ ...c, loja: nome.get(c.portal_id) ?? "Loja" }));
  const todos = com((h ?? []) as Contato[]);
  // Próximo passo some quando já houve um contato com a mesma loja depois de registrado.
  const prox = com((p ?? []) as Contato[]).filter((c) => !todos.some((t) => t.portal_id === c.portal_id && t.feito_em > c.feito_em));
  return { hoje: todos, proximos: prox };
}

export async function editarContato(id: string, x: { resumo: string; proximo_passo: string; proximo_em: string; precisa_ajuda: boolean }) {
  await ok(sb().from("cs_contatos").update({ resumo: x.resumo.trim() || null, proximo_passo: x.proximo_passo.trim() || null, proximo_em: x.proximo_em || null, precisa_ajuda: x.precisa_ajuda }).eq("id", id));
}

export async function excluirContato(id: string) {
  await ok(sb().from("cs_contatos").delete().eq("id", id));
}

/** Os últimos contatos registrados com uma loja (para a ficha da cliente). */
export async function contatosDaLoja(portalId: string, loja: string): Promise<ContatoDoDia[]> {
  const { data } = await sb().from("cs_contatos").select("*").eq("portal_id", portalId).order("feito_em", { ascending: false }).limit(10);
  return ((data ?? []) as Contato[]).map((c) => ({ ...c, loja }));
}
