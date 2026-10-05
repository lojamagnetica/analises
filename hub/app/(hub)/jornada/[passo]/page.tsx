import Link from "next/link";
import { notFound } from "next/navigation";
import { Texto } from "@/components/Texto";
import { Titulo } from "@/components/Titulo";
import { contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";

const ATALHO: Record<number, [string, string]> = {
  3: ["/plano", "Abrir o Plano de Ação"],
  4: ["/cursos", "Abrir cursos e gravações"],
  5: ["/planeje", "Abrir o PLANEJE AQUI"],
  6: ["/reunioes", "Ver as reuniões"],
};

export default async function Passo({ params }: { params: Promise<{ passo: string }> }) {
  const { passo } = await params;
  await contextoPortal();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("jornada_passos").select("*").eq("numero", Number(passo)).maybeSingle();
  if (!data) notFound();
  const atalho = ATALHO[data.numero];
  return (
    <>
      <Titulo voltar={{ href: "/jornada", rotulo: "Os 7 passos" }} titulo={`${data.numero}. ${data.titulo}`} sub={data.descricao} />
      <div className="card" style={{ maxWidth: 820 }}>
        <Texto md={data.conteudo} />
        {atalho && <Link className="btn p mt" href={atalho[0]}>{atalho[1]}</Link>}
      </div>
    </>
  );
}
