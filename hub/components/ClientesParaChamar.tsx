"use client";

import { useState } from "react";
import type { ClienteChamar } from "@/lib/vez";

/** O card "Clientes para chamar" do link pessoal: nome, o que comprou, a mensagem pronta e o "chamei". */
export function ClientesParaChamar({ lista, marcar }: { lista: ClienteChamar[]; marcar: (id: string, feito: boolean) => void }) {
  const [copiada, setCopiada] = useState("");
  if (lista.length === 0) return null;
  const feitas = lista.filter((c) => c.feito).length;
  const copiar = async (c: ClienteChamar) => {
    try { await navigator.clipboard.writeText(c.mensagem); setCopiada(c.id); setTimeout(() => setCopiada(""), 1500); } catch { /* sem permissão: ela seleciona o texto */ }
  };
  return (
    <div className="card mb">
      <div className="linha entre" style={{ alignItems: "baseline" }}>
        <b style={{ fontSize: 18 }}>Clientes para chamar</b>
        <small className="mudo">{feitas} de {lista.length} chamadas</small>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: "var(--line)", margin: "8px 0 4px", overflow: "hidden" }}>
        <div style={{ width: `${(feitas / lista.length) * 100}%`, height: "100%", background: "#2E9D57", transition: "width .4s" }} />
      </div>
      <p className="ajuda" style={{ margin: "0 0 4px" }}>Clientes suas que não voltam há mais de 60 dias. A mensagem já está pronta.</p>
      {lista.map((c) => {
        const zap = c.whatsapp ? `https://wa.me/${c.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(c.mensagem)}` : "";
        return (
          <div key={c.id} style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12, opacity: c.feito ? 0.55 : 1 }}>
            <b style={{ fontSize: 17 }}>{c.nome}</b>
            {c.resumo && <div className="mudo" style={{ fontSize: 13.5 }}>{c.resumo}</div>}
            {c.comprou && <p style={{ margin: "6px 0", fontSize: 14.5 }}><b>Levou:</b> {c.comprou}</p>}
            {!c.feito && (
              <>
                <div style={{ background: "var(--soft)", borderRadius: 12, padding: "10px 12px", fontSize: 14.5, marginTop: 6 }}>{c.mensagem}</div>
                {!c.whatsapp && <p className="ajuda" style={{ margin: "6px 0 0" }}>Sem número na ficha. Procure o nome no seu WhatsApp e salve o contato.</p>}
              </>
            )}
            <div className="linha" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {!c.feito && zap && <a className="btn p peq" style={{ background: "#25D366", borderColor: "#25D366", color: "#06260F", flex: "1 1 120px", textAlign: "center" }} href={zap} target="_blank" rel="noreferrer">Abrir o WhatsApp</a>}
              {!c.feito && <button type="button" className="btn s peq" style={{ flex: "1 1 120px" }} onClick={() => copiar(c)}>{copiada === c.id ? "Copiada ✓" : "Copiar mensagem"}</button>}
              <button type="button" className={`btn ${c.feito ? "s" : "p"} peq`} style={{ flex: "1 1 120px" }} onClick={() => marcar(c.id, !c.feito)}>{c.feito ? "Chamada ✓ (desfazer)" : "Chamei"}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
