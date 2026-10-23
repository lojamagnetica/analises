"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ETAPAS, type Respostas } from "@/lib/conteudo";

export const CHAVE_PORTAL = "lm_portal";
export const CHAVE_RESULTADO = "lm_resultado_portal";

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

export type Hub = {
  userId: string;
  nome: string;
  email: string;
  equipe: boolean;
  portal: Portal | null;
  pers: Map<number, { respostas: Respostas; concluida: boolean }>;
  persFaltam: number;
  recarregar: () => Promise<void>;
  abrirPortal: (id: string | null, destino?: string) => void;
};

const Contexto = createContext<Hub | null>(null);

function lerPortalEscolhido() {
  try { return localStorage.getItem(CHAVE_PORTAL); } catch { return null; }
}

/** Carrega quem está logado e o portal aberto. Sem sessão, manda para o login. */
export function HubProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hub, setHub] = useState<Hub | null>(null);

  const carregar = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data: sessao } = await sb.auth.getSession();
    const user = sessao.session?.user;
    if (!user) {
      router.replace("/login");
      return;
    }
    const { data: perfil } = await sb.from("perfis").select("nome, email, papel, portal_id").eq("id", user.id).maybeSingle();
    const equipe = perfil?.papel === "equipe";
    const portalId = equipe ? lerPortalEscolhido() : perfil?.portal_id;

    let portal: Portal | null = null;
    const pers = new Map<number, { respostas: Respostas; concluida: boolean }>();
    if (portalId) {
      const [{ data: p }, { data: linhas }] = await Promise.all([
        sb.from("portais").select("*").eq("id", portalId).maybeSingle(),
        sb.from("personalizacao").select("etapa, respostas, concluida").eq("portal_id", portalId),
      ]);
      portal = (p as Portal) ?? null;
      (linhas ?? []).forEach((l) => pers.set(l.etapa, { respostas: l.respostas as Respostas, concluida: l.concluida }));
    }
    if (!equipe) sb.rpc("registrar_acesso").then(() => undefined);

    setHub({
      userId: user.id,
      nome: perfil?.nome ?? user.email ?? "",
      email: perfil?.email ?? user.email ?? "",
      equipe,
      portal,
      pers,
      persFaltam: portal ? ETAPAS.filter((e) => !pers.get(e.numero)?.concluida).length : 0,
      recarregar: carregar,
      abrirPortal: (id, destino) => {
        try { if (id) localStorage.setItem(CHAVE_PORTAL, id); else localStorage.removeItem(CHAVE_PORTAL); } catch { /* sem armazenamento */ }
        carregar().then(() => router.push(destino ?? (id ? "/inicio" : "/empresa")));
      },
    });
  }, [router]);

  useEffect(() => {
    carregar();
    const { data } = supabaseBrowser().auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") router.replace("/login");
    });
    return () => data.subscription.unsubscribe();
  }, [carregar, router]);

  if (!hub) return <div className="carregando">Carregando…</div>;
  return <Contexto.Provider value={hub}>{children}</Contexto.Provider>;
}

export function useHub() {
  const hub = useContext(Contexto);
  if (!hub) throw new Error("useHub fora do HubProvider");
  return hub;
}

/** Para páginas do portal. A casca do Hub (layout) só mostra essas páginas quando há portal aberto. */
export function usePortal() {
  return useHub() as Hub & { portal: Portal };
}

/** Para páginas da equipe. A casca do Hub só mostra essas páginas para a equipe. */
export function useEquipe() {
  return useHub();
}

/** Para onde mandar quem abriu uma página que não pode ver (null = pode ver). */
export function desvio(caminho: string, hub: Pick<Hub, "equipe" | "portal">) {
  const livre = caminho === "/" || caminho.startsWith("/conta") || caminho.startsWith("/sem-portal");
  if (caminho.startsWith("/equipe") || caminho.startsWith("/empresa")) return hub.equipe ? null : "/inicio";
  if (livre || hub.portal) return null;
  return hub.equipe ? "/empresa" : "/sem-portal";
}

/** Carrega dados do Supabase e permite recarregar depois de uma alteração. */
export function useDados<T>(buscar: () => Promise<T>, deps: unknown[]) {
  const [dados, setDados] = useState<T | null>(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    let vivo = true;
    buscar().then((d) => { if (vivo) setDados(d); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versao]);
  return { dados, recarregar: () => setVersao((v) => v + 1) };
}

export function Carregando() {
  return <div className="carregando">Carregando…</div>;
}

export function primeiroNome(nome: string) {
  return (nome || "").trim().split(/\s+/)[0] || "";
}
