import "server-only";
import { JWT } from "google-auth-library";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { acharPortal, normalizar, temaDoTitulo, type PortalNomes } from "@/lib/agenda-regras";

// Google Agenda → tabela de Reuniões de cada portal.
// Regras (as mesmas da tarefa diária que alimentava o Notion):
// - a loja é identificada pelo NOME no título, em qualquer posição (nome da loja ou apelidos do portal);
// - eventos roxos (colorId "3") são leads do comercial e ficam de fora;
// - eventos de dia inteiro e club/curso/treinamento/semanal/ausente ficam de fora;
// - nunca duplica (pelo id do evento e pela data) e nunca altera nem apaga linhas existentes.

type Evento = {
  id: string;
  status?: string;
  summary?: string;
  colorId?: string;
  start?: { dateTime?: string; date?: string };
};

const IGNORAR = /\b(club|curso|treinamento|semanal|ausente)\b/i;

export async function sincronizarAgenda() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const chave = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !chave) throw new Error("Faltam GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY.");
  const agendas = (process.env.GOOGLE_CALENDAR_IDS || "suportelojamagnetica@gmail.com").split(",").map((s) => s.trim()).filter(Boolean);

  const jwt = new JWT({ email, key: chave, scopes: ["https://www.googleapis.com/auth/calendar.readonly"] });
  const admin = supabaseAdmin();

  const { data: portais } = await admin.from("portais").select("id, loja, apelidos").eq("ativo", true);
  const nomes: PortalNomes[] = (portais ?? []).map((p) => ({ id: p.id, nomes: [p.loja, ...(p.apelidos ?? [])] }));

  const inicio = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const fim = new Date(Date.now() + 45 * 86_400_000).toISOString();
  const resultado = { criadas: 0, ignoradas: 0, sem_loja: [] as string[], erros: [] as string[] };
  const vistos = new Set<string>();

  for (const agenda of agendas) {
    let eventos: Evento[] = [];
    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(agenda)}/events?singleEvents=true&orderBy=startTime&maxResults=500&timeMin=${encodeURIComponent(inicio)}&timeMax=${encodeURIComponent(fim)}`;
      const r = await jwt.request<{ items?: Evento[] }>({ url });
      eventos = r.data.items ?? [];
    } catch (e) {
      resultado.erros.push(`${agenda}: ${(e as Error).message}`);
      continue;
    }

    for (const ev of eventos) {
      if (vistos.has(ev.id)) continue;
      vistos.add(ev.id);
      const titulo = ev.summary?.trim() ?? "";
      if (ev.status === "cancelled" || ev.colorId === "3" || !ev.start?.dateTime || !titulo || IGNORAR.test(normalizar(titulo))) {
        resultado.ignoradas++;
        continue;
      }
      const achado = acharPortal(titulo, nomes);
      if (!achado) {
        resultado.sem_loja.push(titulo);
        continue;
      }
      const data = new Date(ev.start.dateTime).toISOString();
      const { data: existe } = await admin
        .from("reunioes")
        .select("id")
        .or(`gcal_event_id.eq."${ev.id}",and(portal_id.eq.${achado.id},data.eq."${data}")`)
        .limit(1);
      if (existe?.length) {
        resultado.ignoradas++;
        continue;
      }
      const { error } = await admin.from("reunioes").insert({
        portal_id: achado.id,
        titulo: temaDoTitulo(titulo, achado.nome),
        data,
        gcal_event_id: ev.id,
      });
      if (error) resultado.erros.push(`${titulo}: ${error.message}`);
      else resultado.criadas++;
    }
  }
  return resultado;
}
