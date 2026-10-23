// Cria a primeira conta da equipe (a da Camilla), com e-mail e senha escolhidos por ela no Hub.
// Só funciona para o e-mail autorizado e enquanto ainda não existe ninguém da equipe.
import { createClient } from "npm:@supabase/supabase-js@2";

const AUTORIZADO = "2f37f7633c160aa0a7d6705423df5af71b101cd0ab4c0bc946505b9bc0b759d3"; // sha-256 do e-mail autorizado
const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(texto: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);
  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });

  const { count } = await admin.from("perfis").select("id", { count: "exact", head: true }).eq("papel", "equipe");
  if ((count ?? 0) > 0) return json({ erro: "O Hub já está configurado. Entre pela tela de login." }, 410);

  const { email, senha, nome } = await req.json().catch(() => ({}));
  const e = String(email ?? "").trim().toLowerCase();
  if (String(senha ?? "").length < 8) return json({ erro: "Use uma senha com pelo menos 8 caracteres." }, 400);
  if ((await sha256(e)) !== AUTORIZADO) return json({ erro: "Este e-mail não está autorizado a configurar o Hub." }, 403);

  const { data, error } = await admin.auth.admin.createUser({
    email: e, password: senha, email_confirm: true, user_metadata: { nome: nome || "Camilla Ribeiro" },
  });
  if (error || !data.user) return json({ erro: error?.message ?? "Não foi possível criar a conta." }, 400);
  await admin.from("perfis").update({ papel: "equipe", nome: nome || "Camilla Ribeiro" }).eq("id", data.user.id);
  return json({ ok: true });
});
