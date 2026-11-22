// Rode com: node --experimental-strip-types lib/mural-juntar.test.ts
import assert from "node:assert/strict";
import { juntarMural } from "./mural-juntar.ts";

// A página carregou sem escala; por fora entrou a escala de dezembro; a loja muda só a missão: a escala fica.
const banco = { missao: "velha", escala: { "2026-12": { a: 1 } } };
assert.deepEqual(juntarMural(banco, { missao: "velha" }, { missao: "nova" }), { missao: "nova", escala: { "2026-12": { a: 1 } } });
// A loja mexe em janeiro da escala: dezembro, que entrou por fora, não some.
assert.deepEqual(juntarMural(banco, { escala: {} }, { escala: { "2027-01": { b: 2 } } }).escala, { "2026-12": { a: 1 }, "2027-01": { b: 2 } });
// Tirar um evento de um dia apaga só aquele dia.
assert.deepEqual(juntarMural({ eventos: { "x": [1], "y": [2] } }, { eventos: { "x": [1] } }, { eventos: {} }).eventos, { "y": [2] });
console.log("mural junta sem apagar ok");
