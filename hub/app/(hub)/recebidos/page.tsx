"use client";

// O que você recebeu: tudo o que a Loja Magnética já entregou para a loja, do mais novo para o mais antigo.
import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { buscarEntregasFeitas } from "@/lib/entregas-feitas";

const mesDe = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", month: "long", year: "numeric" }).format(new Date(iso));

export default function Recebidos() {
  const { portal } = usePortal();
  const { dados } = useDados(() => buscarEntregasFeitas(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const meses = [...new Set(dados.map((e) => mesDe(e.entregue_em)))];
  return (
    <>
      <Titulo titulo="O que você recebeu" sub="Tudo o que a Loja Magnética já entregou para a sua loja: diagnósticos, análises, materiais, planos e resumos das reuniões. Toque para abrir." />
      {!dados.length && <div className="card mudo">As entregas aparecem aqui assim que forem liberadas para você.</div>}
      {meses.map((m) => (
        <div key={m}>
          <div className="secao" style={{ textTransform: "capitalize" }}>{m}</div>
          <div className="card mb" style={{ padding: 0 }}>
            {dados.filter((e) => mesDe(e.entregue_em) === m).map((e, i) => {
              const conteudo = (
                <div className="linha entre" style={{ gap: 8, padding: "10px 14px", borderTop: i ? "1px solid var(--line)" : 0 }}>
                  <span><b>{e.titulo}</b><br /><small className="mudo">{e.tipo} · {dataCurta(e.entregue_em.slice(0, 10))}</small></span>
                  {e.link && <span className="btn s peq">Abrir</span>}
                </div>
              );
              if (!e.link) return <div key={e.id}>{conteudo}</div>;
              return e.link.startsWith("/")
                ? <Link key={e.id} href={e.link} style={{ color: "inherit", textDecoration: "none", display: "block" }}>{conteudo}</Link>
                : <a key={e.id} href={e.link} target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "none", display: "block" }}>{conteudo}</a>;
            })}
          </div>
        </div>
      ))}
    </>
  );
}
