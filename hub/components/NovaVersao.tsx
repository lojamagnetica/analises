"use client";

import { useEffect, useState } from "react";
import { BASE } from "@/lib/config";

/** Quando sai uma versão nova do Hub, a tela que já estava aberta avisa e atualiza com um toque. */
export function NovaVersao() {
  const [nova, setNova] = useState(false);
  useEffect(() => {
    const minha = process.env.NEXT_PUBLIC_VERSAO;
    if (!minha) return;
    const conferir = async () => {
      try {
        const r = await fetch(`${BASE}/versao.json?t=${Date.now()}`, { cache: "no-store" });
        const { v } = await r.json();
        if (v && v !== minha) setNova(true);
      } catch { /* sem internet: confere depois */ }
    };
    conferir();
    const t = setInterval(conferir, 3 * 60 * 1000);
    const aoVoltar = () => { if (document.visibilityState === "visible") conferir(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", aoVoltar); };
  }, []);
  if (!nova) return null;
  return (
    <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 1000, maxWidth: 520, margin: "0 auto", background: "var(--ink, #111)", color: "#fff", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", boxShadow: "0 6px 24px rgba(0,0,0,.25)" }}>
      <span style={{ fontSize: 14.5 }}>Saiu uma versão nova do Hub.</span>
      <button type="button" className="btn p peq" onClick={() => location.reload()}>Atualizar agora</button>
    </div>
  );
}
