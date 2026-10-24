"use client";

import { EmBreve } from "@/components/EmBreve";

export default function Compras() {
  return <EmBreve titulo="Estoque e compras" oque="Quanto você pode comprar sem prender dinheiro: o teto de compra de cada mês a partir das vendas e do estoque que já tem, e o que priorizar na próxima compra." adiantar={{ texto: "Para essa análise sair certa, ela usa os relatórios do seu sistema. Já pode subir agora.", href: "/personalizacao/etapa?n=8", botao: "Subir relatórios →" }} />;
}
