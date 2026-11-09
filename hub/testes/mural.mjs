// Teste de tela: Mural da loja (folhas, metas da semana e calendário). Rode com o site servido: node testes/mural.mjs [porta] [pasta de prints]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const l = lojaBase({ tipo: "Consultoria" });
l.tabelas.portais[0].lojas = ["Loja Um", "Loja Dois"];
await simular(page, { tabelas: {
  ...l.tabelas,
  loja_mural: [{ portal_id: l.portal, loja: "Loja Um", dados: { missao: "Missão de teste.", visao: "Visão de teste.", valores: ["Valor um", "Valor dois"], versiculo: "Versículo de teste.", versiculo_ref: "Livro 1:1",
    cartaz: { titulo: "Nossos valores", rodape: "Loja", simbolos: [], itens: [{ pre: "Atenda com", nome: "RESPEITO", frase: "Frase.", pontos: ["a", "b"] }] }, eventos: { [`${hoje.slice(0, 7)}-11`]: [{ t: "Evento teste", c: 1 }] } } }],
  loja_caixa: [{ id: "c1", portal_id: l.portal, loja: "Loja Um", dia: hoje, faturamento: 2000, vendas: 2, pecas: 6, obs: null, pagamentos: null, malinha: null, vendedoras: [{ pessoa_id: "e1", nome: "Vendedora Teste", faturamento: 2000, vendas: 2, pecas: 6 }] }],
  loja_equipe: [{ id: "e1", portal_id: l.portal, nome: "Vendedora Teste", funcao: "Vendedora", ativo: true, loja: "Loja Um" }, { id: "e2", portal_id: l.portal, nome: "Vendedor Outra", funcao: "Vendedora", ativo: true, loja: "Loja Dois" }],
  loja_plano_mes: [],
} });
await page.goto(`${BASE}/mural/`);
await page.getByRole("heading", { name: "Mural" }).waitFor();
ok(await page.getByText("Missão de teste.").count() >= 1, "mostra a missão");
ok(await page.getByText("Versículo de teste.").count() >= 1, "mostra o versículo");
ok(await page.getByText("RESPEITO").count() >= 1, "mostra o cartaz de valores");
ok(await page.getByText("Vendedora").count() >= 1, "metas listam a vendedora");
ok(await page.getByText("LEGENDA DA BOLINHA").count() === 1, "legenda da bolinha");
ok(await page.getByText("Evento teste").count() >= 1, "calendário mostra o evento");
ok(await page.getByRole("cell").filter({ hasText: "Loja Dois" }).count() === 0, "metas começam só com as vendedoras da loja");
await page.getByRole("button", { name: "Todas as vendedoras, das duas lojas" }).click();
await page.getByRole("cell", { name: "Vendedor", exact: false }).filter({ hasText: "Loja Dois" }).first().waitFor();
ok(true, "com todas as lojas, a folha mostra também as vendedoras da outra loja");
await page.getByRole("button", { name: "Só as vendedoras desta loja" }).click();

// Folha de metas: A4 em mm, bolinha de 12 mm, só a semana 1 com meta e a meta nova da semana vinda do caixa.
await page.getByRole("button", { name: "‹" }).first().click();
await page.getByText("META DA SEMANA 1").first().waitFor();
ok(await page.getByText("REALIZADO").count() >= 1, "metas: coluna Realizado");
const ordem = await page.locator('[data-folha="metas"] thead th').allInnerTexts();
ok(ordem[ordem.length - 1].trim() === "BOLINHA", "metas: a bolinha é a última coluna");
await page.getByRole("button", { name: "›" }).first().click();
await page.getByText("META DA SEMANA 2").first().waitFor();
const doc = await page.locator('[data-folha="metas"] tbody tr').first().locator("td").nth(3).innerText();
ok(doc.trim() === "", "metas: as outras semanas saem em branco");
const campo = page.locator('[data-folha="metas"] input[placeholder="R$"]').first();
await campo.fill("5200"); await campo.blur();
await page.locator('[data-folha="metas"] tbody tr').first().locator("td").nth(3).filter({ hasText: "5.200" }).waitFor();
ok(true, "metas: a meta nova da semana, escrita pela equipe, aparece na folha");
await page.addStyleTag({ content: "@page{size:A4 landscape;margin:0}" });
await page.evaluate(() => { document.body.dataset.imprimir = "metas"; });
await page.emulateMedia({ media: "print" });
const med = await page.evaluate(() => { const mm = (px) => px * 25.4 / 96; const b = document.querySelector('[data-folha="metas"] .mu-b12').getBoundingClientRect(); const f = document.querySelector('[data-folha="metas"] .mu-pag').getBoundingClientRect(); return { bola: [mm(b.width), mm(b.height)], folha: [mm(f.width), mm(f.height)] }; });
ok(Math.abs(med.bola[0] - 12) < 0.1 && Math.abs(med.bola[1] - 12) < 0.1, `metas: bolinha de 12 mm na impressão (${med.bola.map((x) => x.toFixed(2)).join(" × ")} mm)`);
ok(Math.abs(med.folha[0] - 297) < 0.5 && Math.abs(med.folha[1] - 210) < 0.5, `metas: folha A4 exata na impressão (${med.folha.map((x) => x.toFixed(1)).join(" × ")} mm)`);
await page.pdf({ path: `${process.argv[3] ?? "."}/mural-metas.pdf`, preferCSSPageSize: true, printBackground: true });
await page.evaluate(() => { delete document.body.dataset.imprimir; });
await page.emulateMedia({ media: "screen" });
await page.screenshot({ path: `${process.argv[3] ?? "."}/mural.png`, fullPage: true });
await browser.close();
