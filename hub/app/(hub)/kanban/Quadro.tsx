"use client";

import { useOptimistic, useState, useTransition } from "react";
import { COLUNAS_KANBAN } from "@/lib/conteudo";
import { kanbanApagar, kanbanCriar, kanbanMover } from "../acoes";

type Card = { id: string; titulo: string; coluna: number };
type Acao = { tipo: "mover"; id: string; coluna: number } | { tipo: "apagar"; id: string } | { tipo: "criar"; titulo: string };

const CORES = ["var(--muted)", "var(--purple)", "var(--red)", "var(--orange)", "var(--green)"];

export function Quadro({ cards }: { cards: Card[] }) {
  const [, iniciar] = useTransition();
  const [novo, setNovo] = useState("");
  const [lista, aplicar] = useOptimistic(cards, (atual, a: Acao) => {
    if (a.tipo === "mover") return atual.map((c) => (c.id === a.id ? { ...c, coluna: a.coluna } : c));
    if (a.tipo === "apagar") return atual.filter((c) => c.id !== a.id);
    return [...atual, { id: "novo-" + Date.now(), titulo: a.titulo, coluna: 0 }];
  });

  const rodar = (a: Acao, fn: () => Promise<void>) => iniciar(async () => { aplicar(a); await fn(); });

  return (
    <>
      <form
        className="linha mb"
        onSubmit={(e) => {
          e.preventDefault();
          const t = novo.trim();
          if (!t) return;
          setNovo("");
          rodar({ tipo: "criar", titulo: t }, () => kanbanCriar(t));
        }}
      >
        <input type="text" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nova ideia de conteúdo…" style={{ maxWidth: 440 }} />
        <button className="btn p" type="submit">Adicionar</button>
      </form>
      <div className="kanban">
        {COLUNAS_KANBAN.map((nome, ci) => {
          const daColuna = lista.filter((c) => c.coluna === ci);
          return (
            <div key={nome} className="coluna" style={{ ["--c" as string]: CORES[ci] }}>
              <h3>{nome}<span className="mudo">{daColuna.length}</span></h3>
              {daColuna.map((c) => (
                <div key={c.id} className="kcard">
                  {c.titulo}
                  <div className="mover">
                    <button disabled={ci === 0} aria-label="Voltar" onClick={() => rodar({ tipo: "mover", id: c.id, coluna: ci - 1 }, () => kanbanMover(c.id, ci - 1))}>←</button>
                    <button aria-label="Excluir" onClick={() => rodar({ tipo: "apagar", id: c.id }, () => kanbanApagar(c.id))}>✕</button>
                    <button disabled={ci === COLUNAS_KANBAN.length - 1} aria-label="Avançar" onClick={() => rodar({ tipo: "mover", id: c.id, coluna: ci + 1 }, () => kanbanMover(c.id, ci + 1))}>→</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
