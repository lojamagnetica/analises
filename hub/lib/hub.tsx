"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ETAPAS, type Respostas } from "@/lib/conteudo";
import { buscarEntrada, dadosCompletos, marcarDadosEnviados, type Entrada } from "@/lib/entrada";

export const CHAVE_PORTAL = "lm_portal";
export const CHAVE_RESULTADO = "lm_resultado_portal";
export const CHAVE_COMO_LOJA = "lm_como_loja";
export const CHAVE_APRESENTACAO = "lm_apresentacao";

export type Portal = {
  id: string;
  loja: string;
  responsavel: string | null;
  email: string | null;
  whatsapp: string | null;
  aniversario?: string | null;
  tipo: string;
  inicio: string | null;
  passo_atual: number;
  /** Grupos do menu que esta loja não vê (consultorias personalizadas). */
  menu_oculto?: string[] | null;
  menu_trancado?: string[] | null;
  canais?: string[] | null;
  meet_url: string | null;
  apelidos: string[];
  ativo: boolean;
  /** Lojas dentro do mesmo portal (ex.: feminino e masculino). Vazio = uma loja só. */
  lojas: string[];
};

export type Hub = {
  userId: string;
  nome: string;
  email: string;
  foto: string | null;
  /** Tem o "Meu estúdio" (espaço particular de criação de produtos e roteiros). */
  estudio: boolean;
  /** Acesso só do caixa: vê só o Fechamento de caixa da loja. */
  soCaixa: boolean;
  /** Pode aprovar e liberar o que vai para a loja (a Camilla). */
  aprova: boolean;
  equipe: boolean;
  portal: Portal | null;
  pers: Map<number, { respostas: Respostas; concluida: boolean }>;
  persFaltam: number;
  /** Onde a loja está na entrada (vídeo, dados da loja, equipe). null sem portal aberto. */
  entrada: Entrada | null;
  recarregar: () => Promise<void>;
  abrirPortal: (id: string | null, destino?: string, comoLoja?: boolean) => void;
  /** Equipe vendo o portal exatamente como a loja vê: sem menus nem botões da equipe. */
  comoLoja: boolean;
  verComoLoja: (sim: boolean) => void;
  /** Vendo como a loja e compartilhando a tela: some o nome da equipe e a faixa escura. */
  apresentacao: boolean;
  modoApresentacao: (sim: boolean) => void;
  /** Sai do "como a loja" e da apresentação sem trocar de página (ex.: abriu um link da empresa). */
  sairComoLoja: () => void;
};

const Contexto = createContext<Hub | null>(null);

function lerComoLoja() {
  try { return localStorage.getItem(CHAVE_COMO_LOJA) === "1"; } catch { return false; }
}
function gravarComoLoja(sim: boolean) {
  try { if (sim) localStorage.setItem(CHAVE_COMO_LOJA, "1"); else localStorage.removeItem(CHAVE_COMO_LOJA); } catch { /* sem armazenamento */ }
}

// Modo apresentação vale só enquanto a janela está aberta: ao reabrir o Hub, a faixa da equipe volta a aparecer.
function lerApresentacao() {
  try { return sessionStorage.getItem(CHAVE_APRESENTACAO) === "1"; } catch { return false; }
}
function gravarApresentacao(sim: boolean) {
  try { localStorage.removeItem(CHAVE_APRESENTACAO); if (sim) sessionStorage.setItem(CHAVE_APRESENTACAO, "1"); else sessionStorage.removeItem(CHAVE_APRESENTACAO); } catch { /* sem armazenamento */ }
}

function lerPortalEscolhido() {
  try {
    // Link direto da equipe para um portal: ?portal=<id> abre aquele portal e fica escolhido.
    const daUrl = new URLSearchParams(window.location.search).get("portal");
    if (daUrl && /^[0-9a-f-]{36}$/.test(daUrl)) localStorage.setItem(CHAVE_PORTAL, daUrl);
    return localStorage.getItem(CHAVE_PORTAL);
  } catch { return null; }
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
    const { data: perfil } = await sb.from("perfis").select("nome, email, papel, portal_id, foto, estudio, so_caixa, aprova").eq("id", user.id).maybeSingle();
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
    const persFaltam = portal ? ETAPAS.filter((e) => !pers.get(e.numero)?.concluida).length : 0;
    const comoLojaAgora = equipe && !!portal && lerComoLoja();
    // Quem comprou só o curso não passa pela entrada da mentoria.
    const entrada = portal && portal.tipo !== "Curso" ? await buscarEntrada(portal.id, persFaltam === 0, comoLojaAgora) : null;
    // A loja terminou de mandar tudo: começa o prazo do Diagnóstico.
    if (entrada && !equipe && !entrada.dadosEm && dadosCompletos(entrada)) {
      await marcarDadosEnviados();
      entrada.dadosEm = new Date().toISOString();
    }

    setHub({
      userId: user.id,
      nome: perfil?.nome ?? user.email ?? "",
      email: perfil?.email ?? user.email ?? "",
      foto: perfil?.foto ?? null,
      estudio: !!perfil?.estudio,
      soCaixa: !equipe && !!perfil?.so_caixa,
      aprova: equipe && !!perfil?.aprova,
      equipe,
      portal,
      pers,
      persFaltam,
      entrada,
      recarregar: carregar,
      abrirPortal: (id, destino, comoLoja = false) => {
        try { if (id) localStorage.setItem(CHAVE_PORTAL, id); else localStorage.removeItem(CHAVE_PORTAL); } catch { /* sem armazenamento */ }
        gravarComoLoja(!!id && comoLoja);
        carregar().then(() => router.push(destino ?? (id ? "/inicio" : "/empresa")));
      },
      comoLoja: comoLojaAgora,
      apresentacao: comoLojaAgora && lerApresentacao(),
      sairComoLoja: () => {
        gravarComoLoja(false);
        gravarApresentacao(false);
        setHub((h) => (h ? { ...h, comoLoja: false, apresentacao: false } : h));
      },
      modoApresentacao: (sim) => {
        gravarApresentacao(sim);
        setHub((h) => (h ? { ...h, apresentacao: sim } : h));
      },
      verComoLoja: (sim) => {
        gravarComoLoja(sim);
        if (!sim) gravarApresentacao(false);
        // Recarrega para a entrada (vídeo, cadeados) refletir exatamente o que a loja vê.
        carregar().then(() => router.push(sim ? "/inicio" : `/equipe/portal?id=${portal?.id ?? ""}`));
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
  const hub = useHub() as Hub & { portal: Portal };
  return hub.comoLoja ? { ...hub, equipe: false } : hub;
}

/** Para páginas da equipe. A casca do Hub só mostra essas páginas para a equipe. */
export function useEquipe() {
  return useHub();
}

/** Para onde mandar quem abriu uma página que não pode ver (null = pode ver). */
export function desvio(caminho: string, hub: Pick<Hub, "equipe" | "portal"> & { soCaixa?: boolean; aprova?: boolean }) {
  const livre = caminho === "/" || caminho.startsWith("/conta") || caminho.startsWith("/sem-portal");
  // Acesso só do caixa: qualquer outra página leva ao Fechamento de caixa.
  if (hub.soCaixa && !hub.equipe) return caminho.startsWith("/gestao/caixa") || caminho.startsWith("/conta") ? null : "/gestao/caixa";
  // Área da mentora: só a Camilla.
  if (caminho.startsWith("/empresa/estudio") || caminho.startsWith("/empresa/conteudo") || caminho.startsWith("/empresa/financeiro")) return hub.equipe && hub.aprova ? null : hub.equipe ? "/empresa" : "/inicio";
  if (caminho.startsWith("/equipe") || caminho.startsWith("/empresa")) return hub.equipe ? null : "/inicio";
  // Portal só do curso: tudo que não é o curso leva para a área de membros.
  if (hub.portal?.tipo === "Curso" && !hub.equipe && !livre && !caminho.startsWith("/cursos")) return "/cursos";
  if (livre || hub.portal) return null;
  // Sem portal aberto, a equipe vê o curso como prévia (sem progresso).
  if (hub.equipe && (caminho === "/cursos" || caminho.startsWith("/cursos/fundamento"))) return null;
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
