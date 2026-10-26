"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dia, hoje, moeda } from "@/lib/formato";
import { STATUS_PLANO, buscarPlanos, metaDoPlano, nomeMes, prazoDoPlano, somarMes } from "@/lib/plano-mes";

const CORES = ["var(--red)", "var(--purple)", "var(--green)", "var(--blue)"];

export default function Planeje() {
  const { portal } = usePortal();
  const { dados } = useDados(async () => {
    const [planos, { data: datas }] = await Promise.all([
      buscarPlanos(portal.id),
      supabaseBrowser().from("datas_comerciais").select("mes, titulo").order("dia", { nullsFirst: true }),
    ]);
    return { planos, datas: (datas ?? []) as { mes: number; titulo: string }[] };
  }, [portal.id]);
  if (!dados) return <Carregando />;
  const atual = hoje().slice(0, 7);
  // Os 3 próximos meses para planejar; o mês atual (já em andamento) fica junto dos anteriores.
  const proximos = [1, 2, 3].map((n) => somarMes(atual, n));
  const anteriores: { mes: string; status: keyof typeof STATUS_PLANO | null }[] = [
    // O mês atual aparece mesmo sem plano, para dar para planejar a meta dele.
    ...(dados.planos.some((p) => p.mes === atual) ? [] : [{ mes: atual, status: null }]),
    ...dados.planos.filter((p) => p.mes <= atual),
  ];

  return (
    <>
      <Titulo titulo="🗓️ PLANEJE AQUI" aba="PLANEJE AQUI"
        sub="O plano de ação de cada mês: a meta, as ações, as datas especiais, os produtos em destaque e as 4 semanas. Monte até o dia 20 do mês anterior e mande para a Camilla." />
      <div className="grade g3">
        {proximos.map((mes, i) => {
          const p = dados.planos.find((x) => x.mes === mes);
          const prazo = prazoDoPlano(mes);
          const atrasado = !p || p.status === "rascunho" ? hoje() > prazo : false;
          const meta = p ? metaDoPlano(p.dados) : null;
          const nMes = Number(mes.slice(5, 7)) - 1;
          return (
            <Link key={mes} href={`/planeje/mes?m=${mes}`} className="card card-borda etapa" style={{ ["--c" as string]: CORES[i], textDecoration: "none", color: "inherit" }}>
              <div className="linha entre">
                {i === 0 ? <span className="selo andamento">próximo mês</span> : <span />}
                {p ? <span className={`selo ${STATUS_PLANO[p.status].classe}`}>{STATUS_PLANO[p.status].texto}</span> : <span className="selo espera">a planejar</span>}
              </div>
              <h3 style={{ fontSize: 18 }}>{nomeMes(mes)}</h3>
              <p className="mudo" style={{ fontSize: 13.5 }}>{dados.datas.filter((d) => d.mes === nMes).map((d) => d.titulo).join(" · ")}</p>
              {meta && <div style={{ fontVariantNumeric: "tabular-nums" }}>Meta: <b>{moeda(meta)}</b></div>}
              {(!p || p.status === "rascunho") && (
                <small style={{ color: atrasado ? "var(--red)" : undefined }}>{atrasado ? `Prazo era ${dia(prazo)}` : `Mandar até ${dia(prazo)}`}</small>
              )}
            </Link>
          );
        })}
      </div>
      {anteriores.length > 0 && (
        <>
          <div className="secao">Este mês e os anteriores</div>
          <div className="grade g4">
            {anteriores.map((p) => (
              <Link key={p.mes} href={`/planeje/mes?m=${p.mes}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <b>{nomeMes(p.mes)}</b>
                <div>{p.status ? <span className={`selo ${STATUS_PLANO[p.status].classe}`}>{STATUS_PLANO[p.status].texto}</span> : <span className="selo espera">a planejar</span>}{p.mes === atual && <small className="mudo"> · este mês</small>}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
