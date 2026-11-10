// Teste de tela: acesso de envios travado em uma loja (portal com duas lojas). Rode com o site servido: node testes/acesso-por-loja.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
async function abrir(locAcesso) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const l = lojaBase();
  l.tabelas.portais[0].lojas = ["Loja Um", "Loja Dois"];
  l.tabelas.perfis[0] = { ...l.tabelas.perfis[0], so_caixa: true, loja_acesso: locAcesso };
  await simular(page, { tabelas: { ...l.tabelas, loja_equipe: [{ id: "e1", portal_id: l.portal, nome: "Ana", funcao: "Vendedora", ativo: true, loja: "Loja Dois" }] }, rpc: { meu_contrato: () => [] } });
  await page.goto(`${BASE}/gestao/caixa/`);
  await page.getByText("Lançar o dia").first().waitFor();
  return page;
}
let page = await abrir("Loja Dois");
ok(!(await page.getByText("As duas lojas").count()), "travada: não mostra o seletor das duas lojas");
const opcoes = await page.locator("#cx-loja option").allInnerTexts();
ok(opcoes.length === 1 && opcoes[0] === "Loja Dois", "travada: só a Loja Dois para escolher no lançamento");
await page.close();
page = await abrir(null);
ok((await page.getByText("As duas lojas").count()) > 0, "sem trava: continua com as duas lojas");
ok((await page.locator("#cx-loja option").count()) >= 2, "sem trava: escolhe entre as lojas");
await browser.close();
