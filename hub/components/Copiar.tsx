"use client";

import { useState } from "react";
import { Icone } from "@/components/Icone";

export function Copiar({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="btn p peq"
      onClick={async () => {
        try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1600); } catch { /* sem permissão */ }
      }}
    >
      <Icone nome={ok ? "check" : "copy"} /> {ok ? "Copiado" : rotulo}
    </button>
  );
}
