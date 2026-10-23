"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { Carregando, usePortal } from "@/lib/hub";
import { ETAPAS } from "@/lib/conteudo";

function Personalizacao() {
  const salvo = useSearchParams().get("salvo");
  const { pers } = usePortal();
  const feitas = ETAPAS.filter((e) => pers.get(e.numero)?.concluida).length;
  const proxima = ETAPAS.find((e) => !pers.get(e.numero)?.concluida);

  return (
    <>
      <Titulo titulo="Personalização" sub="7 etapas para o Hub conhecer a sua loja. Quanto mais completo, mais certeiros ficam o Plano, os scripts e o Assistente." />
      <div className="heroi mb" style={{ background: "var(--red)" }}>
        <div style={{ fontSize: 34, fontWeight: 800 }}>{feitas}/7</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <b>{proxima ? `Próxima: ${proxima.titulo}` : "Personalização completa 🎉"}</b>
          <div className="barra mt" style={{ background: "rgba(255,255,255,.3)" }}><i style={{ width: `${(feitas / 7) * 100}%`, background: "#fff" }} /></div>
        </div>
        {proxima && <Link className="btn b" href={`/personalizacao/etapa?n=${proxima.numero}`}>Continuar →</Link>}
      </div>
      {salvo && <div className="aviso ok mb">Etapa {salvo} salva.</div>}
      <div className="grade g3">
        {ETAPAS.map((e) => {
          const feita = !!pers.get(e.numero)?.concluida;
          const cor = feita ? "var(--green)" : "var(--red)";
          return (
            <div key={e.numero} className="card card-borda etapa" style={{ ["--c" as string]: cor }}>
              <span className={`selo ${feita ? "feito" : "andamento"}`}>{feita ? "feito" : "pendente"}</span>
              <span className="quadrado" style={{ ["--c" as string]: cor }}>
                {feita ? <Icone nome="check" /> : <b style={{ fontSize: 18 }}>{e.numero}</b>}
              </span>
              <h3>{e.titulo}</h3>
              <p>{e.descricao}</p>
              <Link className="btn-contorno" href={`/personalizacao/etapa?n=${e.numero}`}>{feita ? "Ver minhas respostas" : "Responder"}</Link>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Personalizacao /></Suspense>;
}
