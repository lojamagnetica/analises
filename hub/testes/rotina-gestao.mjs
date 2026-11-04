// Teste de tela: Rotina da gestão, relatórios e boletos no Fechamento de caixa, e Análise da semana. Rode com o `next dev` ligado: node testes/rotina-gestao.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const browser = await chromium.launch();
const page = await browser.newPage();
const erros = [];
page.on("pageerror", (e) => { erros.push(e.message); console.log("erro na página:", e.message); });

const l = lojaBase({ tipo: "Consultoria" });
l.tabelas.portais[0].lojas = ["Loja Um", "Loja Dois"];
const linha = (loja, dia, fat) => ({ id: `${loja}-${dia}`, portal_id: l.portal, loja, dia, faturamento: fat, vendas: 4, pecas: 10, obs: null, pagamentos: null, malinha: null,
  vendedoras: [{ pessoa_id: "e1", nome: "Vendedora Teste", faturamento: fat, vendas: 4, pecas: 10 }] });
const banco = await simular(page, { tabelas: {
  ...l.tabelas,
  loja_caixa: [linha("Loja Um", hoje, 1000), linha("Loja Dois", hoje, 500)],
  loja_equipe: [{ id: "e1", portal_id: l.portal, nome: "Vendedora Teste", funcao: "Vendedora", ativo: true }],
  loja_feedbacks: [{ id: "f1", portal_id: l.portal, pessoa_id: "e1", tipo: "Reconhecer", situacao: "x", roteiro: "x", feito: true, created_at: new Date().toISOString() }],
  loja_reunioes: [], loja_planner: [], loja_plano_mes: [], loja_boletos_mes: [], loja_pdi: [],
} });

// Rotina da gestão
await page.goto(`${BASE}/consultoria/rotina/`);
await page.getByRole("heading", { name: "Rotina da gestão" }).waitFor();
ok(await page.getByText("caixa lançado").count() === 2, "mostra o caixa lançado de cada loja");
ok(await page.getByText("Planejamento de", { exact: false }).count() >= 1, "mostra o planejamento do mês seguinte");
ok(await page.getByText("Vendedora Teste").count() === 1, "lista a pessoa nas conversas individuais");
ok(await page.getByText("em dia").count() === 1, "marca a conversa recente como em dia");

// Fechamento de caixa: relatórios e boletos
await page.goto(`${BASE}/gestao/caixa/`);
await page.getByRole("heading", { name: "Relatórios para a análise" }).waitFor();
ok(await page.getByText("Vendas da semana").count() >= 1, "mostra os relatórios da semana");
ok(await page.getByText("Contas a receber (promissória)").count() === 1, "mostra os relatórios do mês");
ok(await page.getByText("Boletos do mês", { exact: false }).count() >= 1, "mostra o cartão dos boletos do mês");
await page.getByLabel("A vencer no mês (R$)").first().fill("90.000,00");
await page.getByLabel("Pago no mês (R$)").first().fill("30.000,00");
ok(await page.getByText("R$ 60.000", { exact: false }).count() >= 1, "calcula quanto falta pagar");
await page.locator(".card", { hasText: "Boletos do mês" }).getByRole("button", { name: "Salvar" }).first().click();
await page.getByText("Salvo ✓").waitFor();
ok(banco.tabelas.loja_boletos_mes.length === 1 && Number(banco.tabelas.loja_boletos_mes[0].a_vencer) === 90000, "guarda os boletos do mês");

// Análise da semana
await page.goto(`${BASE}/consultoria/reunioes/`);
await page.getByRole("button", { name: "+ Análise da semana" }).click();
await page.getByText("Loja · 1 dia").waitFor();
ok(await page.getByText("R$ 1.000").count() >= 1, "puxa o caixa da semana da loja escolhida");
await page.locator("textarea").first().fill("Semana boa");
await page.locator("form").getByRole("button", { name: "Salvar", exact: true }).click();
await page.getByText("Análise da semana · Loja Um").first().waitFor();
ok(banco.tabelas.loja_reunioes.some((r) => r.tipo === "analise_semana"), "registra a análise da semana");

ok(erros.length === 0, "sem erros na página");
await browser.close();
console.log("rotina-gestao: tudo certo");
