// Teste de tela: visão Mês da Programação da semana. Rode com o `next dev` ligado: node testes/semana-mes.mjs [porta]
import { createRequire } from "node:module";
import { conteudoLiberado, lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const mes = hoje.slice(0, 8);
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const l = lojaBase();
const post = (id, d, objetivo, status) => ({ id, portal_id: l.portal, data: mes + d, hora: "19:00", formato: "Reels", objetivo, tema: "Tema " + id, gancho: "Gancho " + id, roteiro: "", legenda: "", cta: "", origem: "manual", status, created_at: "2026-10-01T00:00:00Z" });
await simular(page, { tabelas: {
  ...l.tabelas, ...conteudoLiberado(l.portal),
  loja_posts: [post("a", "10", "Atrair", "Ideia"), post("b", "10", "Vender", "Publicado"), post("c", "20", "Conectar", "Roteiro")],
  datas_comerciais: [{ id: "d1", mes: Number(mes.slice(5, 7)) - 1, dia: 15, titulo: "Data Teste" }],
  loja_acoes: [], acoes: [],
} });
await page.goto(`${BASE}/conteudo/semana/`);
await page.getByRole("tab", { name: "Mês" }).click();
await page.locator(".mes-grade").waitFor();
ok(await page.locator(".mes-dia:not(.fora) .mes-ponto").count() === 3, "um ponto por post no mês");
ok(await page.locator(".mes-dia", { hasText: "Data Teste" }).count() === 1, "mostra a data comercial");
const cor = await page.locator(`.mes-ponto[title^="Vender"]`).evaluate((e) => getComputedStyle(e).borderColor);
ok(cor && cor !== "rgba(0, 0, 0, 0)", "ponto com a cor do objetivo");
ok(await page.locator(`.mes-ponto[title^="Vender"]`).innerText() === "✅", "ícone do status");
await page.screenshot({ path: process.env.SHOTS + "/semana-mes.png", fullPage: true });
await page.locator(".mes-dia:not(.fora)", { hasText: /^20/ }).first().click();
await page.getByText("Gancho c").waitFor();
ok(await page.getByRole("tab", { name: "Semana" }).getAttribute("aria-selected") === "true", "clicar no dia abre a semana daquele dia");
await browser.close();
console.log("semana-mes: tudo certo");
