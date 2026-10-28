"use client";

import Link from "next/link";
import { NossaHistoria } from "@/components/NossaHistoria";
import { RascunhoComoLoja } from "@/components/RascunhoComoLoja";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarHistoriaDoPortal, urlsDasFotos } from "@/lib/historia";

/** A história da loja: para a equipe nova (onboarding) e para lembrar quem a loja é. */
export default function Pagina() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(async () => {
    const h = await buscarHistoriaDoPortal(portal.id);
    return { h, urls: h ? await urlsDasFotos(h.fotos ?? []) : {} };
  }, [portal.id]);
  if (!dados) return <Carregando />;
  const { h, urls } = dados;

  if (!h || (!h.liberado && !equipe)) {
    return (
      <>
        <Titulo titulo="Nossa história" />
        <RascunhoComoLoja />
        <div className="card">
          <p style={{ marginTop: 0 }}>A história da sua loja aparece aqui: como tudo começou, os momentos marcantes, as fotos e os valores da casa. É com ela que cada pessoa nova da equipe conhece a loja.</p>
          {!h && <Link className="btn p" href="/historia" target="_blank" rel="noopener" style={{ display: "inline-block" }}>Contar a minha história</Link>}
          {h && <p className="mudo" style={{ margin: 0 }}>Recebemos a sua história. A Camilla está preparando tudo e logo aparece aqui.</p>}
        </div>
      </>
    );
  }

  return (
    <>
      {equipe && (
        <div className={`aviso mb ${h.liberado ? "ok" : ""}`}>
          {h.liberado ? "A loja já vê a história." : "Rascunho: só a equipe vê."}{" "}
          <Link href="/empresa/historias" className="link-loja">Revisar e liberar</Link>
        </div>
      )}
      <NossaHistoria h={h} urls={urls} />
    </>
  );
}
