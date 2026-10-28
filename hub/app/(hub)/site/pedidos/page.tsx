"use client";

import { Titulo } from "@/components/Titulo";
import { FluxoSite } from "@/components/FluxoSite";
import { FLUXOS } from "@/lib/site-fluxos";

/** Status dos pedidos: cada pedido do pago à entrega, com o aviso ao cliente em cada mudança. */
export default function StatusPedidos() {
  return (
    <>
      <Titulo titulo="Status dos pedidos" sub="Cada pedido do pago à entrega. A cada mudança de status, avise o cliente pelo WhatsApp (a mensagem já vai pronta, com o rastreio). O que não foi avisado fica com o botão em destaque." />
      <FluxoSite fluxo={FLUXOS.pedido} resumo={(l) => {
        const abertos = l.filter((i) => !FLUXOS.pedido.finais.includes(i.etapa));
        const semAviso = l.filter((i) => FLUXOS.pedido.msgs[i.etapa] && i.avisado !== i.etapa && i.etapa !== "Cancelado").length;
        return [
          { rotulo: "Em andamento", valor: String(abertos.length) },
          { rotulo: "Enviados (a caminho)", valor: String(l.filter((i) => i.etapa === "Enviado").length) },
          { rotulo: "Clientes sem aviso do status", valor: String(semAviso), alerta: semAviso > 0 },
          { rotulo: "Entregues (90 dias)", valor: String(l.filter((i) => i.etapa === "Entregue").length) },
        ];
      }} />
    </>
  );
}
