// Teste de tela: Contrato e renovação (/contrato) e o aviso no Início. Rode com o `next dev` ligado: node testes/contrato.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const somar = (dias) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);
const browser = await chromium.launch();

const contratos = [
  { id: "c2", plano: "Mentoria Teste", tipo: "Mentoria", meses: 6, inicio: somar(-150), fim: somar(30), status: "Ativo", renovacao_pedida: false },
  { id: "c1", plano: "Plano Antigo", tipo: "Mentoria", meses: 3, inicio: somar(-250), fim: somar(-160), status: "Renovado", renovacao_pedida: false },
];
let pedidos = 0;
const rpc = {
  meu_contrato: () => contratos,
  pedir_renovacao: () => (pedidos++ ? "ja_pedido" : "pedido"),
};

const page = await browser.newPage();
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const l = lojaBase();
const banco = await simular(page, { tabelas: l.tabelas, rpc });
await page.goto(`${BASE}/contrato/`);
await page.getByRole("heading", { name: "Mentoria Teste" }).waitFor();
const tela = await page.locator("main").innerText();
ok(/Mês \d de 6/.test(tela), "mostra mês X de Y");
ok(/faltam 3\d dias/.test(tela), "mostra quantos dias faltam");
ok(!/R\$/.test(tela), "não mostra valor");
ok(tela.includes("Plano Antigo") && tela.includes("Renovado"), "histórico de contratos anteriores");
ok(tela.includes("Sua mentoria termina em"), "aviso de renovação 45 dias antes");
ok(await page.locator(".nav-sub a", { hasText: "Contrato e renovação" }).count() === 1, "item dentro de Minha mentoria");
await page.getByRole("button", { name: "Quero conversar sobre renovar" }).click();
await page.getByText("Pedido enviado!").waitFor();
ok(banco.chamadas.some((c) => c.rpc === "pedir_renovacao" && c.args.p_portal === l.portal), "cria o pedido de renovação");
await page.screenshot({ path: process.env.SHOTS + "/contrato.png", fullPage: true });

// No Início: o mesmo aviso; se já pediu, avisa que já foi pedido
await page.goto(`${BASE}/inicio/`);
await page.getByText("Sua mentoria termina em").waitFor();
await page.getByRole("button", { name: "Quero conversar sobre renovar" }).click();
await page.getByText("Você já pediu essa conversa").waitFor();
ok(true, "Início avisa que já foi pedido");
await browser.close();
console.log("contrato: tudo certo");
