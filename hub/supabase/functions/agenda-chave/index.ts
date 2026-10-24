// Guarda a chave do Google (conta de serviço) em chaves_internas, depois de conferir que o Google a aceita.
// Só a equipe logada usa. A chave vem do navegador direto para cá e nunca vai para o repositório nem para o chat.
// acao "status": diz se já existe chave guardada e de qual conta (e-mail), sem devolver a chave.
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const b64url = (dados: ArrayBuffer | string) => {
  const bytes = typeof dados === "string" ? new TextEncoder().encode(dados) : new Uint8Array(dados);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Pede ao Google um acesso de leitura com a chave. Se der certo, a chave é válida. */
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: equipe } = await usuario.rpc("is_equipe");
  if (equipe !== true) return json({ erro: "Só a equipe pode guardar a chave do Google." }, 403);

  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  const corpo = await req.json().catch(() => ({}));

  if (corpo.acao === "status") {
    const { data } = await admin.from("chaves_internas").select("valor").eq("nome", "google_agenda").maybeSingle();
    let email: string | null = null;
    try { email = data?.valor ? JSON.parse(data.valor).client_email ?? null : null; } catch { /* chave ilegível: conta como sem e-mail */ }
    return json({ tem: !!data?.valor, email });
  }

  const texto = String(corpo.chave ?? "").trim();
  if (!texto) return json({ erro: "Cole o conteúdo do arquivo da chave." }, 400);
  if (texto.length > 20000) return json({ erro: "O texto é grande demais para ser a chave. Copie só o arquivo da chave do Google." }, 400);
  let conta: { type?: string; client_email?: string; private_key?: string };
  try { conta = JSON.parse(texto); } catch { return json({ erro: "O que foi colado não é o arquivo da chave. Copie o arquivo inteiro, do primeiro { até o último }." }, 400); }
  if (conta.type !== "service_account" || !conta.client_email || !conta.private_key) {
    return json({ erro: "Esse arquivo não é a chave de uma conta de serviço do Google. Use o arquivo .json que o Google baixou ao criar a chave." }, 400);
  }
  try {
    await acessoGoogle({ client_email: conta.client_email, private_key: conta.private_key });
  } catch (e) {
    return json({ erro: `O Google não aceitou essa chave: ${(e as Error).message}` }, 400);
  }
  const { error } = await admin.from("chaves_internas").upsert({ nome: "google_agenda", valor: JSON.stringify(conta), updated_at: new Date().toISOString() }, { onConflict: "nome" });
  if (error) return json({ erro: "O Google aceitou, mas não consegui guardar a chave. Tente de novo." }, 500);
  return json({ ok: true, email: conta.client_email });
});
