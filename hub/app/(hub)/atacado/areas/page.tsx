"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { ETAPAS_PROSPECCAO, POTENCIAIS, STATUS_AREA, buscarAreas, buscarAtacado, excluirArea, salvarArea, salvarCliente, situacao, type Area } from "@/lib/atacado";

const nova = (): Partial<Area> => ({ cidade: "", uf: "", potencial: "medio", status: "mapeada", responsavel: "", motivo: "" });

/** Áreas potenciais para prospecção: as cidades onde vale buscar lojista, com o potencial e quem cuida. */
export default function Areas() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarAtacado(portal.id)), areas: await buscarAreas(portal.id) }), [portal.id]);
  const [ed, setEd] = useState<Partial<Area> | null>(null);
  const [ver, setVer] = useState("ativas");
  if (!dados) return <Carregando />;
  const chave = (cidade = "", uf = "") => `${cidade.trim().toLowerCase()}/${uf.trim().toUpperCase()}`;
  const mapeadas = new Set(dados.areas.map((a) => chave(a.cidade, a.uf)));
  // Sugestões: praças que esfriaram (todos parados) e ainda não estão mapeadas.
  const cidades = [...new Set(dados.clientes.filter((c) => c.cidade && c.uf).map((c) => chave(c.cidade, c.uf)))];
  const frias = cidades.map((k) => {
    const l = dados.clientes.filter((c) => c.cidade && chave(c.cidade, c.uf) === k);
    return { k, cidade: l[0].cidade, uf: l[0].uf, n: l.length, t: l.reduce((s, c) => s + Number(c.total_ano), 0), ativos: l.filter((c) => situacao(c) === "ativo").length };
  }).filter((x) => x.ativos === 0 && !mapeadas.has(x.k)).sort((a, b) => b.t - a.t).slice(0, 10);
  const lista = dados.areas.filter((a) => (ver === "ativas" ? !["aberta", "descartada"].includes(a.status) : true))
    .sort((a, b) => ["alto", "medio", "baixo"].indexOf(a.potencial) - ["alto", "medio", "baixo"].indexOf(b.potencial));
  const prospectsEm = (a: Area) => dados.prospects.filter((p) => chave(p.cidade, p.uf) === chave(a.cidade, a.uf) && p.etapa !== "Perdido").length;

  return (
    <>
      <Titulo titulo="Áreas para prospecção" sub="O mapa de onde buscar lojista novo: cidades sem a marca, praças que esfriaram e regiões com potencial. Cada área com o potencial, quem cuida e em que pé está." />
      <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn p peq" onClick={() => setEd(nova())}>+ Área</button>
        <div className="chips">
          <button type="button" className={`chip${ver === "ativas" ? " escolhido" : ""}`} onClick={() => setVer("ativas")}>Para trabalhar</button>
          <button type="button" className={`chip${ver === "todas" ? " escolhido" : ""}`} onClick={() => setVer("todas")}>Todas ({dados.areas.length})</button>
        </div>
      </div>
      {ed && (
        <div className="card mb">
          <div className="grade g3" style={{ gap: "0 8px" }}>
            <label className="ajuda" style={{ display: "block" }}>Cidade ou região<input type="text" value={ed.cidade ?? ""} onChange={(e) => setEd({ ...ed, cidade: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>UF<input type="text" maxLength={2} value={ed.uf ?? ""} onChange={(e) => setEd({ ...ed, uf: e.target.value.toUpperCase() })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Quem cuida<input type="text" value={ed.responsavel ?? ""} onChange={(e) => setEd({ ...ed, responsavel: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Potencial<select value={ed.potencial} onChange={(e) => setEd({ ...ed, potencial: e.target.value })}>{Object.entries(POTENCIAIS).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}</select></label>
            <label className="ajuda" style={{ display: "block" }}>Em que pé está<select value={ed.status} onChange={(e) => setEd({ ...ed, status: e.target.value })}>{Object.entries(STATUS_AREA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          <label className="ajuda" style={{ display: "block" }}>Por que tem potencial (tamanho, feira, polo de moda, perto de praça forte…)<textarea rows={2} value={ed.motivo ?? ""} onChange={(e) => setEd({ ...ed, motivo: e.target.value })} /></label>
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" disabled={!ed.cidade?.trim()} onClick={async () => { const { id, portal_id: _p, ...d } = ed; await salvarArea(portal.id, id ?? null, d); setEd(null); recarregar(); }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setEd(null)}>Cancelar</button>
          </div>
        </div>
      )}
      <div className="card mb">
        {!lista.length && <p className="mudo" style={{ margin: 0 }}>Nenhuma área mapeada ainda. Comece pelas sugestões abaixo ou cadastre as cidades que a equipe já conhece.</p>}
        {lista.map((a) => (
          <div key={a.id} style={{ borderTop: "1px solid var(--line)", padding: "8px 0" }}>
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span><b>{a.cidade}{a.uf ? `/${a.uf}` : ""}</b> <span className={`selo ${POTENCIAIS[a.potencial]?.classe ?? "espera"}`} style={{ fontSize: 11 }}>potencial {POTENCIAIS[a.potencial]?.nome.toLowerCase()}</span> <small className="mudo">· {STATUS_AREA[a.status] ?? a.status} · {a.responsavel || "sem responsável"} · {prospectsEm(a)} em prospecção</small></span>
              <span className="linha" style={{ gap: 12 }}>
                <button type="button" className="link-loja" onClick={async () => {
                  const nome = prompt(`Nome da loja para prospectar em ${a.cidade}:`); if (!nome?.trim()) return;
                  await salvarCliente(portal.id, null, { nome: nome.trim(), cidade: a.cidade, uf: a.uf, vendedora: a.responsavel, tipo: "prospect", etapa: ETAPAS_PROSPECCAO[0] });
                  if (a.status === "mapeada") await salvarArea(portal.id, a.id, { status: "prospectando" });
                  recarregar();
                }}>+ Lojista para prospectar</button>
                <button type="button" className="link-loja" onClick={() => setEd(a)}>Editar</button>
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir a área ${a.cidade}?`)) { await excluirArea(a.id); recarregar(); } }}>Excluir</button>
              </span>
            </div>
            {a.motivo && <small className="mudo">{a.motivo}</small>}
          </div>
        ))}
      </div>
      {frias.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sugestões: praças que esfriaram</h3>
          <p className="mudo" style={{ marginTop: 0 }}>Cidades onde a marca já vendeu e nenhum lojista comprou nos últimos 30 dias. Ou reativa quem está lá, ou busca um lojista novo.</p>
          {frias.map((x) => (
            <div key={x.k} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0", gap: 8 }}>
              <span><b>{x.cidade}/{x.uf}</b> <small className="mudo">{x.n} lojista{x.n === 1 ? "" : "s"} parado{x.n === 1 ? "" : "s"} · {moeda(x.t)} no ano</small></span>
              <button type="button" className="btn s peq" onClick={async () => { await salvarArea(portal.id, null, { cidade: x.cidade, uf: x.uf, potencial: "alto", status: "mapeada", motivo: `Praça que esfriou: ${x.n} lojista(s) parado(s), ${moeda(x.t)} no ano.` }); recarregar(); }}>Mapear</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
