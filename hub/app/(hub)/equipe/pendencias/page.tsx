"use client";

import { useState } from "react";
import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { ListaPendencias } from "@/components/Pendencias";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { aberta, buscarPendencias } from "@/lib/pendencias";

// Todas as lojas com o que falta pedir e fazer. É a lista de trabalho de quem cobra os clientes.
export default function PendenciasClientes() {
  const { nome } = useEquipe();
  const [filtro, setFiltro] = useState<"loja" | "todas">("loja");
  const [busca, setBusca] = useState("");
  const { dados, recarregar } = useDados(() => buscarPendencias(), []);
  if (!dados) return <Carregando />;

  const lista = dados
    .filter((p) => !busca.trim() || p.loja.toLowerCase().includes(busca.trim().toLowerCase()))
    .map((p) => ({ p, abertas: p.pendencias.filter((x) => aberta(x) && (filtro === "todas" || x.quem === "Loja")).length }));
  const totalLoja = dados.reduce((n, p) => n + p.pendencias.filter((x) => aberta(x) && x.quem === "Loja").length, 0);
  const pedidas = dados.reduce((n, p) => n + p.pendencias.filter((x) => x.status === "solicitado").length, 0);

  return (
    <>
      <Titulo titulo="Pendências por cliente" sub="O que falta pedir a cada loja e o que falta a equipe fazer. Marque quando pedir e quando receber; os itens automáticos somem sozinhos quando o dado entra no Hub." />
      <div className="grade g3 mb">
        <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--orange)" }}><b>{totalLoja}</b><small>itens para pedir às lojas</small></div>
        <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--red)" }}><b>{pedidas}</b><small>já pedidos, esperando a loja</small></div>
        <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--green)" }}><b>{dados.filter((p) => !p.pendencias.some(aberta)).length}</b><small>lojas com tudo em dia</small></div>
      </div>
      <div className="linha mb" style={{ gap: 8 }}>
        <div className="chips">
          <button type="button" className={`chip ${filtro === "loja" ? "escolhido" : ""}`} onClick={() => setFiltro("loja")}>Só o que pedir à loja</button>
          <button type="button" className={`chip ${filtro === "todas" ? "escolhido" : ""}`} onClick={() => setFiltro("todas")}>Tudo, com a equipe</button>
        </div>
        <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar loja…" style={{ maxWidth: 240 }} />
      </div>
      {lista.map(({ p, abertas }) => (
        <details key={p.id} className="card mb pend-loja">
          <summary>
            <span className="linha entre" style={{ width: "100%" }}>
              <span><b>{p.loja}</b> <small className="mudo">· {p.tipo}{p.responsavel ? ` · ${p.responsavel}` : ""}</small></span>
              <span className={`selo ${abertas ? "alerta" : "feito"}`}>{abertas ? `${abertas} em aberto` : "em dia"}</span>
            </span>
          </summary>
          <div className="mt">
            <ListaPendencias p={filtro === "loja" ? { ...p, pendencias: p.pendencias.filter((x) => x.quem === "Loja") } : p} nome={nome} recarregar={recarregar} />
            <Link className="btn s peq mt" href={`/equipe/portal?id=${p.id}#pendencias`}>Abrir o portal</Link>
          </div>
        </details>
      ))}
    </>
  );
}
