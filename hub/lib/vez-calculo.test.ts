// Rode com: node --experimental-strip-types lib/vez-calculo.test.ts
import assert from "node:assert/strict";
import { contarPorPessoa, fluxoSemanal, corDaMeta, diasDeLoja, filaDeEspera, horaDe, metaDoDia, ordenarFila, resumoDoDia, textoDoResumo, type Atend } from "./vez-calculo.ts";

// 10h e 11h em Recife (UTC−3)
const a = (id: string, pessoa: string, utc: string, resultado: Atend["resultado"], motivo = "", fim?: string): Atend => ({ id, pessoa_id: pessoa, nome: pessoa.toUpperCase(), inicio_em: utc, fim_em: fim ?? null, resultado, motivo, cliente: "" });
const lista = [
  a("1", "ana", "2026-11-10T13:05:00Z", "vendeu", "", "2026-11-10T13:25:00Z"),
  a("2", "bia", "2026-11-10T13:40:00Z", "nao_vendeu", "Preço", "2026-11-10T13:50:00Z"),
  a("3", "ana", "2026-11-10T14:10:00Z", "nao_vendeu", "Preço", "2026-11-10T14:20:00Z"),
  a("4", "bia", "2026-11-10T14:30:00Z", "nao_vendeu", "Tamanho / grade", "2026-11-10T14:45:00Z"),
  a("5", "ana", "2026-11-10T14:50:00Z", null),
];
assert.equal(horaDe("2026-11-10T13:05:00Z"), 10);
const r = resumoDoDia(lista);
assert.equal(r.total, 5); assert.equal(r.vendeu, 1); assert.equal(r.naoVendeu, 3); assert.equal(r.abertos, 1);
assert.equal(r.conversao, 0.25);
assert.deepEqual(r.porHora, [{ hora: 10, total: 2, vendeu: 1 }, { hora: 11, total: 3, vendeu: 0 }]);
assert.deepEqual(r.motivos, [{ motivo: "Preço", qtd: 2 }, { motivo: "Tamanho / grade", qtd: 1 }]);
assert.equal(r.porPessoa.find((p) => p.nome === "ANA")?.total, 2);
assert.equal(Math.round(r.tempoMedioMin ?? 0), 14);
assert.equal(resumoDoDia([]).conversao, null);
assert.match(textoDoResumo("Loja Um", "2026-11-10", r), /Conversão: 25%/);

// Quem atende volta para o final: a ordem é pela hora em que entrou na fila.
const fila = [
  { nome: "Bia", status: "fila", ordem_em: "2026-11-10T13:10:00Z" },
  { nome: "Ana", status: "atendendo", ordem_em: "2026-11-10T13:00:00Z" },
  { nome: "Carla", status: "fila", ordem_em: "2026-11-10T13:05:00Z" },
];
assert.deepEqual(ordenarFila(fila).map((f) => f.nome), ["Ana", "Carla", "Bia"]);
assert.deepEqual(filaDeEspera(fila).map((f) => f.nome), ["Carla", "Bia"]);

// Meta do dia: novembro de 2026 começa no domingo; dia 10 é terça. Dias de loja de 10 a 30, sem domingo: 21 − 3 = 18.
assert.equal(diasDeLoja("2026-11-10", "2026-11-30"), 18);
assert.equal(diasDeLoja("2026-11-01", "2026-11-09"), 7);
const m = metaDoDia({ meta: 125000, realizado: 24900, hoje: "2026-11-10" });
assert.equal(m.diasRestantes, 18);
assert.equal(m.faltam, 100100);
assert.equal(m.porDia, 5570);
assert.equal(Math.round(m.esperado), 35000);
assert.equal(corDaMeta(m.ritmo, m.batida), "vermelha");
assert.equal(corDaMeta(1.02, false), "verde");
assert.equal(corDaMeta(0.9, false), "amarela");
assert.equal(metaDoDia({ meta: 1000, realizado: 1200, hoje: "2026-11-10" }).batida, true);
assert.equal(metaDoDia({ meta: 1000, realizado: 0, hoje: "2026-11-02" }).ritmo, null); // domingo não conta: ainda não era para ter vendido nada

// Contagem por vendedora: dia e mês, vendeu e não vendeu (em andamento conta só como atendimento)
const c = contarPorPessoa([
  { pessoa_id: "ana", dia: "2026-11-10", resultado: "vendeu" }, { pessoa_id: "ana", dia: "2026-11-10", resultado: "nao_vendeu" }, { pessoa_id: "ana", dia: "2026-11-10", resultado: null },
  { pessoa_id: "ana", dia: "2026-11-04", resultado: "vendeu" }, { pessoa_id: "bia", dia: "2026-11-09", resultado: "nao_vendeu" },
  { pessoa_id: "ana", dia: "2026-10-30", resultado: "vendeu" }, { pessoa_id: "fora", dia: "2026-11-10", resultado: "vendeu" }, { pessoa_id: null, dia: "2026-11-10", resultado: "vendeu" },
], [{ id: "ana", nome: "Ana" }, { id: "bia", nome: "Bia" }, { id: "cla", nome: "Cláudia" }], "2026-11-10");
assert.deepEqual(c[0].hoje, { total: 3, vendeu: 1, naoVendeu: 1 });
assert.deepEqual(c[0].mes, { total: 4, vendeu: 2, naoVendeu: 1 });
assert.deepEqual(c[1].hoje, { total: 0, vendeu: 0, naoVendeu: 0 });
assert.deepEqual(c[1].mes, { total: 1, vendeu: 0, naoVendeu: 1 });
assert.equal(c[2].mes.total, 0);

// Fluxo por dia da semana e horário (10 e 11 de novembro de 2026 são terça e quarta)
const fx = fluxoSemanal([
  { dia: "2026-11-10", inicio_em: "2026-11-10T13:05:00Z" }, { dia: "2026-11-10", inicio_em: "2026-11-10T13:40:00Z" },
  { dia: "2026-11-17", inicio_em: "2026-11-17T13:10:00Z" }, { dia: "2026-11-11", inicio_em: "2026-11-11T14:10:00Z" },
]);
assert.equal(fx.celulas["2-10"], 3);
assert.equal(fx.celulas["3-11"], 1);
assert.deepEqual(fx.horas, [10, 11]);
assert.deepEqual(fx.pico, { dow: 2, hora: 10, qtd: 3 });
assert.equal(fx.total, 4);
console.log("lista da vez: tudo certo");
