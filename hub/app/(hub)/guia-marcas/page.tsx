"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { CAMPOS_MARCA, buscarMarcas, excluirMarca, salvarMarca, subirFotoMarca, tirarFotoMarca, urlFotoMarca, type Marca } from "@/lib/marcas";

/** Editar uma ficha (marca ou linha de produto). */
function Editor({ m, portalId, aoSalvar, aoCancelar }: { m: Partial<Marca>; portalId: string; aoSalvar: () => void; aoCancelar: () => void }) {
  const [r, setR] = useState<Partial<Marca>>(m);
  const [erro, setErro] = useState("");
  const [subindo, setSubindo] = useState(false);
  return (
    <div className="card mb">
      <input type="text" placeholder="Nome da marca ou da linha de produto" value={r.nome ?? ""} onChange={(e) => setR({ ...r, nome: e.target.value })} style={{ fontWeight: 700, fontSize: 16 }} />
      <div className="linha mb" style={{ gap: 10, alignItems: "center" }}>
        {r.foto && <img src={urlFotoMarca(r.foto)} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />}
        <label className="btn s peq" style={{ cursor: "pointer" }}>
          {subindo ? "Subindo…" : r.foto ? "Trocar foto" : "+ Foto das peças"}
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
            setSubindo(true); setErro("");
            try { const c = await subirFotoMarca(portalId, f); if (r.foto && r.foto !== m.foto) await tirarFotoMarca(r.foto); setR({ ...r, foto: c }); } catch (x) { setErro((x as Error).message); }
            setSubindo(false);
          }} />
        </label>
        {r.foto && <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm("Tirar a foto desta ficha?")) setR({ ...r, foto: null }); }}>tirar foto</button>}
      </div>
      <div className="grade g2" style={{ gap: "0 12px" }}>
        {CAMPOS_MARCA.map((c) => (
          <label key={c.id} className="ajuda" style={{ display: "block", gridColumn: c.longo ? "1 / -1" : undefined }}><b style={{ color: "var(--ink)" }}>{c.rotulo}</b>
            {c.longo
              ? <textarea rows={2} placeholder={`Ex.: ${c.ex}`} value={r[c.id] ?? ""} onChange={(e) => setR({ ...r, [c.id]: e.target.value })} />
              : <input type="text" placeholder={`Ex.: ${c.ex}`} value={r[c.id] ?? ""} onChange={(e) => setR({ ...r, [c.id]: e.target.value })} />}
          </label>
        ))}
      </div>
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="linha" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" disabled={!r.nome?.trim() || subindo} onClick={async () => {
          setErro("");
          try {
            const { id, nome, foto, oque, para_quem, preco, diferenciais, como_vender, perguntas, pecas, cuidados } = r;
            await salvarMarca(portalId, id ?? null, { nome: nome!.trim(), foto: foto ?? null, oque, para_quem, preco, diferenciais, como_vender, perguntas, pecas, cuidados });
            if (m.foto && m.foto !== foto) await tirarFotoMarca(m.foto);
            aoSalvar();
          } catch (x) { setErro((x as Error).message); }
        }}>Salvar</button>
        <button type="button" className="btn s peq" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function Ficha({ m, editar, excluir }: { m: Marca; editar: () => void; excluir: () => void }) {
  const preenchidos = CAMPOS_MARCA.filter((c) => m[c.id]?.trim());
  return (
    <div className="card">
      <div className="linha" style={{ gap: 12, alignItems: "flex-start" }}>
        {m.foto && <img src={urlFotoMarca(m.foto)} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 12, flexShrink: 0 }} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ margin: "0 0 4px" }}>{m.nome}</h3>
          {m.oque && <p style={{ margin: "0 0 6px", fontSize: 14 }}>{m.oque}</p>}
          <small className="mudo">{preenchidos.length} de {CAMPOS_MARCA.length} campos preenchidos</small>
        </div>
      </div>
      <details style={{ marginTop: 8 }}>
        <summary className="link-loja" style={{ cursor: "pointer" }}>Ver a ficha</summary>
        {preenchidos.map((c) => <p key={c.id} style={{ margin: "6px 0", fontSize: 14, whiteSpace: "pre-wrap" }}><b>{c.rotulo}:</b> {m[c.id]}</p>)}
      </details>
      <div className="linha mt" style={{ gap: 12 }}>
        <button type="button" className="link-loja" onClick={editar}>Editar</button>
        <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={excluir}>Excluir</button>
      </div>
    </div>
  );
}

/** Guia das marcas e produtos: para a pessoa nova estudar e para treinar a equipe. */
export default function GuiaMarcas() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarMarcas(portal.id), [portal.id]);
  const [editando, setEditando] = useState<Partial<Marca> | null>(null);
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  return (
    <>
      <Titulo titulo="Guia das marcas e produtos" sub="Uma ficha por marca ou linha de produto. É com ele que a pessoa nova estuda no primeiro dia, e o quiz do terceiro dia sai daqui." />
      {!editando && <button type="button" className="btn p mb" onClick={() => setEditando({})}>+ Marca ou linha de produto</button>}
      {editando && <Editor key={editando.id ?? "nova"} m={editando} portalId={portal.id} aoSalvar={() => { setEditando(null); recarregar(); }} aoCancelar={() => setEditando(null)} />}
      {erro && <div className="aviso mb">{erro}</div>}
      {!dados.length && !editando && (
        <div className="card mudo">Comece pelas 3 ou 4 marcas (ou linhas) que mais vendem. Quanto mais completa a ficha, melhor o estudo e o quiz da pessoa nova.</div>
      )}
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {dados.filter((m) => m.id !== editando?.id).map((m) => (
          <Ficha key={m.id} m={m} editar={() => { setEditando(m); window.scrollTo(0, 0); }} excluir={async () => {
            if (!confirm(`Excluir a ficha de ${m.nome}? Não dá para desfazer.`)) return;
            try { await excluirMarca(m); recarregar(); } catch (e) { setErro((e as Error).message); }
          }} />
        ))}
      </div>
    </>
  );
}
