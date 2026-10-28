"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { MESES_ABREV, hoje, moeda } from "@/lib/formato";
import { buscarMeses, excluirMes, salvarMes, type SiteMes } from "@/lib/site";

const vazio = (mes: string): Omit<SiteMes, "portal_id"> => ({ mes, faturamento: 0, pedidos: 0, visitas: 0, clientes_novos: 0, meta: 0, obs: "" });
const nomeMes = (m: string) => `${MESES_ABREV[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

/** Painel do site: os números de cada mês (da plataforma), com ticket, conversão e meta. */
export default function PainelSite() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarMeses(portal.id), [portal.id]);
  const [ed, setEd] = useState<Omit<SiteMes, "portal_id"> | null>(null);
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const atual = hoje().slice(0, 7);
  const m = dados[0];
  const ant = dados[1];
  const ticket = (x?: SiteMes) => (x && x.pedidos ? Number(x.faturamento) / x.pedidos : 0);
  const conv = (x?: SiteMes) => (x && x.visitas ? (x.pedidos / x.visitas) * 100 : 0);
  const varia = (a: number, b: number) => (b ? `${a >= b ? "▲" : "▼"} ${Math.abs(Math.round(((a - b) / b) * 100))}% vs mês anterior` : "");
  const maior = Math.max(1, ...dados.map((x) => Number(x.faturamento)), ...dados.map((x) => Number(x.meta)));

  return (
    <>
      <Titulo titulo="Painel do site" sub="Os números do site mês a mês. Lance no começo de cada mês, olhando a plataforma (faturamento, pedidos e visitas)." />
      <div className="linha mb" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" onClick={() => setEd(dados.find((x) => x.mes === atual) ?? vazio(atual))}>Lançar o mês</button>
      </div>
      {ed && (
        <div className="card mb">
          <div className="grade g4" style={{ gap: "0 8px" }}>
            <label className="ajuda" style={{ display: "block" }}>Mês<input type="month" value={ed.mes} onChange={(e) => setEd(dados.find((x) => x.mes === e.target.value) ?? { ...vazio(e.target.value), meta: ed.meta })} /></label>
            {([["faturamento", "Faturamento (R$)"], ["meta", "Meta (R$)"], ["pedidos", "Pedidos"], ["visitas", "Visitas"], ["clientes_novos", "Clientes novos"]] as [keyof SiteMes, string][]).map(([k, rot]) => (
              <label key={k} className="ajuda" style={{ display: "block" }}>{rot}<input type="number" min={0} value={Number(ed[k as keyof typeof ed]) || ""} onChange={(e) => setEd({ ...ed, [k]: Number(e.target.value) })} /></label>
            ))}
          </div>
          <label className="ajuda" style={{ display: "block" }}>O que aconteceu no mês (campanha, problema, novidade)<textarea rows={2} value={ed.obs} onChange={(e) => setEd({ ...ed, obs: e.target.value })} /></label>
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" onClick={async () => { setErro(""); try { await salvarMes(portal.id, ed); setEd(null); recarregar(); } catch (e) { setErro((e as Error).message); } }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setEd(null)}>Cancelar</button>
          </div>
          {erro && <div className="aviso mt">{erro}</div>}
        </div>
      )}
      {!m && !ed && <div className="card mudo">Nenhum mês lançado ainda. Comece pelo mês passado e pelo atual.</div>}
      {m && (
        <>
          <h3 style={{ margin: "0 0 8px" }}>{nomeMes(m.mes)}</h3>
          <div className="grade g4 mb">
            <div className="kpi"><small>Faturamento{m.meta ? ` · ${Math.round((Number(m.faturamento) / Number(m.meta)) * 100)}% da meta` : ""}</small><b>{moeda(Number(m.faturamento))}</b><small className="mudo">{ant ? varia(Number(m.faturamento), Number(ant.faturamento)) : ""}</small></div>
            <div className="kpi"><small>Pedidos</small><b>{m.pedidos}</b><small className="mudo">{ant ? varia(m.pedidos, ant.pedidos) : ""}</small></div>
            <div className="kpi"><small>Ticket médio</small><b>{moeda(ticket(m))}</b><small className="mudo">{ant ? varia(ticket(m), ticket(ant)) : ""}</small></div>
            <div className="kpi"><small>Conversão (pedidos ÷ visitas)</small><b>{m.visitas ? `${conv(m).toFixed(2).replace(".", ",")}%` : "—"}</b><small className="mudo">{m.clientes_novos} clientes novos</small></div>
          </div>
        </>
      )}
      {dados.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Mês a mês</h3>
          {[...dados].reverse().map((x) => (
            <div key={x.mes} style={{ borderTop: "1px solid var(--line)", padding: "8px 0" }}>
              <div className="linha entre" style={{ gap: 8 }}>
                <b>{nomeMes(x.mes)}</b>
                <span>{moeda(Number(x.faturamento))} <small className="mudo">· {x.pedidos} pedidos · ticket {moeda(ticket(x))}</small></span>
              </div>
              <div style={{ position: "relative", height: 8, background: "var(--soft)", borderRadius: 6, margin: "6px 0" }}>
                <div style={{ width: `${(Number(x.faturamento) / maior) * 100}%`, height: "100%", background: "var(--red)", borderRadius: 6 }} />
                {Number(x.meta) > 0 && <div title="meta" style={{ position: "absolute", left: `${(Number(x.meta) / maior) * 100}%`, top: -3, width: 2, height: 14, background: "var(--ink)" }} />}
              </div>
              {x.obs && <small className="mudo">{x.obs}</small>}
              <div className="linha" style={{ gap: 12 }}>
                <button type="button" className="link-loja" onClick={() => { const { portal_id: _p, ...r } = x; setEd(r); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir os números de ${nomeMes(x.mes)}?`)) { await excluirMes(portal.id, x.mes); recarregar(); } }}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
