"use client";

import { useRef, useState } from "react";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { buscarLojinha, fotoDoPremio, fotoDoPremioSubir, pedidoCancelar, pedidoEntregue, premioExcluir, premioSalvar, type PremioGestao } from "@/lib/lojinha";

const NIVEIS = [100, 200, 300, 400, 500, 600, 800, 1000];

function Editor({ p, portalId, aoFim }: { p: PremioGestao | null; portalId: string; aoFim: (salvou: boolean) => void }) {
  const [nome, setNome] = useState(p?.nome ?? "");
  const [descricao, setDescricao] = useState(p?.descricao ?? "");
  const [pontos, setPontos] = useState(p?.pontos ?? 100);
  const [foto, setFoto] = useState<string | null>(p?.foto ?? null);
  const [ativo, setAtivo] = useState(p?.ativo ?? true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const arq = useRef<HTMLInputElement>(null);
  const salvar = async () => {
    setOcupado(true); setErro("");
    try { await premioSalvar(portalId, p?.id ?? null, { nome: nome.trim(), descricao: descricao.trim(), pontos, ativo, foto }); aoFim(true); }
    catch (e) { setErro((e as Error).message); setOcupado(false); }
  };
  return (
    <div className="card mb">
      <label className="ajuda" style={{ display: "block" }}>Nome do mimo<input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Garrafinha Farm" /></label>
      <label className="ajuda" style={{ display: "block" }}>Detalhe (opcional)<input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: cor sortida" /></label>
      <label className="ajuda" style={{ display: "block" }}>Quantos pontos
        <select value={pontos} onChange={(e) => setPontos(Number(e.target.value))} style={{ width: "auto" }}>{NIVEIS.map((n) => <option key={n} value={n}>{n} pontos</option>)}</select>
      </label>
      <div className="linha" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {foto && <img src={fotoDoPremio(foto)!} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />}
        <input ref={arq} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return; setOcupado(true); setErro("");
          try { setFoto(await fotoDoPremioSubir(portalId, f)); } catch (x) { setErro((x as Error).message); }
          setOcupado(false); e.target.value = "";
        }} />
        <button type="button" className="btn s peq" disabled={ocupado} onClick={() => arq.current?.click()}>{foto ? "Trocar a foto" : "Subir a foto"}</button>
      </div>
      <label className="ajuda" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />Aparece na lojinha</label>
      {erro && <div className="aviso mt" role="alert">{erro}</div>}
      <div className="linha mt" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" disabled={ocupado || !nome.trim()} onClick={salvar}>Salvar</button>
        <button type="button" className="btn s peq" onClick={() => aoFim(false)}>Cancelar</button>
      </div>
    </div>
  );
}

/** A lojinha na gestão: cadastrar os mimos com foto e acompanhar os pedidos de resgate. */
export function LojinhaGestao() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => {
    const [l, e] = await Promise.all([buscarLojinha(portal.id), supabaseBrowser().from("loja_equipe").select("id, nome").eq("portal_id", portal.id)]);
    return { ...l, nomes: new Map(((e.data ?? []) as { id: string; nome: string }[]).map((x) => [x.id, x.nome.split(" ")[0]])) };
  }, [portal.id]);
  const [editando, setEditando] = useState<PremioGestao | "novo" | null>(null);
  if (!dados) return <Carregando />;
  const pendentes = dados.pedidos.filter((p) => p.status === "pedido");
  return (
    <>
      <div className="secao">Lojinha de resgate</div>
      <p className="mudo" style={{ marginTop: 0 }}>Os pontos podem virar mimos, de 100 em 100: garrafinha, maquiagem, skincare, brindes das marcas. Roupa só pelo voucher de R$ 500.</p>
      {pendentes.length > 0 && (
        <div className="card card-borda mb" style={{ ["--c" as string]: "var(--orange)" }}>
          <b>Pedidos para entregar ({pendentes.length})</b>
          {pendentes.map((p) => (
            <div key={p.id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <span><b>{dados.nomes.get(p.pessoa_id) ?? "Alguém"}</b> pediu {p.premio_nome} <span className="mudo">· {p.pontos} pontos</span></span>
              <span className="linha" style={{ gap: 6 }}>
                <button type="button" className="btn p peq" onClick={async () => { await pedidoEntregue(p.id); recarregar(); }}>Entreguei</button>
                <button type="button" className="btn s peq" onClick={async () => { if (confirm(`Cancelar o pedido e devolver ${p.pontos} pontos?`)) { await pedidoCancelar(p.id); recarregar(); } }}>Cancelar</button>
              </span>
            </div>
          ))}
        </div>
      )}
      {editando && <Editor p={editando === "novo" ? null : editando} portalId={portal.id} aoFim={(s) => { setEditando(null); if (s) recarregar(); }} />}
      {!editando && <button type="button" className="btn p peq mb" onClick={() => setEditando("novo")}>+ Novo mimo</button>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }} className="mb">
        {dados.premios.map((p) => (
          <div key={p.id} className="card" style={{ padding: 10, opacity: p.ativo ? 1 : 0.55 }}>
            {fotoDoPremio(p.foto) ? <img src={fotoDoPremio(p.foto)!} alt={p.nome} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 10 }} /> : <div style={{ aspectRatio: "1 / 1", background: "var(--soft)", borderRadius: 10, display: "grid", placeItems: "center", fontSize: 30 }}>🎁</div>}
            <b style={{ display: "block", marginTop: 6, fontSize: 14 }}>{p.nome}</b>
            <div style={{ color: "var(--orange)", fontWeight: 800 }}>{p.pontos} pontos{p.ativo ? "" : " · escondido"}</div>
            <div className="linha" style={{ gap: 6, marginTop: 6 }}>
              <button type="button" className="btn s peq" onClick={() => setEditando(p)}>Editar</button>
              <button type="button" className="btn s peq" onClick={async () => { if (confirm(`Excluir "${p.nome}" da lojinha?`)) { await premioExcluir(p); recarregar(); } }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
