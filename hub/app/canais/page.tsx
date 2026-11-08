"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { moeda } from "@/lib/formato";
import { TEMPOS, abrirLink, apagarLancamento, lancar, rotuloTempo, type Aberta } from "@/lib/canais";

const CHAVE_QUEM = "canais-quem";
const dm = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

// O link que a equipe da loja abre no celular, sem entrar no Hub, para lançar a venda e o tempo de cada canal.
function Lancar() {
  const token = useSearchParams().get("t") ?? "";
  const [m, setM] = useState<Aberta | null | undefined>(undefined);
  const [quem, setQuem] = useState("");
  const [canal, setCanal] = useState("");
  const [valor, setValor] = useState("");
  const [pecas, setPecas] = useState(1);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => setM(/^[0-9a-f-]{36}$/.test(token) ? await abrirLink(token) : null), [token]);
  useEffect(() => {
    document.title = "Vendas por canal · magnética.hub";
    try { setQuem(localStorage.getItem(CHAVE_QUEM) ?? ""); } catch { /* sem armazenamento */ }
    carregar();
  }, [carregar]);

  if (m === undefined) return <div className="carregando">Carregando…</div>;
  if (!m) return <div className="card">Este link não vale mais. Peça o novo para a sua gestora.</div>;
  const fora = !m.ativa || m.hoje < m.inicio || m.hoje > m.fim;

  const fazer = async (f: () => Promise<void>, aviso: string) => {
    setOcupado(true); setMsg("");
    try { await f(); setMsg(aviso); await carregar(); } catch (e) { setMsg((e as Error).message); }
    setOcupado(false);
  };
  const guardaQuem = (v: string) => { setQuem(v); try { localStorage.setItem(CHAVE_QUEM, v); } catch { /* sem armazenamento */ } };
  const numero = Number(valor.replace(/\./g, "").replace(",", "."));
  const vendas = m.lancamentos.filter((l) => l.tipo === "venda");
  const totalHoje = vendas.reduce((s, l) => s + Number(l.valor), 0);

  return (
    <>
      <div className="card mb">
        <small className="mudo">Vendas por canal · {m.loja}</small>
        <h2 style={{ margin: "2px 0 4px" }}>Lance a venda e o tempo de cada canal</h2>
        <p className="mudo" style={{ margin: 0 }}>Medição de {dm(m.inicio)} a {dm(m.fim)}. Lance na hora ou no fim do dia: leva menos de 1 minuto.</p>
      </div>

      {fora ? (
        <div className="aviso mb">{m.ativa ? `A medição vai de ${dm(m.inicio)} a ${dm(m.fim)}. Hoje não entra.` : "A medição foi encerrada. Obrigada!"}</div>
      ) : (
        <>
          <div className="card mb">
            <label className="ajuda" style={{ display: "block" }}>Quem está lançando
              <input type="text" value={quem} placeholder="Seu nome" onChange={(e) => guardaQuem(e.target.value)} />
            </label>
            <b style={{ display: "block", margin: "10px 0 6px" }}>1. Qual canal?</b>
            <div className="chips" role="group" aria-label="Canal">
              {m.canais.map((c) => <button key={c} type="button" className={`chip ${canal === c ? "escolhido" : ""}`} style={{ padding: "10px 14px", fontSize: 15 }} onClick={() => { setCanal(c); setMsg(""); }}>{c}</button>)}
            </div>
          </div>

          {canal && (
            <div className="card mb">
              <b>2. Venda · {canal}</b>
              <div className="linha mt" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <label className="ajuda" style={{ flex: 1, minWidth: 130 }}>Valor (R$)
                  <input type="text" inputMode="decimal" value={valor} placeholder="Ex.: 189,80" onChange={(e) => setValor(e.target.value)} style={{ fontSize: 18 }} />
                </label>
                <div className="ajuda">Peças
                  <div className="linha" style={{ gap: 6 }}>
                    <button type="button" className="btn s peq" disabled={pecas <= 1} onClick={() => setPecas(pecas - 1)}>−</button>
                    <b style={{ fontSize: 18, minWidth: 24, textAlign: "center" }}>{pecas}</b>
                    <button type="button" className="btn s peq" onClick={() => setPecas(pecas + 1)}>+</button>
                  </div>
                </div>
              </div>
              <button type="button" className="btn p mt" style={{ width: "100%" }} disabled={ocupado || !(numero > 0)}
                onClick={() => fazer(async () => { await lancar(token, canal, "venda", numero, pecas, 0, quem); setValor(""); setPecas(1); }, `Venda lançada em ${canal} ✓`)}>
                Lançar a venda
              </button>

              <b style={{ display: "block", marginTop: 18 }}>3. Tempo gasto · {canal}</b>
              <p className="ajuda" style={{ margin: "2px 0 6px" }}>Preparar e vender: separar peças, fotografar, gravar, postar, responder. Uma estimativa já basta.</p>
              <div className="chips">
                {TEMPOS.map((t) => (
                  <button key={t} type="button" className="chip" style={{ padding: "10px 14px", fontSize: 15 }} disabled={ocupado}
                    onClick={() => fazer(() => lancar(token, canal, "tempo", 0, 0, t, quem), `${rotuloTempo(t)} lançado em ${canal} ✓`)}>
                    {rotuloTempo(t)}{t === 180 ? "+" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msg && <div className={`aviso mb ${msg.includes("✓") ? "ok" : ""}`}>{msg}</div>}
        </>
      )}

      <div className="card">
        <div className="linha entre"><b>Hoje</b><b>{moeda(totalHoje)}</b></div>
        {m.lancamentos.length === 0 && <p className="mudo" style={{ marginBottom: 0 }}>Nada lançado hoje ainda.</p>}
        {m.lancamentos.map((l) => (
          <div key={l.id} className="linha entre" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <span>
              <b>{l.canal}</b> · {l.tipo === "venda" ? `${moeda(Number(l.valor))} · ${l.pecas} ${l.pecas === 1 ? "peça" : "peças"}` : `tempo ${rotuloTempo(l.minutos)}`}
              {l.quem && <small className="mudo"> · {l.quem}</small>}
            </span>
            {!fora && <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm("Apagar este lançamento?")) fazer(() => apagarLancamento(token, l.id), "Lançamento apagado."); }}>Apagar</button>}
          </div>
        ))}
      </div>
    </>
  );
}

export default function PaginaCanais() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
      <div className="linha" style={{ gap: 10, marginBottom: 16 }}><Simbolo tamanho={28} /><b>magnética.hub</b></div>
      <Suspense fallback={<div className="carregando">Carregando…</div>}><Lancar /></Suspense>
    </main>
  );
}
