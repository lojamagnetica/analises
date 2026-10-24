// Lê os Google Agendas (só leitura, por conta de serviço) e guarda os eventos em agenda_eventos.
// A chave da conta de serviço fica no segredo GOOGLE_SERVICE_ACCOUNT_JSON do Supabase ou em chaves_internas
// (nome google_agenda, sem acesso para ninguém do Hub), nunca no repositório.
// Atende a equipe logada (botão "Atualizar agora") e o agendamento do banco (cabeçalho x-hub-interno).
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-interno",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DIAS_ANTES = 30;
const DIAS_DEPOIS = 90;
const TIPOS = new Set(["default", "outOfOffice", "fromGmail"]);

const b64url = (dados: ArrayBuffer | string) => {
  const bytes = typeof dados === "string" ? new TextEncoder().encode(dados) : new Uint8Array(dados);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Troca a chave da conta de serviço por um acesso de leitura do Google Agenda (vale 1 hora). */
async function acessoGoogle(conta: { client_email: string; private_key: string }) {
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = b64url(JSON.stringify({
    iss: conta.client_email, scope: "https://www.googleapis.com/auth/calendar.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: agora, exp: agora + 3600,
  }));
  const pem = conta.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const chave = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", chave, new TextEncoder().encode(`${cab}.${corpo}`));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${cab}.${corpo}.${b64url(assinatura)}` }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error_description ?? "O Google não liberou o acesso.");
  return j.access_token as string;
}

// deno-lint-ignore no-explicit-any
type EventoGoogle = any;

// Dia inteiro vem como "2026-11-02" (sem hora): vira meia-noite em Recife (UTC−3).
const quando = (t: { dateTime?: string; date?: string }) => (t.dateTime ?? `${t.date}T00:00:00-03:00`);

async function lerEventos(token: string, calendarioId: string, de: Date, ate: Date) {
  const itens: EventoGoogle[] = [];
  let pagina = "";
  do {
    const q = new URLSearchParams({
      timeMin: de.toISOString(), timeMax: ate.toISOString(), singleEvents: "true", orderBy: "startTime",
      maxResults: "250", showDeleted: "false",
      // Só o necessário: sem participantes, descrição nem anexos.
      fields: "nextPageToken,items(id,summary,start,end,colorId,hangoutLink,conferenceData/entryPoints,htmlLink,eventType,status)",
    });
    if (pagina) q.set("pageToken", pagina);
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarioId)}/events?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message ?? `Google respondeu ${r.status}`);
    itens.push(...(j.items ?? []));
    pagina = j.nextPageToken ?? "";
  } while (pagina);
  return itens;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });

  // Chamada do agendamento do banco (chave guardada em chaves_internas) ou da equipe logada.
  const interno = req.headers.get("x-hub-interno");
  let liberado = false;
  if (interno) {
    const { data } = await admin.from("chaves_internas").select("valor").eq("nome", "agenda").maybeSingle();
    liberado = !!data?.valor && data.valor.length >= 32 && data.valor === interno;
  }
  if (!liberado) {
    const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: equipe } = await usuario.rpc("is_equipe");
    if (equipe !== true) return json({ erro: "Só a equipe pode atualizar a agenda." }, 403);
  }

  // A chave vem do segredo do painel ou, se ele não chegar à função, de chaves_internas (nome "google_agenda").
  let segredo = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!segredo) {
    const { data } = await admin.from("chaves_internas").select("valor").eq("nome", "google_agenda").maybeSingle();
    segredo = data?.valor ?? undefined;
  }
  if (!segredo) return json({ erro: "Falta a chave do Google (guarde em chaves_internas, nome google_agenda)." }, 500);

  let token: string;
  try {
    token = await acessoGoogle(JSON.parse(segredo));
  } catch (e) {
    return json({ erro: `Google: ${(e as Error).message}` }, 502);
  }

  const { data: calendarios } = await admin.from("agenda_calendarios").select("id, nome").eq("ativo", true);
  const de = new Date(Date.now() - DIAS_ANTES * 86_400_000);
  const ate = new Date(Date.now() + DIAS_DEPOIS * 86_400_000);
  const resultado: { nome: string; eventos?: number; erro?: string }[] = [];

  for (const cal of calendarios ?? []) {
    const inicioSync = new Date().toISOString();
    try {
      const itens = (await lerEventos(token, cal.id, de, ate)).filter((e) => e.status !== "cancelled" && TIPOS.has(e.eventType ?? "default"));
      const linhas = itens.map((e) => ({
        calendario_id: cal.id,
        gcal_id: e.id,
        titulo: String(e.summary ?? "").slice(0, 300),
        inicio: quando(e.start),
        fim: quando(e.end),
        dia_inteiro: !!e.start?.date,
        cor_id: e.colorId ?? null,
        meet_url: e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p: { entryPointType: string }) => p.entryPointType === "video")?.uri ?? null,
        link: e.htmlLink ?? null,
        tipo_google: e.eventType ?? null,
        atualizado_em: inicioSync,
      }));
      for (let i = 0; i < linhas.length; i += 200) {
        const { error } = await admin.from("agenda_eventos").upsert(linhas.slice(i, i + 200), { onConflict: "calendario_id,gcal_id" });
        if (error) throw new Error(error.message);
      }
      // Evento que sumiu do Google (apagado ou movido para fora da janela) sai da cópia.
      await admin.from("agenda_eventos").delete().eq("calendario_id", cal.id).gte("inicio", de.toISOString()).lte("inicio", ate.toISOString()).lt("atualizado_em", inicioSync);
      await admin.from("agenda_calendarios").update({ sincronizado_em: new Date().toISOString(), erro: null }).eq("id", cal.id);
      resultado.push({ nome: cal.nome, eventos: linhas.length });
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300);
      await admin.from("agenda_calendarios").update({ erro: msg }).eq("id", cal.id);
      resultado.push({ nome: cal.nome, erro: msg });
    }
  }
  return json({ ok: true, resultado });
});
