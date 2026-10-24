"use client";

import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { apagarAnotacao, criarAnotacao, listarAnotacoes } from "@/lib/anotacoes";
import { dataHora } from "@/lib/formato";

/** O que foi combinado em cada contato com a cliente. Só a equipe vê. */
export function AnotacoesDaCliente({ portalId, nome }: { portalId: string; nome: string }) {
  const { dados, recarregar } = useDados(() => listarAnotacoes(portalId), [portalId]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState("");
  if (!dados) return <Carregando />;

  return (
    <div className="card mt" id="anotacoes">
      <h2>Anotações de atendimento</h2>
      <p className="mudo" style={{ marginTop: 0 }}>Registre o que foi combinado em cada contato. Fica com a data e o seu nome, e só a equipe vê.</p>
      <form
        action={async () => {
          setSalvando(true); setErro("");
          try { await criarAnotacao(portalId, texto, nome); setTexto(""); recarregar(); } catch (e) { setErro((e as Error).message); }
          setSalvando(false);
        }}
      >
        <textarea id="nova-anotacao" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: Ligamos hoje. Combinou de mandar o relatório de estoque até sexta." />
        {erro && <div className="aviso mt">{erro}</div>}
        <div className="linha mt"><button className="btn p peq" type="submit" disabled={salvando || !texto.trim()}>{salvando ? "Salvando…" : "Registrar anotação"}</button></div>
      </form>
      <div className="mt">
        {dados.length === 0 && <p className="mudo">Nenhuma anotação ainda.</p>}
        {dados.map((a) => (
          <div key={a.id} className="marcar" style={{ display: "block", cursor: "default" }}>
            <div className="linha entre">
              <span className="mudo" style={{ fontSize: 13 }}><b>{a.por_nome ?? "Equipe"}</b> · {dataHora(a.created_at)}</span>
              {confirmando === a.id ? (
                <span className="linha">
                  <button type="button" className="btn p peq" onClick={async () => { await apagarAnotacao(a.id); setConfirmando(""); recarregar(); }}>Apagar mesmo</button>
                  <button type="button" className="btn s peq" onClick={() => setConfirmando("")}>Cancelar</button>
                </span>
              ) : (
                <button type="button" className="btn s peq" onClick={() => setConfirmando(a.id)}>Apagar</button>
              )}
            </div>
            <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{a.texto}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
