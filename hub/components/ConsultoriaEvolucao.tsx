"use client";

import { useState } from "react";
import { STATUS_EVOLUCAO, salvarEstrutura, type DadosConsultoria, type Evolucao, type ItemEvolucao } from "@/lib/consultoria";

// "Do diagnóstico até aqui": o que o diagnóstico mostrou, o que já mudou e o que ainda vamos construir.
// A equipe escreve e libera; a loja só vê depois de liberado.

const CLASSE: Record<ItemEvolucao["status"], string> = { "Feito": "feito", "Em andamento": "andamento", "A construir": "espera", "Próximo ano": "espera" };
const novoItem = (): ItemEvolucao => ({ id: crypto.randomUUID().slice(0, 8), tema: "", titulo: "", antes: "", hoje: "", proximo: "", quando: "", status: "A construir" });

function Item({ it, equipe, mudar, tirar }: { it: ItemEvolucao; equipe: boolean; mudar: (it: ItemEvolucao) => void; tirar: () => void }) {
  const [editando, setEditando] = useState(!it.titulo);
  const [r, setR] = useState(it);
  if (editando && equipe) {
    const campo = (k: keyof ItemEvolucao, rotulo: string, longo = false) => (
      <label className="ajuda" style={{ display: "block" }}>{rotulo}
        {longo
          ? <textarea rows={2} value={r[k]} onChange={(e) => setR({ ...r, [k]: e.target.value })} />
          : <input type="text" value={r[k]} onChange={(e) => setR({ ...r, [k]: e.target.value })} />}
      </label>
    );
    return (
      <div className="card">
        {campo("titulo", "O ponto")}
        {campo("tema", "Tema (ex.: Dados e controle, Atacado, Equipe)")}
        {campo("antes", "O que o diagnóstico mostrou", true)}
        {campo("hoje", "O que já mudou", true)}
        {campo("proximo", "Próximo passo", true)}
        <div className="linha" style={{ gap: 8 }}>
          <select value={r.status} aria-label="Situação" onChange={(e) => setR({ ...r, status: e.target.value as ItemEvolucao["status"] })} style={{ width: "auto" }}>
            {STATUS_EVOLUCAO.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="text" placeholder="Quando (ex.: Novembro)" value={r.quando} onChange={(e) => setR({ ...r, quando: e.target.value })} style={{ flex: 1 }} />
        </div>
        <div className="linha mt" style={{ gap: 8 }}>
          <button type="button" className="btn p peq" disabled={!r.titulo.trim()} onClick={() => { mudar(r); setEditando(false); }}>Salvar</button>
          {it.titulo && <button type="button" className="btn s peq" onClick={() => { setR(it); setEditando(false); }}>Cancelar</button>}
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Excluir "${it.titulo || "este ponto"}"?`)) tirar(); }}>Excluir</button>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="linha entre" style={{ alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          {it.tema && <small className="mudo" style={{ fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{it.tema}</small>}
          <h3 style={{ margin: "2px 0 6px" }}>{it.titulo}</h3>
        </div>
        <span className={`selo ${CLASSE[it.status]}`} style={{ whiteSpace: "nowrap" }}>{it.status === "Feito" ? "✓ Feito" : it.status}{it.quando && it.status !== "Feito" ? ` · ${it.quando}` : ""}</span>
      </div>
      {it.antes && <p style={{ margin: "0 0 6px", fontSize: 14 }}><b>Antes:</b> {it.antes}</p>}
      {it.hoje && <p style={{ margin: "0 0 6px", fontSize: 14 }}><b>Hoje:</b> {it.hoje}</p>}
      {it.proximo && <p style={{ margin: 0, fontSize: 14 }}><b>Próximo passo:</b> {it.proximo}</p>}
      {equipe && <button type="button" className="link-loja mt" style={{ fontSize: 12.5 }} onClick={() => setEditando(true)}>Editar</button>}
    </div>
  );
}

export function ConsultoriaEvolucao({ portalId, c, equipe, encontros, aoSalvar }: { portalId: string; c: DadosConsultoria; equipe: boolean; encontros: number; aoSalvar: () => void }) {
  const [erro, setErro] = useState("");
  const ev: Evolucao = c.evolucao ?? { resumo: "", liberado: false, itens: [] };
  if (!equipe && (!ev.liberado || !ev.itens.length)) return null;

  const salvar = async (novo: Evolucao) => {
    setErro("");
    try { await salvarEstrutura(portalId, { ...c, evolucao: novo }); aoSalvar(); } catch (e) { setErro((e as Error).message); }
  };
  const mudar = (it: ItemEvolucao) => salvar({ ...ev, itens: ev.itens.some((x) => x.id === it.id) ? ev.itens.map((x) => (x.id === it.id ? it : x)) : [...ev.itens, it] });
  const tirar = (id: string) => salvar({ ...ev, itens: ev.itens.filter((x) => x.id !== id) });
  const mudou = ev.itens.filter((x) => x.status === "Feito" || x.status === "Em andamento");
  const vem = ev.itens.filter((x) => x.status === "A construir" || x.status === "Próximo ano");
  const feitos = ev.itens.filter((x) => x.status === "Feito").length;

  return (
    <div className="mb">
      <div className="secao">Do diagnóstico até aqui</div>
      {equipe && (
        <div className={`aviso mb ${ev.liberado ? "ok" : ""}`}>
          {ev.liberado
            ? <>A loja já vê esta parte. <button type="button" className="link-loja" onClick={() => salvar({ ...ev, liberado: false })}>Voltar para rascunho</button></>
            : <>Rascunho: só a equipe vê. <button type="button" className="btn p peq" style={{ marginLeft: 8 }} onClick={() => { if (confirm("Liberar para a loja?")) salvar({ ...ev, liberado: true }); }}>Liberar para a loja</button></>}
        </div>
      )}
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
        {equipe ? (
          <label className="ajuda" style={{ display: "block", margin: 0 }}>O que o diagnóstico mostrou (resumo)
            <textarea rows={2} defaultValue={ev.resumo} onBlur={(e) => { if (e.target.value.trim() !== ev.resumo) salvar({ ...ev, resumo: e.target.value.trim() }); }} />
          </label>
        ) : ev.resumo && <p style={{ margin: "0 0 10px", fontSize: 15.5 }}>{ev.resumo}</p>}
        <div className="linha" style={{ gap: 16, marginTop: 8 }}>
          {encontros > 0 && <span><b style={{ fontSize: 22 }}>{encontros}</b> <small className="mudo">encontros realizados</small></span>}
          <span><b style={{ fontSize: 22 }}>{feitos}</b> <small className="mudo">feitos</small></span>
          <span><b style={{ fontSize: 22 }}>{mudou.length - feitos}</b> <small className="mudo">em andamento</small></span>
          <span><b style={{ fontSize: 22 }}>{vem.length}</b> <small className="mudo">a construir</small></span>
        </div>
      </div>

      {[["O que já mudou", mudou], ["O que vamos construir", vem]].map(([titulo, lista]) => (lista as ItemEvolucao[]).length > 0 && (
        <div key={titulo as string} className="mb">
          <h3 style={{ margin: "0 0 10px" }}>{titulo as string}</h3>
          <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {(lista as ItemEvolucao[]).map((it) => <Item key={it.id} it={it} equipe={equipe} mudar={mudar} tirar={() => tirar(it.id)} />)}
          </div>
        </div>
      ))}
      {equipe && <NovoPonto aoCriar={mudar} />}
    </div>
  );
}

function NovoPonto({ aoCriar }: { aoCriar: (it: ItemEvolucao) => void }) {
  const [it, setIt] = useState<ItemEvolucao | null>(null);
  if (!it) return <button type="button" className="btn s peq" onClick={() => setIt(novoItem())}>+ ponto</button>;
  return <Item key={it.id} it={it} equipe mudar={(x) => { aoCriar(x); setIt(null); }} tirar={() => setIt(null)} />;
}
