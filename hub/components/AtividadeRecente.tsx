"use client";

import Link from "next/link";
import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { ROTULO_ATIVIDADE, buscarAtividades, type TipoAtividade } from "@/lib/atividade";
import { dataHora, haQuanto } from "@/lib/formato";

const TIPOS = Object.keys(ROTULO_ATIVIDADE) as TipoAtividade[];

export function AtividadeRecente() {
  const [filtro, setFiltro] = useState<TipoAtividade | "">("");
  const { dados } = useDados(buscarAtividades, []);
  if (!dados) return <Carregando />;
  const lista = dados.filter((a) => !filtro || a.tipo === filtro).slice(0, 25);

  return (
    <div className="card mt" id="atividade">
      <h2>Atividade recente</h2>
      <p className="mudo" style={{ marginTop: 0 }}>O que a equipe fez por último: entradas, vendas, etapas, respostas e contratos.</p>
      <div className="chips mb">
        <button type="button" className={`chip${filtro === "" ? " escolhido" : ""}`} onClick={() => setFiltro("")}>Tudo</button>
        {TIPOS.map((t) => (
          <button key={t} type="button" className={`chip${filtro === t ? " escolhido" : ""}`} onClick={() => setFiltro(t)}>{ROTULO_ATIVIDADE[t]}</button>
        ))}
      </div>
      {lista.length === 0 && <p className="mudo">Nada registrado ainda.</p>}
      {lista.map((a) => (
        <div key={a.id} className="linha entre marcar" style={{ cursor: "default" }}>
          <span>
            <b>{a.quem}</b> {a.texto}
            {a.loja && <> · {a.portal_id ? <Link href={`/equipe/portal?id=${a.portal_id}#ficha`}>{a.loja}</Link> : a.loja}</>}
          </span>
          <span className="mudo" style={{ whiteSpace: "nowrap" }} title={dataHora(a.quando)}>{haQuanto(a.quando)}</span>
        </div>
      ))}
    </div>
  );
}
