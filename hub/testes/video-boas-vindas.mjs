// Teste de tela: vídeo de boas-vindas em /comece, no computador e no celular. Rode com o `next dev` ligado: node testes/video-boas-vindas.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch({ channel: process.env.PW_CANAL });
const l = lojaBase({ video: false });

for (const [nome, opcoes] of [["computador", { viewport: { width: 1366, height: 800 } }], ["celular", devices["iPhone 13"]]]) {
  const ctx = await browser.newContext(opcoes);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  await simular(page, { tabelas: { ...l.tabelas, hub_config: [] } });
  await page.goto(`${BASE}/comece/`);
  const video = page.locator("video");
  await video.waitFor();
  const caixa = await video.boundingBox();
  const largura = page.viewportSize().width;
  ok(caixa.x >= 0 && caixa.x + caixa.width <= largura, `${nome}: vídeo cabe na largura da tela`);
  ok(Math.abs(caixa.width / caixa.height - 16 / 9) < 0.02, `${nome}: vídeo em 16:9`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${nome}: sem rolagem lateral`);
  ok(await video.getAttribute("playsinline") !== null, `${nome}: toca na própria página (playsinline)`);
  const botao = page.getByRole("button", { name: "Assista até o fim para seguir" });
  ok(await botao.isDisabled(), `${nome}: botão fechado antes do fim`);
  await video.evaluate((v) => v.dispatchEvent(new Event("ended")));
  await page.getByRole("button", { name: "Assisti, quero começar" }).waitFor();
  ok(true, `${nome}: botão abre quando o vídeo termina`);
  await page.screenshot({ path: `${process.env.SHOTS ?? "."}/video-${nome}.png` });
  await ctx.close();
}
await browser.close();
