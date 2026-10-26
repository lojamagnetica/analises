// Rode com: node --experimental-strip-types lib/otb-conta.test.ts
import assert from "node:assert/strict";
import { calcularOtb, mesesComVenda, resumoOtb, somarMes } from "./otb-conta.ts";

assert.equal(somarMes("2026-11", 2), "2027-01");
assert.equal(somarMes("2026-01", -1), "2025-12");

// Loja de exemplo: venda de R$ 20 mil por mês, markup 2, cobertura de 3 meses → venda a custo de R$ 10 mil e alvo de R$ 30 mil.
const vendas = Object.fromEntries(mesesComVenda({ inicio: "2026-11", cobertura: 3 }).map((m) => [m, 20000]));
assert.equal(Object.keys(vendas).length, 9);

// Estoque no alvo: compra todo mês só o que vende.
let r = calcularOtb({ inicio: "2026-11", estoque_inicial: 30000, markup: 2, cobertura: 3, vendas, pedidos: [] });
assert.equal(r.length, 6);
assert.deepEqual(r.map((l) => l.compra), [10000, 10000, 10000, 10000, 10000, 10000]);
assert.equal(r[0].cobertura, 3);

// Estoque em excesso (R$ 60 mil): sem compra até o estoque voltar ao alvo; o pedido entra no mês em que chega.
r = calcularOtb({ inicio: "2026-11", estoque_inicial: 60000, markup: 2, cobertura: 3, vendas, pedidos: [{ id: "p", descricao: "Coleção", mes: "2026-12", valor: 5000 }] });
assert.deepEqual(r.map((l) => Math.round(l.compra)), [0, 0, 0, 5000, 10000, 10000]);
assert.equal(r[1].chegando, 5000);
assert.equal(r[1].inicial, 50000);
const s = resumoOtb({ inicio: "2026-11", estoque_inicial: 60000, markup: 2, cobertura: 3, vendas, pedidos: [{ id: "p", descricao: "", mes: "2026-12", valor: 5000 }] }, r);
assert.equal(s.excesso, 30000);
assert.equal(s.coberturaHoje, 6);
assert.equal(s.primeiraCompra?.mes, "2027-02");
console.log("otb-conta: tudo certo");
