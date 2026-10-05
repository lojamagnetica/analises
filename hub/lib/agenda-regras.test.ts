// Rode com: node --experimental-strip-types lib/agenda-regras.test.ts
import assert from "node:assert/strict";
import { acharPortal, temaDoTitulo } from "./agenda-regras.ts";

const portais = [
  { id: "shie", nomes: ["Shiê Store", "Shiê", "Shie"] },
  { id: "js", nomes: ["Jamisson Moda", "JS", "Jamisson"] },
  { id: "mercadao", nomes: ["Mercadão das Miudezas", "Mercadão"] },
  { id: "sea", nomes: ["Sea Live", "Lucio"] },
];

const casos: [string, string | null, string][] = [
  ["Reunião - Shiê", "shie", "Reunião"],
  ["shie: plano de ação mês 1", "shie", "plano de ação mês 1"],
  ["Mentoria JS | revisão de números", "js", "Mentoria | revisão de números"],
  ["Consultoria Mercadão - estoque", "mercadao", "Consultoria - estoque"],
  ["Lucio (Sea Live) devolutiva", "sea", "Lucio devolutiva"],
  ["JSON de integração", null, ""],
  ["Almoço com fornecedor", null, ""],
];

for (const [titulo, esperado, tema] of casos) {
  const achado = acharPortal(titulo, portais);
  assert.equal(achado?.id ?? null, esperado, `loja de "${titulo}"`);
  if (achado) assert.equal(temaDoTitulo(titulo, achado.nome), tema, `tema de "${titulo}"`);
}
console.log(`ok · ${casos.length} casos`);
