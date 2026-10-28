"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { metasDoCanal } from "@/lib/plano-mes";
import { SITUACOES, buscarAtacado, curvaAbc, salvarCliente, situacao, type Situacao } from "@/lib/atacado";

/** Projeção por cliente: quanto se espera de cada lojista no período, somado por situação e por vendedora, contra a meta. */
export default function Projecao() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarAtacado(portal.id)), meta: await metasDoCanal(portal.id, "Atacado") }), [portal.id]);
  const [vend, setVend] = useState("");
  const [sit, setSit] = useState<Situacao | "">("");
  const [edit, setEdit] = useState<Record<string, number>>({});
  const [qtd, setQtd] = useState(60);
  if (!dados) return <Carregando />;
  const cs = dados.clientes;
  const proj = (id: string, atual: number) => edit[id] ?? atual;
  const curva = curvaAbc(cs);
  const vendedoras = [...new Set(cs.map((c) => c.vendedora).filter(Boolean))].sort();
  const lista = cs.filter((c) => (!vend || c.vendedora === vend) && (!sit || situacao(c) === sit));
  const soma = (l: typeof cs) => l.reduce((s, c) => s + proj(c.id, Number(c.projecao ?? 0)), 0);
  const total = soma(cs);
  const meta1 = dados.meta?.canal.faixas[0]?.valor ?? 0;
  const pendentes = Object.keys(edit).length;
  // Sugestão: quem está ativo repete a média do que comprou por pedido; em risco, metade; parado, zero até reativar.
  const sugerir = (c: (typeof cs)[number]) => {
    const media = c.pedidos ? Number(c.total_ano) / c.pedidos : Number(c.total_ano) / 4;
    const s = situacao(c);
    return Math.round((s === "ativo" ? media : s === "risco" ? media / 2 : 0) / 100) * 100;
  };

  return (
    <>
      <Titulo titulo="Projeção por cliente" sub="Quanto você espera de cada lojista no período (coleção ou mês), pela situação dele. A soma mostra se a carteira chega na meta." />
      <div className="grade g4 mb">
        <div className="kpi"><small>Projeção da carteira</small><b>{moeda(total)}</b></div>
        <div className="kpi"><small>{dados.meta ? `Meta 1 · ${dados.meta.nome}` : "Meta 1 do atacado"}</small><b>{meta1 ? moeda(meta1) : "—"}</b></div>
        <div className="kpi"><small>Falta para a meta</small><b style={{ color: meta1 > total ? "var(--red)" : undefined }}>{meta1 ? moeda(Math.max(0, meta1 - total)) : "—"}</b></div>
        <div className="kpi"><small>Lojistas com projeção</small><b style={{ fontSize: 26 }}>{cs.filter((c) => proj(c.id, Number(c.projecao ?? 0)) > 0).length} / {cs.length}</b></div>
      </div>
      <div className="grade g2 mb">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Por situação</h3>
          {(["ativo", "risco", "parado", "sem"] as Situacao[]).map((s) => {
            const l = cs.filter((c) => situacao(c) === s);
            return <div key={s} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0" }}><span><span className={`selo ${SITUACOES[s].classe}`}>{SITUACOES[s].nome}</span> <small className="mudo">{l.length} lojistas</small></span><b>{moeda(soma(l))}</b></div>;
          })}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Por vendedora</h3>
          {vendedoras.map((v) => {
            const l = cs.filter((c) => c.vendedora === v);
            return <div key={v} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0" }}><span><b>{v}</b> <small className="mudo">{l.length} lojistas</small></span><b>{moeda(soma(l))}</b></div>;
          })}
          {!vendedoras.length && <p className="mudo">Sem vendedora nos lojistas ainda.</p>}
        </div>
      </div>
      <div className="card">
        <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
          <select value={vend} onChange={(e) => setVend(e.target.value)} style={{ width: "auto", margin: 0 }}><option value="">Todas as vendedoras</option>{vendedoras.map((v) => <option key={v}>{v}</option>)}</select>
          <select value={sit} onChange={(e) => setSit(e.target.value as Situacao | "")} style={{ width: "auto", margin: 0 }}><option value="">Todas as situações</option>{(["ativo", "risco", "parado", "sem"] as Situacao[]).map((s) => <option key={s} value={s}>{SITUACOES[s].nome}</option>)}</select>
          <button type="button" className="btn s peq" onClick={() => {
            if (!confirm("Preencher a projeção dos lojistas da lista que estão sem valor, com a sugestão do Hub (ativo: a média por pedido; em risco: metade; parado: zero)?")) return;
            const n = { ...edit }; for (const c of lista) if (!Number(c.projecao) && n[c.id] == null) n[c.id] = sugerir(c); setEdit(n);
          }}>✨ Sugerir projeção</button>
        </div>
        {!cs.length && <p className="mudo">Importe a carteira para projetar por cliente.</p>}
        <div className="tabela-wrap"><table className="tabela">
          <thead><tr><th>Lojista</th><th>Situação</th><th>No ano</th><th>Projeção</th></tr></thead>
          <tbody>{lista.slice(0, qtd).map((c) => {
            const s = situacao(c);
            return (
              <tr key={c.id}>
                <td><b>{c.nome}</b> <span className="selo espera" style={{ fontSize: 11 }}>{curva.get(c.id)}</span>{c.exclusivo && <span className="selo andamento" style={{ fontSize: 11, marginLeft: 4 }}>exclusivo</span>}<br /><small className="mudo">{[c.cidade, c.uf].filter(Boolean).join("/")} · {c.vendedora || "sem vendedora"}</small></td>
                <td><span className={`selo ${SITUACOES[s].classe}`} style={{ fontSize: 11 }}>{SITUACOES[s].nome}</span></td>
                <td>{moeda(Number(c.total_ano))}</td>
                <td style={{ minWidth: 130 }}><input type="number" min={0} step={100} value={proj(c.id, Number(c.projecao ?? 0)) || ""} placeholder="0" onChange={(e) => setEdit({ ...edit, [c.id]: Number(e.target.value) })} style={{ margin: 0 }} /></td>
              </tr>
            );
          })}</tbody>
        </table></div>
        {lista.length > qtd && <button type="button" className="btn s peq mt" onClick={() => setQtd(qtd + 100)}>Mostrar mais</button>}
      </div>
      {pendentes > 0 && (
        <div className="card mt linha entre" style={{ position: "sticky", bottom: 12, gap: 10, boxShadow: "0 6px 20px rgba(0,0,0,.12)" }}>
          <span>{pendentes} projeç{pendentes === 1 ? "ão alterada" : "ões alteradas"}</span>
          <span className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" onClick={async () => { for (const [id, v] of Object.entries(edit)) await salvarCliente(portal.id, id, { projecao: v }); setEdit({}); recarregar(); }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setEdit({})}>Descartar</button>
          </span>
        </div>
      )}
    </>
  );
}
