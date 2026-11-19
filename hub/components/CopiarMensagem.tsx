"use client";

// Uma mensagem pronta para copiar e colar no WhatsApp (bloco ``` no texto dos materiais).
import { useState } from "react";

export function CopiarMensagem({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  const copiar = async () => { try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* sem permissão */ } };
  return (
    <div className="card" style={{ margin: "0 0 .9em", padding: 12, background: "var(--soft)" }}>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{texto}</div>
      <button type="button" className={`btn ${ok ? "s" : "p"} peq`} style={{ marginTop: 8 }} onClick={copiar}>{ok ? "Copiada ✓" : "Copiar mensagem"}</button>
    </div>
  );
}
