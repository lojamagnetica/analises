"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Menu } from "@/components/Menu";
import { Ferramentas } from "@/components/Ferramentas";
import { Carregando, HubProvider, desvio, useHub } from "@/lib/hub";
import { ETAPAS } from "@/lib/conteudo";

function Casca({ children }: { children: React.ReactNode }) {
  const hub = useHub();
  const router = useRouter();
  const caminho = usePathname().replace(/(.)\/$/, "$1");
  const equipe = hub.equipe && !hub.comoLoja;
  const destino = desvio(caminho, { ...hub, equipe });
  useEffect(() => { if (destino) router.replace(destino); }, [destino, router]);
  return (
    <div className="app">
      <Menu equipe={equipe} temPortal={!!hub.portal} persFaltam={hub.persFaltam} nome={hub.nome} email={hub.email} foto={hub.foto} />
      <div className="main">
        {hub.comoLoja && hub.portal ? (
          <div className="faixa equipe">
            👁 Você está vendo exatamente o que {hub.portal.loja} vê. O que você marcar aqui fica na conta da loja.
            <button type="button" onClick={() => hub.verComoLoja(false)}>Voltar para a visão da equipe</button>
          </div>
        ) : hub.equipe && hub.portal ? (
          <div className="faixa equipe">
            Você está no portal de {hub.portal.loja} como equipe
            <button type="button" onClick={() => hub.verComoLoja(true)}>👁 Ver 100% como a loja</button>
            <Link href="/empresa/carteira">Trocar portal</Link>
            <button type="button" onClick={() => hub.abrirPortal(null)}>Voltar para a empresa</button>
          </div>
        ) : !hub.equipe && hub.persFaltam > 0 ? (
          <div className="faixa">
            Termine a sua Personalização · falta {hub.persFaltam} de {ETAPAS.length}
            <Link href="/personalizacao">Terminar agora →</Link>
          </div>
        ) : null}
        <Ferramentas temPortal={!!hub.portal} />
        <main className="conteudo">{destino ? <Carregando /> : children}</main>
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
