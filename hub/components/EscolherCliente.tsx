"use client";

import { useState } from "react";
import { semAcento } from "@/lib/clientes";
import { novaCliente, type ClienteSimples } from "@/lib/loja-na-mao";

/** Busca a cliente pelo nome ou WhatsApp; se não acha, cadastra na hora só com nome e WhatsApp. */
export function EscolherCliente({ portalId, clientes, valor, mudar, aoCadastrar }: {
  portalId: string; clientes: ClienteSimples[]; valor: ClienteSimples | null; mudar: (c: ClienteSimples | null) => void; aoCadastrar?: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [whats, setWhats] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const [erro, setErro] = useState("");
  if (valor) return (
    <div className="linha entre card-borda" style={{ padding: "8px 12px" }}>
      <span><b>{valor.nome}</b> <span className="mudo">{valor.whatsapp ?? ""}</span></span>
      <button type="button" className="link-loja" onClick={() => mudar(null)}>trocar</button>
    </div>
  );
  const dig = busca.replace(/\D/g, "");
  const achadas = busca.trim().length >= 2 ? clientes.filter((c) => semAcento(c.nome).includes(semAcento(busca)) || (dig.length >= 4 && (c.whatsapp ?? "").replace(/\D/g, "").includes(dig))).slice(0, 6) : [];
  return (
    <>
      <input type="text" placeholder="Nome ou WhatsApp da cliente" value={busca} onChange={(e) => { setBusca(e.target.value); setCadastrando(false); }} />
      {achadas.length > 0 && <div className="chips mt">{achadas.map((c) => <button key={c.id} type="button" className="chip" onClick={() => { mudar(c); setBusca(""); }}>{c.nome}</button>)}</div>}
      {busca.trim().length >= 2 && !cadastrando && <button type="button" className="btn s peq mt" onClick={() => setCadastrando(true)}>+ Cadastrar &quot;{busca.trim()}&quot;</button>}
      {cadastrando && (
        <div className="linha mt" style={{ gap: 8 }}>
          <input type="text" inputMode="tel" placeholder="WhatsApp (com DDD)" value={whats} onChange={(e) => setWhats(e.target.value)} />
          <button type="button" className="btn p peq" onClick={async () => {
            setErro("");
            try { const c = await novaCliente(portalId, busca, whats); mudar(c); setBusca(""); setWhats(""); setCadastrando(false); aoCadastrar?.(); }
            catch (x) { setErro((x as Error).message); }
          }}>Cadastrar</button>
        </div>
      )}
      {erro && <div className="aviso mt">{erro}</div>}
    </>
  );
}
