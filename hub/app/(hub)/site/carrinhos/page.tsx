"use client";

import { Titulo } from "@/components/Titulo";
import { FluxoSite } from "@/components/FluxoSite";
import { moeda } from "@/lib/formato";
import { FLUXOS } from "@/lib/site-fluxos";

/** Recuperação de carrinhos abandonados: a sequência de 3 mensagens (1h, 24h e 72h) até recuperar ou perder. */
export default function Carrinhos() {
  return (
    <>
      <Titulo titulo="Carrinhos abandonados" sub="Quem deixou peças no carrinho sem finalizar. A sequência: uma mensagem em até 1 hora, outra em 24 horas e a última em 72 horas com uma condição. Cadastre o carrinho, mande a mensagem e avance." />
      <FluxoSite fluxo={FLUXOS.carrinho} resumo={(l) => {
        const rec = l.filter((i) => i.etapa === "Recuperado");
        const fechados = rec.length + l.filter((i) => i.etapa === "Perdido").length;
        return [
          { rotulo: "Em recuperação", valor: String(l.length - fechados) },
          { rotulo: "Valor parado nos carrinhos", valor: moeda(l.filter((i) => !FLUXOS.carrinho.finais.includes(i.etapa)).reduce((s, i) => s + Number(i.valor), 0)) },
          { rotulo: "Recuperados (90 dias)", valor: `${rec.length} · ${moeda(rec.reduce((s, i) => s + Number(i.valor), 0))}` },
          { rotulo: "Taxa de recuperação", valor: fechados ? `${Math.round((rec.length / fechados) * 100)}%` : "—" },
        ];
      }} />
    </>
  );
}
