import assert from "node:assert/strict";
import { lerListaDeVendas, maisVendidos } from "./lista-vendas.ts";

// Relatório fictício no formato do sistema (colunas separadas por 3 espaços).
const texto = `
Lista de Vendas
1 — LOJA TESTE   3 vendas
VENDA   NFCE / NF-E   OPERADOR   DATA   VENDEDOR   CLIENTE   DESC   VALOR
1001.02   10   CAIXA   03/11/2026 10:00:00   ANA SOUZA   CLIENTE UM   0,00   300,00
0,00 %
CÓDIGO   PRODUTO   QTD   VALOR   DESC   TOTAL
11   CAMISA AZUL   2   150,00   0,00   300,00
0,00 %
SICOOB Cartao: Credito VISA NSU: 1 2x R$ 300,00
1002.02   11   CAIXA   03/11/2026 11:00:00   BIA LIMA   CLIENTE DOIS   0,00   1.200,50
0,00 %
CÓDIGO   PRODUTO   QTD   VALOR   DESC   TOTAL
12   CALCA PRETA   1   1.000,50   0,00   1.000,50
13   CAMISA AZUL   1   200,00   0,00   200,00
Devolução 1x R$ 200,50   Transferência 1x R$ 1.000,00
1003.02   12   CAIXA   04/11/2026 09:00:00   ANA SOUZA   CLIENTE TRES   0,00   100,00
0,00 %
CÓDIGO   PRODUTO   QTD   VALOR   DESC   TOTAL
11   CAMISA AZUL   1   100,00   0,00   100,00
Promissoria: em 2x R$ 100,00
Total de vendas   3
`;

const dias = lerListaDeVendas(texto);
assert.equal(dias.length, 2);
const d3 = dias[0];
assert.equal(d3.dia, "2026-11-03");
assert.equal(d3.faturamento, 1500.5);
assert.equal(d3.vendas, 2);
assert.equal(d3.pecas, 4);
assert.deepEqual(d3.vendedoras.map((v) => [v.nome, v.faturamento]), [["ANA SOUZA", 300], ["BIA LIMA", 1200.5]]);
assert.equal(d3.pagamentos.credito, 300);
assert.equal(d3.pagamentos.pix, 1000);
assert.equal(d3.vale, 200.5, "devolução fica fora das formas de pagamento");
assert.equal(dias[1].pagamentos.crediario, 100);
assert.equal(dias[1].itens.length, 1);

const top = maisVendidos(dias.flatMap((d) => d.itens));
assert.equal(top[0].produto, "CAMISA AZUL");
assert.equal(top[0].qtd, 4);
assert.equal(top[0].total, 600);

console.log("lista de vendas: tudo certo");
