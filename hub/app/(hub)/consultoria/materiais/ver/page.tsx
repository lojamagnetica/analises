"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Texto } from "@/components/Texto";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarConsultoria } from "@/lib/consultoria";
import { abrirAnexo, buscarMaterial, excluirMaterial, nomeDoAnexo, salvarMaterial, subirAnexo, type Material } from "@/lib/materiais";

const VOLTAR = { href: "/consultoria/materiais", rotulo: "Materiais" };

/** A equipe escreve o material: título, mês, entrega, texto e anexo. */
function Editor({ m, meses, entregas, aoSalvar, aoCancelar }: {
  m: Partial<Material> & { portal_id: string }; meses: { mes: string; nome: string }[]; entregas: { id: string; entrega: string; mes: string }[];
  aoSalvar: (id: string) => void; aoCancelar: () => void;
}) {
  const [r, setR] = useState({ titulo: m.titulo ?? "", mes: m.mes ?? "", entrega_id: m.entrega_id ?? "", conteudo: m.conteudo ?? "", arquivo: m.arquivo ?? null });
  const [erro, setErro] = useState("");
  const [subindo, setSubindo] = useState(false);
  return (
    <div className="card">
      <input type="text" placeholder="Título do material" value={r.titulo} onChange={(e) => setR({ ...r, titulo: e.target.value })} />
      <div className="grade g2" style={{ gap: 8 }}>
        <select value={r.mes} aria-label="Mês" onChange={(e) => setR({ ...r, mes: e.target.value })}>
          <option value="">Sem mês</option>
          {meses.map((x) => <option key={x.mes} value={x.mes}>{x.nome}</option>)}
        </select>
        <select value={r.entrega_id} aria-label="Entrega" onChange={(e) => setR({ ...r, entrega_id: e.target.value })}>
          <option value="">Não ligado a uma entrega</option>
          {entregas.map((x) => <option key={x.id} value={x.id}>{x.mes} · {x.entrega}</option>)}
        </select>
      </div>
      <label className="ajuda" style={{ display: "block" }}>Texto: &quot;## &quot; título, &quot;### &quot; subtítulo, &quot;- &quot; lista, **negrito**, tabela com | e aviso com &gt;. Um bloco por parágrafo (linha em branco entre eles).
        <textarea rows={22} value={r.conteudo} onChange={(e) => setR({ ...r, conteudo: e.target.value })} style={{ fontFamily: "monospace", fontSize: 13 }} />
      </label>
      <div className="linha" style={{ gap: 8, alignItems: "center" }}>
        <label className="btn s peq" style={{ cursor: "pointer" }}>
          {subindo ? "Subindo…" : r.arquivo ? "Trocar anexo" : "Anexar planilha ou PDF"}
          <input type="file" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f || !m.portal_id) return;
            setSubindo(true); setErro("");
            try { setR({ ...r, arquivo: await subirAnexo(m.portal_id, f) }); } catch (x) { setErro((x as Error).message); }
            setSubindo(false);
          }} />
        </label>
        {r.arquivo && <small>{nomeDoAnexo(r.arquivo)} <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm("Tirar o anexo deste material?")) setR({ ...r, arquivo: null }); }}>tirar</button></small>}
      </div>
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" disabled={!r.titulo.trim() || subindo} onClick={async () => {
          setErro("");
          try { aoSalvar(await salvarMaterial({ ...m, ...r, titulo: r.titulo.trim(), mes: r.mes || null, entrega_id: r.entrega_id || null })); } catch (x) { setErro((x as Error).message); }
        }}>Salvar</button>
        <button type="button" className="btn s peq" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function Ver() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { portal, equipe } = usePortal();
  const novo = id === "novo";
  const [editando, setEditando] = useState(novo);
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const [m, c] = await Promise.all([novo ? Promise.resolve(null) : buscarMaterial(id), buscarConsultoria(portal.id)]);
    return { m, meses: c.dados?.meses ?? [], entregas: c.entregas };
  }, [id, portal.id]);
  if (!dados) return <Carregando />;
  const m = dados.m;
  if (!novo && !m) return <><Titulo voltar={VOLTAR} titulo="Material" /><div className="card">Material não encontrado.</div></>;

  if (equipe && editando) {
    return (
      <>
        <Titulo voltar={VOLTAR} titulo={novo ? "Novo material" : `Editar: ${m!.titulo}`} />
        <Editor m={m ?? { portal_id: portal.id }} meses={dados.meses} entregas={dados.entregas}
          aoSalvar={(nid) => { setEditando(false); if (novo) router.replace(`/consultoria/materiais/ver?id=${nid}`); else recarregar(); }}
          aoCancelar={() => (novo ? router.push(VOLTAR.href) : setEditando(false))} />
      </>
    );
  }
  const mat = m!;
  return (
    <>
      <Titulo voltar={VOLTAR} titulo={mat.titulo} />
      {equipe && (
        <div className={`aviso mb ${mat.liberado ? "ok" : ""}`}>
          {mat.liberado ? "A loja já vê este material." : "Rascunho: só a equipe vê."}{" "}
          <button type="button" className="link-loja" onClick={async () => { await salvarMaterial({ ...mat, liberado: !mat.liberado }); recarregar(); }}>
            {mat.liberado ? "Voltar para rascunho" : "Liberar para a loja"}
          </button>
          {" · "}<button type="button" className="link-loja" onClick={() => setEditando(true)}>Editar</button>
          {" · "}<button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => {
            if (!confirm(`Excluir o material "${mat.titulo}"? Não dá para desfazer.`)) return;
            try { await excluirMaterial(mat); router.push(VOLTAR.href); } catch (x) { setErro((x as Error).message); }
          }}>Excluir</button>
        </div>
      )}
      {erro && <div className="aviso mb">{erro}</div>}
      {mat.arquivo && (
        <div className="card mb linha entre" style={{ gap: 8 }}>
          <span>📎 {nomeDoAnexo(mat.arquivo)}</span>
          <button type="button" className="btn s peq" onClick={() => abrirAnexo(mat.arquivo!)}>Abrir o arquivo</button>
        </div>
      )}
      {mat.conteudo && <div className="card"><Texto md={mat.conteudo} /></div>}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Ver /></Suspense>;
}
