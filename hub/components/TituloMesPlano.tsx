"use client";

import { useState } from "react";
import { salvarTituloMes } from "@/lib/acoes";
import { tituloMes } from "@/lib/conteudo";

/** Título do mês no Plano de Ação. A equipe escreve o tema do mês desta loja ali mesmo; a loja só vê. */
export function TituloMesPlano({ portalId, mes, titulos, editar, aoSalvar }: { portalId: string; mes: number; titulos?: Record<string, string> | null; editar: boolean; aoSalvar: () => void }) {
  const atual = titulos?.[String(mes)] ?? "";
  const [texto, setTexto] = useState(atual);
  const [salvo, setSalvo] = useState(false);
  if (!editar) return <h3 style={{ marginBottom: 2 }}>{tituloMes(mes, titulos)}</h3>;
  const salvar = async () => {
    if (texto.trim() === atual.trim()) return;
    try { await salvarTituloMes(portalId, mes, texto); setSalvo(true); setTimeout(() => setSalvo(false), 2000); aoSalvar(); } catch (e) { alert((e as Error).message); }
  };
  return (
    <div style={{ marginBottom: 2 }}>
      <h3 style={{ margin: 0 }}>Mês {mes}{salvo && <small className="mudo"> · salvo ✓</small>}</h3>
      <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={salvar}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        placeholder="Tema do mês para esta loja (ex.: arrumar o crediário)" aria-label={`Tema do mês ${mes}`} />
    </div>
  );
}
