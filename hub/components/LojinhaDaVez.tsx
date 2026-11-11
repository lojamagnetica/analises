"use client";

import { useState } from "react";
import { fotoDoPremio, vezResgatar, type LojinhaDaPessoa } from "@/lib/lojinha";

/** A lojinha no link pessoal: os mimos que dá para trocar pelos pontos, de 100 em 100. */
export function LojinhaDaVez({ token, l, aoMudar }: { token: string; l: LojinhaDaPessoa; aoMudar: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");
  if (l.premios.length === 0 && l.meus.length === 0) return null;
  const resgatar = async (id: string, nome: string, pontos: number) => {
    if (!confirm(`Trocar ${pontos} pontos por "${nome}"? A gestora combina a entrega com você.`)) return;
    setOcupado(true); setMsg("");
    const r = await vezResgatar(token, id);
    setMsg(r === "ok" ? `Pedido feito: ${nome}! A gestora combina a entrega com você. 🎁` : r === "saldo" ? "Você ainda não tem pontos para esse." : "Não deu para resgatar agora. Tente de novo.");
    setOcupado(false); aoMudar();
  };
  return (
    <div className="card mb">
      <b style={{ fontSize: 18 }}>Lojinha de resgate 🎁</b>
      <p className="ajuda" style={{ margin: "4px 0 10px" }}>A cada 100 pontos você já pode trocar por um mimo. Roupa só pelo voucher de R$ 500. Você tem <b>{l.saldo} pontos</b>.</p>
      {msg && <div className="aviso ok" role="status" style={{ marginBottom: 10 }}>{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {l.premios.map((p) => {
          const foto = fotoDoPremio(p.foto), pode = l.saldo >= p.pontos;
          return (
            <div key={p.id} style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", opacity: pode ? 1 : 0.8 }}>
              {foto ? <img src={foto} alt={p.nome} loading="lazy" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
                : <div style={{ aspectRatio: "1 / 1", background: "var(--soft)", display: "grid", placeItems: "center", fontSize: 34 }}>🎁</div>}
              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <b style={{ fontSize: 14.5, lineHeight: 1.25 }}>{p.nome}</b>
                {p.descricao && <small className="mudo">{p.descricao}</small>}
                <div style={{ marginTop: "auto" }}>
                  <div style={{ fontWeight: 800, color: "var(--orange)" }}>{p.pontos} pontos</div>
                  <button type="button" className={`btn ${pode ? "p" : "s"} peq`} style={{ width: "100%", marginTop: 6 }} disabled={ocupado || !pode} onClick={() => resgatar(p.id, p.nome, p.pontos)}>
                    {pode ? "Resgatar" : `Faltam ${p.pontos - l.saldo}`}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {l.meus.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
          <small className="mudo">Meus resgates</small>
          {l.meus.map((m) => (
            <div key={m.id} className="linha entre" style={{ fontSize: 14, marginTop: 4, gap: 8 }}>
              <span style={{ flex: 1 }}>{m.nome}</span><span className={`selo ${m.status === "entregue" ? "feito" : "andamento"}`}>{m.status === "entregue" ? "Entregue" : "A entregar"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
