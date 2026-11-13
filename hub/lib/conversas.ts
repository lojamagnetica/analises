"use client";

// Conversas da equipe: o canal interno só da Camilla e da CS. Cada mensagem é ligada a uma loja (ou "geral") e vira,
// com 1 toque, lembrete, pendência da loja, combinado ou contato registrado. Só quem tem perfis.conversas_equipe entra (RLS).
import { supabaseBrowser } from "@/lib/supabase/client";
import { novaPendencia } from "@/lib/pendencias";

export type TipoConversa = "Alinhamento" | "Pedido" | "Aviso" | "Urgente";
export const TIPOS_CONVERSA: TipoConversa[] = ["Alinhamento", "Pedido", "Aviso", "Urgente"];
export type Anexo = { caminho: string; nome: string; tipo: string; tamanho: number };
/** A pergunta da Assistente Magnética para confirmar uma reunião (ver a migração 0169). */
export type AcaoReuniao = { tipo: "confirmar_reuniao"; reuniao_id: string; estado: "pendente" | "confirmada" | "nao"; minutos?: number; texto?: string; whatsapp?: string | null };
export type Mensagem = { id: string; acao?: AcaoReuniao | null; arquivos?: Anexo[]; portal_id: string | null; tipo: TipoConversa; texto: string; autor: string | null; autor_nome: string | null; para: string | null; status: "aberta" | "concluida"; created_at: string };
export type Lembrete = { id: string; portal_id: string | null; texto: string; quando: string | null; responsavel: string | null; feito: boolean; conversa_id: string | null; criado_por: string | null; created_at: string };
export type Pessoa = { id: string; nome: string };

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

/** Resposta da Camilla: minutos 0 = no horário, > 0 = começa depois, null = não mandar nada para a cliente. */
export const confirmarReuniao = (conversaId: string, minutos: number | null) =>
  ok(sb().rpc("reuniao_confirmar", { p_conversa: conversaId, p_minutos: minutos }));

/** Quem entra nas conversas (Camilla e CS), para marcar "para quem é". */
export async function buscarPessoas(): Promise<Pessoa[]> {
  const { data } = await sb().from("perfis").select("id, nome").eq("conversas_equipe", true).order("nome");
  return (data ?? []) as Pessoa[];
}

/** As mensagens de uma loja (ou da conversa geral, com portalId null), da mais antiga para a mais nova. */
export async function buscarMensagens(portalId: string | null): Promise<Mensagem[]> {
  let q = sb().from("equipe_conversas").select("*").order("created_at", { ascending: true }).limit(300);
  q = portalId ? q.eq("portal_id", portalId) : q.is("portal_id", null);
  const { data } = await q;
  return (data ?? []) as Mensagem[];
}

export type Resumo = Pick<Mensagem, "portal_id" | "texto" | "autor" | "autor_nome" | "status" | "created_at">;
/** As mensagens dos últimos 90 dias, da mais nova para a mais antiga: a lista de conversas sai daqui (última, novas e em aberto). */
export async function buscarResumo(): Promise<Resumo[]> {
  const desde = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data } = await sb().from("equipe_conversas").select("portal_id, texto, autor, autor_nome, status, created_at").gte("created_at", desde).order("created_at", { ascending: false }).limit(2000);
  return (data ?? []) as Resumo[];
}

/** Quantas mensagens abertas há em cada loja (para o selo na lista). */
export async function abertasPorLoja(): Promise<Record<string, number>> {
  const { data } = await sb().from("equipe_conversas").select("portal_id").eq("status", "aberta");
  const m: Record<string, number> = {};
  (data ?? []).forEach((x: { portal_id: string | null }) => { const k = x.portal_id ?? "geral"; m[k] = (m[k] ?? 0) + 1; });
  return m;
}

export const LIMITE_ANEXO = 25 * 1024 * 1024;

/** Sobe um arquivo para o bucket privado (só a Camilla e a CS leem) e devolve o que fica salvo na mensagem. */
export async function subirAnexo(arquivo: File, autorId: string): Promise<Anexo> {
  if (arquivo.size > LIMITE_ANEXO) throw new Error(`${arquivo.name} passa de 25 MB.`);
  const limpo = arquivo.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.\-]+/g, "_");
  const caminho = `${autorId}/${Date.now()}-${limpo}`;
  const { error } = await sb().storage.from("equipe-conversas").upload(caminho, arquivo, { contentType: arquivo.type || undefined });
  if (error) throw new Error(error.message);
  return { caminho, nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size };
}
/** Endereço temporário (1 hora) para abrir um anexo. */
export async function linkAnexo(caminho: string): Promise<string | null> {
  const { data } = await sb().storage.from("equipe-conversas").createSignedUrl(caminho, 3600);
  return data?.signedUrl ?? null;
}

export const enviarMensagem = (portalId: string | null, tipo: TipoConversa, texto: string, autor: { id: string; nome: string }, para: string | null, arquivos: Anexo[] = []) =>
  ok(sb().from("equipe_conversas").insert({ portal_id: portalId, tipo, texto: texto.trim(), autor: autor.id, autor_nome: autor.nome, para: para || null, arquivos }));
export const concluirMensagem = (id: string, concluida: boolean) => ok(sb().from("equipe_conversas").update({ status: concluida ? "concluida" : "aberta" }).eq("id", id));

// ───── O que uma mensagem vira ─────
export const criarLembrete = (m: Mensagem, quando: string | null, responsavel: string | null, por: string, texto?: string) =>
  ok(sb().from("equipe_lembretes").insert({ portal_id: m.portal_id, texto: (texto ?? m.texto).trim(), quando: quando || null, responsavel: responsavel || null, conversa_id: m.id, criado_por: por }));
export async function virarPendencia(m: Mensagem, por: string) {
  if (!m.portal_id) throw new Error("A pendência é de uma loja: escolha a loja da conversa.");
  await novaPendencia(m.portal_id, m.texto, "Loja", por);
}
export const virarCombinado = (m: Mensagem, prazo: string | null, por: string) => {
  if (!m.portal_id) throw new Error("O combinado é de uma loja: escolha a loja da conversa.");
  return ok(sb().from("loja_combinados").insert({ portal_id: m.portal_id, texto: m.texto.trim(), quem: "loja", prazo: prazo || null, origem: "conversa", criado_por: por }));
};
export const virarContato = (m: Mensagem, por: string) => {
  if (!m.portal_id) throw new Error("O contato é de uma loja: escolha a loja da conversa.");
  return ok(sb().from("cs_contatos").insert({ portal_id: m.portal_id, tipo: "geral", ref: m.id, feito_em: new Date().toISOString(), feito_por: por, resumo: m.texto.trim() }));
};

// ───── Lembretes ─────
export async function buscarLembretes(responsavel: string | null, abertos = true): Promise<Lembrete[]> {
  let q = sb().from("equipe_lembretes").select("*").order("quando", { ascending: true, nullsFirst: false });
  if (abertos) q = q.eq("feito", false);
  if (responsavel) q = q.eq("responsavel", responsavel);
  const { data } = await q;
  return (data ?? []) as Lembrete[];
}
export const marcarLembrete = (id: string, feito: boolean) => ok(sb().from("equipe_lembretes").update({ feito }).eq("id", id));
