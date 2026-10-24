// Fale com a Camilla: o canal da loja com a Camilla e a equipe. Cada mensagem (texto ou áudio) vira uma solicitação
// com tipo, status, prazo de resposta e quem cuida. A equipe responde e pode transformar em ação ou tarefa.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Tipo = "Dúvida" | "Pedido" | "Aviso" | "Urgente";
export type Status = "Recebida" | "Em andamento" | "Respondida" | "Concluída";
export const TIPOS: Tipo[] = ["Dúvida", "Pedido", "Aviso", "Urgente"];
export const STATUS: Status[] = ["Recebida", "Em andamento", "Respondida", "Concluída"];

export type Resposta = {
  id: string; solicitacao_id: string; autor: string | null; autor_nome: string | null; equipe: boolean;
  texto: string; audio: string | null; transcricao: string | null; created_at: string; automatica?: boolean;
};
export type Solicitacao = {
  id: string; portal_id: string; autor: string | null; autor_nome: string | null; tipo: Tipo; texto: string;
  audio: string | null; transcricao: string | null; status: Status; responsavel: string | null; responsavel_nome: string | null;
  vinculo: string | null; created_at: string; updated_at: string;
  respostas: Resposta[];
  portal?: { loja: string; tipo: string; inicio: string | null } | null;
};

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

export const classeStatus = (s: Status) => (s === "Concluída" || s === "Respondida" ? "feito" : s === "Em andamento" ? "andamento" : "alerta");
export const classeTipo = (t: Tipo) => (t === "Urgente" ? "erro" : t === "Pedido" ? "andamento" : "espera");
export const aberta = (s: Solicitacao) => s.status === "Recebida" || s.status === "Em andamento";

/** Prazo de resposta: 12 horas úteis (seg a sex, 9h às 18h, horário de Recife) a partir do envio. */
export function prazoDe(s: Pick<Solicitacao, "created_at">): Date {
  let resta = 12 * 60;
  // Trabalha no "relógio de Recife" (UTC−3, sem horário de verão).
  const t = new Date(new Date(s.created_at).getTime() - 3 * 3_600_000);
  const util = (d: Date) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5;
  while (resta > 0) {
    const h = t.getUTCHours() + t.getUTCMinutes() / 60;
    if (!util(t) || h >= 18) { t.setUTCDate(t.getUTCDate() + 1); t.setUTCHours(9, 0, 0, 0); continue; }
    if (h < 9) { t.setUTCHours(9, 0, 0, 0); continue; }
    const ateFim = Math.round((18 - h) * 60);
    const passo = Math.min(resta, ateFim);
    t.setTime(t.getTime() + passo * 60_000);
    resta -= passo;
  }
  return new Date(t.getTime() + 3 * 3_600_000);
}

/** O prazo conta da última mensagem da loja (quando ela complementa, o relógio recomeça). */
export const desde = (s: Solicitacao) => [...s.respostas].reverse().find((r) => !r.equipe)?.created_at ?? s.created_at;

/** Quanto falta para o prazo: "em até 3 h", "até qua, 10:00" ou "atrasada há 2 h". */
export function prazoTexto(s: Pick<Solicitacao, "created_at">, agora = Date.now()) {
  const p = prazoDe(s).getTime();
  const min = Math.round((p - agora) / 60_000);
  if (min < 0) return { texto: `atrasada há ${Math.max(1, Math.round(-min / 60))} h`, atrasada: true };
  if (min < 60) return { texto: `em até ${min} min`, atrasada: false };
  if (min < 24 * 60) return { texto: `em até ${Math.round(min / 60)} h`, atrasada: false };
  const quando = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(p);
  return { texto: `até ${quando.replace(".", "")}`, atrasada: false };
}

async function anexarRespostas(lista: Omit<Solicitacao, "respostas">[]): Promise<Solicitacao[]> {
  if (!lista.length) return [];
  const { data } = await sb().from("solicitacao_respostas").select("*").in("solicitacao_id", lista.map((s) => s.id)).order("created_at");
  const por = new Map<string, Resposta[]>();
  (data ?? []).forEach((r) => { const k = (r as Resposta).solicitacao_id; por.set(k, [...(por.get(k) ?? []), r as Resposta]); });
  return lista.map((s) => ({ ...s, respostas: por.get(s.id) ?? [] }));
}

/** As mensagens de uma loja (o que ela vê na Assistente). */
export async function buscarDoPortal(portalId: string) {
  const { data } = await sb().from("solicitacoes").select("*").eq("portal_id", portalId).order("created_at", { ascending: false });
  return anexarRespostas((data ?? []) as Omit<Solicitacao, "respostas">[]);
}

/** A caixa de entrada da equipe: todas as lojas. */
export async function buscarCaixa() {
  const { data } = await sb().from("solicitacoes").select("*, portal:portais(loja, tipo, inicio)").order("created_at", { ascending: false }).limit(500);
  return anexarRespostas((data ?? []) as Omit<Solicitacao, "respostas">[]);
}

export async function buscarEquipe() {
  const { data } = await sb().from("perfis").select("id, nome").eq("papel", "equipe").order("nome");
  return (data ?? []) as { id: string; nome: string }[];
}

export async function subirAudio(portalId: string, audio: Blob) {
  const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  const caminho = `${portalId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb().storage.from("audios").upload(caminho, audio, { contentType: audio.type || "audio/webm" });
  if (error) throw new Error("Não deu para enviar o áudio. Confira a internet e tente de novo.");
  return caminho;
}

export async function linkAudio(caminho: string) {
  const { data } = await sb().storage.from("audios").createSignedUrl(caminho, 3600);
  return data?.signedUrl ?? null;
}

export type Envio = { texto: string; audio: Blob | null; transcricao: string };

export async function enviarSolicitacao(portalId: string, autor: string, autorNome: string, tipo: Tipo, e: Envio) {
  if (!e.texto.trim() && !e.audio) throw new Error("Escreva a mensagem ou grave um áudio.");
  const audio = e.audio ? await subirAudio(portalId, e.audio) : null;
  await ok(sb().from("solicitacoes").insert({
    portal_id: portalId, autor, autor_nome: autorNome, tipo, texto: e.texto.trim().slice(0, 8000), audio, transcricao: e.transcricao.trim() || null,
  }));
}

export async function responder(s: Solicitacao, autor: string, autorNome: string, equipe: boolean, e: Envio) {
  if (!e.texto.trim() && !e.audio) throw new Error("Escreva a resposta ou grave um áudio.");
  const audio = e.audio ? await subirAudio(s.portal_id, e.audio) : null;
  await ok(sb().from("solicitacao_respostas").insert({
    solicitacao_id: s.id, portal_id: s.portal_id, autor, autor_nome: autorNome, equipe,
    texto: e.texto.trim().slice(0, 8000), audio, transcricao: e.transcricao.trim() || null,
  }));
}

export const mudarStatus = (id: string, status: Status) =>
  ok(sb().from("solicitacoes").update({ status, updated_at: new Date().toISOString() }).eq("id", id));

export const mudarResponsavel = (id: string, pessoa: { id: string; nome: string } | null) =>
  ok(sb().from("solicitacoes").update({ responsavel: pessoa?.id ?? null, responsavel_nome: pessoa?.nome ?? null, updated_at: new Date().toISOString() }).eq("id", id));

/** Texto curto da mensagem para virar ação ou tarefa. */
export const resumo = (s: Solicitacao) => (s.texto || s.transcricao || "Mensagem em áudio").replace(/\s+/g, " ").trim().slice(0, 280);

/** Mês do Plano de 90 dias em que a loja está (1 a 3). */
export function mesDoPlano(inicio: string | null | undefined) {
  if (!inicio) return 1;
  const dias = Math.floor((Date.now() - new Date(inicio + "T12:00:00").getTime()) / 86_400_000);
  return Math.min(3, Math.max(1, Math.floor(dias / 30) + 1));
}

/** Consultoria: vira uma entrega da Loja Magnética nas ações. Mentoria: vira tarefa no Plano de Ação do mês. */
export async function virarTarefa(s: Solicitacao, o: { consultoria: boolean; quem: string; inicio: string | null }) {
  if (o.consultoria) {
    await ok(sb().from("consultoria_acoes").insert({ portal_id: s.portal_id, acao: resumo(s), quem: o.quem, tipo: "Entrega Loja Magnética", obs: `Pedido pela Assistente (${s.tipo})` }));
  } else {
    await ok(sb().from("plano_itens").insert({ portal_id: s.portal_id, mes: mesDoPlano(o.inicio), ordem: 800, texto: resumo(s), origem: "assistente" }));
  }
  await ok(sb().from("solicitacoes").update({ vinculo: o.consultoria ? "acao" : "plano", status: "Em andamento", updated_at: new Date().toISOString() }).eq("id", s.id));
}

/** Nome e foto da Camilla para o topo do Fale com a Camilla (ficam em hub_config, que a loja pode ler). */
export async function buscarCamilla() {
  const { data } = await sb().from("hub_config").select("valor").eq("chave", "camilla").maybeSingle();
  return (data?.valor ?? null) as { nome: string; foto: string | null } | null;
}
