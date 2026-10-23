"use client";

import { useEffect, useRef, useState } from "react";
import { salvarPlaneje } from "@/lib/acoes";

export function Bloco({ portalId, mes, bloco, inicial }: { portalId: string; mes: number; bloco: string; inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo">("");
  const ultimo = useRef(inicial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (texto === ultimo.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setEstado("salvando");
      await salvarPlaneje(portalId, mes, bloco, texto);
      ultimo.current = texto;
      setEstado("salvo");
    }, 900);
    return () => clearTimeout(timer.current);
  }, [texto, portalId, mes, bloco]);

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
