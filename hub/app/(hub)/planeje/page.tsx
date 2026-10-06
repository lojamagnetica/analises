import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { BLOCOS_PLANEJE, MESES } from "@/lib/conteudo";
import { mesAtual } from "@/lib/formato";

export const metadata = { title: "PLANEJE AQUI" };

const CORES = ["var(--red)", "var(--purple)", "var(--green)", "var(--blue)", "var(--orange)"];

export default async function Planeje() {
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  const [{ data: blocos }, { data: datas }] = await Promise.all([
    supabase.from("planeje").select("mes, texto").eq("portal_id", portal.id),
    supabase.from("datas_comerciais").select("mes, titulo").order("dia", { nullsFirst: true }),
  ]);
  const atual = mesAtual();

  return (
    <>
      <Titulo titulo="🗓️ PLANEJE AQUI" sub="Um card por mês: datas comerciais, produtos em destaque, ações, meta e as 4 semanas." />
      <div className="grade g4">
        {MESES.map((m, i) => {
          const preenchidos = (blocos ?? []).filter((b) => b.mes === i && b.texto.trim()).length;
          return (
            <Link key={m} href={`/planeje/${i}`} className="card card-borda etapa" style={{ ["--c" as string]: CORES[i % 5], textDecoration: "none", color: "inherit" }}>
              {i === atual && <span className="selo andamento">este mês</span>}
              <h3 style={{ fontSize: 17 }}>{m}</h3>
              <p>{(datas ?? []).filter((d) => d.mes === i).map((d) => d.titulo).join(" · ")}</p>
              <div>
                {preenchidos
                  ? <span className="selo feito">{preenchidos}/{BLOCOS_PLANEJE.length} blocos</span>
                  : <span className="selo espera">a planejar</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
