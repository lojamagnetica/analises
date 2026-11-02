"use client";

import { useState } from "react";
import { salvarEstrutura, type DadosConsultoria, type DiaVisita } from "@/lib/consultoria";

// Visita presencial da consultoria: um card por dia. A equipe escreve, edita, exclui e libera cada dia.
const novoId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

function FormDia({ d, aoSalvar, aoCancelar }: { d: DiaVisita; aoSalvar: (d: DiaVisita) => void; aoCancelar: () => void }) {
  const [v, setV] = useState(d);
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); aoSalvar({ ...v, data: v.data.trim(), titulo: v.titulo.trim(), objetivo: v.objetivo.trim(), material_url: v.material_url.trim() }); }}>
      <div className="grade g3">
        <div><label className="rotulo">Dia</label><input type="text" value={v.data} placeholder="Ex.: 02/11" onChange={(e) => setV({ ...v, data: e.target.value })} required /></div>
        <div style={{ gridColumn: "span 2" }}><label className="rotulo">Tema do dia</label><input type="text" value={v.titulo} placeholder="Ex.: Imersão de gestão" onChange={(e) => setV({ ...v, titulo: e.target.value })} /></div>
      </div>
      <label className="rotulo mt">Objetivo</label>
      <textarea rows={3} value={v.objetivo} onChange={(e) => setV({ ...v, objetivo: e.target.value })} />
      <label className="rotulo mt">Link do material (opcional)</label>
      <input type="url" value={v.material_url} placeholder="https://…" onChange={(e) => setV({ ...v, material_url: e.target.value })} />
      <div className="linha mt" style={{ gap: 8 }}>
        <button className="btn p peq" type="submit">Salvar</button>
        <button className="btn s peq" type="button" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

export function VisitaPresencial({ portalId, c, equipe, aoSalvar }: { portalId: string; c: DadosConsultoria; equipe: boolean; aoSalvar: () => void }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const dias = c.visita_dias ?? [];
  const visiveis = equipe ? dias : dias.filter((d) => d.liberado);
  if (!equipe && !visiveis.length) return null;

  const salvar = async (novos: DiaVisita[], periodo = c.visita_periodo) => {
    setErro("");
    try { await salvarEstrutura(portalId, { ...c, visita_dias: novos, visita_periodo: periodo }); setEditando(null); aoSalvar(); } catch (e) { setErro((e as Error).message); }
  };
  const gravar = (d: DiaVisita) => salvar(dias.some((x) => x.id === d.id) ? dias.map((x) => (x.id === d.id ? d : x)) : [...dias, d]);

  return (
    <>
      <div className="secao">Visita presencial · Consultoria{c.visita_periodo ? ` · ${c.visita_periodo}` : ""}</div>
      {equipe && (
        <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
          <label className="rotulo" style={{ margin: 0 }}>Período</label>
          <input type="text" defaultValue={c.visita_periodo ?? ""} placeholder="Ex.: 02 a 04/11" style={{ width: "auto" }}
            onBlur={(e) => { const p = e.target.value.trim(); if (p !== (c.visita_periodo ?? "")) salvar(dias, p); }} />
          <span className="ajuda">Cada dia fica em rascunho até você liberar.</span>
        </div>
      )}
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="grade g3">
        {visiveis.map((d) => editando === d.id
          ? <FormDia key={d.id} d={d} aoSalvar={gravar} aoCancelar={() => setEditando(null)} />
          : (
            <div key={d.id} className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
              <div className="linha entre">
                <small className="mudo">Dia {d.data}</small>
                {equipe && <span className={`selo ${d.liberado ? "feito" : "espera"}`}>{d.liberado ? "a loja vê" : "rascunho"}</span>}
              </div>
              {d.titulo ? <h3 style={{ margin: "4px 0 6px" }}>{d.titulo}</h3> : <p className="mudo" style={{ margin: "4px 0 6px" }}>Ainda não montado.</p>}
              {d.objetivo && <p style={{ margin: 0, whiteSpace: "pre-line" }}>{d.objetivo}</p>}
              {d.material_url && <a className="btn s peq mt" href={d.material_url} target="_blank" rel="noopener noreferrer">Abrir o material →</a>}
              {equipe && (
                <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className={`btn ${d.titulo ? "s" : "p"} peq`} type="button" onClick={() => setEditando(d.id)}>{d.titulo ? "Editar" : "Montar o dia"}</button>
                  <button className="btn s peq" type="button" onClick={() => { if (confirm(`Excluir o dia ${d.data}?`)) salvar(dias.filter((x) => x.id !== d.id)); }}>Excluir</button>
                  {!d.titulo ? null : d.liberado
                    ? <button className="btn s peq" type="button" onClick={() => gravar({ ...d, liberado: false })}>Voltar para rascunho</button>
                    : <button className="btn p peq" type="button" onClick={() => { if (confirm("Liberar este dia para a loja?")) gravar({ ...d, liberado: true }); }}>Liberar</button>}
                </div>
              )}
            </div>
          ))}
        {equipe && (editando === "novo"
          ? <FormDia d={{ id: novoId(), data: "", titulo: "", objetivo: "", material_url: "", liberado: false }} aoSalvar={gravar} aoCancelar={() => setEditando(null)} />
          : <button className="card" type="button" style={{ borderStyle: "dashed", cursor: "pointer" }} onClick={() => setEditando("novo")}>+ Adicionar dia</button>)}
      </div>
    </>
  );
}
