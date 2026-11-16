// Cria (ou renova) o acesso de uma mentorada com e-mail e senha que não vencem, e liga a conta dela ao portal.
// A loja entra sempre pelo mesmo endereço (a página de entrar do Hub): nada de link de uso único que expira.
// Com equipe: true, cria o acesso de uma pessoa nova da equipe e já dá a ela o papel de equipe.
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
    if (equipe !== true) return json({ erro: "Só a equipe pode criar acessos." }, 403);
  }

  const { email, nome, portal_id, equipe: daEquipe, funcao } = await req.json().catch(() => ({}));
  const e = String(email ?? "").trim().toLowerCase();
  if (!e.includes("@")) return json({ erro: "E-mail inválido." }, 400);

  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  // Senha simples de ler e digitar no celular: "Loja" + 6 números. A pessoa pode trocar depois em Conta.
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000;
  const senha = `Loja${n}`;
  let userId: string | undefined;
  const novo = await admin.auth.admin.createUser({ email: e, password: senha, email_confirm: true, user_metadata: { nome: nome ?? "" } });
  if (novo.data?.user) userId = novo.data.user.id;
  else {
    // Já tem conta: acha pelo link de entrada (não manda e-mail) e troca a senha, já confirmando o e-mail.
    const r = await admin.auth.admin.generateLink({ type: "magiclink", email: e });
    userId = r.data?.user?.id;
    if (!userId) return json({ erro: r.error?.message ?? novo.error?.message ?? "Não foi possível criar o acesso." }, 400);
    // Pelo portal de uma loja, nunca troca a senha de alguém da equipe.
    if (daEquipe !== true) {
      const { data: perfil } = await admin.from("perfis").select("papel").eq("id", userId).maybeSingle();
      if (perfil?.papel === "equipe") return json({ erro: `${e} é da equipe e não pode ser ligado a um portal.` }, 400);
    }
    const { error } = await admin.auth.admin.updateUserById(userId, { password: senha, email_confirm: true });
    if (error) return json({ erro: error.message }, 400);
  }

  if (daEquipe === true) {
    const dados: Record<string, string | null> = { papel: "equipe", portal_id: null, funcao: funcao ? String(funcao).slice(0, 80) : null };
    if (nome) dados.nome = nome;
    await admin.from("perfis").update(dados).eq("id", userId);
  } else if (portal_id) {
    const dados: Record<string, string> = { portal_id };
    if (nome) dados.nome = nome;
    await admin.from("perfis").update(dados).eq("id", userId);
  }
  return json({ email: e, senha });
});
