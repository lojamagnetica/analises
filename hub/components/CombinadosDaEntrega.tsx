"use client";

// Combinados da loja, registrados pela equipe no fim da reunião de entrega (ou de qualquer reunião individual).
// "Liberar o acompanhamento" grava os combinados e passa a loja para o acompanhamento da CS.
import { useState } from "react";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataCurta, hoje } from "@/lib/formato";
import { SUGESTOES, buscarCombinados, excluirCombinado, liberarAcompanhamento, type NovoCombinado, type Quem } from "@/lib/combinados";

const QUEM: { v: Quem; rotulo: string }[] = [{ v: "loja", rotulo: "A loja" }, { v: "claudia", rotulo: "A Claudia" }, { v: "camilla", rotulo: "A Camilla" }];

export function CombinadosDaEntrega({ portalId, loja }: { portalId: string; loja: string }) {
  const { nome } = useEquipe();
  const { dados, recarregar } = useDados(() => buscarCombinados(portalId), [portalId]);
  const [itens, setItens] = useState<(NovoCombinado & { chave: string })[]>([]);
  const [livre, setLivre] = useState("");
  const [salvando, setSalvando] = useState(false);
  if (!dados) return <Carregando />;
  const marcado = (t: string) => itens.some((i) => i.texto === t);
  const alternar = (s: (typeof SUGESTOES)[number]) =>
    setItens((l) => (marcado(s.texto) ? l.filter((i) => i.texto !== s.texto) : [...l, { chave: s.texto, texto: s.texto, quem: "loja", prazo: s.prazo() }]));
  const mudar = (chave: string, parte: Partial<NovoCombinado>) => setItens((l) => l.map((i) => (i.chave === chave ? { ...i, ...parte } : i)));
  const acrescentar = () => { const t = livre.trim(); if (!t || marcado(t)) return; setItens((l) => [...l, { chave: t, texto: t, quem: "loja", prazo: null }]); setLivre(""); };
  const liberar = async () => {
    if (!confirm(`Registrar ${itens.length} ${itens.length === 1 ? "combinado" : "combinados"} e passar ${loja} para o acompanhamento da CS?`)) return;
    setSalvando(true);
    try { await liberarAcompanhamento(portalId, itens.map(({ texto, quem, prazo }) => ({ texto, quem, prazo })), nome?.split(" ")[0] ?? ""); setItens([]); recarregar(); } catch (e) { alert((e as Error).message); }
    setSalvando(false);
  };
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
      <h3 style={{ marginTop: 0 }}>Combinados da loja</h3>
      <p className="mudo" style={{ marginTop: 0 }}>O que {loja} vai começar a fazer. A loja vê no Início dela e a Claudia acompanha cada prazo. Os combinados saem da loja, não de nós.</p>

      {dados.length > 0 && (
        <div className="mb">
          {dados.map((c) => (
            <div key={c.id} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <span><span className={`selo ${c.status === "feito" ? "feito" : c.prazo && c.prazo < hoje() ? "alerta" : "espera"}`}>{c.status === "feito" ? "feito" : c.prazo ? `até ${dataCurta(c.prazo)}` : "sem prazo"}</span> {c.texto} <span className="mudo">· {QUEM.find((q) => q.v === c.quem)?.rotulo}</span></span>
              <button type="button" className="btn s peq" onClick={async () => { if (confirm("Remover este combinado?")) { await excluirCombinado(c.id); recarregar(); } }}>Remover</button>
            </div>
          ))}
        </div>
      )}

      <div className="chips mb">
        {SUGESTOES.map((s) => <button key={s.texto} type="button" className={`chip${marcado(s.texto) ? " escolhido" : ""}`} onClick={() => alternar(s)}>{s.texto}</button>)}
      </div>
      <div className="linha mb" style={{ gap: 8 }}>
        <input type="text" value={livre} onChange={(e) => setLivre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && acrescentar()} placeholder="Outro combinado, com as palavras dela" style={{ flex: 1 }} />
        <button type="button" className="btn s peq" onClick={acrescentar}>Acrescentar</button>
      </div>

      {itens.map((i) => (
        <div key={i.chave} className="grade g3" style={{ gap: 8, alignItems: "end", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
          <div style={{ gridColumn: "span 3" }}><b>{i.texto}</b></div>
          <div><label className="rotulo">Prazo</label><input type="date" value={i.prazo ?? ""} onChange={(e) => mudar(i.chave, { prazo: e.target.value || null })} /></div>
          <div><label className="rotulo">Quem faz</label><select value={i.quem} onChange={(e) => mudar(i.chave, { quem: e.target.value as Quem })}>{QUEM.map((q) => <option key={q.v} value={q.v}>{q.rotulo}</option>)}</select></div>
          <div><button type="button" className="btn s peq" onClick={() => setItens((l) => l.filter((x) => x.chave !== i.chave))}>Tirar</button></div>
        </div>
      ))}

      <div className="linha mt">
        <button type="button" className="btn p" disabled={salvando || (!itens.length && !dados.length)} onClick={liberar}>{salvando ? "Salvando…" : "Liberar o acompanhamento"}</button>
      </div>
    </div>
  );
}
