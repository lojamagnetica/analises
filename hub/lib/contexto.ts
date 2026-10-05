import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Respostas } from "@/lib/conteudo";

export const COOKIE_PORTAL = "lm_portal";

export type Portal = {
  id: string;
  loja: string;
  responsavel: string | null;
  email: string | null;
  whatsapp: string | null;
  tipo: string;
  inicio: string | null;
  passo_atual: number;
  meet_url: string | null;
  apelidos: string[];
  ativo: boolean;
};

export type Contexto = {
  userId: string;
  nome: string;
  email: string;
  equipe: boolean;
  portal: Portal | null;
};

/** Quem está logado e qual portal está aberto. A equipe escolhe o portal pelo painel. */
export const contexto = cache(async (): Promise<Contexto> => {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, email, papel, portal_id")
    .eq("id", auth.user.id)
    .single();

  const equipe = perfil?.papel === "equipe";
  const portalId = equipe ? (await cookies()).get(COOKIE_PORTAL)?.value : perfil?.portal_id;

  let portal: Portal | null = null;
  if (portalId) {
    const { data } = await supabase.from("portais").select("*").eq("id", portalId).maybeSingle();
    portal = (data as Portal) ?? null;
  }

  return {
    userId: auth.user.id,
    nome: perfil?.nome ?? auth.user.email ?? "",
    email: perfil?.email ?? auth.user.email ?? "",
    equipe,
    portal,
  };
});

/** Para páginas do portal: exige um portal aberto. */
export async function contextoPortal() {
  const ctx = await contexto();
  if (!ctx.portal) redirect(ctx.equipe ? "/equipe" : "/sem-portal");
  return ctx as Contexto & { portal: Portal };
}

/** Para páginas e ações da equipe. */
export async function contextoEquipe() {
  const ctx = await contexto();
  if (!ctx.equipe) redirect("/inicio");
  return ctx;
}

/** Respostas da Personalização do portal, por etapa. */
export const personalizacao = cache(async (portalId: string) => {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("personalizacao")
    .select("etapa, respostas, concluida")
    .eq("portal_id", portalId);
  const porEtapa = new Map<number, { respostas: Respostas; concluida: boolean }>();
  (data ?? []).forEach((l) => porEtapa.set(l.etapa, { respostas: l.respostas as Respostas, concluida: l.concluida }));
  return porEtapa;
});

export function primeiroNome(nome: string) {
  return (nome || "").trim().split(/\s+/)[0] || "";
}
