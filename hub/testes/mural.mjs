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
  loja_mural: [{ portal_id: l.portal, loja: "", dados: { missao: "Missão de teste.", visao: "Visão de teste.", valores: ["Valor um", "Valor dois"], versiculo: "Versículo de teste.", versiculo_ref: "Livro 1:1",
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
await page.getByRole("cell", { name: "Vendedor", exact: false }).filter({ hasText: "Loja Dois" }).first().waitFor();
ok(true, "mural único: as metas trazem as vendedoras das duas lojas");
await page.screenshot({ path: `${process.argv[3] ?? "."}/mural.png`, fullPage: true });
await browser.close();
