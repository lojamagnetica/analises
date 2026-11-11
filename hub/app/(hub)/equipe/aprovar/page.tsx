"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { buscarParaAprovar } from "@/lib/aprovar";

/** Tudo o que espera a Camilla para a loja ver: um lugar só, com o atalho para abrir e o botão de liberar. */
export default function Aprovar() {
  const { abrirPortal, aprova } = useEquipe();
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("");
  const { dados, recarregar } = useDados(() => buscarParaAprovar(), []);
  if (!dados) return <Carregando />;

  const nome = (id: string | null) => (id ? dados.ativos.get(id) ?? "Loja" : "Para todas as lojas");
  const tipos = [...new Set(dados.itens.map((i) => i.tipo))];
  const lista = dados.itens.filter((i) => !filtro || i.tipo === filtro);
  // Agrupa por loja; o que é para todas fica no fim.
  const grupos = [...new Set(lista.map((i) => i.portal))].sort((a, b) => (a == null ? 1 : b == null ? -1 : nome(a).localeCompare(nome(b))));

  return (
    <>
      <Titulo titulo={aprova ? "Para aprovar" : "Esperando a Camilla"} sub={aprova
        ? "Tudo o que está esperando a sua revisão para as lojas verem: Diagnósticos, Gestão, Análises do Instagram, planos do mês, Ações do Mês e pautas. Abra para revisar e libere quando estiver ok."
        : "Tudo o que está pronto e esperando a Camilla aprovar para as lojas verem. Abra para conferir e completar o que faltar; liberar é com a Camilla."} />
      <div className="chips mb">
        <button type="button" className={`chip ${!filtro ? "escolhido" : ""}`} aria-pressed={!filtro} onClick={() => setFiltro("")}>Tudo · {dados.itens.length}</button>
        {tipos.map((t) => (
          <button key={t} type="button" className={`chip ${filtro === t ? "escolhido" : ""}`} aria-pressed={filtro === t} onClick={() => setFiltro(t)}>
            {t} · {dados.itens.filter((i) => i.tipo === t).length}
          </button>
        ))}
      </div>
      {erro && <div className="aviso mb">{erro}</div>}
      {!lista.length && <div className="card">Nada esperando a sua revisão. 🎉</div>}
      {grupos.map((g) => (
        <div key={g ?? "todas"} className="card mb">
          <h3 style={{ marginTop: 0 }}>{nome(g)}</h3>
          {lista.filter((i) => i.portal === g).map((i) => (
            <div key={i.chave} className="linha entre" style={{ padding: "8px 0", borderTop: "1px solid var(--line)", gap: 8 }}>
              <span>
                <span className="selo espera" style={{ marginRight: 8 }}>{i.tipo}</span>
                <b>{i.titulo}</b>
                {i.quando && <small className="mudo"> · {dataCurta(i.quando)}</small>}
              </span>
              <span className="linha" style={{ gap: 6 }}>
                {i.destino && i.portal
                  ? <button type="button" className="btn s peq" onClick={() => abrirPortal(i.portal, i.destino)}>Abrir para revisar</button>
                  : i.href && <Link className="btn s peq" href={i.href}>Abrir para revisar</Link>}
                {i.liberar && aprova && (
                  <button type="button" className="btn p peq" onClick={async () => {
                    if (!confirm(`Liberar "${i.titulo}" para ${nome(i.portal)}? A loja passa a ver.`)) return;
                    setErro("");
                    try { await i.liberar!(); recarregar(); } catch (e) { setErro((e as Error).message); }
                  }}>Liberar</button>
                )}
              </span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
