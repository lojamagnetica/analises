"use client";

import { AnaliseDaGestao } from "@/components/AnaliseGestao";

export default function Compras() {
  return <AnaliseDaGestao area="compras" titulo="Estoque e compras" sub="O teto de compra de cada mês (OTB): quanto pode comprar sem prender dinheiro em estoque." oque="Quanto você pode comprar sem prender dinheiro: o teto de compra de cada mês a partir das vendas e do estoque que já tem, e o que priorizar na próxima compra." />;
}
