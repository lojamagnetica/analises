"use client";

import { ORDENS, type Letra } from "@/lib/pessoas";

export type Pergunta = { pergunta: string; opcoes: Record<Letra, string> };
export type MaisMenos = { mais: (Letra | null)[]; menos: (Letra | null)[] };

/** Quantas situações ainda não têm "mais" e "menos" marcados. */
export const faltamDisc = (perguntas: Pergunta[], r: MaisMenos) =>
  perguntas.filter((_, i) => !r.mais[i] || !r.menos[i]).length;

/** O teste de perfil: em cada situação, a frase que MAIS parece e a que MENOS parece com a pessoa. */
export function PerguntasDisc({ perguntas, r, mudar, quem = "você" }: {
  perguntas: Pergunta[]; r: MaisMenos; mudar: (r: MaisMenos) => void; quem?: string;
}) {
  const marcar = (i: number, tipo: "mais" | "menos", l: Letra) => {
    const outro = tipo === "mais" ? "menos" : "mais";
    const novo: MaisMenos = { mais: [...r.mais], menos: [...r.menos] };
    novo[tipo][i] = l;
    if (novo[outro][i] === l) novo[outro][i] = null; // a mesma frase não pode ser as duas
    mudar(novo);
  };
  return (
    <>
      {perguntas.map((q, i) => {
        const feita = !!r.mais[i] && !!r.menos[i];
        return (
          <fieldset key={q.pergunta} className="card mb" style={{ border: 0 }}>
            <legend style={{ fontWeight: 700, color: "var(--ink)", padding: 0, marginBottom: 8 }}>
              {i + 1}. {q.pergunta} {feita && <span className="selo feito" style={{ marginLeft: 6 }}>ok</span>}
            </legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 64px", gap: "2px 8px", alignItems: "center" }}>
              <span />
              <small className="mudo" style={{ textAlign: "center", fontWeight: 700 }}>Mais</small>
              <small className="mudo" style={{ textAlign: "center", fontWeight: 700 }}>Menos</small>
              {ORDENS[i % 4].map((l) => (
                <div key={l} style={{ display: "contents" }}>
                  <span style={{ padding: "8px 0", borderTop: "1px solid var(--line)", minWidth: 0 }}>{q.opcoes[l]}</span>
                  <label style={{ textAlign: "center", borderTop: "1px solid var(--line)", padding: "8px 0", cursor: "pointer" }}>
                    <input type="radio" name={`mais${i}`} aria-label={`Mais parece com ${quem}: ${q.opcoes[l]}`} checked={r.mais[i] === l} onChange={() => marcar(i, "mais", l)} />
                  </label>
                  <label style={{ textAlign: "center", borderTop: "1px solid var(--line)", padding: "8px 0", cursor: "pointer" }}>
                    <input type="radio" name={`menos${i}`} aria-label={`Menos parece com ${quem}: ${q.opcoes[l]}`} checked={r.menos[i] === l} onChange={() => marcar(i, "menos", l)} />
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        );
      })}
    </>
  );
}
