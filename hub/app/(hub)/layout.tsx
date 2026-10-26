"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bloqueado } from "@/components/Bloqueado";
import { Menu } from "@/components/Menu";
import { Ferramentas } from "@/components/Ferramentas";
import { Carregando, HubProvider, desvio, useHub } from "@/lib/hub";
import { ETAPAS } from "@/lib/conteudo";
import { liberado, requisito } from "@/lib/entrada";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Páginas que abrem mesmo antes do vídeo de boas-vindas. */
const ANTES_DO_VIDEO = ["/comece", "/guia", "/conta", "/sem-portal"];

function Casca({ children }: { children: React.ReactNode }) {
  const hub = useHub();
  const router = useRouter();
  const caminho = usePathname().replace(/(.)\/$/, "$1");
  // Equipe que abre uma página da empresa sai sozinha do "Ver como a loja" e do modo apresentação.
  const areaEquipe = caminho.startsWith("/empresa") || caminho.startsWith("/equipe");
  const equipe = hub.equipe && (!hub.comoLoja || areaEquipe);
  const destino = desvio(caminho, { ...hub, equipe });
  // A loja (ou a equipe vendo como a loja) passa pela entrada; a equipe vê tudo.
  const ent = !equipe && hub.portal && !hub.soCaixa ? hub.entrada : null;
  const req = requisito(caminho);
  const semVideo = !!ent && !ent.video && !ent.livre && !ANTES_DO_VIDEO.some((b) => caminho.startsWith(b));
  const travado = !!ent && !!req && !liberado(req, ent);
  const completa = !ent || ent.livre || (ent.video && ent.loja && ent.equipe);

  useEffect(() => { if (destino) router.replace(destino); }, [destino, router]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (hub.equipe && hub.comoLoja && areaEquipe) hub.sairComoLoja(); }, [areaEquipe, hub.comoLoja]);
  // Esc sai do modo apresentação.
  useEffect(() => {
    if (!hub.apresentacao) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") hub.modoApresentacao(false); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [hub.apresentacao]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!destino && semVideo) router.replace("/comece"); }, [destino, semVideo, router]);
  // Enquanto a entrada não termina, confere de novo a cada página (ex.: acabou de cadastrar a equipe).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!completa) hub.recarregar(); }, [caminho]);

  const trava = (href: string) => {
    if (!ent) return false;
    const r = requisito(href.split("?")[0]);
    return !!r && !liberado(r, ent);
  };

  // Acesso só do caixa: sem menu, só o Fechamento de caixa da loja.
  if (hub.soCaixa) {
    return (
      <div className="main" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="linha entre mb" style={{ paddingTop: 12 }}>
          <span><b>magnética.hub</b> <span className="mudo">· {hub.portal?.loja ?? ""} · {hub.nome}</span></span>
          <button type="button" className="btn s peq" onClick={() => supabaseBrowser().auth.signOut().then(() => router.replace("/login"))}>Sair</button>
        </div>
        {destino ? <Carregando /> : children}
      </div>
    );
  }

  return (
    <div className="app">
      <Menu equipe={equipe} temPortal={!!hub.portal} consultoria={hub.portal?.tipo === "Consultoria"} estudio={hub.estudio} soCurso={hub.portal?.tipo === "Curso"} persFaltam={hub.persFaltam} trava={trava}
        nome={hub.apresentacao ? (hub.portal?.responsavel || hub.portal?.loja || "") : hub.nome} email={hub.apresentacao ? "" : hub.email} foto={hub.apresentacao ? null : hub.foto} />
      <div className="main">
        {hub.apresentacao ? (
          <button type="button" className="sair-apresentacao" onClick={() => hub.modoApresentacao(false)} title="Sair do modo apresentação (Esc)">✕</button>
        ) : hub.comoLoja && hub.portal ? (
          <div className="faixa equipe">
            👁 Você está vendo exatamente o que {hub.portal.loja} vê. O que você marcar aqui fica na conta da loja.
            <button type="button" onClick={() => hub.modoApresentacao(true)}>🎥 Modo apresentação</button>
            <button type="button" onClick={() => hub.verComoLoja(false)}>Voltar para a visão da equipe</button>
          </div>
        ) : hub.equipe && hub.portal ? (
          <div className="faixa equipe">
            Você está no portal de {hub.portal.loja} como equipe
            <button type="button" onClick={() => hub.verComoLoja(true)}>👁 Ver 100% como a loja</button>
            <Link href="/empresa/carteira">Trocar portal</Link>
            <button type="button" onClick={() => hub.abrirPortal(null)}>Voltar para a empresa</button>
          </div>
        ) : ent && !completa && ent.video ? (
          <div className="faixa">
            {!ent.loja
              ? <>Próximo passo: Dados da loja · falta{hub.persFaltam > 1 ? "m" : ""} {hub.persFaltam} de {ETAPAS.length}<Link href="/personalizacao">Continuar →</Link></>
              : <>Próximo passo: cadastrar a sua equipe<Link href="/personalizacao/etapa?n=5">Cadastrar →</Link></>}
          </div>
        ) : null}
        <Ferramentas temPortal={!!hub.portal} />
        <main className="conteudo">
          {destino || semVideo ? <Carregando /> : travado && ent && req ? <Bloqueado req={req} entrada={ent} faltamEtapas={hub.persFaltam} /> : children}
        </main>
      </div>
    </div>
  );
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubProvider>
      <Casca>{children}</Casca>
    </HubProvider>
  );
}
