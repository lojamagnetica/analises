"use client";

import { useState } from "react";
import { SITUACOES, chaveSituacao, type Campo, type Respostas, type Situacao } from "@/lib/conteudo";

/** Um campo da etapa. Os dados (números, relatório) têm as 3 opções: tenho, estimativa, ainda não tenho. */
export function CampoEtapa({ c, r, padrao }: { c: Campo; r: Respostas; padrao: string }) {
  const [st, setSt] = useState<Situacao>((r[chaveSituacao(c.id)] as Situacao) || "tenho");
  const valor = typeof r[c.id] === "string" ? (r[c.id] as string) : padrao;
  const lista = Array.isArray(r[c.id]) ? (r[c.id] as string[]) : [];
  const fora = st === "nao_tenho";
  return (
    <div style={{ marginBottom: 6 }}>
      <label className="rotulo" htmlFor={c.id}>{c.rotulo}</label>
      {c.tipo === "textarea" ? (
        <textarea id={c.id} name={c.id} defaultValue={valor} disabled={fora} />
      ) : c.tipo === "opcao" ? (
        <select id={c.id} name={c.id} defaultValue={valor} disabled={fora}>
          <option value="">Escolha…</option>
          {c.opcoes!.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : c.tipo === "multi" ? (
        c.opcoes!.map((o) => (
          <label key={o} className="marcar">
            <input type="checkbox" name={c.id} value={o} defaultChecked={lista.includes(o)} disabled={fora} />
            <span>{o}</span>
          </label>
        ))
      ) : (
        <input id={c.id} name={c.id} type={c.tipo === "numero" ? "number" : "text"} step="any" defaultValue={valor} disabled={fora} />
      )}
      {c.ajuda && <div className="ajuda">{c.ajuda}</div>}
      {c.dado && (
        <div className="linha" style={{ gap: 6, marginTop: 6 }} role="radiogroup" aria-label={`Situação: ${c.rotulo}`}>
          <input type="hidden" name={chaveSituacao(c.id)} value={st} />
          {SITUACOES.map((s) => (
            <button key={s.valor} type="button" className="chip" aria-pressed={st === s.valor} onClick={() => setSt(s.valor)}
              style={st === s.valor ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)", fontSize: 12.5 } : { fontSize: 12.5 }}>
              {s.rotulo}
            </button>
          ))}
        </div>
      )}
      {fora && <div className="ajuda">Sem problema: isso vira uma tarefa no seu Plano e você completa quando tiver.</div>}
    </div>
  );
}

