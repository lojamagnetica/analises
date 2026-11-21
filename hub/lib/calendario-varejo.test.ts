// Rode com: node --experimental-strip-types lib/calendario-varejo.test.ts
import assert from "node:assert/strict";
import { datasMoveis, diaDaData, seloDaData } from "./calendario-varejo.ts";

const d26 = Object.fromEntries(datasMoveis(2026).map((x) => [x.titulo, x.data]));
assert.equal(d26["Carnaval"], "2026-02-17");
assert.equal(d26["Páscoa"], "2026-04-05");
assert.equal(d26["Corpus Christi"], "2026-06-04");
assert.equal(d26["Dia das Mães"], "2026-05-10");
assert.equal(d26["Dia dos Pais"], "2026-08-09");
assert.equal(d26["Black Friday"], "2026-11-27");
assert.equal(d26["Volta às aulas"], "2026-01-26");
assert.equal(diaDaData("Dia das Mães (2º domingo)", 2027, 5), 9);
assert.equal(diaDaData("Black Friday", 2027, 11), 26);
assert.equal(diaDaData("Dia das Mães", 2027, 6), null);   // mês errado
assert.equal(seloDaData("Dia das Mães (2º domingo)"), "forte");
assert.equal(seloDaData("Dia do Consumidor"), "rapida");
assert.equal(seloDaData("Réveillon"), null);
console.log("calendário do varejo ok");
{
  const { datasDoMes } = await import("./calendario-varejo.ts");
  const jun = datasDoMes([{ dia: 12, titulo: "Dia dos Namorados" }, { dia: null, titulo: "Corpus Christi" }], "2027-06");
  assert.ok(!jun.some((x) => x.titulo === "Corpus Christi"));                       // em 2027 cai em maio
  const mai = datasDoMes([{ dia: null, titulo: "Dia das Mães (2º domingo)" }], "2027-05");
  assert.deepEqual(mai.map((x) => [x.dia, x.titulo]), [[9, "Dia das Mães (2º domingo)"], [27, "Corpus Christi"]]);
  console.log("datas do mês ok");
}
