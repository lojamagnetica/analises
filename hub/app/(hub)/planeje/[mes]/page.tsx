import { notFound } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { BLOCOS_PLANEJE, MESES } from "@/lib/conteudo";
import { Bloco } from "./Bloco";

export default async function Mes({ params }: { params: Promise<{ mes: string }> }) {
  const mes = Number((await params).mes);
  if (!Number.isInteger(mes) || mes < 0 || mes > 11) notFound();
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  const [{ data: blocos }, { data: datas }] = await Promise.all([
    supabase.from("planeje").select("bloco, texto").eq("portal_id", portal.id).eq("mes", mes),
    supabase.from("datas_comerciais").select("dia, titulo").eq("mes", mes).order("dia", { nullsFirst: true }),
  ]);
  const texto = (b: string) => blocos?.find((x) => x.bloco === b)?.texto ?? "";

  return (
    <>
      <Titulo voltar={{ href: "/planeje", rotulo: "Todos os meses" }} titulo={`🗓️ ${MESES[mes]}`} sub="Tudo salva sozinho enquanto você escreve." />
      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--green)" }}>
        <h3>Datas comerciais do mês</h3>
        <div className="chips">
          {(datas ?? []).map((d) => <span key={d.titulo} className="chip">{d.dia ? `${d.dia}/${mes + 1} · ` : ""}{d.titulo}</span>)}
        </div>
      </div>
      <div className="grade g2">
        {BLOCOS_PLANEJE.map((b) => <Bloco key={b} mes={mes} bloco={b} inicial={texto(b)} />)}
      </div>
    </>
  );
}
