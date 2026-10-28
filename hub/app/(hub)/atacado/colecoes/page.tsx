"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { CampoReais } from "@/components/CampoReais";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import { abertosNa, buscarAtacado, buscarColecoes, excluirColecao, salvarColecao, type Colecao } from "@/lib/atacado";

/** Meta de abertura por coleção: quantos lojistas novos cada coleção precisa abrir, e quem abriu. */
export default function Colecoes() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarAtacado(portal.id)), colecoes: await buscarColecoes(portal.id) }), [portal.id]);
  const [ed, setEd] = useState<Partial<Colecao> | null>(null);
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const hj = hoje();

  return (
    <>
      <Titulo titulo="Meta de abertura por coleção" sub="Cada coleção com a meta de lojistas novos (primeiro pedido) e de valor. A abertura conta quando a prospecção marca o primeiro pedido." />
      <button type="button" className="btn p peq mb" onClick={() => setEd({ nome: "", inicio: hj, fim: hj, meta_aberturas: 0, meta_valor: 0, obs: "" })}>+ Coleção</button>
      {ed && (
        <div className="card mb">
          <div className="grade g3" style={{ gap: "0 8px" }}>
            <label className="ajuda" style={{ display: "block" }}>Nome da coleção<input type="text" value={ed.nome ?? ""} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Começa a vender<input type="date" value={ed.inicio ?? ""} onChange={(e) => setEd({ ...ed, inicio: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Termina<input type="date" value={ed.fim ?? ""} onChange={(e) => setEd({ ...ed, fim: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Meta de lojistas novos<input type="number" min={0} value={ed.meta_aberturas || ""} onChange={(e) => setEd({ ...ed, meta_aberturas: Number(e.target.value) })} /></label>
            <CampoReais rotulo="Meta de valor dos novos" vazio valor={Number(ed.meta_valor ?? 0)} mudar={(v) => setEd({ ...ed, meta_valor: v })} />
          </div>
          <label className="ajuda" style={{ display: "block" }}>Observação (regras, prêmio por abertura…)<textarea rows={2} value={ed.obs ?? ""} onChange={(e) => setEd({ ...ed, obs: e.target.value })} /></label>
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" disabled={!ed.nome?.trim() || !ed.inicio || !ed.fim} onClick={async () => {
              setErro(""); const { id, portal_id: _p, ...d } = ed;
              try { await salvarColecao(portal.id, id ?? null, d); setEd(null); recarregar(); } catch (e) { setErro((e as Error).message); }
            }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setEd(null)}>Cancelar</button>
          </div>
          {erro && <div className="aviso mt">{erro}</div>}
        </div>
      )}
      {!dados.colecoes.length && !ed && <div className="card mudo">Cadastre a coleção atual e a próxima, com a meta de lojistas novos de cada uma.</div>}
      {dados.colecoes.map((col) => {
        const abertos = abertosNa(col, dados.clientes);
        const valor = abertos.reduce((s, c) => s + Number(c.total_ano), 0);
        const pct = col.meta_aberturas ? Math.min(100, Math.round((abertos.length / col.meta_aberturas) * 100)) : 0;
        const vigente = col.inicio <= hj && col.fim >= hj;
        const porVend = [...new Set(abertos.map((c) => c.vendedora || "(sem vendedora)"))].map((v) => ({ v, n: abertos.filter((c) => (c.vendedora || "(sem vendedora)") === v).length }));
        return (
          <div key={col.id} className="card card-borda mb" style={{ ["--c" as string]: vigente ? "var(--red)" : "var(--line)" }}>
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span><b style={{ fontSize: 16 }}>{col.nome}</b> {vigente && <span className="selo andamento">vendendo agora</span>}<br /><small className="mudo">{dia(col.inicio)} a {dia(col.fim)}</small></span>
              <span className="linha" style={{ gap: 12 }}>
                <button type="button" className="link-loja" onClick={() => setEd(col)}>Editar</button>
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir a coleção ${col.nome}?`)) { await excluirColecao(col.id); recarregar(); } }}>Excluir</button>
              </span>
            </div>
            <div className="grade g3 mt">
              <div className="kpi"><small>Lojistas novos</small><b style={{ fontSize: 26 }}>{abertos.length}{col.meta_aberturas ? ` / ${col.meta_aberturas}` : ""}</b></div>
              <div className="kpi"><small>Valor dos novos</small><b>{moeda(valor)}</b><small className="mudo">{col.meta_valor ? `meta ${moeda(Number(col.meta_valor))}` : ""}</small></div>
              <div className="kpi"><small>Em prospecção agora</small><b style={{ fontSize: 26 }}>{dados.prospects.filter((p) => p.etapa !== "Perdido").length}</b></div>
            </div>
            {col.meta_aberturas > 0 && <div style={{ height: 8, background: "var(--soft)", borderRadius: 6, margin: "10px 0" }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--red)", borderRadius: 6 }} /></div>}
            {porVend.length > 0 && <small className="mudo">Por vendedora: {porVend.map((x) => `${x.v} (${x.n})`).join(" · ")}</small>}
            {abertos.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 14 }}>{abertos.map((c) => <li key={c.id}>{c.nome} · {[c.cidade, c.uf].filter(Boolean).join("/")} · aberto em {dia(c.aberto_em)}</li>)}</ul>}
            {col.obs && <p className="mudo" style={{ marginBottom: 0 }}>{col.obs}</p>}
          </div>
        );
      })}
    </>
  );
}
