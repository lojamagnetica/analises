// Traz para o Hub os documentos da pasta da mentorada no Drive (fichas.pasta_interna), para os agentes lerem.
// Usa a conta de serviço do Google do Hub (a mesma da Agenda), só leitura: a pasta precisa estar compartilhada com ela.
// Planilha do Google vira Excel, documento e apresentação viram PDF; vídeo e áudio ficam de fora (o agente não lê).
// Os arquivos entram em relatorios/<portal>/drive-<id>-<nome> e não se repetem numa nova importação. Só quem aprova chama.
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
const MAX = 9 * 1024 * 1024;

const b64url = (x: string | ArrayBuffer) => {
  const bytes = typeof x === "string" ? new TextEncoder().encode(x) : new Uint8Array(x);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Troca a chave da conta de serviço por um acesso de leitura do Drive (vale 1 hora). */
async function acessoDrive(conta: { client_email: string; private_key: string }) {
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = b64url(JSON.stringify({ iss: conta.client_email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: "https://oauth2.googleapis.com/token", iat: agora, exp: agora + 3600 }));
  const pem = conta.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const chave = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", chave, new TextEncoder().encode(`${cab}.${corpo}`));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${cab}.${corpo}.${b64url(assinatura)}` }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error_description ?? "O Google não liberou o acesso.");
  return j.access_token as string;
}

type ArquivoDrive = { id: string; name: string; mimeType: string; size?: string; caminho: string };

/** Lista os arquivos da pasta e das subpastas (até 3 níveis). */
async function listar(token: string, pasta: string, caminho = "", nivel = 0): Promise<ArquivoDrive[]> {
  const saida: ArquivoDrive[] = [];
  let pagina = "";
  do {
    const q = encodeURIComponent(`'${pasta}' in parents and trashed = false`);
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,size)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true${pagina ? `&pageToken=${pagina}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message ?? "Não deu para ler a pasta do Drive.");
    for (const f of j.files ?? []) {
      if (f.mimeType === "application/vnd.google-apps.folder") { if (nivel < 3) saida.push(...await listar(token, f.id, `${caminho}${f.name}/`, nivel + 1)); }
      else saida.push({ ...f, caminho });
    }
    pagina = j.nextPageToken ?? "";
  } while (pagina);
  return saida;
}

const EXPORTA: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.spreadsheet": { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" },
  "application/vnd.google-apps.document": { mime: "application/pdf", ext: "pdf" },
  "application/vnd.google-apps.presentation": { mime: "application/pdf", ext: "pdf" },
};
const LIDOS = /\.(pdf|docx|xlsx|xls|csv|txt|ods|png|jpe?g|webp|gif)$/i;
const limpar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 90);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);
  const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: aprova } = await usuario.rpc("pode_aprovar");
  if (aprova !== true) return json({ erro: "Só a Camilla importa do Drive." }, 403);
  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });

  let segredo = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!segredo) segredo = (await admin.from("chaves_internas").select("valor").eq("nome", "google_agenda").maybeSingle()).data?.valor ?? undefined;
  if (!segredo) return json({ erro: "Falta a chave do Google do Hub (a mesma da Agenda)." }, 500);
  const conta = JSON.parse(segredo);

  const { portal_id } = await req.json().catch(() => ({}));
  const { data: ficha } = await admin.from("fichas").select("pasta_interna").eq("portal_id", String(portal_id ?? "")).maybeSingle();
  const pasta = String(ficha?.pasta_interna ?? "").match(/folders\/([A-Za-z0-9_-]+)/)?.[1];
  if (!pasta) return json({ erro: "Esta loja não tem a pasta interna do Drive na ficha (Editar portal › Pasta interna)." }, 400);

  let token: string;
  try { token = await acessoDrive(conta); } catch (e) { return json({ erro: `Google: ${(e as Error).message}`, email: conta.client_email }, 502); }

  let arquivos: ArquivoDrive[];
  try { arquivos = await listar(token, pasta); }
  catch (e) {
    const msg = (e as Error).message;
    return json({ erro: /not found|File not found/i.test(msg) ? `A pasta não está compartilhada com o Hub. Compartilhe a pasta (como Leitor) com ${conta.client_email} e tente de novo.` : `Drive: ${msg}`, email: conta.client_email }, 400);
  }

  const { data: ja } = await admin.storage.from("relatorios").list(portal_id, { limit: 1000 });
  const existentes = new Set((ja ?? []).map((x) => x.name.match(/^drive-([A-Za-z0-9_-]+)-/)?.[1]).filter(Boolean));
  const importados: string[] = [], pulados: string[] = [];
  for (const f of arquivos) {
    const rotulo = `${f.caminho}${f.name}`;
    if (existentes.has(f.id)) { pulados.push(`${rotulo} (já estava no Hub)`); continue; }
    const exp = EXPORTA[f.mimeType];
    const nome = exp ? `${f.name.replace(/\.[^.]+$/, "")}.${exp.ext}` : f.name;
    if (!exp && !LIDOS.test(nome)) { pulados.push(`${rotulo} (${/video|audio/.test(f.mimeType) ? "vídeo ou áudio" : "formato que o agente não lê"})`); continue; }
    if (!exp && Number(f.size ?? 0) > MAX) { pulados.push(`${rotulo} (maior que 9 MB)`); continue; }
    const url = exp
      ? `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=${encodeURIComponent(exp.mime)}`
      : `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&supportsAllDrives=true`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { pulados.push(`${rotulo} (o Drive não liberou o download)`); continue; }
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > MAX) { pulados.push(`${rotulo} (maior que 9 MB)`); continue; }
    const destino = `${portal_id}/drive-${f.id}-${limpar(`${f.caminho.replace(/\//g, " - ")}${nome}`)}`;
    const { error } = await admin.storage.from("relatorios").upload(destino, buf, { contentType: exp?.mime ?? f.mimeType, upsert: false });
    if (error) pulados.push(`${rotulo} (${error.message})`); else importados.push(rotulo);
  }
  return json({ ok: true, importados, pulados, email: conta.client_email });
});
