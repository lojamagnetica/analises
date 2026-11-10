// Rode com: node --experimental-strip-types lib/atalho-novo.test.ts
import assert from "node:assert/strict";
import { chaveDoAtalho, temNovidade } from "./atalho-novo.ts";

assert.equal(temNovidade(null, null), false);                                       // sem atualização, nada de verde
assert.equal(temNovidade("2026-11-10T12:00:00Z", null), true);                      // nunca abriu
assert.equal(temNovidade("2026-11-10T12:00:00Z", "2026-11-10T11:00:00Z"), true);    // atualizou depois de abrir
assert.equal(temNovidade("2026-11-10T12:00:00Z", "2026-11-10T13:00:00Z"), false);   // abriu depois da atualização
assert.equal(temNovidade("2026-11-10T12:00:00Z", "2026-11-10T12:00:00Z"), false);
assert.equal(chaveDoAtalho("/planeje/mes?m=2026-12"), "/planeje/mes");
console.log("atalhos com novidade: tudo certo");
