"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Texto } from "@/components/Texto";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { PROJETOS_BASE, STATUS_ESTUDIO, TIPOS_ESTUDIO, apagarDoc, classeStatus, lerDoc, salvarDoc, type DocEstudio } from "@/lib/estudio";

/** Só as falas (linhas com "> "), para ler na gravação. */
const falas = (md: string) => md.replace(/\r/g, "").split("\n").filter((l) => l.startsWith(">")).map((l) => l.replace(/^>\s?/, "")).join("\n");

function Editor({ d, aoSalvar, aoFechar }: { d: DocEstudio; aoSalvar: () => void; aoFechar: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(d);
  const [aviso, setAviso] = useState("");
  const campo = <K extends keyof DocEstudio>(k: K, v: DocEstudio[K]) => setF({ ...f, [k]: v });
  return (
    <div className="card mb">
      <div className="grade g4" style={{ gap: "0 12px" }}>
        <div style={{ gridColumn: "span 2" }}><label className="rotulo">Título</label><input value={f.titulo} onChange={(e) => campo("titulo", e.target.value)} /></div>
        <div><label className="rotulo">Projeto</label><input list="projetos-doc" value={f.projeto} onChange={(e) => campo("projeto", e.target.value)} /></div>
        <div><label className="rotulo">Tipo</label><select value={f.tipo} onChange={(e) => campo("tipo", e.target.value)}>{[...new Set([...TIPOS_ESTUDIO, f.tipo])].map((t) => <option key={t}>{t}</option>)}</select></div>
        <div><label className="rotulo">Código</label><input value={f.ref ?? ""} onChange={(e) => campo("ref", e.target.value || null)} placeholder="Ex.: 1.2" /></div>
        <div><label className="rotulo">Ordem</label><input type="number" value={f.ordem} onChange={(e) => campo("ordem", Number(e.target.value) || 0)} /></div>
      </div>
      <datalist id="projetos-doc">{PROJETOS_BASE.map((p) => <option key={p} value={p} />)}</datalist>
      <label className="rotulo">Conteúdo</label>
      <textarea rows={24} value={f.conteudo} onChange={(e) => campo("conteudo", e.target.value)} style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }} />
      <p className="ajuda">Formatação: <b>### Título</b> para seção, <b>**negrito**</b>, linhas com <b>- </b> viram lista e linhas com <b>&gt; </b> viram fala. Deixe uma linha em branco entre os blocos.</p>
      {aviso && <div className="aviso mt">{aviso}</div>}
      <div className="linha mt" style={{ gap: 8 }}>
        <button type="button" className="btn p" onClick={async () => {
          setAviso("");
          try {
            const { id: _id, atualizado_em: _a, ...resto } = f;
            await salvarDoc(d.id, resto); aoSalvar(); aoFechar();
          } catch (e) { setAviso((e as Error).message); }
        }}>Salvar</button>
        <button type="button" className="btn s" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn s" style={{ marginLeft: "auto" }} onClick={async () => {
          if (!confirm("Apagar este documento? Não dá para desfazer.")) return;
          await apagarDoc(d.id); router.replace("/empresa/estudio");
        }}>Apagar</button>
      </div>
    </div>
  );
}

function Doc() {
  const { estudio } = useEquipe();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [editar, setEditar] = useState(params.get("editar") === "1");
  const [gravacao, setGravacao] = useState(false);
  const [letra, setLetra] = useState(30);
  const { dados, recarregar } = useDados(async () => ({ doc: estudio && id ? await lerDoc(id) : null }), [id, estudio]);
  const d = dados?.doc;
  useEffect(() => { if (d) document.title = `${d.titulo} · Meu estúdio`; }, [d]);
  useEffect(() => {
    if (!gravacao) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setGravacao(false); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [gravacao]);
  if (!dados) return <Carregando />;
  if (!d) return <p className="mudo">Documento não encontrado. <Link href="/empresa/estudio">Voltar ao estúdio</Link></p>;

  const proximo = STATUS_ESTUDIO[STATUS_ESTUDIO.indexOf(d.status) + 1];
  const soFalas = falas(d.conteudo);

  if (gravacao) {
    return (
      <div className="estudio-gravacao" style={{ fontSize: letra }}>
        <div className="estudio-gravacao-barra">
          <b>{d.ref ? `${d.ref} · ` : ""}{d.titulo}</b>
          <span className="linha" style={{ gap: 8 }}>
            <button type="button" onClick={() => setLetra(Math.max(18, letra - 4))}>A−</button>
            <button type="button" onClick={() => setLetra(Math.min(56, letra + 4))}>A+</button>
            <button type="button" onClick={() => setGravacao(false)}>Sair (Esc)</button>
          </span>
        </div>
        <Texto md={d.conteudo} />
      </div>
    );
  }

  return (
    <>
      <Link className="voltar" href="/empresa/estudio">← Meu estúdio · {d.projeto}</Link>
      <Titulo titulo={`${d.ref ? `${d.ref} · ` : ""}${d.titulo}`} sub={`${d.tipo} · atualizado em ${dataCurta(d.atualizado_em)}`} />

      <div className="card mb">
        <div className="linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
          <div className="linha" style={{ gap: 8 }}>
            <span className={`selo ${classeStatus(d.status)}`}>{d.status}</span>
            <select value={d.status} style={{ width: "auto" }} onChange={async (e) => { await salvarDoc(d.id, { status: e.target.value }); recarregar(); }}>
              {[...new Set([...STATUS_ESTUDIO, d.status])].map((s) => <option key={s}>{s}</option>)}
            </select>
            {proximo && <button type="button" className="btn p peq" onClick={async () => { await salvarDoc(d.id, { status: proximo }); recarregar(); }}>Marcar: {proximo}</button>}
          </div>
          <div className="linha" style={{ gap: 8 }}>
            {soFalas && <Copiar texto={soFalas} rotulo="Copiar só as falas" />}
            <button type="button" className="btn s peq" onClick={() => setGravacao(true)}>Modo gravação</button>
            <button type="button" className="btn s peq" onClick={() => setEditar(!editar)}>{editar ? "Fechar edição" : "Editar"}</button>
          </div>
        </div>
      </div>

      {editar && <Editor key={d.atualizado_em} d={d} aoSalvar={recarregar} aoFechar={() => setEditar(false)} />}

      <div className="card estudio-leitura">
        {d.conteudo ? <Texto md={d.conteudo} /> : <p className="mudo" style={{ margin: 0 }}>Documento vazio. Clique em Editar para escrever.</p>}
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Doc /></Suspense>;
}
