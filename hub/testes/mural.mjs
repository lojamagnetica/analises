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
  datas_comerciais: [{ mes: Number(hoje.slice(5, 7)) - 1, dia: 9, titulo: "Data comemorativa teste" }],
  loja_plano_mes: [{ portal_id: l.portal, mes: hoje.slice(0, 7), status: "ok", dados: { acoes: [{ titulo: "Ação do plano", inicio: `${hoje.slice(0, 7)}-15` }], datas: [{ titulo: "Data do plano", dia: 20, trabalhar: true, acao: "" }] } }],
} });
await page.goto(`${BASE}/mural/`);
await page.getByRole("heading", { name: "Mural" }).waitFor();
ok(await page.getByText("Missão de teste.").count() >= 1, "mostra a missão");
ok(await page.getByText("Versículo de teste.").count() >= 1, "mostra o versículo");
ok(await page.getByText("RESPEITO").count() >= 1, "mostra o cartaz de valores");
ok(await page.getByText("Vendedora").count() >= 1, "metas listam a vendedora");
ok(await page.getByText("LEGENDA DA BOLINHA").count() === 1, "legenda da bolinha");
ok(await page.getByText("Evento teste").count() >= 1, "calendário mostra o evento");
ok(await page.locator('[data-folha="cal"]').getByText("Ação do plano").count() === 1 && await page.locator('[data-folha="cal"]').getByText("Data do plano").count() === 1, "as ações e as datas do Planeje entram sozinhas no calendário");
ok(await page.locator('[data-folha="cal"]').getByText("Data comemorativa teste").count() === 1, "as datas comemorativas do mês entram sozinhas");
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
// Almoço: a loja fecha 2h; a soma da semana conta contra o teto da regra e "usar as 42h" estica a saída.
await esc.getByText("A loja fecha no almoço").click();
await esc.getByText(/reabre às 14h/).waitFor();
ok(true, "a loja fecha no almoço (2h) e reabre às 14h");
await esc.getByText("A loja fecha no almoço").click();
const vt = esc.locator("div.linha").filter({ has: page.locator("b", { hasText: "Vendedora Teste" }) }).first();
await vt.getByRole("button", { name: "2h" }).click();
await page.waitForTimeout(300);
ok(/7h por dia/.test(await vt.innerText()), "2h de almoço: 7h por dia");
await esc.getByRole("button", { name: "Fechar" }).click();
await esc.getByRole("button", { name: "‹" }).click();
await esc.getByRole("button", { name: "Time e horários" }).click();
const vt2 = esc.locator("div.linha").filter({ has: page.locator("b", { hasText: "Vendedora Teste" }) }).first();
await vt2.getByRole("button", { name: "1h", exact: true }).click();
await page.waitForTimeout(300);
const txt = await vt2.innerText();
ok(/semana de \d\d\/\d\d: \d+h(\d\d)? de 4[24]h/.test(txt), "mostra as horas da semana e o teto: " + txt.replace(/\s+/g, " ").slice(0, 160));
if (await vt2.getByRole("button", { name: /usar as 42h/ }).count()) {
  await vt2.getByRole("button", { name: /usar as 42h/ }).click();
  await page.waitForTimeout(300);
  ok(/42h de 42h/.test(await vt2.innerText()), "usar as 42h fecha a semana no teto");
}
await vt2.screenshot({ path: `${process.argv[3] ?? "."}/mural-almoco.png` });
await page.screenshot({ path: `${process.argv[3] ?? "."}/mural.png`, fullPage: true });
await browser.close();
