// Teste de tela: campanha da loja (modo campanha do Início e a página Sua campanha, aba Antes).
// Rode com o site servido: node testes/campanha.mjs [porta] [pasta-para-prints]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const PRINTS = process.argv[3];
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const somar = (d, n) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const browser = await chromium.launch();

const l = lojaBase();
const campanha = {
  id: "camp1", portal_id: l.portal, nome: "BRILHO", chamada: "Sua campanha de fim de ano",
  preparo_desde: somar(hoje, -3), inicio: somar(hoje, 1), fim: somar(hoje, 35), aprovada_em: null, livro: null,
  antes: [
    { id: "a1", titulo: "Entender a campanha em 10 minutos", texto: "O livro da campanha.", botao: "Abrir o livro", link: "/consultoria/materiais" },
    { id: "a2", titulo: "Mandar imprimir as tags", ate: "30/11" },
    { id: "a3", titulo: "Reunião com o time" },
  ],
  dias: { [hoje]: { destaque: "**Hoje:** gravação do filme.", itens: [{ id: "grava", titulo: "Gravar o filme da campanha", botao: "Ver", link: "/campanha" }] } },
  feitos: {}, abas: ["antes"], status: "liberada",
};
const tabelas = { ...l.tabelas, loja_equipe: [], loja_campanhas: [campanha],
  loja_posts: [{ id: "post1", portal_id: l.portal, data: hoje, hora: null, formato: "Carrossel", tema: "BRILHO · Abertura · Capa do look", status: "Ideia", fazer: "", imagens: [{ path: "x", nome: "1.png" }] }] };
const rpc = { campanha_marcar: (a) => { const c = campanha; if (a.p_feito) c.feitos = { ...c.feitos, [a.p_chave]: hoje }; else { const f = { ...c.feitos }; delete f[a.p_chave]; c.feitos = f; } return c.feitos; } };

// 1) Início em modo campanha, no celular.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const banco = await simular(page, { tabelas, rpc });
  await page.addInitScript((id) => { try { localStorage.setItem("lm_portal", id); } catch {} }, l.portal);
  await page.goto(`${BASE}/inicio/`);
  await page.getByText("Hoje na campanha").first().waitFor({ timeout: 15000 });
  const t = await page.locator("main").innerText();
  ok(/BRILHO/.test(t) && /Semana de preparo/.test(t), "a campanha aparece no topo, na semana de preparo");
  ok(/gravação do filme/.test(t), "mostra o destaque de hoje");
  ok(/Gravar o filme da campanha/.test(t) && /Postar: Capa do look/.test(t), "Hoje na campanha tem o passo do dia e o post do dia");
  ok(/Entender a campanha em 10 minutos/.test(t), "na semana de preparo, o que falta do Antes entra no dia");
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/inicio.png`, fullPage: true });
  await page.getByRole("button", { name: /Marcar como feito: Gravar o filme/ }).click();
  await page.waitForTimeout(400);
  ok(banco.chamadas.some((c) => c.rpc === "campanha_marcar" && c.args.p_chave === `${hoje}:grava` && c.args.p_feito === true), "marcar o passo do dia chama o banco");
  await page.close();
}

// 2) Sua campanha: aba Antes funcionando; Semanas e Resultado com cadeado.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const banco = await simular(page, { tabelas, rpc });
  await page.addInitScript((id) => { try { localStorage.setItem("lm_portal", id); } catch {} }, l.portal);
  await page.goto(`${BASE}/campanha/`);
  await page.getByText("Faça uma vez, antes da semana 1").first().waitFor({ timeout: 15000 });
  ok(/0 de 3/.test(await page.locator("main").innerText()), "mostra quantos passos do Antes já foram feitos");
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/antes.png`, fullPage: true });
  await page.getByRole("button", { name: /Marcar como feito: Entender a campanha/ }).click();
  await page.waitForTimeout(400);
  ok(banco.chamadas.some((c) => c.rpc === "campanha_marcar" && c.args.p_chave === "a1" && c.args.p_feito === true), "marcar um passo do Antes chama o banco");
  await page.getByRole("button", { name: /Semanas/ }).click();
  ok(/abre em breve/.test(await page.locator("main").innerText()), "Semanas fica com cadeado até a Camilla liberar");
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/cadeado.png`, fullPage: true });
  await page.close();
}
await browser.close();
