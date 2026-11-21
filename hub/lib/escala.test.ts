// Rode com: node --experimental-strip-types lib/escala.test.ts
import assert from "node:assert/strict";
import { conferirEscala, regraDaSemana, horasDoDia, pessoaVazia } from "./escala.ts";

assert.equal(regraDaSemana("2026-12-14").horas, 44);   // semana que começa antes de 16/12: regra de hoje
assert.equal(regraDaSemana("2026-12-21").horas, 42);   // primeira semana inteira da fase 1
assert.equal(regraDaSemana("2027-12-20").horas, 40);
assert.equal(horasDoDia({ ...pessoaVazia(), entrada: "09:00", saida: "18:00", almoco: 60 }), 8);

const tipo = (a: { regra: string }[], r: RegExp) => a.some((x) => r.test(x.regra));
// Dezembro/2026, 8h por dia, folga só no domingo (loja fechada): ok até 20/12, na semana de 21/12 falta a 2ª folga e passa de 42h.
let a = conferirEscala("2026-12", { abreDomingo: false, pessoas: { Ana: pessoaVazia() } });
assert.ok(tipo(a, /2 folgas/) && tipo(a, /42h/));
assert.ok(a.some((x) => /semana de 14\/12.*44h/.test(x.texto)) && !a.some((x) => /folga.*semana de 14\/12/.test(x.texto))); // antes da mudança: 1 folga basta, mas 6 dias de 8h passam de 44h
// Com folga no sábado a partir de 21/12: só fica o aviso do Natal (feriado).
const dias: Record<string, string> = { "26": "F", "25": "F" };
a = conferirEscala("2026-12", { abreDomingo: false, pessoas: { Ana: { ...pessoaVazia(), dias } } });
assert.ok(!a.some((x) => /semana de 21\/12/.test(x.texto)), JSON.stringify(a));
// Almoço curto e 11h de descanso.
a = conferirEscala("2026-11", { abreDomingo: false, pessoas: { Bia: { entrada: "08:00", saida: "22:00", almoco: 30, dias: {} } } });
assert.ok(tipo(a, /Almoço/) && tipo(a, /11h de descanso/) && tipo(a, /8h por dia/));
// Domingo aberto sem folga: 7 dias seguidos e 3 domingos.
a = conferirEscala("2026-11", { abreDomingo: true, pessoas: { Cris: pessoaVazia() } });
assert.ok(tipo(a, /7º dia/) && tipo(a, /Domingo/));
console.log("escala ok");
// Loja fechada domingo e segunda, sábado até 16h30: em dezembro, depois da mudança, ter 2 folgas sai da própria loja fechada.
{
  const sab = { entrada: "09:00", saida: "16:30", almoco: 60 };
  const e = { abreDomingo: false, fecha: [0, 1], pessoas: { Mel: { ...pessoaVazia(), sabado: sab } } };
  const a2 = conferirEscala("2026-12", e);
  assert.ok(!a2.some((x) => /folga/.test(x.regra)), JSON.stringify(a2));            // domingo e segunda fechados = 2 folgas
  // ter a sex 4 × 8h + sáb 6,5h = 38,5h: dentro das 42h
  assert.ok(!a2.some((x) => /semana de 21\/12/.test(x.texto) && /42h/.test(x.regra)));
  console.log("escala com dias fechados ok");
}
