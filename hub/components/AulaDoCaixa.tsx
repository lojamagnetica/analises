"use client";

import { BASE } from "@/lib/config";
import { AULAS } from "@/lib/guias";

/** No começo do Fechamento de caixa: a aula animada (3 min) de como fechar o caixa, fechada até a pessoa querer ver. */
export function AulaDoCaixa() {
  const aula = AULAS[0];
  return (
    <details className="card mb">
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Aula de {aula.duracao}: {aula.titulo}</summary>
      <p className="ajuda" style={{ margin: "6px 0 8px" }}>{aula.para}</p>
      <iframe title={aula.titulo} src={`${BASE}/aula/${aula.arquivo}`} loading="lazy" style={{ width: "100%", height: 820, border: 0, borderRadius: 12, background: "var(--soft)" }} />
    </details>
  );
}
