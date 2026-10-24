"use client";

// Agenda da equipe: os eventos dos Google Agendas (cópia só de leitura em agenda_eventos) com categoria e loja.
import { supabaseBrowser } from "@/lib/supabase/client";
import { FUSO } from "@/lib/formato";
import { acharPortal, normalizar } from "@/lib/agenda-regras";

export type Calendario = { id: string; nome: string; sincronizado_em: string | null; erro: string | null };
export type CategoriaAgenda = "cliente" | "lead" | "bloqueio" | "ausencia" | "interno" | "outro";
export type Evento = {
  calendario_id: string; gcal_id: string; titulo: string; inicio: string; fim: string; dia_inteiro: boolean;
  cor_id: string | null; meet_url: string | null; link: string | null;
  categoria: CategoriaAgenda; portal_id: string | null; loja: string | null;
};

export const CATEGORIAS: { id: CategoriaAgenda; rotulo: string; selo: string }[] = [
  { id: "cliente", rotulo: "Cliente", selo: "feito" },
  { id: "lead", rotulo: "Lead do comercial", selo: "andamento" },
  { id: "bloqueio", rotulo: "Bloqueio", selo: "erro" },
  { id: "ausencia", rotulo: "Ausência", selo: "alerta" },
  { id: "interno", rotulo: "Interno", selo: "espera" },
  { id: "outro", rotulo: "Outros", selo: "espera" },
];
export const seloDa = (c: CategoriaAgenda) => CATEGORIAS.find((x) => x.id === c)?.selo ?? "espera";
export const rotuloDa = (c: CategoriaAgenda) => CATEGORIAS.find((x) => x.id === c)?.rotulo ?? "";

// No Google Agenda a cor das calls do comercial muda com a situação do lead, então não identifica o tipo.
// Roxo (3) continua valendo como lead; o resto vem do título.
const COR_LEAD = "3";

/** "[Nome] Loja Magnética" e evento roxo são leads; "Bloqueada" e "ausente" pelo título; senão, pela loja achada. */
export function categoriaDe(e: { titulo: string; cor_id: string | null }, temLoja: boolean): CategoriaAgenda {
  const t = normalizar(e.titulo);
  if (/^bloquead/.test(t)) return "bloqueio";
  if (/\bausente\b|\bferias\b|\bfolga\b/.test(t)) return "ausencia";
  if (/alinhamento|\binterno\b/.test(t)) return "interno";
  if (e.cor_id === COR_LEAD || /^\[[^\]]+\]\s*loja magnetica/.test(t)) return "lead";
  return temLoja ? "cliente" : "outro";
}

// ----- Datas (sempre no fuso de Recife; "dia" é "2026-10-24") -----
export const chaveDia = (d: Date | string) => new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(new Date(d));
export const hojeChave = () => chaveDia(new Date());
export const somarDias = (chave: string, n: number) => new Date(new Date(`${chave}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
export const diaDaSemana = (chave: string) => new Date(`${chave}T12:00:00Z`).getUTCDay();
export const inicioDoDia = (chave: string) => `${chave}T00:00:00-03:00`;
export const fimDoDia = (chave: string) => `${chave}T23:59:59-03:00`;

export const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const rotuloDia = (chave: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(`${chave}T12:00:00Z`)).replace(".", "");
export const rotuloMes = (chave: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${chave}T12:00:00Z`));

/** Dias em que o evento aparece (o fim de um evento de dia inteiro é o dia seguinte, por isso desconta 1 ms). */
export function diasDoEvento(e: Pick<Evento, "inicio" | "fim">) {
  const ini = chaveDia(e.inicio);
  const fimMs = new Date(e.fim).getTime();
  const fim = fimMs > new Date(e.inicio).getTime() ? chaveDia(new Date(fimMs - 1)) : ini;
  const dias: string[] = [];
  for (let d = ini; d <= fim && dias.length < 62; d = somarDias(d, 1)) dias.push(d);
  return dias;
}

/** Eventos entre duas datas, já com categoria e a loja achada pelo nome (ou apelido) no título. */
export async function buscarAgenda(desde: string, ate: string) {
  const sb = supabaseBrowser();
  const [cal, ev, portais] = await Promise.all([
    sb.from("agenda_calendarios").select("id, nome, sincronizado_em, erro").eq("ativo", true).order("ordem"),
    sb.from("agenda_eventos").select("calendario_id, gcal_id, titulo, inicio, fim, dia_inteiro, cor_id, meet_url, link").lt("inicio", ate).gt("fim", desde).order("inicio").limit(1500),
    sb.from("portais").select("id, loja, apelidos, lojas"),
  ]);
  const lista = (portais.data ?? []) as { id: string; loja: string; apelidos: string[] | null; lojas: string[] | null }[];
  const nomes = lista.map((p) => ({ id: p.id, nomes: [p.loja, ...(p.apelidos ?? []), ...(p.lojas ?? [])] }));
  const lojaDe = new Map(lista.map((p) => [p.id, p.loja]));
  const eventos: Evento[] = (ev.data ?? []).map((e) => {
    const achado = e.dia_inteiro ? null : acharPortal(e.titulo, nomes);
    return { ...e, categoria: categoriaDe(e, !!achado), portal_id: achado?.id ?? null, loja: achado ? lojaDe.get(achado.id) ?? null : null };
  });
  return { calendarios: (cal.data ?? []) as Calendario[], eventos, lojas: lista.map((p) => ({ id: p.id, loja: p.loja })).sort((a, b) => a.loja.localeCompare(b.loja)) };
}

/** Pede à função do Supabase para ler o Google Agenda agora. Devolve a mensagem de erro, se houver. */
export async function atualizarAgora() {
  const { data, error } = await supabaseBrowser().functions.invoke("agenda-sincronizar", { body: {} });
  if (error) {
    const contexto = (error as { context?: unknown }).context;
    const corpo = contexto instanceof Response ? await contexto.json().catch(() => null) : null;
    return (corpo as { erro?: string } | null)?.erro ?? error.message;
  }
  const falhas = ((data as { resultado?: { nome: string; erro?: string }[] })?.resultado ?? []).filter((r) => r.erro);
  return falhas.length ? falhas.map((f) => `${f.nome}: ${f.erro}`).join(" · ") : "";
}
