"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { PROJETOS_BASE, STATUS_ESTUDIO, TIPOS_ESTUDIO, classeStatus, criarDoc, listarDocs } from "@/lib/estudio";

export default function Estudio() {
  const { estudio } = useEquipe();
  const router = useRouter();
  const { dados } = useDados(async () => (estudio ? listarDocs() : []), [estudio]);
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const [erro, setErro] = useState("");

  if (!estudio) {
    return (
      <>
        <Titulo titulo="Meu estúdio" />
        <div className="card"><p className="mudo" style={{ margin: 0 }}>Esta é uma área particular. Ela só aparece para quem tem o estúdio liberado.</p></div>
      </>
    );
  }
  if (!dados) return <Carregando />;

  const termo = busca.trim().toLowerCase();
  const docs = dados.filter((d) => (!status || d.status === status) && (!termo || `${d.ref ?? ""} ${d.titulo}`.toLowerCase().includes(termo)));
  const projetos = [...new Set([...PROJETOS_BASE, ...dados.map((d) => d.projeto)])].filter((p) => docs.some((d) => d.projeto === p));
  const conta = (s: string) => dados.filter((d) => d.status === s).length;

  return (
    <>
      <Titulo titulo="Meu estúdio" sub="Seu espaço particular de criação: roteiros de gravação, produtos e ideias. Só você vê o que está aqui." />

      <div className="grade g4 mb">
        {STATUS_ESTUDIO.map((s) => (
          <button key={s} type="button" className={`card estudio-cont${status === s ? " ativo" : ""}`} onClick={() => setStatus(status === s ? "" : s)}>
            <small>{s}</small><b>{conta(s)}</b>
          </button>
        ))}
      </div>

      <div className="linha entre mb" style={{ gap: 10, flexWrap: "wrap" }}>
        <input type="search" placeholder="Buscar pelo título ou código da aula…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ maxWidth: 360 }} />
        <button type="button" className="btn p" onClick={() => setNovo(!novo)}>+ Novo documento</button>
      </div>

      {novo && (
        <form className="card mb" onSubmit={async (e) => {
          e.preventDefault();
          setErro("");
          const f = new FormData(e.currentTarget);
          try {
            const id = await criarDoc({
              titulo: String(f.get("titulo") || "Sem título"),
              projeto: String(f.get("projeto") || "Geral"),
              tipo: String(f.get("tipo") || "Ideia"),
            });
            router.push(`/empresa/estudio/doc?id=${id}&editar=1`);
          } catch (x) { setErro((x as Error).message); }
        }}>
          <div className="grade g3" style={{ gap: "0 12px" }}>
            <div><label className="rotulo">Título</label><input name="titulo" required placeholder="Ex.: Aula bônus de Natal" /></div>
            <div><label className="rotulo">Projeto</label><input name="projeto" list="projetos-estudio" defaultValue="Método Loja Magnética" /></div>
            <div><label className="rotulo">Tipo</label><select name="tipo">{TIPOS_ESTUDIO.map((t) => <option key={t}>{t}</option>)}</select></div>
          </div>
          <datalist id="projetos-estudio">{[...new Set([...PROJETOS_BASE, ...dados.map((d) => d.projeto)])].map((p) => <option key={p} value={p} />)}</datalist>
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt"><button className="btn p">Criar e abrir</button></div>
        </form>
      )}

      {!docs.length && <div className="card"><p className="mudo" style={{ margin: 0 }}>{dados.length ? "Nada com esse filtro." : "Ainda não há documentos. Crie o primeiro."}</p></div>}

      {projetos.map((p) => {
        const itens = docs.filter((d) => d.projeto === p);
        const prontos = itens.filter((d) => d.status === "Pronto para gravar" || d.status === "Gravado").length;
        return (
          <section key={p} className="card mb">
            <div className="linha entre" style={{ marginBottom: 6 }}>
              <h2 style={{ margin: 0 }}>{p}</h2>
              <span className="mudo" style={{ fontSize: 13 }}>{prontos} de {itens.length} prontos ou gravados</span>
            </div>
            <div className="barra" style={{ height: 6, marginBottom: 8 }}><i style={{ width: `${(prontos / Math.max(itens.length, 1)) * 100}%` }} /></div>
            {itens.map((d) => (
              <Link key={d.id} href={`/empresa/estudio/doc?id=${d.id}`} className="estudio-item">
                <span className="estudio-ref">{d.ref ?? "·"}</span>
                <span className="estudio-tit"><b>{d.titulo}</b><small>{d.tipo} · {dataCurta(d.atualizado_em)}</small></span>
                <span className={`selo ${classeStatus(d.status)}`}>{d.status}</span>
              </Link>
            ))}
          </section>
        );
      })}
    </>
  );
}
