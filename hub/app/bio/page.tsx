"use client";

// Página pública do Link da Bio (fora do Hub logado): /bio?l=<endereço da loja>.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BioPagina } from "@/components/BioPagina";
import { bioPublica, modeloDe, registrarClique, type BioPublica } from "@/lib/bio";

function Pagina() {
  const slug = (useSearchParams().get("l") ?? "").trim();
  const [p, setP] = useState<BioPublica | null | undefined>(undefined);
  useEffect(() => {
    if (!slug) { setP(null); return; }
    bioPublica(slug).then(setP).catch(() => setP(null));
  }, [slug]);
  useEffect(() => {
    if (p) document.title = p.perfil?.nome || "Link da bio";
    const cor = p ? modeloDe(p.aparencia?.modelo).fundo : "#F4EEE6";
    document.body.style.background = cor;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", cor);
  }, [p]);

  if (p === undefined) return <div style={{ minHeight: "100vh" }} />;
  if (!p) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", background: "#F4EEE6", color: "#2B2522" }}>
      <div><h1 style={{ fontSize: 22 }}>Página não encontrada</h1><p>Confira o link ou procure a loja no Instagram.</p></div>
    </div>
  );
  return <div style={{ minHeight: "100vh" }}><BioPagina p={p} aoClicar={(b) => registrarClique(p.slug, b)} /></div>;
}

export default function Bio() {
  return <Suspense fallback={<div style={{ minHeight: "100vh" }} />}><Pagina /></Suspense>;
}
