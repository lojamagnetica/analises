"use client";

import { Titulo } from "@/components/Titulo";
import { TextosSecoes } from "@/components/TextosSecoes";
import { CONTATOS_PADRAO } from "@/lib/varejo";

/** Contatos padronizados: as mensagens que todo vendedor usa com a cliente, prontas para copiar. */
export default function Contatos() {
  return (
    <>
      <Titulo titulo="Contatos padronizados" sub="As mensagens de cada momento (pós-venda, novidade, aniversário, resgate, convite, reserva). Todo vendedor usa o mesmo texto: é só copiar, trocar o que está entre [ ] e mandar." />
      <TextosSecoes chave="contatos" padrao={CONTATOS_PADRAO} copiar />
    </>
  );
}
