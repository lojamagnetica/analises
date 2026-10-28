// Manda a notificação de uma novidade para os celulares da equipe (Web Push).
// Chamada pelo banco (gatilho em novidades), com a chave do aviso no cabeçalho x-aviso.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BASE = "/analises/portal";

Deno.serve(async (req) => {
  const { data: cfg } = await sb.rpc("push_config");
  if (!cfg?.aviso_chave || req.headers.get("x-aviso") !== cfg.aviso_chave) return new Response("não autorizado", { status: 401 });
  const { texto, link } = await req.json();
  webpush.setVapidDetails("https://lojamagnetica.github.io/analises/portal/", cfg.vapid_publica, cfg.vapid_privada);
  const { data: destinos } = await sb.rpc("push_destinos");
  const msg = JSON.stringify({ titulo: "magnética.hub", texto, url: `${BASE}${link ?? "/empresa/novidades"}` });
  let enviados = 0;
  for (const d of destinos ?? []) {
    try {
      await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, msg, { TTL: 86400 });
      enviados++;
    } catch (e) {
      // Aparelho que desativou ou trocou: sai da lista.
      const st = (e as { statusCode?: number }).statusCode;
      if (st === 404 || st === 410) await sb.from("push_assinaturas").delete().eq("id", d.id);
    }
  }
  return new Response(JSON.stringify({ enviados }), { headers: { "Content-Type": "application/json" } });
});
