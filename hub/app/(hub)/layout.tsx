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
  const destino = desvio(caminho, hub);
  useEffect(() => { if (destino) router.replace(destino); }, [destino, router]);
  return (
    <div className="app">
      <Menu equipe={hub.equipe} temPortal={!!hub.portal} persFaltam={hub.persFaltam} nome={hub.nome} email={hub.email} />
      <div className="main">
        {hub.equipe && hub.portal ? (
          <div className="faixa equipe">
            Você está vendo o portal de {hub.portal.loja} como equipe
            <Link href="/empresa/carteira">Trocar portal →</Link>
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
