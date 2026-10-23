"use client";

/** "18.000,50" ou "18000.5" → 18000.5 (vazio = 0). */
export function lerNumero(v: string) {
  const t = v.trim();
  if (!t) return 0;
  const limpo = t.replace(/[R$\s%]/g, "");
  // "18.000" é milhar em pt-BR; "1.6" é decimal.
  const n = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(limpo) ? limpo.replace(/\./g, "") : limpo);
  return Number.isFinite(n) ? n : 0;
}

export function CampoNumero({ valor, aoMudar, rotulo, dica }: { valor: string; aoMudar: (v: string) => void; rotulo?: string; dica?: string }) {
  return (
    <input type="text" inputMode="decimal" aria-label={rotulo} placeholder={dica} value={valor} onChange={(e) => aoMudar(e.target.value)} style={{ minWidth: 70 }} />
  );
}
