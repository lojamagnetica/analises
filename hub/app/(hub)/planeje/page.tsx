"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BLOCOS_PLANEJE, MESES } from "@/lib/conteudo";
import { mesAtual } from "@/lib/formato";

const CORES = ["var(--red)", "var(--purple)", "var(--green)", "var(--blue)", "var(--orange)"];

export default function Planeje() {
  const { portal } = usePortal();
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: blocos }, { data: datas }] = await Promise.all([
      sb.from("planeje").select("mes, texto").eq("portal_id", portal.id),
      sb.from("datas_comerciais").select("mes, titulo").order("dia", { nullsFirst: true }),
    ]);
    return { blocos: blocos ?? [], datas: datas ?? [] };
  }, [portal.id]);
  if (!dados) return <Carregando />;
  const atual = mesAtual();

  return (
    <>
      <Titulo titulo="🗓️ PLANEJE AQUI" aba="PLANEJE AQUI" sub="Um card por mês: datas comerciais, produtos em destaque, ações, meta e as 4 semanas." />
      <div className="grade g4">
        {MESES.map((m, i) => {
          const preenchidos = dados.blocos.filter((b) => b.mes === i && b.texto.trim()).length;
          return (
            <Link key={m} href={`/planeje/mes?m=${i}`} className="card card-borda etapa" style={{ ["--c" as string]: CORES[i % 5], textDecoration: "none", color: "inherit" }}>
              {i === atual && <span className="selo andamento">este mês</span>}
              <h3 style={{ fontSize: 17 }}>{m}</h3>
              <p>{dados.datas.filter((d) => d.mes === i).map((d) => d.titulo).join(" · ")}</p>
              <div>
                {preenchidos ? <span className="selo feito">{preenchidos}/{BLOCOS_PLANEJE.length} blocos</span> : <span className="selo espera">a planejar</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
