"use client";

import { useEffect, useRef, useState } from "react";
import { salvarPlaneje } from "../../acoes";

export function Bloco({ mes, bloco, inicial }: { mes: number; bloco: string; inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo">("");
  const ultimo = useRef(inicial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (texto === ultimo.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setEstado("salvando");
      await salvarPlaneje(mes, bloco, texto);
      ultimo.current = texto;
      setEstado("salvo");
    }, 900);
    return () => clearTimeout(timer.current);
  }, [texto, mes, bloco]);

  return (
    <div className="card">
      <div className="linha entre">
        <h3>{bloco}</h3>
        <small className="mudo">{estado === "salvando" ? "salvando…" : estado === "salvo" ? "salvo ✓" : ""}</small>
      </div>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva aqui…" />
    </div>
  );
}
