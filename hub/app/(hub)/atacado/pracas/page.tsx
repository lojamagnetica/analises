"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { buscarAtacado, situacao } from "@/lib/atacado";

/** Praças: onde o atacado vende, por estado e cidade. Mostra onde está concentrado e onde a praça esfriou. */
export default function Pracas() {
  const { portal } = usePortal();
  const { dados } = useDados(() => buscarAtacado(portal.id), [portal.id]);
  const [uf, setUf] = useState("");
  if (!dados) return <Carregando />;
  const cs = dados.clientes;
  const total = cs.reduce((s, c) => s + Number(c.total_ano), 0) || 1;
  const agrupa = (chave: (c: (typeof cs)[number]) => string, lista = cs) => [...new Set(lista.map(chave))].map((k) => {
    const l = lista.filter((c) => chave(c) === k);
    const t = l.reduce((s, c) => s + Number(c.total_ano), 0);
    return { k, n: l.length, t, ativos: l.filter((c) => situacao(c) === "ativo").length, parados: l.filter((c) => situacao(c) === "parado").length };
  }).sort((a, b) => b.t - a.t);
  const estados = agrupa((c) => c.uf || "(sem UF)");
  const cidades = agrupa((c) => c.cidade || "(sem cidade)", cs.filter((c) => (c.uf || "(sem UF)") === uf));
  // Praça fria: todos os lojistas da cidade parados ou sem pedido.
  const frias = agrupa((c) => `${c.cidade}/${c.uf}`, cs.filter((c) => c.cidade && c.uf)).filter((x) => x.ativos === 0 && x.parados > 0).slice(0, 15);

  const Tabela = ({ linhas, rot, clicar }: { linhas: ReturnType<typeof agrupa>; rot: string; clicar?: (k: string) => void }) => (
    <div className="tabela-wrap"><table className="tabela">
      <thead><tr><th>{rot}</th><th>Lojistas</th><th>Ativos</th><th>Parados</th><th>No ano</th><th>%</th></tr></thead>
      <tbody>{linhas.map((x) => (
        <tr key={x.k} style={clicar ? { cursor: "pointer", background: x.k === uf ? "var(--soft)" : undefined } : undefined} onClick={() => clicar?.(x.k)}>
          <td><b>{x.k}</b></td><td>{x.n}</td><td>{x.ativos}</td><td style={{ color: x.parados ? "var(--red)" : undefined }}>{x.parados}</td><td>{moeda(x.t)}</td><td>{Math.round((x.t / total) * 100)}%</td>
        </tr>
      ))}</tbody>
    </table></div>
  );

  return (
    <>
      <Titulo titulo="Praças" sub="Onde o atacado vende: por estado e por cidade. Toque num estado para ver as cidades." />
      {!cs.length && <div className="card mudo">Importe a carteira (com cidade e UF) para ver as praças.</div>}
      {cs.length > 0 && (
        <div className="grade g2 mb">
          <div className="card"><h3 style={{ marginTop: 0 }}>Por estado</h3><Tabela linhas={estados} rot="UF" clicar={(k) => setUf(k === uf ? "" : k)} /></div>
          <div className="card"><h3 style={{ marginTop: 0 }}>{uf ? `Cidades de ${uf}` : "Cidades"}</h3>{uf ? <Tabela linhas={cidades} rot="Cidade" /> : <p className="mudo">Escolha um estado ao lado.</p>}</div>
        </div>
      )}
      {frias.length > 0 && (
        <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
          <h3 style={{ marginTop: 0 }}>Praças que esfriaram</h3>
          <p className="mudo" style={{ marginTop: 0 }}>Cidades onde nenhum lojista comprou nos últimos 30 dias. Ou reativa quem está lá, ou busca um lojista novo para a praça.</p>
          {frias.map((x) => <div key={x.k} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0" }}><span><b>{x.k}</b> <small className="mudo">{x.n} lojista{x.n === 1 ? "" : "s"}</small></span><b>{moeda(x.t)}</b></div>)}
        </div>
      )}
    </>
  );
}
