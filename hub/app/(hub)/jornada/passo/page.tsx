"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Texto } from "@/components/Texto";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";

const ATALHO: Record<number, [string, string]> = {
  3: ["/plano", "Abrir o Plano de Ação"],
  4: ["/cursos", "Abrir cursos e gravações"],
  5: ["/planeje", "Abrir o PLANEJE AQUI"],
  6: ["/reunioes", "Ver as reuniões"],
};

function Passo() {
  usePortal();
  const n = Number(useSearchParams().get("n"));
  const { dados } = useDados(async () => (await supabaseBrowser().from("jornada_passos").select("*").eq("numero", n).maybeSingle()).data, [n]);
  if (!dados) return <Carregando />;
  const atalho = ATALHO[dados.numero];
  return (
    <>
      <Titulo voltar={{ href: "/jornada", rotulo: "Os 7 passos" }} titulo={`${dados.numero}. ${dados.titulo}`} sub={dados.descricao} />
      <div className="card" style={{ maxWidth: 820 }}>
        <Texto md={dados.conteudo} />
        {atalho && <Link className="btn p mt" href={atalho[0]}>{atalho[1]}</Link>}
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Passo /></Suspense>;
}
