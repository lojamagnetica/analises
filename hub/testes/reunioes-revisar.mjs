// Teste de tela: Reuniões para revisar (rascunhos do agente do Tactiq, aprovados pela Camilla).
// Rode com o site servido: node testes/reunioes-revisar.mjs [porta]
import { createRequire } from "node:module";
import { simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
page.on("dialog", (d) => d.accept());
const banco = await simular(page, { usuario: { id: "u-cam", email: "c@c.com" }, tabelas: {
  perfis: [{ id: "u-cam", nome: "Camilla Ribeiro", email: "c@c.com", papel: "equipe", aprova: true, monta: true, conversas_equipe: true }, { id: "u-cs", nome: "Claudia CS", papel: "equipe", aprova: false, monta: true, conversas_equipe: true }],
  portais: [{ id: "A", loja: "Loja Alfa", tipo: "Mentoria", ativo: true, menu_oculto: [] }],
  reunioes_gravadas: [{ id: "g1", tactiq_id: "t1", tactiq_url: "https://x", portal_id: "A", titulo: "ALFA - Reunião", data: "2026-11-09", duracao_min: 60, participantes: [], status: "rascunho",
    resumo_loja: "Resumo para a loja", interno: "Só equipe", combinados: [{ texto: "Lançar o caixa todos os dias", quem: "loja", prazo: "2026-11-14" }, { texto: "Camilla finaliza o portal", quem: "camilla", prazo: "2026-11-10" }],
    para_claudia: [{ texto: "Confirmar o primeiro lançamento", prazo: "2026-11-11" }], criado_em: new Date().toISOString() }],
  loja_combinados: [], equipe_lembretes: [], reunioes: [],
} });
await page.addInitScript(() => { try { localStorage.setItem("lm_conversa_aberta", "0"); } catch {} });
await page.goto(`${BASE}/equipe/reunioes-revisar/`);
await page.getByText("ALFA - Reunião").first().waitFor({ timeout: 15000 });
let t = await page.locator("main").innerText();
ok(/para revisar/.test(t) && await page.locator('input[value="Lançar o caixa todos os dias"]').count() === 1 && await page.locator('input[value="Confirmar o primeiro lançamento"]').count() === 1, "mostra o rascunho com combinados e o que é da CS");
await page.getByRole("button", { name: "Aprovar" }).click();
await page.waitForTimeout(900);
ok((banco.tabelas.loja_combinados ?? []).length === 2 && banco.tabelas.loja_combinados.every((c) => c.origem === "reuniao" && c.portal_id === "A"), "os combinados entram na loja");
ok((banco.tabelas.equipe_lembretes ?? []).some((l) => l.texto === "Confirmar o primeiro lançamento" && l.responsavel === "u-cs"), "o que é da CS vira lembrete dela");
ok(banco.tabelas.reunioes_gravadas[0].status === "aprovada", "a reunião fica aprovada");
t = await page.locator("main").innerText();
ok(/sem reunião no Hub nessa data/.test(t), "avisa quando não há reunião no Hub para liberar o resumo");
await browser.close();
