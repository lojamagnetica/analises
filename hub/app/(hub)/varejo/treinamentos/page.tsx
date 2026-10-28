"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import { TIPOS_TREINO, buscarTreinamentos, excluirTreinamento, salvarTreinamento, sugerirTreinos, type Treinamento } from "@/lib/varejo";

const novo = (): Partial<Treinamento> => ({ dia: hoje(), tipo: "produto", tema: "", conduz: "", participantes: "Todo o time de vendas", material: "", obs: "", feito: false });

/** Cronograma de treinamento de produtos e vendas: um por semana, com quem conduz, quem participa e o material. */
export default function Treinamentos() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => {
    const { data: marcas } = await supabaseBrowser().from("loja_marcas").select("nome").eq("portal_id", portal.id).limit(4);
    return { l: await buscarTreinamentos(portal.id), marcas: ((marcas ?? []) as { nome: string }[]).map((m) => m.nome) };
  }, [portal.id]);
  const [ed, setEd] = useState<Partial<Treinamento> | null>(null);
  const [ver, setVer] = useState<"proximos" | "feitos">("proximos");
  if (!dados) return <Carregando />;
  const l = dados.l;
  const hj = hoje();
  const lista = ver === "proximos" ? l.filter((t) => !t.feito) : l.filter((t) => t.feito).reverse();
  const mes = hj.slice(0, 7);
  const doMes = l.filter((t) => t.dia.slice(0, 7) === mes);

  return (
    <>
      <Titulo titulo="Treinamentos de produto e vendas" sub="O cronograma de treinamentos do time: um por semana, alternando produto (coleção, marcas, linhas) e vendas (abordagem, objeções, fechamento). Cada um com quem conduz, quem participa e o material." />
      <div className="grade g3 mb">
        <div className="kpi"><small>Neste mês</small><b style={{ fontSize: 26 }}>{doMes.filter((t) => t.feito).length} / {doMes.length}</b><small className="mudo">feitos / programados</small></div>
        <div className="kpi"><small>Atrasados</small><b style={{ fontSize: 26, color: l.some((t) => !t.feito && t.dia < hj) ? "var(--red)" : undefined }}>{l.filter((t) => !t.feito && t.dia < hj).length}</b></div>
        <div className="kpi"><small>Feitos no total</small><b style={{ fontSize: 26 }}>{l.filter((t) => t.feito).length}</b><small className="mudo">{l.filter((t) => t.feito && t.tipo === "produto").length} de produto · {l.filter((t) => t.feito && t.tipo === "vendas").length} de vendas</small></div>
      </div>
      <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn p peq" onClick={() => setEd(novo())}>+ Treinamento</button>
        <button type="button" className="btn s peq" onClick={async () => {
          const ultimo = l[l.length - 1]?.dia;
          const inicio = ultimo && ultimo >= hj ? new Date(Date.parse(ultimo) + 7 * 86_400_000).toISOString().slice(0, 10) : hj;
          if (!confirm(`Programar 4 semanas de treinamento a partir de ${dia(inicio)}?`)) return;
          for (const t of sugerirTreinos(inicio, dados.marcas)) await salvarTreinamento(portal.id, null, { ...t, participantes: "Todo o time de vendas" });
          recarregar();
        }}>✨ Sugerir as próximas 4 semanas</button>
        <div className="chips">
          <button type="button" className={`chip${ver === "proximos" ? " escolhido" : ""}`} onClick={() => setVer("proximos")}>Programados</button>
          <button type="button" className={`chip${ver === "feitos" ? " escolhido" : ""}`} onClick={() => setVer("feitos")}>Feitos</button>
        </div>
      </div>
      {ed && (
        <div className="card mb">
          <div className="grade g3" style={{ gap: "0 8px" }}>
            <label className="ajuda" style={{ display: "block" }}>Dia<input type="date" value={ed.dia ?? ""} onChange={(e) => setEd({ ...ed, dia: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Tipo<select value={ed.tipo} onChange={(e) => setEd({ ...ed, tipo: e.target.value })}>{Object.entries(TIPOS_TREINO).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}</select></label>
            <label className="ajuda" style={{ display: "block" }}>Quem conduz<input type="text" value={ed.conduz ?? ""} onChange={(e) => setEd({ ...ed, conduz: e.target.value })} /></label>
          </div>
          <label className="ajuda" style={{ display: "block" }}>Tema<input type="text" value={ed.tema ?? ""} onChange={(e) => setEd({ ...ed, tema: e.target.value })} placeholder="Ex.: coleção de verão: peças-chave e como combinar" /></label>
          <div className="grade g2" style={{ gap: "0 8px" }}>
            <label className="ajuda" style={{ display: "block" }}>Quem participa<input type="text" value={ed.participantes ?? ""} onChange={(e) => setEd({ ...ed, participantes: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Material (link do vídeo, PDF ou catálogo)<input type="text" value={ed.material ?? ""} onChange={(e) => setEd({ ...ed, material: e.target.value })} /></label>
          </div>
          <label className="ajuda" style={{ display: "block" }}>Como foi / combinados<textarea rows={2} value={ed.obs ?? ""} onChange={(e) => setEd({ ...ed, obs: e.target.value })} /></label>
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" disabled={!ed.tema?.trim() || !ed.dia} onClick={async () => { const { id, portal_id: _p, ...d } = ed; await salvarTreinamento(portal.id, id ?? null, d); setEd(null); recarregar(); }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setEd(null)}>Cancelar</button>
          </div>
        </div>
      )}
      <div className="card">
        {!lista.length && <p className="mudo" style={{ margin: 0 }}>{ver === "proximos" ? "Nenhum treinamento programado. Use a sugestão das próximas 4 semanas." : "Nenhum treinamento feito ainda."}</p>}
        {lista.map((t) => (
          <div key={t.id} style={{ borderTop: "1px solid var(--line)", padding: "8px 0" }}>
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span><span className={`selo ${TIPOS_TREINO[t.tipo]?.classe ?? "espera"}`} style={{ fontSize: 11 }}>{TIPOS_TREINO[t.tipo]?.nome ?? t.tipo}</span> <b>{t.tema}</b>
                <br /><small className="mudo" style={{ color: !t.feito && t.dia < hj ? "var(--red)" : undefined }}>{dia(t.dia)}{!t.feito && t.dia < hj ? " (atrasado)" : ""} · {t.conduz || "quem conduz?"} · {t.participantes}</small></span>
              <span className="linha" style={{ gap: 10 }}>
                {t.material && <a className="link-loja" href={t.material} target="_blank" rel="noopener">Material</a>}
                <button type="button" className={`btn ${t.feito ? "s" : "p"} peq`} onClick={async () => { await salvarTreinamento(portal.id, t.id, { feito: !t.feito }); recarregar(); }}>{t.feito ? "Desfazer" : "Feito"}</button>
                <button type="button" className="link-loja" onClick={() => setEd(t)}>Editar</button>
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir o treinamento "${t.tema}"?`)) { await excluirTreinamento(t.id); recarregar(); } }}>Excluir</button>
              </span>
            </div>
            {t.obs && <small className="mudo">{t.obs}</small>}
          </div>
        ))}
      </div>
    </>
  );
}
