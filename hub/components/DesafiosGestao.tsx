"use client";

import { useState } from "react";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import { buscarDesafios, desafioExcluir, desafioSalvar, MODELOS, type DesafioGestao } from "@/lib/desafios";

const somaDia = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const dm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

function Editor({ d, lojas, portalId, aoFim }: { d: DesafioGestao | null; lojas: string[]; portalId: string; aoFim: (s: boolean) => void }) {
  const [modeloId, setModeloId] = useState(d?.modelo ?? "linha_parada");
  const modelo = MODELOS.find((m) => m.id === modeloId) ?? MODELOS[0];
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(modelo.campos.map((c) => [c.chave, c.padrao])));
  const [pontos, setPontos] = useState(d?.pontos ?? modelo.pontos);
  const [titulo, setTitulo] = useState(d?.titulo ?? "");
  const [unidade, setUnidade] = useState(d?.unidade ?? "");
  const [descricao, setDescricao] = useState(d?.descricao ?? "");
  const [limite, setLimite] = useState(d?.limite ? String(d.limite) : "");
  const [dia, setDia] = useState(d?.dia ?? hoje());
  const [loja, setLoja] = useState(d?.loja ?? "");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  // Em um desafio novo, o título e a frase saem do modelo e dos números; no editar, valem os textos salvos.
  const tituloFinal = d ? titulo : modelo.titulo(v), unidadeFinal = d ? unidade : modelo.unidade(v);
  const escolher = (id: string) => { const m = MODELOS.find((x) => x.id === id)!; setModeloId(id); setV(Object.fromEntries(m.campos.map((c) => [c.chave, c.padrao]))); setPontos(m.pontos); };
  const salvar = async () => {
    setOcupado(true); setErro("");
    try { await desafioSalvar(portalId, d?.id ?? null, { loja: loja || null, dia, modelo: modeloId, titulo: tituloFinal.trim(), descricao: descricao.trim(), unidade: unidadeFinal.trim(), pontos, limite: limite ? Number(limite) : null }); aoFim(true); }
    catch (e) { setErro((e as Error).message); setOcupado(false); }
  };
  return (
    <div className="card mb">
      {!d && (
        <div className="chips mb">
          {MODELOS.map((m) => <button key={m.id} type="button" className={`chip ${m.id === modeloId ? "on" : ""}`} onClick={() => escolher(m.id)}>{m.rotulo}</button>)}
        </div>
      )}
      {!d && <p className="ajuda" style={{ marginTop: 0 }}>{modelo.quando}</p>}
      {d ? (
        <>
          <label className="ajuda" style={{ display: "block" }}>Nome do desafio<input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label>
          <label className="ajuda" style={{ display: "block" }}>Cada o quê?<input type="text" value={unidade} onChange={(e) => setUnidade(e.target.value)} /></label>
        </>
      ) : modelo.campos.map((c) => (
        <label key={c.chave} className="ajuda" style={{ display: "block" }}>{c.rotulo}<input type="text" value={v[c.chave] ?? ""} onChange={(e) => setV({ ...v, [c.chave]: e.target.value })} /></label>
      ))}
      <label className="ajuda" style={{ display: "block" }}>Recado para o time (opcional)<input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: a vitrine está com elas, mostra na entrada" /></label>
      <div className="linha" style={{ gap: 10, flexWrap: "wrap" }}>
        <label className="ajuda">Pontos por vez<input type="number" min={1} value={pontos} onChange={(e) => setPontos(Math.max(1, Number(e.target.value) || 1))} style={{ width: 90 }} /></label>
        <label className="ajuda">Limite no dia (opcional)<input type="number" min={1} value={limite} onChange={(e) => setLimite(e.target.value)} style={{ width: 90 }} /></label>
        <label className="ajuda">Dia<select value={dia} onChange={(e) => setDia(e.target.value)} style={{ width: "auto" }}>
          {[0, 1, 2, 3].map((n) => { const x = somaDia(hoje(), n); return <option key={x} value={x}>{n === 0 ? "Hoje" : n === 1 ? "Amanhã" : dm(x)} · {dm(x)}</option>; })}
          {d && ![0, 1, 2, 3].map((n) => somaDia(hoje(), n)).includes(d.dia) && <option value={d.dia}>{dm(d.dia)}</option>}
        </select></label>
        {lojas.length > 1 && <label className="ajuda">Para<select value={loja} onChange={(e) => setLoja(e.target.value)} style={{ width: "auto" }}><option value="">Todas as lojas</option>{lojas.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>}
      </div>
      <div className="aviso ok mt" style={{ margin: "8px 0" }}><b>{tituloFinal}</b>: {pontos} pontos por {unidadeFinal}.</div>
      {erro && <div className="aviso mt" role="alert">{erro}</div>}
      <div className="linha mt" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" disabled={ocupado || !tituloFinal.trim() || !unidadeFinal.trim()} onClick={salvar}>{d ? "Salvar" : "Lançar o desafio"}</button>
        <button type="button" className="btn s peq" onClick={() => aoFim(false)}>Cancelar</button>
      </div>
    </div>
  );
}

/** Desafio do dia na gestão: escolher um modelo, lançar e acompanhar quem cumpriu. */
export function DesafiosGestao() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => {
    const [lista, e] = await Promise.all([buscarDesafios(portal.id), supabaseBrowser().from("loja_equipe").select("id, nome").eq("portal_id", portal.id)]);
    return { lista, nomes: new Map(((e.data ?? []) as { id: string; nome: string }[]).map((x) => [x.id, x.nome.split(" ")[0]])) };
  }, [portal.id]);
  const [editando, setEditando] = useState<DesafioGestao | "novo" | null>(null);
  if (!dados) return <Carregando />;
  return (
    <>
      <div className="secao">Desafio do dia</div>
      <p className="mudo" style={{ marginTop: 0 }}>Todo dia um desafio novo, que vale ponto para todo mundo. A equipe vê assim que abre o link, e quem tem os avisos ligados recebe no celular.</p>
      {editando ? <Editor d={editando === "novo" ? null : editando} lojas={portal.lojas ?? []} portalId={portal.id} aoFim={(s) => { setEditando(null); if (s) recarregar(); }} />
        : <button type="button" className="btn p peq mb" onClick={() => setEditando("novo")}>+ Lançar um desafio</button>}
      {dados.lista.map((d) => (
        <div key={d.id} className="card mb">
          <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
            <span><b>{d.titulo}</b> <span className="mudo">· {d.dia === hoje() ? "hoje" : dm(d.dia)}{d.loja ? ` · ${d.loja}` : ""}</span></span>
            <span className="linha" style={{ gap: 6 }}>
              <button type="button" className="btn s peq" onClick={() => setEditando(d)}>Editar</button>
              <button type="button" className="btn s peq" onClick={async () => { if (confirm(`Excluir o desafio "${d.titulo}"? Os pontos que ele deu saem do saldo.`)) { await desafioExcluir(d.id); recarregar(); } }}>Excluir</button>
            </span>
          </div>
          <div className="mudo" style={{ fontSize: 14 }}>{d.pontos} pontos por {d.unidade}{d.limite ? ` · até ${d.limite} por dia` : ""}</div>
          <div style={{ marginTop: 6, fontSize: 14 }}>
            {d.feitos.length === 0 ? <span className="mudo">Ninguém marcou ainda.</span>
              : d.feitos.map((f) => <span key={f.pessoa_id} className="selo feito" style={{ marginRight: 6 }}>{dados.nomes.get(f.pessoa_id) ?? "Alguém"} · {f.qtd}×</span>)}
          </div>
        </div>
      ))}
      {dados.lista.length === 0 && !editando && <p className="mudo">Nenhum desafio lançado nos últimos dias.</p>}
    </>
  );
}
