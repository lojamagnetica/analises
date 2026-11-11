"use client";

import { Titulo } from "@/components/Titulo";
import { ReunioesDasLojas } from "@/components/ReunioesDasLojas";

// A lista de reuniões agora também fica dentro da Agenda; esta página continua para os links antigos.
export default function ReunioesEquipe() {
  return (
    <>
      <Titulo titulo="Reuniões" sub="Próximas reuniões de todos os portais. Para marcar uma reunião, abra o portal da loja em Editar → Reuniões." />
      <ReunioesDasLojas />
    </>
  );
}
