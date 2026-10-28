"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { FREQUENCIAS, buscarOperacao, criarPadrao, excluirItem, salvarItem, vencido, type ItemOperacao } from "@/lib/site";

/** Operação do site: o checklist do que precisa ser feito todo dia, semana e mês, com quem faz. */
export default function OperacaoSite() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ l: await buscarOperacao(portal.id) }), [portal.id]);
  const [ed, setEd] = useState<Partial<ItemOperacao> | null>(null);
  if (!dados) return <Carregando />;
  const l = dados.l;
  const pendentes = l.filter(vencido).length;

  return (
    <>
      <Titulo titulo="Operação do site" sub="O checklist da rotina do site. Marque quando fizer: o item volta a ficar pendente quando chega a próxima vez (dia, semana ou mês)." />
      {!l.length && (
        <div className="card mb">
          <p style={{ marginTop: 0 }}>Comece com o checklist sugerido (pedidos, estoque, novidades, régua de recompra, números do mês). Depois é só editar, tirar e colocar o que for da sua rotina.</p>
          <button type="button" className="btn p peq" onClick={async () => { await criarPadrao(portal.id); recarregar(); }}>Usar o checklist sugerido</button>
        </div>
      )}
      {l.length > 0 && <p className="mudo" style={{ marginTop: 0 }}>{pendentes ? `${pendentes} ite${pendentes === 1 ? "m pendente" : "ns pendentes"} agora.` : "Tudo em dia ✓"}</p>}
      {Object.entries(FREQUENCIAS).map(([f, { nome }]) => {
        const itens = l.filter((i) => i.frequencia === f);
        if (!itens.length) return null;
        return (
          <div key={f} className="card mb">
            <h3 style={{ marginTop: 0 }}>{nome}</h3>
            {itens.map((i) => (
              <div key={i.id} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0", gap: 8, flexWrap: "wrap" }}>
                <label className="linha" style={{ gap: 8, cursor: "pointer", flex: 1, minWidth: 200 }}>
                  <input type="checkbox" checked={!vencido(i)} onChange={async (e) => { await salvarItem(portal.id, i.id, { feito_em: e.target.checked ? hoje() : null }); recarregar(); }} style={{ width: "auto", margin: 0 }} />
                  <span style={{ textDecoration: vencido(i) ? undefined : "line-through", color: vencido(i) ? undefined : "var(--muted)" }}>{i.item}</span>
                </label>
                <small className="mudo">{i.responsavel || "sem responsável"}{i.feito_em ? ` · feito ${dia(i.feito_em)}` : ""}</small>
                <span className="linha" style={{ gap: 10 }}>
                  <button type="button" className="link-loja" onClick={() => setEd(i)}>Editar</button>
                  <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir “${i.item}”?`)) { await excluirItem(i.id); recarregar(); } }}>Excluir</button>
                </span>
              </div>
            ))}
          </div>
        );
      })}
      <button type="button" className="btn s peq" onClick={() => setEd({ item: "", frequencia: "semanal", responsavel: "", ordem: l.length })}>+ Item no checklist</button>
      {ed && (
        <div className="card mt">
          <div className="grade g3" style={{ gap: "0 8px" }}>
            <label className="ajuda" style={{ display: "block" }}>O que fazer<input type="text" value={ed.item ?? ""} onChange={(e) => setEd({ ...ed, item: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Quando<select value={ed.frequencia} onChange={(e) => setEd({ ...ed, frequencia: e.target.value })}>{Object.entries(FREQUENCIAS).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}</select></label>
            <label className="ajuda" style={{ display: "block" }}>Quem faz<input type="text" value={ed.responsavel ?? ""} onChange={(e) => setEd({ ...ed, responsavel: e.target.value })} /></label>
          </div>
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" disabled={!ed.item?.trim()} onClick={async () => { const { id, portal_id: _p, ...d } = ed; await salvarItem(portal.id, id ?? null, d); setEd(null); recarregar(); }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setEd(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
