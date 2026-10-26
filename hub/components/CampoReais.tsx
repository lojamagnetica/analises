"use client";

import { useState } from "react";
import { numeroDe } from "@/lib/caixa";

const reais = (n: number) => n.toLocaleString("pt-BR", Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Campo em reais: mostra "R$ 60.000" e aceita "60000", "60.000" ou "89,90". sem = número sem "R$" (markup); vazio = 0 aparece em branco. */
export function CampoReais({ rotulo, valor, mudar, sem, vazio, dica }: { rotulo: string; valor: number; mudar: (v: number) => void; sem?: boolean; vazio?: boolean; dica?: string }) {
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <div>
      <label className="rotulo">{rotulo}</label>
      <div style={{ position: "relative" }}>
        {!sem && <span className="mudo" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>R$</span>}
        <input type="text" inputMode="decimal" style={{ paddingLeft: sem ? undefined : 40, fontVariantNumeric: "tabular-nums" }}
          value={texto ?? (vazio && !valor ? "" : reais(valor))} placeholder={dica}
          onChange={(e) => { setTexto(e.target.value); mudar(numeroDe(e.target.value) ?? 0); }}
          onBlur={() => setTexto(null)} />
      </div>
    </div>
  );
}
