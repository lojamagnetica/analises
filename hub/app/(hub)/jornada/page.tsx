"use client";

import { SetePassos } from "@/components/SetePassos";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Jornada() {
  const { portal } = usePortal();
  const { dados: passos } = useDados(async () => (await supabaseBrowser().from("jornada_passos").select("numero, titulo, descricao").order("numero")).data ?? [], []);
  if (!passos) return <Carregando />;
  return (
    <>
      <Titulo titulo="A jornada da sua Loja Magnética" aba="A jornada" sub="Os 7 passos da mentoria. Você está no passo destacado." />
      <SetePassos passos={passos} atual={portal.passo_atual} />
    </>
  );
}
