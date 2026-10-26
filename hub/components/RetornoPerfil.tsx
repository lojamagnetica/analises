"use client";

import { Simbolo } from "@/components/Simbolo";
import { LETRAS, principal, type Letra } from "@/lib/pessoas";
import { RELATORIO_PERFIL, versaoDaFuncao } from "@/lib/perfil-pessoa";
import { dataCurta } from "@/lib/formato";

/** Relatório de Perfil Comportamental da pessoa da equipe: o gráfico, a síntese, os diferenciais,
 * os pontos de desenvolvimento e como potencializar. Usado no fim do teste, no link do relatório e na prévia da loja. */
export function RetornoPerfil({ nome, loja, funcao, perfil, data }: {
  nome: string; loja: string; funcao?: string | null; perfil: Record<Letra, number>; data?: string | null;
}) {
  const pr = principal(perfil);
  if (!pr) return null;
  const t = RELATORIO_PERFIL[pr.letra];
  const v = t[versaoDaFuncao(funcao)];
  const total = LETRAS.reduce((s, l) => s + (perfil[l] ?? 0), 0) || 1;
  const bloco = (titulo: string, itens: string[]) => (
    <div style={{ marginTop: 18 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 15, letterSpacing: 0.3, textTransform: "uppercase" }}>{titulo}</h3>
      <ol style={{ margin: 0, paddingLeft: 20 }}>{itens.map((x) => <li key={x} style={{ marginBottom: 6 }}>{x}</li>)}</ol>
    </div>
  );
  return (
    <div className="card relatorio-perfil" style={{ padding: "28px 28px 22px" }}>
      <div className="linha entre" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 18 }}>
        <span className="linha" style={{ gap: 10 }}>
          <span className="logo"><Simbolo /></span>
          <span><b>Loja Magnética</b><br /><small className="mudo">Programa de mentoria</small></span>
        </span>
        <small className="mudo" style={{ textAlign: "right" }}>Relatório de Perfil<br />Comportamental</small>
      </div>

      <small className="mudo">{[nome, funcao, funcao?.includes(loja) ? null : loja].filter(Boolean).join(" · ")}{data ? ` · ${dataCurta(data)}` : ""}</small>
      <h2 style={{ margin: "6px 0 2px" }}>Perfil predominante: {t.nome}</h2>
      {pr.segunda && <p className="mudo" style={{ margin: 0 }}>Com traços de {RELATORIO_PERFIL[pr.segunda].nome}</p>}
      <p style={{ margin: "12px 0 16px" }}>{t.sintese}</p>

      {LETRAS.map((l) => (
        <div key={l} style={{ marginBottom: 8 }}>
          <div className="linha entre" style={{ fontSize: 13, fontWeight: l === pr.letra ? 700 : 400 }}><span>{RELATORIO_PERFIL[l].nome}</span><span>{Math.round(((perfil[l] ?? 0) / total) * 100)}%</span></div>
          <div className="barra"><i style={{ width: `${((perfil[l] ?? 0) / total) * 100}%`, background: l === pr.letra ? "var(--red)" : "var(--green)" }} /></div>
        </div>
      ))}

      {bloco("Seus diferenciais", v.diferenciais)}
      {bloco("Pontos de desenvolvimento", v.atencao)}
      {bloco("Como potencializar o seu resultado", v.potencializar)}

      <p className="mudo" style={{ fontSize: 13, marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        Não existe perfil melhor ou pior: cada perfil contribui de um jeito para o resultado da loja. Conhecer o seu é o primeiro passo para crescer com mais intenção.
        <br /><b>Camilla Ribeiro · Loja Magnética</b>
      </p>
    </div>
  );
}
