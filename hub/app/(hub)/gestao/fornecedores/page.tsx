"use client";

import { EmBreve } from "@/components/EmBreve";

export default function Fornecedores() {
  return <EmBreve titulo="Estoque e fornecedores" oque="Quanto você compra de cada fornecedor e quanto cada um vende de volta. Mostra de quem comprar mais, de quem comprar menos e a dependência de uma marca só." adiantar={{ texto: "Para essa análise sair certa, ela usa os relatórios do seu sistema. Já pode subir agora.", href: "/personalizacao/etapa?n=8", botao: "Subir relatórios →" }} />;
}
