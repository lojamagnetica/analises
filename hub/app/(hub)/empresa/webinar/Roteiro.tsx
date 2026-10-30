"use client";

import { useEffect, useRef, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Carregando } from "@/lib/hub";
import { SECOES, buscarRoteiro, progresso, roteiroFinal, salvarRoteiro, type Campo, type Respostas } from "@/lib/webinar-roteiro";

/** A entrega do evento: o Mapa do Webinar respondido parte por parte e o roteiro final montado. Salva sozinho. */
export function Roteiro() {
  const [r, setR] = useState<Respostas | null>(null);
  const [parte, setParte] = useState<string>(SECOES[0].id);
  const [estado, setEstado] = useState("");
  const pendente = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { buscarRoteiro().then(setR).catch(() => setR({})); }, []);
  if (!r) return <Carregando />;

  const muda = (id: string, valor: string) => {
    const novo = { ...r, [id]: valor };
    setR(novo); setEstado("Salvando…");
    if (pendente.current) clearTimeout(pendente.current);
    pendente.current = setTimeout(() => { salvarRoteiro(novo).then(() => setEstado("Salvo ✓")).catch((e) => setEstado((e as Error).message)); }, 800);
  };
  const campo = (c: Campo) => {
    if (c.se && !c.se(r)) return null;
    const val = r[c.id] ?? "";
    if (c.tipo === "check") return (
      <label key={c.id} className="linha" style={{ gap: 8, padding: "4px 0", cursor: "pointer" }}>
        <input type="checkbox" checked={val === "1"} onChange={(e) => muda(c.id, e.target.checked ? "1" : "")} /> {c.rotulo}
      </label>
    );
    return (
      <label key={c.id} className="ajuda" style={{ display: "block", marginTop: 10 }}>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{c.rotulo}</span>
        {c.exemplo && <span style={{ display: "block" }}>Exemplo: {c.exemplo}</span>}
        {c.tipo === "escolha" ? (
          <select value={val} onChange={(e) => muda(c.id, e.target.value)}>
            <option value="">Escolha…</option>
            {c.opcoes?.map((o) => <option key={o.v} value={o.v}>{o.r}</option>)}
          </select>
        ) : c.tipo === "linha"
          ? <input type="text" value={val} onChange={(e) => muda(c.id, e.target.value)} />
          : <textarea rows={3} value={val} onChange={(e) => muda(c.id, e.target.value)} />}
      </label>
    );
  };

  const secao = SECOES.find((s) => s.id === parte);
  const final = roteiroFinal(r);
  const textoFinal = final.map((p) => `## ${p.titulo}\n${p.texto}`).join("\n\n");
  return (
    <>
      <div className="chips mb" role="tablist" aria-label="Partes do roteiro">
        {SECOES.map((s) => { const p = progresso(s, r); return (
          <button key={s.id} type="button" className={`chip ${parte === s.id ? "escolhido" : ""}`} onClick={() => setParte(s.id)}>{s.titulo} <small>({p.feitos}/{p.total})</small></button>
        ); })}
        <button type="button" className={`chip ${parte === "final" ? "escolhido" : ""}`} onClick={() => setParte("final")}>Roteiro final</button>
        {estado && <small className="mudo" style={{ alignSelf: "center" }}>{estado}</small>}
      </div>

      {secao && (
        <>
          <p className="mudo" style={{ marginTop: 0 }}>{secao.objetivo}</p>
          {secao.blocos.filter((b) => b.campos.some((c) => !c.se || c.se(r))).map((b) => (
            <div key={b.id} className="card mb">
              <b>{b.titulo}</b>{b.ritmo && <small className="mudo"> · {b.ritmo}</small>}
              {b.dica && <p className="ajuda" style={{ margin: "4px 0 0" }}>{b.dica}</p>}
              {b.campos.map(campo)}
            </div>
          ))}
        </>
      )}

      {parte === "final" && (
        <>
          <div className="linha mb" style={{ gap: 8 }}>
            <Copiar texto={textoFinal} rotulo="Copiar o roteiro inteiro" />
            <small className="mudo">As falas ficam em linhas com "&gt; ", prontas para o Teleprompter. O que falta preencher aparece como ____.</small>
          </div>
          {final.map((p) => (
            <div key={p.titulo} className="card mb">
              <div className="linha entre"><b>{p.titulo}</b><Copiar texto={p.texto} rotulo="Copiar" /></div>
              <div className="mt" style={{ whiteSpace: "pre-wrap" }}>{p.texto || <span className="mudo">Ainda vazio.</span>}</div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
