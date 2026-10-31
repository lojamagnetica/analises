"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { RetornoLojista } from "@/components/RetornoLojista";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Conteudo, Papel, Respostas } from "@/lib/lojista";

type Dados = { nome: string; papel: Papel; respostas: Respostas; conteudo: Conteudo };

// O retrato de quem respondeu o teste do lojista, pelo mesmo link. Não mostra índice nem prontidão.
function Retorno() {
  const token = useSearchParams().get("t") ?? "";
  const [d, setD] = useState<Dados | null | undefined>(undefined);

  useEffect(() => {
    document.title = "Seu retrato · magnética.hub";
    if (!/^[0-9a-f-]{36}$/.test(token)) { setD(null); return; }
    supabaseBrowser().rpc("lojista_retorno", { p_token: token }).then(({ data }) => setD((data as Dados | null) ?? null));
  }, [token]);

  if (d === undefined) return <div className="carregando">Carregando…</div>;
  if (!d) return <div className="card"><h2>Este link não abre</h2><p className="mudo">O teste ainda não foi respondido ou o link foi trocado. Peça um link novo para quem te enviou.</p></div>;
  return <RetornoLojista c={d.conteudo} r={d.respostas} papel={d.papel} nome={d.nome} />;
}

export default function Pagina() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px max(16px, env(safe-area-inset-left, 0px)) 48px" }}>
        <div className="linha mb" style={{ gap: 10 }}>
          <div className="logo"><Simbolo /></div>
          <b className="marca-nome" style={{ fontSize: 20 }}>magnética<span>.hub</span></b>
          <span className="mudo" style={{ marginLeft: "auto", fontSize: 13 }}>Seu retrato</span>
        </div>
        <Suspense fallback={<div className="carregando">Carregando…</div>}><Retorno /></Suspense>
      </div>
    </div>
  );
}
