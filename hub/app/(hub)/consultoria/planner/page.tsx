"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataCurta, hoje } from "@/lib/formato";
import {
  COR_FRENTE, DIAS_SEMANA, FRENTES, buscarPlanner, cumprimento, deHoje, modeloPlanner, novoBloco, salvarPlanner,
  type Bloco, type Frente, type Planner,
} from "@/lib/planner";

/** Um bloco do planner: título, detalhe e quem faz, com editar e excluir. */
function Cartao({ b, editavel, mudar, tirar, rotuloDia }: { b: Bloco; editavel: boolean; mudar: (b: Bloco) => void; tirar: () => void; rotuloDia?: string }) {
  const [editando, setEditando] = useState(!b.titulo);
  if (editando && editavel) {
    return (
      <div className="card" style={{ padding: 10, borderLeft: `4px solid ${COR_FRENTE[b.frente]}` }}>
        <select value={b.frente} onChange={(e) => mudar({ ...b, frente: e.target.value as Frente })} aria-label="Frente">
          {FRENTES.map((f) => <option key={f}>{f}</option>)}
        </select>
        <input type="text" placeholder="O que fazer" value={b.titulo} onChange={(e) => mudar({ ...b, titulo: e.target.value })} />
        <input type="text" placeholder="Detalhe (opcional)" value={b.detalhe} onChange={(e) => mudar({ ...b, detalhe: e.target.value })} />
        <input type="text" placeholder="Quem faz (opcional)" value={b.quem} onChange={(e) => mudar({ ...b, quem: e.target.value })} />
        <div className="linha" style={{ gap: 6 }}>
          <button type="button" className="btn p peq" disabled={!b.titulo.trim()} onClick={() => setEditando(false)}>Pronto</button>
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm("Tirar esta etapa do planner?")) tirar(); }}>Excluir</button>
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 10, borderLeft: `4px solid ${COR_FRENTE[b.frente]}` }}>
      <small style={{ color: COR_FRENTE[b.frente], fontWeight: 700 }}>{b.frente}{rotuloDia ? ` · ${rotuloDia}` : ""}</small>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{b.titulo}</div>
      {b.detalhe && <small className="mudo">{b.detalhe}</small>}
      {b.quem && <div><small>👤 {b.quem}</small></div>}
      {editavel && <button type="button" className="link-loja" style={{ fontSize: 12.5 }} onClick={() => setEditando(true)}>Editar</button>}
    </div>
  );
}

const rotuloMensal = (d: number) => (d === 0 ? "último dia do mês" : `todo dia ${d}`);

export default function PlannerGestao() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(async () => ({ salvo: await buscarPlanner(portal.id) }), [portal.id]);
  const [p, setP] = useState<Planner | null>(null);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState("");
  if (!dados) return <Carregando />;
  const atual = p ?? dados.salvo ?? modeloPlanner();
  if (!atual.liberado && !equipe) {
    return (
      <>
        <Titulo titulo="Planner de gestão" />
        <div className="card">O seu planner de gestão está sendo montado pela Camilla. Ele aparece aqui assim que estiver pronto.</div>
      </>
    );
  }

  const salvar = async (novo: Planner, aviso = "") => {
    setP(novo); setErro(""); setSalvo("");
    try { await salvarPlanner(portal.id, novo); if (aviso) setSalvo(aviso); } catch (e) { setErro((e as Error).message); }
  };
  const d = hoje();
  const lista = deHoje(atual, d);
  const feitos = atual.feitos[d] ?? [];
  const marcar = (bid: string, ok: boolean) => salvar({ ...atual, feitos: { ...atual.feitos, [d]: ok ? [...new Set([...feitos, bid])] : feitos.filter((x) => x !== bid) } });
  const mudarBloco = (campo: "blocos" | "mensal") => (b: Bloco) => salvar({ ...atual, [campo]: atual[campo].map((x) => (x.id === b.id ? b : x)) });
  const tirarBloco = (campo: "blocos" | "mensal", bid: string) => salvar({ ...atual, [campo]: atual[campo].filter((x) => x.id !== bid) });
  const cumpre = cumprimento(atual);
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(new Date(`${d}T12:00:00Z`));

  return (
    <>
      <Titulo titulo="Planner de gestão" sub="O dia de cada etapa da sua gestão, separado em varejo, atacado, gestão e equipe. Comece pelo foco de hoje e marque o que fizer." />

      {equipe && (
        <div className={`aviso mb ${atual.liberado ? "ok" : ""}`}>
          {atual.liberado
            ? <>A loja já vê este planner. <button type="button" className="link-loja" onClick={() => salvar({ ...atual, liberado: false }, "Voltou para rascunho.")}>Voltar para rascunho</button></>
            : <>Rascunho: só a equipe vê. Ajuste os dias e os textos e libere quando estiver pronto. <button type="button" className="btn p peq" style={{ marginLeft: 8 }} onClick={() => { if (confirm("Liberar o planner para a loja?")) salvar({ ...atual, liberado: true }, "Liberado para a loja."); }}>Liberar para a loja</button></>}
        </div>
      )}
      {erro && <div className="aviso mb">{erro}</div>}
      {salvo && <div className="aviso ok mb">{salvo}</div>}

      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
        <div className="linha entre">
          <h2 style={{ margin: 0, textTransform: "capitalize" }}>Hoje · {semana}, {dataCurta(d)}</h2>
          {cumpre.previstos > 0 && <small className="mudo">Últimos 7 dias: {cumpre.feitos} de {cumpre.previstos} etapas feitas</small>}
        </div>
        {!lista.length && <p className="mudo" style={{ margin: "8px 0 0" }}>Nenhuma etapa fixa hoje. Bom dia para colocar em dia o que ficou para trás.</p>}
        {FRENTES.filter((f) => lista.some((b) => b.frente === f)).map((f) => (
          <div key={f} className="mt">
            <b style={{ color: COR_FRENTE[f] }}>{f}</b>
            {lista.filter((b) => b.frente === f).map((b) => {
              const ok = feitos.includes(b.id);
              return (
                <label key={b.id} className="marcar" style={{ gap: 10 }}>
                  <input type="checkbox" checked={ok} onChange={(e) => marcar(b.id, e.target.checked)} />
                  <span style={ok ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
                    <b>{b.titulo}</b>{b.detalhe ? <span className="mudo"> · {b.detalhe}</span> : ""}{b.quem ? <small> · 👤 {b.quem}</small> : ""}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

      <div className="linha entre">
        <div className="secao">A semana</div>
        <div className="chips">{FRENTES.map((f) => <span key={f} className="chip" style={{ borderColor: COR_FRENTE[f], color: COR_FRENTE[f] }}>{f}</span>)}</div>
      </div>
      <div className="grade mb" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((dia) => (
          <div key={dia} style={{ background: dia === new Date(`${d}T12:00:00Z`).getUTCDay() ? "var(--accent-soft)" : "var(--soft)", borderRadius: 14, padding: 10 }}>
            <b>{DIAS_SEMANA[dia]}</b>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {FRENTES.flatMap((f) => atual.blocos.filter((b) => b.dia === dia && b.frente === f)).map((b) => (
                <Cartao key={b.id} b={b} editavel mudar={mudarBloco("blocos")} tirar={() => tirarBloco("blocos", b.id)} />
              ))}
              <button type="button" className="btn s peq" onClick={() => salvar({ ...atual, blocos: [...atual.blocos, novoBloco(dia, "Gestão")] })}>+ etapa</button>
            </div>
          </div>
        ))}
      </div>

      <div className="secao">Todo mês</div>
      <div className="grade g4 mb">
        {[...atual.mensal].sort((a, b) => (a.dia || 32) - (b.dia || 32)).map((b) => (
          <div key={b.id}>
            <Cartao b={b} editavel rotuloDia={rotuloMensal(b.dia)} mudar={mudarBloco("mensal")} tirar={() => tirarBloco("mensal", b.id)} />
            <select value={b.dia} aria-label="Dia do mês" style={{ marginTop: 4 }} onChange={(e) => mudarBloco("mensal")({ ...b, dia: Number(e.target.value) })}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Todo dia {n}</option>)}
              <option value={0}>Último dia do mês</option>
            </select>
          </div>
        ))}
        <button type="button" className="btn s peq" style={{ alignSelf: "start" }} onClick={() => salvar({ ...atual, mensal: [...atual.mensal, novoBloco(1, "Gestão")] })}>+ data fixa do mês</button>
      </div>
      {!dados.salvo && !p && equipe && <p className="ajuda">Este é o modelo de partida. Ele é salvo assim que você mexer em alguma coisa.</p>}
    </>
  );
}
