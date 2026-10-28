"use client";

import { useEffect, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { POLITICA_PADRAO, buscarAtacado, salvarPolitica, situacao, type SecaoPolitica } from "@/lib/atacado";

/** Apresentação e política: o jeito único de apresentar a marca, a política comercial e a de exclusividade. Todo o time segue o mesmo texto. */
export default function Politica() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarAtacado(portal.id), [portal.id]);
  const [secoes, setSecoes] = useState<SecaoPolitica[] | null>(null);
  const [editando, setEditando] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (dados) setSecoes(dados.politica.length ? dados.politica : POLITICA_PADRAO); }, [dados]);
  if (!dados || !secoes) return <Carregando />;
  const modelo = !dados.politica.length;
  const exclusivos = dados.clientes.filter((c) => c.exclusivo);
  // Mesma cidade com mais de um exclusivo, ou exclusivo parado: precisa de revisão.
  const porCidade = (c: (typeof exclusivos)[number]) => `${c.cidade}/${c.uf}`;
  const conflitos = [...new Set(exclusivos.map(porCidade))].filter((k) => exclusivos.filter((c) => porCidade(c) === k).length > 1);
  const parados = exclusivos.filter((c) => situacao(c) === "parado");

  return (
    <>
      <Titulo titulo="Apresentação e política" sub="O processo único de apresentar a marca, a política comercial e a de exclusividade. Toda vendedora usa o mesmo texto: o lojista ouve a mesma coisa, seja quem for." />
      {modelo && !editando && <div className="aviso mb">Este é o modelo para começar. Toque em <b>Editar</b> e troque pelos textos da marca.</div>}
      <div className="linha mb" style={{ gap: 8 }}>
        {!editando ? <button type="button" className="btn p peq" onClick={() => setEditando(true)}>Editar</button> : (
          <>
            <button type="button" className="btn p peq" onClick={async () => { await salvarPolitica(portal.id, secoes.filter((s) => s.titulo.trim() || s.texto.trim())); setEditando(false); setMsg("Salvo ✓"); recarregar(); }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => { setSecoes(dados.politica.length ? dados.politica : POLITICA_PADRAO); setEditando(false); }}>Cancelar</button>
            <button type="button" className="btn s peq" onClick={() => setSecoes([...secoes, { titulo: "", texto: "" }])}>+ Seção</button>
          </>
        )}
        {msg && <small className="mudo">{msg}</small>}
      </div>
      {secoes.map((s, i) => (
        <div key={i} className="card mb">
          {editando ? (
            <>
              <div className="linha" style={{ gap: 8 }}>
                <input type="text" value={s.titulo} placeholder="Título da seção" onChange={(e) => setSecoes(secoes.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))} style={{ fontWeight: 700 }} />
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Tirar a seção "${s.titulo || "sem título"}"?`)) setSecoes(secoes.filter((_, j) => j !== i)); }}>Excluir</button>
              </div>
              <textarea rows={8} value={s.texto} onChange={(e) => setSecoes(secoes.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
            </>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>{s.titulo}</h3>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{s.texto}</p>
            </>
          )}
        </div>
      ))}
      <div className="card card-borda" style={{ ["--c" as string]: conflitos.length || parados.length ? "var(--red)" : "var(--line)" }}>
        <h3 style={{ marginTop: 0 }}>Quem tem exclusividade hoje ({exclusivos.length})</h3>
        <p className="mudo" style={{ marginTop: 0 }}>Marque o exclusivo na Carteira de lojistas (Editar dados). Aqui o Hub avisa quando a exclusividade precisa de revisão.</p>
        {conflitos.map((k) => <div key={k} className="aviso mb">{k}: mais de um lojista marcado como exclusivo na mesma cidade.</div>)}
        {parados.length > 0 && <div className="aviso mb">{parados.length} exclusivo{parados.length === 1 ? "" : "s"} parado{parados.length === 1 ? "" : "s"} há mais de 60 dias: a praça está travada sem venda. Revise pela política.</div>}
        {exclusivos.map((c) => (
          <div key={c.id} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0", gap: 8 }}>
            <span><b>{c.nome}</b> <small className="mudo">{[c.cidade, c.uf].filter(Boolean).join("/")} · {c.vendedora || "sem vendedora"}</small></span>
            <span>{moeda(Number(c.total_ano))} <small className="mudo">no ano</small></span>
          </div>
        ))}
      </div>
    </>
  );
}
