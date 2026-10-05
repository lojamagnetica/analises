"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contextoEquipe } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sincronizarAgenda } from "@/lib/agenda";
import { localParaIso } from "@/lib/formato";

// Toda ação aqui começa conferindo que quem pediu é da equipe.

const txt = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);
const apelidos = (s: string) => s.split(",").map((a) => a.trim()).filter(Boolean);

/** Convida por e-mail (ou reaproveita a conta que já existe) e liga a pessoa ao portal. */
async function ligarPessoa(portalId: string, email: string, nome: string) {
  const admin = supabaseAdmin();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  let userId: string | undefined;

  const convite = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: `${site}/auth/confirm`,
  });
  if (convite.data.user) userId = convite.data.user.id;
  else {
    const { data: existente } = await admin.from("perfis").select("id").eq("email", email).maybeSingle();
    userId = existente?.id;
  }
  if (!userId) return `Não foi possível convidar ${email}: ${convite.error?.message ?? "erro desconhecido"}`;

  const { data: perfil } = await admin.from("perfis").select("papel").eq("id", userId).maybeSingle();
  if (perfil?.papel === "equipe") return `${email} é da equipe e não pode ser ligado a um portal.`;
  await admin.from("perfis").update({ portal_id: portalId, nome: nome || undefined }).eq("id", userId);
  return null;
}

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

  let aviso = "";
  if (email && form.get("convidar") === "on") aviso = (await ligarPessoa(portal.id, email, responsavel)) ?? "";
  revalidatePath("/equipe");
  redirect(`/equipe/portais/${portal.id}${aviso ? `?aviso=${encodeURIComponent(aviso)}` : "?criado=1"}`);
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
  const aviso = await ligarPessoa(portalId, email, txt(form, "nome", 200));
  revalidatePath(`/equipe/portais/${portalId}`);
  redirect(`/equipe/portais/${portalId}?${aviso ? `aviso=${encodeURIComponent(aviso)}` : "convidado=1"}`);
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
