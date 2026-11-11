"use client";

import { useState } from "react";
import { vezDesafioMarcar, type DesafioDoDia as Desafio } from "@/lib/desafios";

/** O desafio de hoje, no topo do link pessoal: a pessoa vê ao chegar e marca cada vez que cumpre. */
export function DesafioDoDia({ token, lista, aoMudar }: { token: string; lista: Desafio[]; aoMudar: () => void }) {
  const [ocupado, setOcupado] = useState("");
  if (lista.length === 0) return null;
  const marcar = async (id: string, delta: 1 | -1) => { setOcupado(id); await vezDesafioMarcar(token, id, delta); setOcupado(""); aoMudar(); };
  return (
    <>
      {lista.map((d) => (
        <div key={d.id} className="card mb" style={{ border: "2px solid var(--orange)", background: "var(--orange-soft)" }}>
          <small style={{ fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--orange)" }}>🔥 Desafio de hoje · vale ponto para todo mundo</small>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15, margin: "4px 0" }}>{d.titulo}</div>
          {d.descricao && <p style={{ margin: "0 0 6px" }}>{d.descricao}</p>}
          <p style={{ margin: 0 }}><b>{d.pontos} pontos</b> por {d.unidade}.{d.limite ? ` Até ${d.limite} vezes hoje.` : ""}</p>
          <div className="linha" style={{ gap: 10, alignItems: "center", marginTop: 10 }}>
            <button type="button" className="btn s" style={{ flex: "0 0 52px", fontSize: 20 }} disabled={ocupado === d.id || d.feitos === 0} onClick={() => marcar(d.id, -1)} aria-label="Tirar uma">−</button>
            <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{d.feitos}</div><small className="mudo">{d.feitos * d.pontos} pontos hoje</small></div>
            <button type="button" className="vez-btn" style={{ flex: 2, padding: "12px 8px", fontSize: 16 }} disabled={ocupado === d.id || (d.limite !== null && d.feitos >= d.limite)} onClick={() => marcar(d.id, 1)}>Cumpri +1</button>
          </div>
        </div>
      ))}
    </>
  );
}
