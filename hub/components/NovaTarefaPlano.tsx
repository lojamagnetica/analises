"use client";

import { useState } from "react";
import { planoAdicionar } from "@/lib/acoes";

/** Incluir tarefa no Plano de Ação (equipe). Com o campo vazio, o "+" pergunta a tarefa: nunca fica sem resposta. */
export function NovaTarefaPlano({ portalId, mes, rotuloMes, aoIncluir }: { portalId: string; mes: number; rotuloMes: string; aoIncluir: () => void }) {
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const incluir = async () => {
    const t = (texto.trim() || window.prompt(`Nova tarefa · ${rotuloMes}`) || "").trim();
    if (!t) return;
    setSalvando(true);
    try {
      const f = new FormData();
      f.set("mes", String(mes));
      f.set("texto", t);
      await planoAdicionar(portalId, f);
      setTexto("");
      aoIncluir();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <div className="linha mt" style={{ flexWrap: "nowrap", gap: 6 }}>
      <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nova tarefa…"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); incluir(); } }} />
      <button className="btn p peq" type="button" onClick={incluir} disabled={salvando} aria-label="Incluir tarefa">{salvando ? "…" : "+"}</button>
    </div>
  );
}
