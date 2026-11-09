"use client";

import { dia, hoje } from "@/lib/formato";
import type { Parcela } from "@/lib/loja-na-mao";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Lista de parcelas: marcar paga (hoje) ou desmarcar. Atrasada em vermelho. */
export function ListaParcelas({ parcelas, mudar }: { parcelas: Parcela[]; mudar: (p: Parcela[]) => void }) {
  const ref = hoje();
  return (
    <div>
      {parcelas.map((p, i) => (
        <label key={i} className={`marcar ${p.pago_em ? "feito" : ""}`} style={{ padding: "6px 0" }}>
          <input type="checkbox" checked={!!p.pago_em} onChange={(e) => mudar(parcelas.map((x, j) => (j === i ? { ...x, pago_em: e.target.checked ? ref : null } : x)))} />
          <span style={{ color: !p.pago_em && p.vence < ref ? "var(--red)" : undefined }}>
            {i + 1}ª · {brl(p.valor)} · vence {dia(p.vence)}{p.pago_em ? ` · paga em ${dia(p.pago_em)}` : !p.pago_em && p.vence < ref ? " · atrasada" : ""}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Editar as parcelas uma a uma (valor e vencimento), com incluir e tirar. */
export function EditarParcelas({ parcelas, mudar }: { parcelas: Parcela[]; mudar: (p: Parcela[]) => void }) {
  return (
    <div>
      {parcelas.map((p, i) => (
        <div key={i} className="linha" style={{ gap: 8, marginBottom: 6 }}>
          <span className="mudo" style={{ width: 28 }}>{i + 1}ª</span>
          <input type="text" inputMode="decimal" style={{ maxWidth: 120 }} defaultValue={String(p.valor).replace(".", ",")}
            onBlur={(e) => { const v = Number(e.target.value.replace(/[R$\s.]/g, "").replace(",", ".")); mudar(parcelas.map((x, j) => (j === i ? { ...x, valor: Number.isFinite(v) ? v : x.valor } : x))); }} />
          <input type="date" value={p.vence} onChange={(e) => mudar(parcelas.map((x, j) => (j === i ? { ...x, vence: e.target.value } : x)))} />
          {parcelas.length > 1 && <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Tirar a ${i + 1}ª parcela?`)) mudar(parcelas.filter((_, j) => j !== i)); }}>tirar</button>}
        </div>
      ))}
      <button type="button" className="btn s peq" onClick={() => {
        const ult = parcelas[parcelas.length - 1];
        mudar([...parcelas, { vence: ult?.vence ?? hoje(), valor: ult?.valor ?? 0, pago_em: null }]);
      }}>+ parcela</button>
    </div>
  );
}
