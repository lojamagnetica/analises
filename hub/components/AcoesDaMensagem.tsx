"use client";

// As ações de 1 toque de uma mensagem das Conversas da equipe: lembrete, pendência da loja, combinado, contato e concluir.
import { useState } from "react";
import { hoje } from "@/lib/formato";
import { concluirMensagem, criarLembrete, virarCombinado, virarContato, virarPendencia, type Mensagem, type Pessoa } from "@/lib/conversas";

export function AcoesDaMensagem({ m, pessoas, por, aoFeito }: { m: Mensagem; pessoas: Pessoa[]; por: string; aoFeito: () => void }) {
  const [aberto, setAberto] = useState<"lembrete" | "combinado" | null>(null);
  const [quando, setQuando] = useState("");
  const [quem, setQuem] = useState(m.para ?? "");
  const tenta = async (fn: () => Promise<void>, fechar = true) => { try { await fn(); if (fechar) setAberto(null); aoFeito(); } catch (e) { alert((e as Error).message); } };
  return (
    <div style={{ marginTop: 6 }}>
      <div className="linha" style={{ gap: 6, flexWrap: "wrap" }}>
        <button type="button" className="btn s peq" onClick={() => setAberto(aberto === "lembrete" ? null : "lembrete")}>Criar lembrete</button>
        <button type="button" className="btn s peq" onClick={() => tenta(() => virarPendencia(m, por).then(() => concluirMensagem(m.id, true)))}>Virar pendência da loja</button>
        <button type="button" className="btn s peq" onClick={() => setAberto(aberto === "combinado" ? null : "combinado")}>Virar combinado</button>
        <button type="button" className="btn s peq" onClick={() => tenta(() => virarContato(m, por))}>Registrar contato</button>
        <button type="button" className="btn s peq" onClick={() => tenta(() => concluirMensagem(m.id, m.status === "aberta"))}>{m.status === "aberta" ? "Concluir" : "Reabrir"}</button>
      </div>
      {aberto && (
        <div className="linha mt" style={{ gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div><label className="rotulo">{aberto === "lembrete" ? "Para quando" : "Prazo"}</label><input type="date" value={quando} min={hoje()} onChange={(e) => setQuando(e.target.value)} /></div>
          {aberto === "lembrete" && (
            <div><label className="rotulo">Quem lembra</label>
              <select value={quem} onChange={(e) => setQuem(e.target.value)}><option value="">As duas</option>{pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            </div>
          )}
          <button type="button" className="btn p peq" onClick={() => tenta(() => (aberto === "lembrete" ? criarLembrete(m, quando || null, quem || null, por).then(() => concluirMensagem(m.id, true)) : virarCombinado(m, quando || null, por).then(() => concluirMensagem(m.id, true))))}>Salvar</button>
        </div>
      )}
    </div>
  );
}

