"use client";

import { useEffect, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { POP_PADRAO, buscarPop, salvarPop, type SecaoPop } from "@/lib/site-fluxos";

/** POP de atendimento do site: o padrão que toda pessoa que atende segue (tempo de resposta, passo a passo, frases, trocas). */
export default function PopAtendimento() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ pop: await buscarPop(portal.id) }), [portal.id]);
  const [secoes, setSecoes] = useState<SecaoPop[] | null>(null);
  const [editando, setEditando] = useState(false);
  useEffect(() => { if (dados) setSecoes(dados.pop.length ? dados.pop : POP_PADRAO); }, [dados]);
  if (!dados || !secoes) return <Carregando />;
  const original = dados.pop.length ? dados.pop : POP_PADRAO;

  return (
    <>
      <Titulo titulo="POP de atendimento" sub="O padrão de atendimento do site: quanto tempo para responder, o passo a passo da conversa, as frases prontas e quando passar para a gerente. Quem entra no time aprende por aqui." />
      {!dados.pop.length && !editando && <div className="aviso mb">Este é o modelo para começar. Toque em <b>Editar</b> e ajuste para o jeito da loja.</div>}
      <div className="linha mb" style={{ gap: 8 }}>
        {!editando ? <button type="button" className="btn p peq" onClick={() => setEditando(true)}>Editar</button> : (
          <>
            <button type="button" className="btn p peq" onClick={async () => { await salvarPop(portal.id, secoes.filter((s) => s.titulo.trim() || s.texto.trim())); setEditando(false); recarregar(); }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => { setSecoes(original); setEditando(false); }}>Cancelar</button>
            <button type="button" className="btn s peq" onClick={() => setSecoes([...secoes, { titulo: "", texto: "" }])}>+ Seção</button>
          </>
        )}
      </div>
      {secoes.map((s, i) => (
        <div key={i} className="card mb">
          {editando ? (
            <>
              <div className="linha" style={{ gap: 8 }}>
                <input type="text" value={s.titulo} placeholder="Título da seção" style={{ fontWeight: 700 }} onChange={(e) => setSecoes(secoes.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))} />
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Tirar a seção "${s.titulo || "sem título"}"?`)) setSecoes(secoes.filter((_, j) => j !== i)); }}>Excluir</button>
              </div>
              <textarea rows={7} value={s.texto} onChange={(e) => setSecoes(secoes.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
            </>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>{s.titulo}</h3>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{s.texto}</p>
            </>
          )}
        </div>
      ))}
    </>
  );
}
