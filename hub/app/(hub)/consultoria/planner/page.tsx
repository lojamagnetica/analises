"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataCurta, hoje } from "@/lib/formato";
import {
  COR_FRENTE, DIAS_SEMANA, ativa, mesCurto, FREQS, FRENTES, buscarPlanner, cumprimento, deHoje, modeloPlanner, novoBloco, salvarPlanner,
  type Bloco, type Freq, type Frente, type Planner,
} from "@/lib/planner";

const passos = (como: string) => como.split("\n").map((x) => x.trim()).filter(Boolean);

/** O dia fixo da demanda: dia da semana ou do mês, ou "a definir". */
function EscolherDia({ b, mudar }: { b: Bloco; mudar: (b: Bloco) => void }) {
  if (b.freq === "diaria") return null;
  const opcoes: [number, string][] = b.freq === "semanal"
    ? [1, 2, 3, 4, 5, 6].map((n) => [n, DIAS_SEMANA[n]])
    : [...Array.from({ length: 28 }, (_, i): [number, string] => [i + 1, `Dia ${i + 1}`]), [0, "Último dia do mês"]];
  return (
    <select value={b.dia ?? ""} aria-label="Dia fixo" style={{ marginTop: 8, borderColor: b.dia === null ? "var(--red)" : undefined }}
      onChange={(e) => mudar({ ...b, dia: e.target.value === "" ? null : Number(e.target.value) })}>
      <option value="">Dia a definir</option>
      {opcoes.map(([n, t]) => <option key={n} value={n}>{t}</option>)}
    </select>
  );
}

/** Quem faz: preenchido direto no cartão (na reunião, junto com o dia). */
function QuemFaz({ b, mudar }: { b: Bloco; mudar: (b: Bloco) => void }) {
  const [v, setV] = useState(b.quem);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13 }}>
      👤
      <input type="text" placeholder="Quem faz?" value={v} onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v.trim() !== b.quem) mudar({ ...b, quem: v.trim() }); }}
        style={{ margin: 0, padding: "6px 8px", fontSize: 13, borderColor: b.quem ? undefined : "var(--red)" }} />
    </label>
  );
}

/** Uma demanda: o que é, quem faz, o dia fixo e o passo a passo, com editar e excluir. */
function Cartao({ b, mudar, tirar }: { b: Bloco; mudar: (b: Bloco) => void; tirar: () => void }) {
  const [editando, setEditando] = useState(!b.titulo);
  const borda = { padding: 12, borderLeft: `4px solid ${COR_FRENTE[b.frente]}` };
  if (editando) {
    return (
      <div className="card" style={borda}>
        <div className="linha" style={{ gap: 6 }}>
          <select value={b.freq} aria-label="Frequência" onChange={(e) => mudar({ ...b, freq: e.target.value as Freq, dia: null })}>
            {FREQS.map((f) => <option key={f.id} value={f.id}>{f.titulo}</option>)}
          </select>
          <select value={b.frente} aria-label="Frente" onChange={(e) => mudar({ ...b, frente: e.target.value as Frente })}>
            {FRENTES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <input type="text" placeholder="A demanda" value={b.titulo} onChange={(e) => mudar({ ...b, titulo: e.target.value })} />
        <input type="text" placeholder="Para que serve (opcional)" value={b.detalhe} onChange={(e) => mudar({ ...b, detalhe: e.target.value })} />
        <input type="text" placeholder="Quem faz" value={b.quem} onChange={(e) => mudar({ ...b, quem: e.target.value })} />
        <label className="ajuda" style={{ display: "block" }}>Começa em (deixe vazio se já vale agora)
          <input type="month" value={b.inicio ?? ""} onChange={(e) => mudar({ ...b, inicio: e.target.value || null })} />
        </label>
        <textarea rows={5} placeholder="Como fazer: um passo por linha" value={b.como} onChange={(e) => mudar({ ...b, como: e.target.value })} />
        <div className="linha" style={{ gap: 6 }}>
          <button type="button" className="btn p peq" disabled={!b.titulo.trim()} onClick={() => setEditando(false)}>Pronto</button>
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm("Excluir esta demanda do planner?")) tirar(); }}>Excluir</button>
        </div>
      </div>
    );
  }
  const lista = passos(b.como);
  return (
    <div className="card" style={borda}>
      <div className="linha entre">
        <small style={{ color: COR_FRENTE[b.frente], fontWeight: 700 }}>
          {b.frente}{!ativa(b) && b.inicio && <span className="selo espera" style={{ marginLeft: 6 }}>a partir de {mesCurto(b.inicio)}</span>}
        </small>
        <button type="button" className="link-loja" style={{ fontSize: 12.5 }} onClick={() => setEditando(true)}>Editar</button>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{b.titulo}</div>
      {b.detalhe && <small className="mudo">{b.detalhe}</small>}
      {lista.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Como fazer</summary>
          <ol style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: 13.5 }}>{lista.map((x, i) => <li key={i} style={{ marginBottom: 3 }}>{x}</li>)}</ol>
        </details>
      )}
      <QuemFaz key={b.quem} b={b} mudar={mudar} />
      <EscolherDia b={b} mudar={mudar} />
    </div>
  );
}

export default function PlannerGestao() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(async () => ({ salvo: await buscarPlanner(portal.id) }), [portal.id]);
  const [p, setP] = useState<Planner | null>(null);
  const [filtro, setFiltro] = useState<Frente | null>(null);
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
  const mudar = (b: Bloco) => salvar({ ...atual, blocos: atual.blocos.map((x) => (x.id === b.id ? b : x)) });
  const tirar = (bid: string) => salvar({ ...atual, blocos: atual.blocos.filter((x) => x.id !== bid) });
  const cumpre = cumprimento(atual);
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(new Date(`${d}T12:00:00Z`));
  const hojeDow = new Date(`${d}T12:00:00Z`).getUTCDay();
  const ordem = (b: Bloco) => FRENTES.indexOf(b.frente) * 100 + (b.dia === null ? 99 : b.dia || 32);
  const ativos = atual.blocos.filter((b) => ativa(b, d));
  const depois = atual.blocos.filter((b) => !ativa(b, d) && (!filtro || b.frente === filtro)).sort((a, b) => (a.inicio ?? "").localeCompare(b.inicio ?? ""));
  const semDia = ativos.filter((b) => b.freq !== "diaria" && b.dia === null).length;
  const semQuem = ativos.filter((b) => !b.quem.trim()).length;
  const semanais = ativos.filter((b) => b.freq === "semanal");

  return (
    <>
      <Titulo titulo="Planner de gestão" sub="Todas as demandas da sua gestão, separadas em diárias, semanais e mensais, com o passo a passo de cada uma. Comece pelo foco de hoje e marque o que fizer." />

      {equipe && (
        <div className={`aviso mb ${atual.liberado ? "ok" : ""}`}>
          {atual.liberado
            ? <>A loja já vê este planner. <button type="button" className="link-loja" onClick={() => salvar({ ...atual, liberado: false }, "Voltou para rascunho.")}>Voltar para rascunho</button></>
            : <>Rascunho: só a equipe vê. Ajuste as demandas e os dias e libere quando estiver pronto. <button type="button" className="btn p peq" style={{ marginLeft: 8 }} onClick={() => { if (confirm("Liberar o planner para a loja?")) salvar({ ...atual, liberado: true }, "Liberado para a loja."); }}>Liberar para a loja</button></>}
        </div>
      )}
      {erro && <div className="aviso mb">{erro}</div>}
      {salvo && <div className="aviso ok mb">{salvo}</div>}

      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
        <div className="linha entre">
          <h2 style={{ margin: 0, textTransform: "capitalize" }}>Hoje · {semana}, {dataCurta(d)}</h2>
          {cumpre.previstos > 0 && <small className="mudo">Últimos 7 dias: {cumpre.feitos} de {cumpre.previstos} feitas</small>}
        </div>
        {!lista.length && <p className="mudo" style={{ margin: "8px 0 0" }}>Nenhuma demanda fixa hoje. Bom dia para colocar em dia o que ficou para trás.</p>}
        {FRENTES.filter((f) => lista.some((b) => b.frente === f)).map((f) => (
          <div key={f} className="mt">
            <b style={{ color: COR_FRENTE[f] }}>{f}</b>
            {lista.filter((b) => b.frente === f).map((b) => {
              const ok = feitos.includes(b.id);
              return (
                <label key={b.id} className="marcar" style={{ gap: 10 }}>
                  <input type="checkbox" checked={ok} onChange={(e) => marcar(b.id, e.target.checked)} />
                  <span style={ok ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
                    <b>{b.titulo}</b>{b.quem ? <small> · 👤 {b.quem}</small> : ""}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
        {semDia > 0 && <p className="ajuda" style={{ marginTop: 10 }}>{semDia} {semDia === 1 ? "demanda ainda está" : "demandas ainda estão"} sem dia fixo. Elas entram aqui assim que o dia for escolhido.</p>}
        {semQuem > 0 && <p className="ajuda" style={{ marginTop: 4 }}>{semQuem} {semQuem === 1 ? "demanda ainda está" : "demandas ainda estão"} sem quem faz.</p>}
      </div>

      <div className="secao">A semana</div>
      <div className="grade mb" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {[1, 2, 3, 4, 5, 6].map((dia) => (
          <div key={dia} style={{ background: dia === hojeDow ? "var(--accent-soft)" : "var(--soft)", borderRadius: 12, padding: 10 }}>
            <b>{DIAS_SEMANA[dia]}</b>
            {semanais.filter((b) => b.dia === dia).sort((a, b) => ordem(a) - ordem(b)).map((b) => (
              <div key={b.id} style={{ fontSize: 12.5, marginTop: 6, paddingLeft: 6, borderLeft: `3px solid ${COR_FRENTE[b.frente]}` }}>{b.titulo}</div>
            ))}
            {!semanais.some((b) => b.dia === dia) && <div className="mudo" style={{ fontSize: 12.5, marginTop: 6 }}>Livre</div>}
          </div>
        ))}
      </div>

      <div className="linha entre" style={{ flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0 }}>As demandas da gestão</h2>
        <div className="chips">
          <button type="button" className={`chip ${filtro === null ? "escolhido" : ""}`} onClick={() => setFiltro(null)}>Todas</button>
          {FRENTES.map((f) => (
            <button key={f} type="button" className={`chip ${filtro === f ? "escolhido" : ""}`} style={{ borderColor: COR_FRENTE[f], color: filtro === f ? undefined : COR_FRENTE[f] }} onClick={() => setFiltro(filtro === f ? null : f)}>{f}</button>
          ))}
        </div>
      </div>
      {FREQS.map((fq) => {
        const itens = ativos.filter((b) => b.freq === fq.id && (!filtro || b.frente === filtro)).sort((a, b) => ordem(a) - ordem(b));
        return (
          <div key={fq.id} className="mb">
            <div className="secao">{fq.titulo} · {itens.length}</div>
            <p className="mudo" style={{ margin: "-4px 0 10px", fontSize: 13.5 }}>{fq.sub}</p>
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {itens.map((b) => <Cartao key={b.id} b={b} mudar={mudar} tirar={() => tirar(b.id)} />)}
              <button type="button" className="btn s peq" style={{ alignSelf: "start" }} onClick={() => salvar({ ...atual, blocos: [...atual.blocos, novoBloco(fq.id, filtro ?? "Gestão")] })}>+ demanda</button>
            </div>
          </div>
        );
      })}
      {depois.length > 0 && (
        <div className="mb">
          <div className="secao">Começam depois · {depois.length}</div>
          <p className="mudo" style={{ margin: "-4px 0 10px", fontSize: 13.5 }}>Demandas que só entram no planner a partir do mês marcado. Até lá, ficam fora do Hoje e da semana.</p>
          <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {depois.map((b) => <Cartao key={b.id} b={b} mudar={mudar} tirar={() => tirar(b.id)} />)}
          </div>
        </div>
      )}
      {!dados.salvo && !p && equipe && <p className="ajuda">Este é o modelo de partida. Ele é salvo assim que você mexer em alguma coisa.</p>}
    </>
  );
}
