"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { STATUS, criarProduto, listarProdutos, type Status } from "@/lib/produtos";

/** Os produtos da empresa: os que vendemos e os que estão nascendo. Cada um abre a sua área. */
export default function Produtos() {
  const router = useRouter();
  const { dados } = useDados(() => listarProdutos(), []);
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState<Status>("ideia");
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;

  return (
    <>
      <Titulo titulo="Produtos" sub="Tudo o que a empresa vende e o que está nascendo. Cada produto tem a sua área: estrutura, valor, entregáveis, materiais de apresentação e venda e os projetos dele." />
      <form className="card mb linha" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }} onSubmit={async (e) => {
        e.preventDefault(); setErro("");
        if (!nome.trim()) return;
        try { const id = await criarProduto(nome, status); router.push(`/empresa/produtos/produto?id=${id}`); } catch (x) { setErro((x as Error).message); }
      }}>
        <label className="ajuda" style={{ flex: 2, minWidth: 200, margin: 0 }}>Novo produto<input type="text" value={nome} placeholder="Ex.: Imersão Loja Magnética" onChange={(e) => setNome(e.target.value)} /></label>
        <label className="ajuda" style={{ flex: 1, minWidth: 150, margin: 0 }}>Como está
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>{STATUS.map((s) => <option key={s.v} value={s.v}>{s.rotulo}</option>)}</select>
        </label>
        <button type="submit" className="btn p" disabled={!nome.trim()}>Criar e abrir</button>
        {erro && <div className="aviso" style={{ width: "100%" }}>{erro}</div>}
      </form>
      {STATUS.map((s) => {
        const lista = dados.filter((p) => p.status === s.v);
        if (!lista.length) return null;
        return (
          <div key={s.v} className="mb">
            <h3 className="mudo" style={{ margin: "16px 0 8px" }}>{s.rotulo} ({lista.length})</h3>
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {lista.map((p) => (
                <Link key={p.id} href={`/empresa/produtos/produto?id=${p.id}`} className="card card-borda" style={{ ["--c" as string]: s.v === "ativo" ? "var(--green)" : s.v === "pausado" ? "var(--line)" : "var(--orange)", color: "inherit", textDecoration: "none" }}>
                  <div className="linha entre" style={{ gap: 8 }}><b style={{ fontSize: 16 }}>{p.nome}</b><span className={`selo ${s.selo}`}>{s.rotulo}</span></div>
                  <small className="mudo">{p.categoria} · {p.tipo}{p.ficha?.duracao ? ` · ${p.ficha.duracao}` : ""}</small>
                  <div style={{ fontSize: 20, fontWeight: 800, margin: "6px 0" }}>{p.preco ? moeda(p.preco) : "Sob consulta"}</div>
                  {p.resumo && <p className="mudo" style={{ margin: 0, fontSize: 14 }}>{p.resumo}</p>}
                  <small className="mudo">{p.materiais?.length ?? 0} materiais · {(p.projetos ?? []).filter((x) => x.status !== "feito").length} projetos em aberto</small>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
      {!dados.length && <div className="card mudo">Nenhum produto ainda.</div>}
    </>
  );
}
