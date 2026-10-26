"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RetornoPerfil } from "@/components/RetornoPerfil";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Letra } from "@/lib/pessoas";

type Relatorio = { nome: string; funcao: string | null; loja: string; perfil: Record<Letra, number>; perfil_em: string | null };

// O Relatório de Perfil Comportamental que a pessoa da equipe abre pelo link, sem entrar no Hub.
function Pagina() {
  const token = useSearchParams().get("t") ?? "";
  const [r, setR] = useState<Relatorio | null | undefined>(undefined);
  useEffect(() => {
    document.title = "Relatório de Perfil · Loja Magnética";
    if (!/^[0-9a-f-]{36}$/.test(token)) { setR(null); return; }
    supabaseBrowser().rpc("perfil_relatorio", { p_token: token }).then(({ data }) => setR((data as Relatorio | null) ?? null));
  }, [token]);
  if (r === undefined) return <div className="carregando">Carregando…</div>;
  if (!r) return <div className="card"><h2>Este relatório não abre</h2><p className="mudo">O link pode ter sido digitado errado. Peça o link de novo para quem te enviou.</p></div>;
  return (
    <>
      <RetornoPerfil nome={r.nome} loja={r.loja} funcao={r.funcao} perfil={r.perfil} data={r.perfil_em} />
      <div className="linha mt nao-imprimir" style={{ justifyContent: "center" }}>
        <button type="button" className="btn s" onClick={() => window.print()}>Salvar em PDF</button>
      </div>
    </>
  );
}

export default function Relatorio() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{"@media print { .nao-imprimir { display: none !important; } body { background: #fff; } .relatorio-perfil { box-shadow: none; border: none; } }"}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px max(16px, env(safe-area-inset-left, 0px)) 48px" }}>
        <Suspense fallback={<div className="carregando">Carregando…</div>}><Pagina /></Suspense>
      </div>
    </div>
  );
}
