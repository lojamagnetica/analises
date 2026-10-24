"use client";

import { AnaliseDaGestao } from "@/components/AnaliseGestao";

export default function Fornecedores() {
  return <AnaliseDaGestao area="fornecedores" titulo="Estoque e fornecedores" sub="Quanto cada marca vende, quanto tem parado e de quem comprar mais ou menos." oque="Quanto você compra de cada fornecedor e quanto cada um vende de volta. Mostra de quem comprar mais, de quem comprar menos e a dependência de uma marca só." />;
}
