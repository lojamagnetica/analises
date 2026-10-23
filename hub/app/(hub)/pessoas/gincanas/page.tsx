"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { INDICADORES, REGRAS_DE_OURO, buscarGincanas, fecharGincana, rodarGincana, type Gincana } from "@/lib/gincanas";

function CartaoGincana({ g, indicador, aoRodar }: { g: Gincana; indicador: string | null; aoRodar: (d: { inicio: string; fim: string; premio: string }) => Promise<void> }) {
  const [rodar, setRodar] = useState(false);
  const [d, setD] = useState({ inicio: hoje(), fim: "", premio: "" });
  return (
    <div className="card card-borda" style={{ ["--c" as string]: g.comece ? "var(--red)" : "var(--orange)" }}>
      <div className="linha entre">
        <small className="mudo">{g.categoria}</small>
        {g.comece && <span className="selo andamento">comece por aqui</span>}
      </div>
      <h2 style={{ margin: "6px 0" }}>{g.nome}</h2>
      <p style={{ marginTop: 0 }}>{g.objetivo}</p>
      <div className="linha" style={{ gap: 6 }}>{g.indicadores.map((i) => <span key={i} className="selo espera">{i}</span>)}</div>
      {g.duracao && <p className="mudo" style={{ fontSize: 13.5 }}>Duração: {g.duracao}</p>}
      <details>
        <summary style={{ cursor: "pointer" }}><b>Como funciona</b></summary>
        <ol style={{ paddingLeft: 18 }}>{g.como_funciona.map((x) => <li key={x} style={{ marginBottom: 4 }}>{x}</li>)}</ol>
        {g.regras.length > 0 && <><b>Regras</b><ul style={{ paddingLeft: 18 }}>{g.regras.map((x) => <li key={x} style={{ marginBottom: 4 }}>{x}</li>)}</ul></>}
        {g.premiacao && <p><b>Premiação:</b> {g.premiacao}</p>}
        {g.materiais.length > 0 && <p><b>Materiais:</b> {g.materiais.join(", ")}</p>}
        {g.dica && <div className="aviso ok">Dica: {g.dica}</div>}
      </details>
      {!rodar ? (
        <div className="linha mt"><button className="btn p peq" type="button" onClick={() => setRodar(true)}>Vou rodar esta gincana</button></div>
      ) : (
        <div className="mt">
          <div className="grade g2" style={{ gap: 12 }}>
            <div><label className="rotulo">Começa</label><input type="date" value={d.inicio} onChange={(e) => setD({ ...d, inicio: e.target.value })} /></div>
            <div><label className="rotulo">Termina</label><input type="date" value={d.fim} onChange={(e) => setD({ ...d, fim: e.target.value })} /></div>
          </div>
          <label className="rotulo">Prêmio (anuncie antes)</label>
          <input type="text" value={d.premio} onChange={(e) => setD({ ...d, premio: e.target.value })} placeholder="Ex.: folga no sábado, jantar, R$ 100" />
          <div className="linha mt">
            <button className="btn p peq" type="button" onClick={async () => { await aoRodar(d); setRodar(false); }}>Começar{indicador ? ` · foco em ${indicador}` : ""}</button>
            <button className="btn s peq" type="button" onClick={() => setRodar(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Gincanas() {
  const inicial = useSearchParams().get("ind");
  const { portal } = usePortal();
  const [ind, setInd] = useState<string | null>(inicial);
  const [aviso, setAviso] = useState("");
  const [fechar, setFechar] = useState<Record<string, { vencedor: string; resultado: string }>>({});
  const { dados, recarregar } = useDados(() => buscarGincanas(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const disponiveis = INDICADORES.filter((i) => dados.gincanas.some((g) => g.indicadores.includes(i)));
  const lista = dados.gincanas
    .filter((g) => !ind || g.indicadores.includes(ind))
    .sort((a, b) => Number(b.comece) - Number(a.comece) || a.ordem - b.ordem);
  const nome = (id: string) => dados.gincanas.find((g) => g.id === id)?.nome ?? "—";
  const emAndamento = dados.minhas.find((m) => !m.resultado && (!m.fim || m.fim >= hoje()));

  return (
    <>
      <Titulo voltar={{ href: "/pessoas", rotulo: "Minha equipe" }} titulo="Gincanas" sub="Diga o que você quer trabalhar com o time e escolha a gincana. Gincana sem técnica é sorte; com técnica, é número subindo no fim do mês." />
      {aviso && <div className="aviso ok mb">{aviso}</div>}
      <div className="card mb">
        <b>O que você quer trabalhar?</b>
        <div className="chips mt">
          <button type="button" className="chip" aria-pressed={!ind} style={!ind ? { borderColor: "var(--red)", color: "var(--red)" } : undefined} onClick={() => setInd(null)}>Todas</button>
          {disponiveis.map((i) => (
            <button key={i} type="button" className="chip" aria-pressed={ind === i} style={ind === i ? { borderColor: "var(--red)", color: "var(--red)" } : undefined} onClick={() => setInd(i)}>{i}</button>
          ))}
        </div>
        <details className="mt">
          <summary style={{ cursor: "pointer" }}><b>As 5 regras de ouro</b></summary>
          <ol style={{ paddingLeft: 18 }}>{REGRAS_DE_OURO.map((r) => <li key={r}>{r}</li>)}</ol>
        </details>
      </div>
      {emAndamento && <div className="aviso mb">Uma gincana por vez: {nome(emAndamento.gincana_id)} está rolando{emAndamento.fim ? ` até ${dia(emAndamento.fim)}` : ""}. Feche o resultado antes de começar outra.</div>}

      <div className="grade g2 mb">
        {lista.map((g) => (
          <CartaoGincana key={g.id} g={g} indicador={ind} aoRodar={async (d) => {
            await rodarGincana(portal.id, g.id, { ...d, indicador: ind });
            setAviso(`${g.nome} começou. Anuncie o prêmio antes e monte o placar visível.`); recarregar();
          }} />
        ))}
      </div>
      {lista.length === 0 && <div className="card mb">Ainda não há gincana para este indicador. A equipe magnética está ampliando a biblioteca.</div>}

      {dados.minhas.length > 0 && (
        <>
          <div className="secao">As gincanas da sua loja</div>
          <div className="card">
            {dados.minhas.map((m) => (
              <div key={m.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <b>{nome(m.gincana_id)}</b> · {dia(m.inicio)}{m.fim ? ` a ${dia(m.fim)}` : ""}{m.indicador ? ` · ${m.indicador}` : ""}{m.premio ? ` · prêmio: ${m.premio}` : ""}
                {m.resultado ? (
                  <div className="mudo" style={{ fontSize: 13.5 }}>Vencedor(a): {m.vencedor ?? "—"} · {m.resultado}</div>
                ) : (
                  <div className="grade g2 mt" style={{ gap: 8 }}>
                    <input type="text" placeholder="Quem venceu" value={fechar[m.id]?.vencedor ?? ""} onChange={(e) => setFechar({ ...fechar, [m.id]: { vencedor: e.target.value, resultado: fechar[m.id]?.resultado ?? "" } })} />
                    <div className="linha" style={{ flexWrap: "nowrap" }}>
                      <input type="text" placeholder="O resultado (ex.: PA foi de 1,6 para 2,1)" value={fechar[m.id]?.resultado ?? ""} onChange={(e) => setFechar({ ...fechar, [m.id]: { vencedor: fechar[m.id]?.vencedor ?? "", resultado: e.target.value } })} />
                      <button className="btn p peq" type="button" disabled={!fechar[m.id]?.resultado} onClick={async () => { await fecharGincana(m.id, fechar[m.id].vencedor, fechar[m.id].resultado); recarregar(); }}>Fechar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Gincanas /></Suspense>;
}
