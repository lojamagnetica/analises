"use client";

import { Titulo } from "@/components/Titulo";
import { FluxoSite } from "@/components/FluxoSite";
import { moeda } from "@/lib/formato";
import { FLUXOS } from "@/lib/site-fluxos";

/** Prospecção de clientes do site: quem chamou (Instagram, anúncio, indicação) até a primeira compra. */
export default function ProspeccaoSite() {
  return (
    <>
      <Titulo titulo="Prospecção de clientes" sub="Cada pessoa que chamou pelo Instagram, anúncio, indicação ou live, do primeiro contato até a compra. A mensagem de cada etapa já vai pronta para o WhatsApp." />
      <FluxoSite fluxo={FLUXOS.lead} resumo={(l) => {
        const comprou = l.filter((i) => i.etapa === "Comprou");
        const fechados = comprou.length + l.filter((i) => i.etapa === "Sem resposta").length;
        return [
          { rotulo: "Em conversa", valor: String(l.length - fechados) },
          { rotulo: "Compraram (90 dias)", valor: String(comprou.length) },
          { rotulo: "Conversão", valor: l.length ? `${Math.round((comprou.length / l.length) * 100)}%` : "—" },
          { rotulo: "Vendido para novos", valor: moeda(comprou.reduce((s, i) => s + Number(i.valor), 0)) },
        ];
      }} />
    </>
  );
}
