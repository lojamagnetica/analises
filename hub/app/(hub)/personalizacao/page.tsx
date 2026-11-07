"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { Carregando, usePortal } from "@/lib/hub";
import { ETAPAS, chaveSituacao } from "@/lib/conteudo";

function Personalizacao() {
  const salvo = useSearchParams().get("salvo");
  const { pers } = usePortal();
  const feitas = ETAPAS.filter((e) => pers.get(e.numero)?.concluida).length;
  const proxima = ETAPAS.find((e) => !pers.get(e.numero)?.concluida);

  return (
    <>
      <Titulo titulo="Dados da loja" sub={`${ETAPAS.length} etapas para a gente conhecer a fundo como está a gestão e os resultados da sua loja. Com elas a equipe monta o seu Diagnóstico e define o foco da mentoria.`} />
      <div className="heroi mb" style={{ background: "var(--red)" }}>
        <div style={{ fontSize: 34, fontWeight: 800 }}>{feitas}/{ETAPAS.length}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <b>{proxima ? `Próxima: ${proxima.titulo}` : "Dados da loja completos 🎉"}</b>
          <div className="barra mt" style={{ background: "rgba(255,255,255,.3)" }}><i style={{ width: `${(feitas / ETAPAS.length) * 100}%`, background: "#fff" }} /></div>
        </div>
        {proxima && <Link className="btn b" href={`/personalizacao/etapa?n=${proxima.numero}`}>Continuar →</Link>}
      </div>
      {salvo && <div className="aviso ok mb">Etapa {salvo} salva.{proxima ? "" : " Painel, Gestão estratégica e Vendas liberados."}</div>}
      <div className="grade g3">
        {ETAPAS.map((e, i) => {
          const feita = !!pers.get(e.numero)?.concluida;
          // O que a equipe já preencheu conta: mostra quanto falta em vez de "pendente" na etapa toda.
          const r = (pers.get(e.numero)?.respostas ?? {}) as Record<string, unknown>;
          const vazio = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
          const faltam = e.campos.filter((c) => vazio(r[c.id]) && r[chaveSituacao(c.id)] !== "nao_tenho").length;
          const comeco = !feita && faltam < e.campos.length;
          const cor = feita ? "var(--green)" : comeco ? "var(--amber, #d98a00)" : "var(--red)";
          return (
            <div key={e.numero} className="card card-borda etapa" style={{ ["--c" as string]: cor }}>
              <span className={`selo ${feita ? "feito" : comeco ? "espera" : "andamento"}`}>{feita ? "feito" : comeco ? (faltam ? `falta${faltam > 1 ? "m" : ""} ${faltam}` : "conferir e concluir") : "pendente"}</span>
              <span className="quadrado" style={{ ["--c" as string]: cor }}>
                {feita ? <Icone nome="check" /> : <b style={{ fontSize: 18 }}>{i + 1}</b>}
              </span>
              <h3>{e.titulo}</h3>
              <p>{e.descricao}</p>
              <Link className="btn-contorno" href={`/personalizacao/etapa?n=${e.numero}`}>{feita ? "Ver minhas respostas" : comeco ? "Conferir e completar" : "Responder"}</Link>
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
