"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { CombinadosDaEntrega } from "@/components/CombinadosDaEntrega";
import { antesDaReuniao, buscarEntrega, roteiroEntrega, roteiroTexto } from "@/lib/entrega";

/** O roteiro da reunião de entrega do Hub, montado com os dados do portal. */
function Entrega() {
  const id = useSearchParams().get("id") ?? "";
  const hub = useEquipe();
  const { dados } = useDados(() => buscarEntrega(id), [id]);
  if (!dados) return <Carregando />;
  const blocos = roteiroEntrega(dados);
  const conferir = antesDaReuniao(dados);
  const total = blocos.reduce((s, b) => s + b.minutos, 0);
  return (
    <>
      <Titulo voltar={{ href: "/equipe", rotulo: "Painel dos portais" }} titulo={`Reunião de entrega · ${dados.p.loja}`}
        sub={`A reunião individual extra de entrega do Hub (${total} min). O foco é a clareza do uso: no fim, a loja usa sozinha. Faça tudo no celular dela, com ela mexendo.`} />
      <div className="card card-borda mb" style={{ ["--c" as string]: conferir.every((c) => c.ok) ? "var(--feito)" : "var(--red)" }}>
        <h3 style={{ marginTop: 0 }}>Antes da reunião</h3>
        {conferir.map((c) => <div key={c.texto} style={{ margin: "4px 0" }}><span className={`selo ${c.ok ? "feito" : "alerta"}`}>{c.ok ? "✓" : "falta"}</span> {c.texto}</div>)}
        <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn s peq" onClick={() => hub.abrirPortal(id)}>Abrir o portal</button>
          <Copiar texto={roteiroTexto(dados.p.loja, blocos)} rotulo="Copiar o roteiro" />
        </div>
      </div>
      {blocos.map((b) => (
        <div key={b.titulo} className="card mb">
          <div className="linha entre"><h3 style={{ margin: 0 }}>{b.titulo}</h3><span className="selo espera">{b.minutos} min</span></div>
          <p className="mudo" style={{ margin: "4px 0 8px" }}>Mostrar: {b.mostrar}</p>
          {b.falas.map((x, i) => <p key={i} style={{ margin: "4px 0", fontSize: 16 }}>{x}</p>)}
        </div>
      ))}
      <CombinadosDaEntrega portalId={id} loja={dados.p.loja} />
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Entrega /></Suspense>;
}
