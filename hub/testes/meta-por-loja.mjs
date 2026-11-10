// Teste de tela: a meta de cada loja (portal com duas lojas) aparece no Resultado do mês e no Fechamento de caixa.
// Rode com o site servido: node testes/meta-por-loja.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const mes = hoje.slice(0, 7);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const l = lojaBase({ tipo: "Consultoria" });
l.tabelas.portais[0].lojas = ["Loja Um", "Loja Dois"];
const C = (loja, f, v, p, pessoa, nome) => ({ id: `${loja}`, portal_id: l.portal, loja, dia: `${mes}-02`, faturamento: f, vendas: v, pecas: p, obs: null, pagamentos: null, malinha: null, vendedoras: [{ pessoa_id: pessoa, nome, faturamento: f, vendas: v, pecas: p }] });
await simular(page, { tabelas: { ...l.tabelas,
  loja_caixa: [C("Loja Um", 50000, 20, 50, "e1", "Ana"), C("Loja Dois", 10000, 5, 10, "e2", "Bia")],
  loja_equipe: [{ id: "e1", portal_id: l.portal, nome: "Ana", funcao: "Vendedora", ativo: true, loja: "Loja Um" }, { id: "e2", portal_id: l.portal, nome: "Bia", funcao: "Vendedora", ativo: true, loja: "Loja Dois" }],
  loja_plano_mes: [{ portal_id: l.portal, mes, status: "ok", dados: { canais: [{ canal: "Loja Um", base: null, faixas: [{ valor: 250000, comissao: 0, gerente: 0 }] }, { canal: "Loja Dois", base: null, faixas: [{ valor: 100000, comissao: 0, gerente: 0 }] }] }, updated_at: new Date().toISOString() }],
} });
await page.goto(`${BASE}/gestao/resultado/`);
await page.getByText("Meta do mês").first().waitFor();
const t = await page.locator(".card", { hasText: "Meta do mês" }).first().innerText();
ok(/Loja Um/.test(t) && /250\.000/.test(t) && /Loja Dois/.test(t) && /100\.000/.test(t), "o Resultado do mês mostra a meta de cada loja");
ok(/20%/.test(t) && /10%/.test(t), "e quanto cada loja já fez da meta (50 mil de 250 mil, 10 mil de 100 mil)");
await page.goto(`${BASE}/gestao/caixa/`);
await page.getByText("Meta").first().waitFor();
ok((await page.locator("body").innerText()).includes("250.000"), "no caixa, a meta de cada vendedora sai da meta da loja dela (250 mil para a Ana)");
await browser.close();
