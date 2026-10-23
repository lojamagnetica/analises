"use client";

import Link from "next/link";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";

const CORES = ["var(--red)", "var(--purple)", "var(--green)", "var(--blue)", "var(--orange)", "var(--purple)", "var(--red)"];

export default function Jornada() {
  const { portal } = usePortal();
  const { dados: passos } = useDados(async () => (await supabaseBrowser().from("jornada_passos").select("numero, titulo, descricao").order("numero")).data ?? [], []);
  if (!passos) return <Carregando />;
  return (
    <>
      <Titulo titulo="A jornada da sua Loja Magnética" aba="A jornada" sub="Os 7 passos da mentoria. Você está no passo destacado." />
      <div className="grade g3">
        {passos.map((p) => {
          const feito = p.numero < portal.passo_atual;
          const agora = p.numero === portal.passo_atual;
          const cor = feito ? "var(--green)" : CORES[p.numero - 1];
          return (
            <div key={p.numero} className="card card-borda etapa" style={{ ["--c" as string]: cor }}>
              <span className={`selo ${feito ? "feito" : agora ? "andamento" : "espera"}`}>{feito ? "feito" : agora ? "agora" : "a seguir"}</span>
              <span className="quadrado" style={{ ["--c" as string]: cor }}>
                {feito ? <Icone nome="check" /> : <b style={{ fontSize: 18 }}>{p.numero}</b>}
              </span>
              <h3>{p.titulo}</h3>
              <p>{p.descricao}</p>
              <Link className="btn-contorno" href={`/jornada/passo?n=${p.numero}`}>Abrir</Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
