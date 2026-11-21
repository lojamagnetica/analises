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
const banco = await simular(page, { tabelas: {
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
// Escala do mês: vai para dezembro (muda a regra) e marca uma folga.
const esc = page.locator('[data-folha="escala"]');
await esc.getByRole("button", { name: "›" }).click();
await esc.getByText(/muda a regra/).first().waitFor();
ok(true, "dezembro avisa a mudança da regra (fim da escala 6x1)");
// Janeiro: semanas inteiras na regra nova (6 dias de trabalho não cabem).
await esc.getByRole("button", { name: "›" }).click();
await esc.getByText(/2 folgas por semana/).first().waitFor();
ok(true, "a conferência cobra as 2 folgas na semana nova");
const linha = esc.locator("tbody tr").filter({ hasText: "Vendedora Teste" });
ok(await linha.locator("td").nth(2).innerText() === "FE" && await linha.locator("td").nth(3).innerText() === "T", "1º de janeiro sai como FE e o dia de trabalho com T");
await linha.locator("td").nth(3).click();
await page.waitForTimeout(400);
ok(/"F"/.test(JSON.stringify(banco.tabelas.loja_mural[0].dados.escala ?? {})), "tocar no dia marca a folga e salva");
// Incluir alguém à mão e tirar da escala (com confirmação).
page.on("dialog", (x) => x.accept());
await esc.getByRole("button", { name: "Time e horários" }).click();
await esc.getByPlaceholder("Nome de quem entra na escala").fill("Temporária Natal");
await esc.getByRole("button", { name: "+ Incluir na escala" }).click();
await esc.locator("tbody tr").filter({ hasText: "Temporária Natal" }).first().waitFor();
ok(true, "inclui uma pessoa na escala");
await esc.locator("b").filter({ hasText: "Vendedor Outra" }).getByRole("button", { name: "tirar" }).click();
await page.waitForTimeout(400);
ok(await esc.locator("tbody tr").filter({ hasText: "Vendedor Outra" }).count() === 0, "tira uma pessoa da escala");
await page.screenshot({ path: `${process.argv[3] ?? "."}/mural.png`, fullPage: true });
await browser.close();
