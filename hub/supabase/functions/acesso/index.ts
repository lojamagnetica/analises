// Gera o link de acesso de uso único de uma mentorada e liga a conta dela ao portal.
// Com equipe: true, gera o link de uma pessoa nova da equipe e já dá a ela o papel de equipe.
// Roda dentro do Supabase (usa a chave de serviço que o próprio Supabase fornece) e só atende a equipe.
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// O Hub chama esta função direto do navegador (site estático), então ela responde ao CORS.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-interno",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  // Chamada interna (do próprio banco, com a chave guardada em chaves_internas) ou da equipe logada.
  const interno = req.headers.get("x-hub-interno");
  let liberado = false;
  if (interno) {
    const adm = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await adm.from("chaves_internas").select("valor").eq("nome", "acesso").maybeSingle();
    liberado = !!data?.valor && data.valor.length >= 32 && data.valor === interno;
  }
  if (!liberado) {
    const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: equipe } = await usuario.rpc("is_equipe");
    if (equipe !== true) return json({ erro: "Só a equipe pode gerar links de acesso." }, 403);
  }

  const { email, nome, portal_id, equipe: daEquipe, funcao } = await req.json().catch(() => ({}));
  const e = String(email ?? "").trim().toLowerCase();
  if (!e.includes("@")) return json({ erro: "E-mail inválido." }, 400);

  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  // Conta nova recebe convite (cria a senha); quem já tem conta recebe link de entrada.
  let tipo = "invite";
  let r = await admin.auth.admin.generateLink({ type: "invite", email: e, options: { data: { nome: nome ?? "" } } });
  if (!r.data?.properties?.hashed_token) {
    tipo = "email";
    r = await admin.auth.admin.generateLink({ type: "magiclink", email: e });
  }
  const hash = r.data?.properties?.hashed_token;
  const userId = r.data?.user?.id;
  if (!hash || !userId) return json({ erro: r.error?.message ?? "Não foi possível gerar o link." }, 400);

  if (daEquipe === true) {
    const dados: Record<string, string | null> = { papel: "equipe", portal_id: null, funcao: funcao ? String(funcao).slice(0, 80) : null };
    if (nome) dados.nome = nome;
    await admin.from("perfis").update(dados).eq("id", userId);
  } else if (portal_id) {
    const { data: perfil } = await admin.from("perfis").select("papel").eq("id", userId).maybeSingle();
    if (perfil?.papel === "equipe") return json({ erro: `${e} é da equipe e não pode ser ligado a um portal.` }, 400);
    const dados: Record<string, string> = { portal_id };
    if (nome) dados.nome = nome;
    await admin.from("perfis").update(dados).eq("id", userId);
  }
  return json({ hash, tipo });
});
