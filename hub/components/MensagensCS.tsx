"use client";

import { Copiar } from "@/components/Copiar";
import type { MensagemCS } from "@/lib/jornada";

/** As mensagens padrão do CS: um botão de copiar por balão (no WhatsApp elas vão separadas) e um para copiar tudo. */
export function MensagensCS({ mensagens }: { mensagens: MensagemCS[] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {mensagens.map((m) => (
        <details key={m.chave} className="card" style={{ padding: "10px 14px", margin: 0 }}>
          <summary style={{ cursor: "pointer" }}><b>{m.titulo}</b> <small className="mudo">· {m.quando}</small></summary>
          <div className="mt" style={{ display: "grid", gap: 6 }}>
            {m.baloes.map((b, i) => (
              <div key={i} className="linha entre" style={{ gap: 10, alignItems: "flex-start", background: "var(--soft)", borderRadius: 10, padding: "8px 10px" }}>
                <span style={{ whiteSpace: "pre-wrap", flex: 1, minWidth: 0, color: /\[[A-ZÁÉÍÓÚ ]+\]/.test(b) ? "var(--red)" : undefined }}>{b}</span>
                <Copiar texto={b} rotulo="Copiar" />
              </div>
            ))}
            <div className="linha" style={{ gap: 8 }}>
              <Copiar texto={m.baloes.join("\n\n")} rotulo="Copiar tudo de uma vez" />
              <small className="mudo">O que está em vermelho entre colchetes você completa antes de mandar.</small>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
