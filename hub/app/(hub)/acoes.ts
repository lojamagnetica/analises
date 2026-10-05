"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COOKIE_PORTAL, contexto, contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BLOCOS_PLANEJE, ETAPAS, type Respostas } from "@/lib/conteudo";

// Todas as escritas usam a sessão de quem está logado: as regras do banco (RLS)
// garantem que cada mentorado só mexe no próprio portal.

export async function abrirPortal(portalId: string) {
  const ctx = await contexto();
  if (!ctx.equipe) return;
  (await cookies()).set(COOKIE_PORTAL, portalId, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  redirect("/inicio");
}

export async function salvarEtapa(numero: number, form: FormData) {
  const { portal } = await contextoPortal();
  const etapa = ETAPAS.find((e) => e.numero === numero);
  if (!etapa) return;
  const respostas: Respostas = {};
  for (const c of etapa.campos) {
    respostas[c.id] = c.tipo === "multi"
      ? form.getAll(c.id).map(String)
      : String(form.get(c.id) ?? "").trim().slice(0, 4000);
  }
  const supabase = await supabaseServer();
  await supabase.from("personalizacao").upsert({
    portal_id: portal.id, etapa: numero, respostas, concluida: true, updated_at: new Date().toISOString(),
  });
  revalidatePath("/", "layout");
  redirect("/personalizacao?salvo=" + numero);
}

export async function marcarPlano(id: string, feito: boolean) {
  await contextoPortal();
  const supabase = await supabaseServer();
  await supabase.from("plano_itens").update({ feito, feito_em: feito ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/plano");
  revalidatePath("/inicio");
}

export async function salvarPlaneje(mes: number, bloco: string, texto: string) {
  const { portal } = await contextoPortal();
  if (mes < 0 || mes > 11 || !BLOCOS_PLANEJE.includes(bloco)) return;
  const supabase = await supabaseServer();
  await supabase.from("planeje").upsert({
    portal_id: portal.id, mes, bloco, texto: texto.slice(0, 8000), updated_at: new Date().toISOString(),
  });
  revalidatePath("/planeje");
}

export async function kanbanCriar(titulo: string) {
  const { portal } = await contextoPortal();
  const t = titulo.trim().slice(0, 300);
  if (!t) return;
  const supabase = await supabaseServer();
  await supabase.from("kanban_cards").insert({ portal_id: portal.id, titulo: t, coluna: 0 });
  revalidatePath("/kanban");
}

export async function kanbanMover(id: string, coluna: number) {
  await contextoPortal();
  const supabase = await supabaseServer();
  await supabase.from("kanban_cards").update({ coluna: Math.max(0, Math.min(4, coluna)) }).eq("id", id);
  revalidatePath("/kanban");
}

export async function kanbanApagar(id: string) {
  await contextoPortal();
  const supabase = await supabaseServer();
  await supabase.from("kanban_cards").delete().eq("id", id);
  revalidatePath("/kanban");
}

export async function notaCriar(form: FormData) {
  const { portal, userId } = await contextoPortal();
  const titulo = String(form.get("titulo") ?? "").trim().slice(0, 200) || "Sem título";
  const conteudo = String(form.get("conteudo") ?? "").trim().slice(0, 20000);
  if (!conteudo && titulo === "Sem título") return;
  const supabase = await supabaseServer();
  await supabase.from("notas").insert({ portal_id: portal.id, autor: userId, titulo, conteudo });
  revalidatePath("/notas");
}

export async function notaApagar(id: string) {
  await contextoPortal();
  const supabase = await supabaseServer();
  await supabase.from("notas").delete().eq("id", id);
  revalidatePath("/notas");
}

export async function duvidaEnviar(form: FormData) {
  const { portal, userId } = await contextoPortal();
  const pergunta = String(form.get("pergunta") ?? "").trim().slice(0, 4000);
  if (!pergunta) return;
  const supabase = await supabaseServer();
  await supabase.from("duvidas").insert({ portal_id: portal.id, autor: userId, pergunta });
  revalidatePath("/duvidas");
  redirect("/duvidas?enviada=1");
}

export async function limparChat() {
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  await supabase.from("chat_mensagens").delete().eq("portal_id", portal.id);
  revalidatePath("/assistente");
}

/** O próprio usuário muda o nome de exibição (a tabela perfis só a equipe altera). */
export async function salvarNome(form: FormData) {
  const ctx = await contexto();
  const nome = String(form.get("nome") ?? "").trim().slice(0, 120);
  if (!nome) return;
  await supabaseAdmin().from("perfis").update({ nome }).eq("id", ctx.userId);
  revalidatePath("/", "layout");
}
