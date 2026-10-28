"use client";

import { Titulo } from "@/components/Titulo";
import { FluxoSite } from "@/components/FluxoSite";
import { atrasadoFluxo, FLUXOS } from "@/lib/site-fluxos";

/** Separação de pedidos: do pago ao separado, com o checklist de conferência e embalagem. */
export default function SeparacaoSite() {
  const f = FLUXOS.pedido;
  return (
    <>
      <Titulo titulo="Separação de pedidos" sub="Os pedidos pagos até ficarem separados e embalados, com o checklist de conferência de cada um. Depois de separado, o pedido segue no Status dos pedidos." />
      <FluxoSite fluxo={f} etapas={["Pago", "Em separação", "Separado"]} resumo={(l) => [
        { rotulo: "Para separar", valor: String(l.filter((i) => i.etapa === "Pago").length) },
        { rotulo: "Em separação", valor: String(l.filter((i) => i.etapa === "Em separação").length) },
        { rotulo: "Separados (esperando envio)", valor: String(l.filter((i) => i.etapa === "Separado").length) },
        { rotulo: "Atrasados para despachar", valor: String(l.filter((i) => ["Pago", "Em separação", "Separado"].includes(i.etapa) && atrasadoFluxo(f, i)).length), alerta: l.some((i) => ["Pago", "Em separação", "Separado"].includes(i.etapa) && atrasadoFluxo(f, i)) },
      ]} />
    </>
  );
}
