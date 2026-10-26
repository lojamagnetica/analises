"use client";

// Encontro em grupo da mentoria: um link fixo do Meet, igual para todas as mentoradas, que se repete a cada N dias.
// Fica em hub_config (chave "encontro_grupo"): a equipe edita, todas as lojas leem.
import { supabaseBrowser } from "@/lib/supabase/client";

export type EncontroGrupo = {
  titulo: string;
  link: string;
  /** Um encontro de referência, no horário de Recife ("2026-10-30T19:00"). */
  primeiro: string;
  /** De quantos em quantos dias (14 = a cada 2 semanas, no mesmo dia da semana). */
  intervalo: number;
  /** Duração em minutos: enquanto o encontro acontece, ele continua aparecendo como "agora". */
  duracao: number;
};

export const ENCONTRO_PADRAO: EncontroGrupo = { titulo: "Encontro em grupo da mentoria", link: "", primeiro: "", intervalo: 14, duracao: 90 };

const sb = () => supabaseBrowser();

export async function buscarEncontro(): Promise<EncontroGrupo | null> {
  const { data } = await sb().from("hub_config").select("valor").eq("chave", "encontro_grupo").maybeSingle();
  const v = data?.valor as Partial<EncontroGrupo> | undefined;
  return v?.link && v.primeiro ? { ...ENCONTRO_PADRAO, ...v } : null;
}

export async function salvarEncontro(e: EncontroGrupo) {
  const { error } = await sb().from("hub_config").upsert({ chave: "encontro_grupo", valor: e, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Horário de Recife ("2026-10-30T19:00") → instante. Recife é UTC−3 o ano todo. */
const instante = (local: string) => Date.parse(`${local}:00-03:00`);

/** O próximo encontro (ou o que está acontecendo agora). */
export function proximoEncontro(e: EncontroGrupo, agora = Date.now()) {
  const inicio = instante(e.primeiro);
  if (!Number.isFinite(inicio) || e.intervalo < 1) return null;
  const passo = e.intervalo * 86_400_000;
  const fimDoPrimeiro = inicio + e.duracao * 60_000;
  const k = agora <= fimDoPrimeiro ? 0 : Math.ceil((agora - fimDoPrimeiro) / passo);
  const quando = inicio + k * passo;
  const hoje = new Date(agora - 3 * 3_600_000).toISOString().slice(0, 10) === new Date(quando - 3 * 3_600_000).toISOString().slice(0, 10);
  return { iso: new Date(quando).toISOString(), agora: agora >= quando && agora <= quando + e.duracao * 60_000, hoje };
}

/** Link para colocar o encontro (com a repetição) no Google Agenda. */
export function linkAgenda(e: EncontroGrupo) {
  const fmt = (t: number) => new Date(t - 3 * 3_600_000).toISOString().replace(/[-:]/g, "").slice(0, 15);
  const ini = instante(e.primeiro);
  const regra = e.intervalo % 7 === 0 ? `RRULE:FREQ=WEEKLY;INTERVAL=${e.intervalo / 7}` : `RRULE:FREQ=DAILY;INTERVAL=${e.intervalo}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.titulo, ctz: "America/Recife", details: `Sala do Meet: ${e.link}`, location: e.link, recur: regra });
  // O Google Agenda não entende a barra das datas codificada (%2F): ela vai por fora.
  return `https://calendar.google.com/calendar/render?${q.toString()}&dates=${fmt(ini)}/${fmt(ini + e.duracao * 60_000)}`;
}
