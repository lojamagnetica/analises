"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { contextoEquipe } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sincronizarAgenda } from "@/lib/agenda";
import { localParaIso } from "@/lib/formato";

// Toda ação aqui começa conferindo que quem pediu é da equipe.

const txt = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);
const apelidos = (s: string) => s.split(",").map((a) => a.trim()).filter(Boolean);

/** Endereço do Hub como a equipe está acessando agora (serve para montar os links de acesso). */
async function origem() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : "");
}

/**
 * Gera um link de acesso de uso único (sem depender de e-mail): convite para quem ainda não tem
 * conta, link de entrada para quem já tem. A equipe copia e manda pelo WhatsApp.
 */
async function gerarLink(email: string, nome: string) {
  const admin = supabaseAdmin();
  const convite = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { nome } } });
  if (convite.data?.properties?.hashed_token) {
    return { userId: convite.data.user.id, hash: convite.data.properties.hashed_token, tipo: "invite" as const };
  }
  const entrada = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (entrada.data?.properties?.hashed_token) {
    return { userId: entrada.data.user.id, hash: entrada.data.properties.hashed_token, tipo: "email" as const };
  }
  throw new Error(entrada.error?.message ?? convite.error?.message ?? "erro desconhecido");
}

async function montarLink(email: string, nome: string) {
  const { userId, hash, tipo } = await gerarLink(email, nome);
  const link = `${await origem()}/auth/confirm?token_hash=${hash}&type=${tipo}${tipo === "email" ? "&next=/conta" : ""}`;
  return { userId, link };
}

/** Liga a pessoa ao portal e devolve o link de acesso dela. */
async function ligarPessoa(portalId: string, email: string, nome: string): Promise<{ link?: string; aviso?: string }> {
  const admin = supabaseAdmin();
  let r: { userId: string; link: string };
  try {
    r = await montarLink(email, nome);
  } catch (e) {
    return { aviso: `Não foi possível criar o acesso de ${email}: ${(e as Error).message}` };
  }
  const { data: perfil } = await admin.from("perfis").select("papel").eq("id", r.userId).maybeSingle();
  if (perfil?.papel === "equipe") return { aviso: `${email} é da equipe e não pode ser ligado a um portal.` };
  await admin.from("perfis").update({ portal_id: portalId, nome: nome || undefined }).eq("id", r.userId);
  return { link: r.link };
}

const comLink = (r: { link?: string; aviso?: string }, ok: string) =>
  r.aviso ? `aviso=${encodeURIComponent(r.aviso)}` : r.link ? `link=${encodeURIComponent(r.link)}` : ok;

export async function criarPortal(form: FormData) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  const loja = txt(form, "loja", 200);
  if (!loja) return;
  const email = txt(form, "email", 200).toLowerCase();
  const responsavel = txt(form, "responsavel", 200);

  const { data: portal, error } = await supabase
    .from("portais")
    .insert({
      loja,
      responsavel: responsavel || null,
      email: email || null,
      whatsapp: txt(form, "whatsapp", 60) || null,
      tipo: txt(form, "tipo", 40) || "Mentoria",
      inicio: txt(form, "inicio", 10) || null,
      meet_url: txt(form, "meet_url", 500) || null,
      apelidos: apelidos(txt(form, "apelidos", 500)),
    })
    .select("id")
    .single();
  if (error || !portal) throw new Error(error?.message ?? "Erro ao criar o portal");

  // Plano de Ação começa a partir do modelo da Biblioteca; a equipe ajusta depois.
  const { data: modelo } = await supabase.from("plano_modelo").select("mes, ordem, texto").order("mes").order("ordem");
  if (modelo?.length) {
    await supabase.from("plano_itens").insert(modelo.map((m) => ({ ...m, portal_id: portal.id })));
  }

  const acesso = email ? await ligarPessoa(portal.id, email, responsavel) : {};
  revalidatePath("/equipe");
  redirect(`/equipe/portais/${portal.id}?${comLink(acesso, "criado=1")}`);
}

export async function atualizarPortal(id: string, form: FormData) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  await supabase.from("portais").update({
    loja: txt(form, "loja", 200),
    responsavel: txt(form, "responsavel", 200) || null,
    email: txt(form, "email", 200) || null,
    whatsapp: txt(form, "whatsapp", 60) || null,
    tipo: txt(form, "tipo", 40) || "Mentoria",
    inicio: txt(form, "inicio", 10) || null,
    passo_atual: Math.min(7, Math.max(1, Number(form.get("passo_atual")) || 1)),
    meet_url: txt(form, "meet_url", 500) || null,
    apelidos: apelidos(txt(form, "apelidos", 500)),
    ativo: form.get("ativo") === "on",
  }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function convidarPessoa(portalId: string, form: FormData) {
  await contextoEquipe();
  const email = txt(form, "email", 200).toLowerCase();
  if (!email) return;
  const acesso = await ligarPessoa(portalId, email, txt(form, "nome", 200));
  revalidatePath(`/equipe/portais/${portalId}`);
  redirect(`/equipe/portais/${portalId}?${comLink(acesso, "convidado=1")}`);
}

/** Novo link de acesso para quem já está no portal (esqueceu a senha, link venceu etc.). */
export async function novoLink(portalId: string, email: string, nome: string) {
  await contextoEquipe();
  let destino: string;
  try {
    destino = comLink({ link: (await montarLink(email, nome)).link }, "");
  } catch (e) {
    destino = comLink({ aviso: (e as Error).message }, "");
  }
  redirect(`/equipe/portais/${portalId}?${destino}`);
}

export async function desligarPessoa(portalId: string, userId: string) {
  await contextoEquipe();
  await supabaseAdmin().from("perfis").update({ portal_id: null }).eq("id", userId).eq("portal_id", portalId);
  revalidatePath(`/equipe/portais/${portalId}`);
}

export async function planoAdicionar(portalId: string, form: FormData) {
  await contextoEquipe();
  const texto = txt(form, "texto", 500);
  if (!texto) return;
  const supabase = await supabaseServer();
  await supabase.from("plano_itens").insert({ portal_id: portalId, mes: Number(form.get("mes")) || 1, ordem: 99, texto });
  revalidatePath(`/equipe/portais/${portalId}`);
}

export async function planoApagar(portalId: string, id: string) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  await supabase.from("plano_itens").delete().eq("id", id);
  revalidatePath(`/equipe/portais/${portalId}`);
}

export async function reuniaoSalvar(portalId: string, id: string | null, form: FormData) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  const quando = txt(form, "data", 20);
  const dados = {
    titulo: txt(form, "titulo", 300) || "Reunião individual",
    selecionar: txt(form, "selecionar", 20) || "Pendente",
    status: txt(form, "status", 20) || "Não iniciada",
    gravacao_url: txt(form, "gravacao_url", 1000) || null,
    ata: txt(form, "ata", 20000) || null,
    ...(quando ? { data: localParaIso(quando) } : {}),
  };
  if (id) await supabase.from("reunioes").update(dados).eq("id", id);
  else if (quando) await supabase.from("reunioes").insert({ ...dados, portal_id: portalId });
  revalidatePath(`/equipe/portais/${portalId}`);
  revalidatePath("/equipe/reunioes");
}

export async function reuniaoApagar(portalId: string, id: string) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  await supabase.from("reunioes").delete().eq("id", id);
  revalidatePath(`/equipe/portais/${portalId}`);
}

export async function responderDuvida(id: string, form: FormData) {
  const ctx = await contextoEquipe();
  const resposta = txt(form, "resposta", 8000);
  if (!resposta) return;
  const supabase = await supabaseServer();
  await supabase.from("duvidas").update({ resposta, respondida_por: ctx.userId, respondida_em: new Date().toISOString() }).eq("id", id);
  revalidatePath("/equipe/duvidas");
}

export async function sincronizarAgora() {
  await contextoEquipe();
  let msg: string;
  try {
    const r = await sincronizarAgenda();
    msg = `${r.criadas} reuniões novas · ${r.ignoradas} ignoradas` +
      (r.sem_loja.length ? ` · sem loja identificada: ${r.sem_loja.slice(0, 8).join("; ")}` : "") +
      (r.erros.length ? ` · erros: ${r.erros.join("; ")}` : "");
  } catch (e) {
    msg = `Erro: ${(e as Error).message}`;
  }
  revalidatePath("/equipe/reunioes");
  redirect(`/equipe/reunioes?msg=${encodeURIComponent(msg)}`);
}

// ───── Biblioteca ─────

export async function scriptSalvar(id: string | null, form: FormData) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  const dados = {
    categoria: txt(form, "categoria", 60),
    titulo: txt(form, "titulo", 200),
    quando: txt(form, "quando", 500),
    texto: txt(form, "texto", 8000),
    ordem: Number(form.get("ordem")) || 0,
  };
  if (!dados.categoria || !dados.titulo || !dados.texto) return;
  if (id) await supabase.from("scripts").update(dados).eq("id", id);
  else await supabase.from("scripts").insert(dados);
  revalidatePath("/equipe/biblioteca");
}

export async function scriptApagar(id: string) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  await supabase.from("scripts").delete().eq("id", id);
  revalidatePath("/equipe/biblioteca");
}

export async function aulaSalvar(id: string | null, form: FormData) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  const dados = {
    modulo: txt(form, "modulo", 200),
    titulo: txt(form, "titulo", 200),
    descricao: txt(form, "descricao", 2000),
    video_url: txt(form, "video_url", 1000) || null,
    ordem: Number(form.get("ordem")) || 0,
  };
  if (!dados.modulo || !dados.titulo) return;
  if (id) await supabase.from("aulas").update(dados).eq("id", id);
  else await supabase.from("aulas").insert(dados);
  revalidatePath("/equipe/biblioteca");
}

export async function aulaApagar(id: string) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  await supabase.from("aulas").delete().eq("id", id);
  revalidatePath("/equipe/biblioteca");
}

export async function passoSalvar(numero: number, form: FormData) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  await supabase.from("jornada_passos").update({
    titulo: txt(form, "titulo", 200),
    descricao: txt(form, "descricao", 500),
    conteudo: txt(form, "conteudo", 30000),
  }).eq("numero", numero);
  revalidatePath("/equipe/biblioteca");
}

export async function modeloAdicionar(form: FormData) {
  await contextoEquipe();
  const texto = txt(form, "texto", 500);
  if (!texto) return;
  const supabase = await supabaseServer();
  await supabase.from("plano_modelo").insert({ mes: Number(form.get("mes")) || 1, ordem: 99, texto });
  revalidatePath("/equipe/biblioteca");
}

export async function modeloApagar(id: string) {
  await contextoEquipe();
  const supabase = await supabaseServer();
  await supabase.from("plano_modelo").delete().eq("id", id);
  revalidatePath("/equipe/biblioteca");
}
