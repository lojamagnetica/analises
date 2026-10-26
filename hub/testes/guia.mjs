// Teste de tela: Como usar o Hub (/guia). Rode com o `next dev` ligado: node testes/guia.mjs [porta]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // instalado na máquina (não rodar playwright install)
import { lojaBase, simular } from "./simulado.mjs";

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();

// 1) Loja que já viu o vídeo mas ainda não tem o Diagnóstico
{
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const l = lojaBase({ diagnostico: false });
  await simular(page, { tabelas: l.tabelas });
  await page.goto(`${BASE}/guia/`);
  await page.getByRole("heading", { name: "Seus primeiros passos" }).waitFor();
  const passos = await page.locator(".card.card-borda").first().innerText();
  ok(passos.includes("✅ feito") && passos.includes("Receber o seu Diagnóstico"), "jornada mostra o que já foi feito");
  ok(/Fica pronto até \d\d\/\d\d\/\d{4}/.test(passos), "mostra o prazo do Diagnóstico");
  ok(await page.locator("section#vendas").getByText("🔒 Abre quando você receber o seu Diagnóstico").count() > 0, "páginas de Vendas mostram quando abrem");
  ok(await page.locator("section#jornada").getByText("Os 7 passos").count() > 0, "blocos gerados a partir do menu");
  ok(await page.locator(".nav-item", { hasText: "Como usar o Hub" }).count() === 1, "item no menu");
  ok(await page.getByText("Fale com a Camilla", { exact: true }).count() > 0, "fim com Fale com a Camilla");
  await page.screenshot({ path: process.env.SHOTS + "/guia.png", fullPage: true });
  await page.close();
}
// 2) Loja que ainda não viu o vídeo: o guia abre mesmo assim
{
  const page = await browser.newPage();
  const l = lojaBase({ diagnostico: false, video: false });
  await simular(page, { tabelas: l.tabelas });
  await page.goto(`${BASE}/guia/`);
  await page.getByRole("heading", { name: "Seus primeiros passos" }).waitFor();
  ok(page.url().includes("/guia"), "abre antes do vídeo");
  ok(await page.getByRole("link", { name: "Fazer agora →" }).first().getAttribute("href").then((h) => h.includes("/comece")), "próximo passo é o vídeo");
  await page.close();
}
await browser.close();
console.log("guia: tudo certo");
