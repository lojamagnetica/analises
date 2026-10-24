"use client";

import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarMetodoClientes, estadoConteudo } from "@/lib/clientes";

const doisDigitos = (n: number) => String(n).padStart(2, "0");

export default function Campanhas() {
  const { equipe } = usePortal();
  const { dados } = useDados(async () => ({ m: await buscarMetodoClientes() }), []);
  if (!dados) return <Carregando />;
  const { m } = dados;
  const estado = estadoConteudo(m, equipe);
  const voltar = { href: "/clientes", rotulo: "Minhas clientes" };

  if (estado === "preparo" || !m) {
    return (
      <>
        <Titulo titulo="Top 10 campanhas" voltar={voltar} />
        <div className="card">
          <h2>Em preparação pela equipe</h2>
          <p className="mudo" style={{ margin: 0 }}>As dez campanhas para a cliente voltar, comprar mais e falar bem da loja estão sendo preparadas. Assim que estiverem prontas, aparecem aqui.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Titulo titulo="Top 10 campanhas" voltar={voltar} sub={m.textos?.campanhas_sub} />
      {estado === "rascunho" && <div className="aviso mb"><b>Rascunho:</b> a loja ainda não vê este conteúdo.</div>}
      <div className="grade g2">
        {m.campanhas.map((c, i) => (
          <div key={c.nome} className="card card-borda">
            <small className="mudo" style={{ fontWeight: 700, letterSpacing: ".08em" }}>{doisDigitos(i + 1)}</small>
            <h3 style={{ margin: "2px 0 10px", textTransform: "uppercase" }}>{c.nome}</h3>
            <div className="linha mb" style={{ gap: 6 }}>
              <span className="chip">Quando: {c.quando}</span>
              <span className="chip">Para quem: {c.para_quem}</span>
            </div>
            <p style={{ margin: "0 0 10px" }}>{c.como}</p>
            <div style={{ fontSize: 13.5 }}><b style={{ color: "var(--ink)" }}>Meta:</b> {c.meta}</div>
          </div>
        ))}
      </div>
    </>
  );
}
