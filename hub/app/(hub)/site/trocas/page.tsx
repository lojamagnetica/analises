"use client";

import { Titulo } from "@/components/Titulo";
import { FluxoSite } from "@/components/FluxoSite";
import { atrasadoFluxo, FLUXOS } from "@/lib/site-fluxos";

/** Trocas e devoluções: cada pedido de troca até resolver, com prazo, motivo e como foi resolvido. */
export default function Trocas() {
  const f = FLUXOS.troca;
  return (
    <>
      <Titulo titulo="Trocas e devoluções" sub="Cada troca ou devolução, da solicitação até resolver, com o motivo e o prazo. Os motivos mostram o que corrigir (tabela de medidas, foto, embalagem)." />
      <FluxoSite fluxo={f} resumo={(l) => {
        const motivos = l.map((i) => String(i.info?.motivo ?? "")).filter(Boolean);
        const top = [...new Set(motivos)].map((m) => [m, motivos.filter((x) => x === m).length] as const).sort((a, b) => b[1] - a[1])[0];
        return [
          { rotulo: "Em aberto", valor: String(l.filter((i) => !f.finais.includes(i.etapa)).length) },
          { rotulo: "Atrasadas", valor: String(l.filter((i) => atrasadoFluxo(f, i)).length), alerta: l.some((i) => atrasadoFluxo(f, i)) },
          { rotulo: "Resolvidas (90 dias)", valor: String(l.filter((i) => i.etapa === "Resolvida").length) },
          { rotulo: "Motivo que mais aparece", valor: top ? `${top[0]} (${top[1]})` : "—" },
        ];
      }} />
    </>
  );
}
