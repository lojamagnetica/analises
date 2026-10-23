"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { buscarAnalises } from "@/lib/instagram";

export default function Analises() {
  useEquipe();
  const [filtro, setFiltro] = useState<"todas" | "falta" | "rascunho" | "liberada">("todas");
  const { dados } = useDados(buscarAnalises, []);
  if (!dados) return <Carregando />;
  const de = (id: string) => dados.analises.find((a) => a.portal_id === id);
  const estado = (id: string) => de(id)?.status ?? "falta";
  const lista = dados.portais.filter((p) => filtro === "todas" || estado(p.id) === filtro);
  const conta = (s: string) => dados.portais.filter((p) => estado(p.id) === s).length;

  return (
    <>
      <Titulo titulo="Análises de perfil" sub="A Análise do Perfil de cada loja, no Método Loja Magnética. Ela abre o módulo de Conteúdo no portal: enquanto não for liberada, a loja vê o Conteúdo trancado." />
      <div className="chips mb">
        {([["todas", `Todas · ${dados.portais.length}`], ["falta", `Sem análise · ${conta("falta")}`], ["rascunho", `Rascunho · ${conta("rascunho")}`], ["liberada", `Liberadas · ${conta("liberada")}`]] as const).map(([k, r]) => (
          <button key={k} type="button" className="chip" aria-pressed={filtro === k} style={filtro === k ? { borderColor: "var(--red)", color: "var(--red)" } : undefined} onClick={() => setFiltro(k)}>{r}</button>
        ))}
      </div>
      <div className="card">
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Loja</th><th>Tipo</th><th>Análise</th><th></th></tr></thead>
            <tbody>
              {lista.map((p) => {
                const a = de(p.id);
                return (
                  <tr key={p.id}>
                    <td><b>{p.loja}</b>{p.responsavel ? <div className="mudo" style={{ fontSize: 13 }}>{p.responsavel}</div> : null}</td>
                    <td>{p.tipo}</td>
                    <td>{!a ? <span className="selo espera">sem análise</span> : a.status === "liberada" ? <span className="selo feito">liberada · {dataCurta(a.liberada_em)}</span> : <span className="selo alerta">rascunho · {dataCurta(a.updated_at)}</span>}</td>
                    <td style={{ textAlign: "right" }}><Link className="btn s peq" href={`/equipe/analise?p=${p.id}`}>{a ? "Abrir" : "Montar análise"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
