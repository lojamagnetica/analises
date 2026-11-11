"use client";

import { Titulo } from "@/components/Titulo";
import { PendenciasPorCliente } from "@/components/PendenciasPorCliente";

// Todas as lojas com o que falta pedir e fazer. Agora também fica dentro do Faça agora da CS; esta página continua para os links antigos.
export default function PendenciasClientes() {
  return (
    <>
      <Titulo titulo="Pendências por cliente" sub="O que falta pedir a cada loja e o que falta a equipe fazer. Marque quando pedir e quando receber; os itens automáticos somem sozinhos quando o dado entra no Hub." />
      <PendenciasPorCliente />
    </>
  );
}
