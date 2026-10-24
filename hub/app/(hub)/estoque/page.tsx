"use client";

import { EmBreve } from "@/components/EmBreve";

export default function Estoque() {
  return <EmBreve titulo="Estoque x o que fazer" oque="A foto do seu estoque e o que fazer com cada parte dele: o que repor, o que girar, o que liquidar e o que não comprar de novo, no padrão Loja Magnética (curva ABC, idade das peças e meses de estoque)." adiantar={{ texto: "Para essa análise sair certa, ela usa os relatórios do seu sistema. Já pode subir agora.", href: "/personalizacao/etapa?n=8", botao: "Subir relatórios →" }} />;
}
