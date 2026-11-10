"use client";

import { LeituraDaSemana } from "@/components/LeituraDaSemana";
import { Titulo } from "@/components/Titulo";

/** A leitura da semana, num atalho do Início (antes ficava aberta no topo). */
export default function Leitura() {
  return (
    <>
      <Titulo titulo="Leitura da semana" sub="Toda segunda a Camilla lê os números da sua semana e deixa aqui o que eles mostram e as ações para a semana." />
      <LeituraDaSemana />
    </>
  );
}
