import Link from "next/link";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "A jornada" };

const CORES = ["var(--red)", "var(--purple)", "var(--green)", "var(--blue)", "var(--orange)", "var(--purple)", "var(--red)"];

export default async function Jornada() {
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  const { data: passos } = await supabase.from("jornada_passos").select("numero, titulo, descricao").order("numero");

  return (
    <>
      <Titulo titulo="A jornada da sua Loja Magnética" sub="Os 7 passos da mentoria. Você está no passo destacado." />
      <div className="grade g3">
        {(passos ?? []).map((p) => {
          const feito = p.numero < portal.passo_atual;
          const agora = p.numero === portal.passo_atual;
          return (
            <div key={p.numero} className="card card-borda etapa" style={{ ["--c" as string]: feito ? "var(--green)" : CORES[p.numero - 1] }}>
              <span className={`selo ${feito ? "feito" : agora ? "andamento" : "espera"}`}>
                {feito ? "feito" : agora ? "agora" : "a seguir"}
              </span>
              <span className="quadrado" style={{ ["--c" as string]: feito ? "var(--green)" : CORES[p.numero - 1] }}>
                {feito ? <Icone nome="check" /> : <b style={{ fontSize: 18 }}>{p.numero}</b>}
              </span>
              <h3>{p.titulo}</h3>
              <p>{p.descricao}</p>
              <Link className="btn-contorno" href={`/jornada/${p.numero}`}>Abrir</Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
