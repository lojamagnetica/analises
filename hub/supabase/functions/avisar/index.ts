// Manda a notificação de uma novidade para os celulares da equipe (Web Push) e os lembretes para as lojas.
// Chamada pelo banco (gatilho em novidades e lembretes diários), com a chave do aviso no cabeçalho x-aviso.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BASE = "/analises/portal";

Deno.serve(async (req) => {
  const { data: cfg } = await sb.rpc("push_config");
  if (!cfg?.aviso_chave || req.headers.get("x-aviso") !== cfg.aviso_chave) return new Response("não autorizado", { status: 401 });
  const { texto, link, para, para_lojas, titulo } = await req.json();
  webpush.setVapidDetails("https://lojamagnetica.github.io/analises/portal/", cfg.vapid_publica, cfg.vapid_privada);
  // para_lojas: lembretes para as pessoas das lojas (só quem ligou os avisos no celular).
  // para: só os celulares dessas pessoas da equipe (ex.: alteração de contrato vai só para Camilla e Claudia).
  const { data: destinos } = Array.isArray(para_lojas) && para_lojas.length
    ? await sb.rpc("push_destinos_lojas", { p: para_lojas })
    : Array.isArray(para) && para.length ? await sb.rpc("push_destinos_para", { p: para }) : await sb.rpc("push_destinos");
  // titulo "Conversas": o celular usa o ícone do app das Conversas e avisa com som a cada mensagem.
  const msg = JSON.stringify({ titulo: typeof titulo === "string" && titulo ? titulo.slice(0, 60) : "magnética.hub", texto, url: `${BASE}${link ?? (Array.isArray(para_lojas) && para_lojas.length ? "/inicio" : "/empresa/novidades")}` });
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
