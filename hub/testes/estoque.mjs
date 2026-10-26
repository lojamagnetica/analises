// Teste de tela: Diagnóstico de estoque numa página só, com o Guia de compras (OTB). Rode com o `next dev` ligado: node testes/estoque.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
page.on("dialog", (d) => d.accept());
const l = lojaBase();
// Loja de exemplo: estoque de R$ 120 mil a preço de venda, markup 2, faturamento de R$ 20 mil por mês
const pers = l.tabelas.personalizacao.map((x) => x.etapa === 1 ? { ...x, respostas: { faturamento_medio: "20000" } }
  : x.etapa === 4 ? { ...x, respostas: { markup: "2" } } : x.etapa === 8 ? { ...x, respostas: { valor_estoque: "120000" } } : x);
const banco = await simular(page, { tabelas: {
  ...l.tabelas, personalizacao: pers, loja_caixa: [], loja_otb: [],
  loja_gestao: [{ portal_id: l.portal, area: "estoque", loja: "", ordem: 0, status: "liberada", dados: { resumo: "Resumo da foto do estoque." }, liberada_em: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" }],
} });

await page.goto(`${BASE}/estoque/`);
await page.getByRole("heading", { name: "Diagnóstico de estoque" }).waitFor();
await page.getByText("Resumo da foto do estoque.").waitFor();
ok(true, "a foto do estoque aparece na primeira parte");
ok(await page.locator(".nav-sub a", { hasText: "estoque" }).count() === 1, "um item só de estoque no menu");
await page.getByRole("tab", { name: "Linhas" }).click();
await page.getByText("Cada linha da loja").waitFor();
ok(true, "parte sem análise mostra o aviso curto");

// Link antigo leva para a parte certa
await page.goto(`${BASE}/gestao/compras/`);
await page.getByText("O teto de compra mês a mês").waitFor();
ok(page.url().includes("parte=compras"), "link antigo de compras abre o Guia de compras");

const kpis = await page.locator(".kpi").allInnerTexts();
ok(kpis.some((t) => t.includes("60.000")), "estoque a custo vem dos Dados da loja (venda ÷ markup)");
ok(kpis.some((t) => t.includes("6,0 meses")), "cobertura de hoje");
ok(kpis.some((t) => t.includes("Excesso a girar") && t.includes("30.000")), "excesso a girar");
ok(await page.locator("tbody tr").count() === 6 + 3 + 1, "6 meses do plano, 3 da cobertura e o total");

// Pedido já feito entra no mês em que chega
await page.getByRole("button", { name: "+ Pedido já feito" }).click();
await page.getByLabel("Pedido", { exact: true }).fill("Coleção teste");
await page.getByLabel("Valor do pedido a custo").fill("5000");
await page.getByLabel("Valor do pedido a custo").blur();
ok((await page.locator("tbody tr").first().innerText()).includes("5.000"), "pedido entra no mês de chegada");
await page.getByRole("button", { name: "Salvar o plano de compra" }).click();
await page.getByText("Plano de compra salvo.").waitFor();
const salvo = banco.tabelas.loja_otb[0];
ok(salvo && salvo.dados.pedidos.length === 1 && salvo.dados.cobertura === 3 && salvo.dados.estoque_inicial === 60000, "salva o plano");
await page.screenshot({ path: process.env.SHOTS + "/estoque-otb.png", fullPage: true });
await page.getByRole("button", { name: "Excluir" }).first().click();
ok((await page.locator("tbody tr").first().innerText()).includes("—"), "exclui o pedido com confirmação");
await browser.close();
console.log("estoque: tudo certo");
