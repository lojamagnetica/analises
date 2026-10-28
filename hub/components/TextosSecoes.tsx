"use client";

import { useEffect, useState } from "react";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarTextos, salvarTextos, type Secao } from "@/lib/varejo";

/** Textos da loja em seções, com editar, excluir seção e (opcional) copiar cada uma. Começa por um modelo. */
export function TextosSecoes({ chave, padrao, copiar }: { chave: string; padrao: Secao[]; copiar?: boolean }) {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ s: await buscarTextos(portal.id, chave) }), [portal.id, chave]);
  const [secoes, setSecoes] = useState<Secao[] | null>(null);
  const [editando, setEditando] = useState(false);
  const [copiado, setCopiado] = useState(-1);
  useEffect(() => { if (dados) setSecoes(dados.s.length ? dados.s : padrao); }, [dados, padrao]);
  if (!dados || !secoes) return <Carregando />;
  const original = dados.s.length ? dados.s : padrao;
  const troca = (i: number, x: Partial<Secao>) => setSecoes(secoes.map((y, j) => (j === i ? { ...y, ...x } : y)));

  return (
    <>
      {!dados.s.length && !editando && <div className="aviso mb">Este é o modelo para começar. Toque em <b>Editar</b> e ajuste para o jeito da loja.</div>}
      <div className="linha mb" style={{ gap: 8 }}>
        {!editando ? <button type="button" className="btn p peq" onClick={() => setEditando(true)}>Editar</button> : (
          <>
            <button type="button" className="btn p peq" onClick={async () => { await salvarTextos(portal.id, chave, secoes.filter((s) => s.titulo.trim() || s.texto.trim())); setEditando(false); recarregar(); }}>Salvar</button>
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
                <input type="text" value={s.titulo} placeholder="Título" style={{ fontWeight: 700 }} onChange={(e) => troca(i, { titulo: e.target.value })} />
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Tirar "${s.titulo || "sem título"}"?`)) setSecoes(secoes.filter((_, j) => j !== i)); }}>Excluir</button>
              </div>
              <textarea rows={5} value={s.texto} onChange={(e) => troca(i, { texto: e.target.value })} />
            </>
          ) : (
            <>
              <div className="linha entre" style={{ gap: 8 }}>
                <h3 style={{ margin: 0 }}>{s.titulo}</h3>
                {copiar && <button type="button" className="btn s peq" onClick={async () => { try { await navigator.clipboard.writeText(s.texto); setCopiado(i); setTimeout(() => setCopiado(-1), 1500); } catch { /* sem permissão */ } }}>{copiado === i ? "Copiado ✓" : "Copiar"}</button>}
              </div>
              <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0" }}>{s.texto}</p>
            </>
          )}
        </div>
      ))}
    </>
  );
}
