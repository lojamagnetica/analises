// Teste de tela: Bússola do gestor (rotina, estoque parado, boletos e alertas). Rode com o `next dev` ligado: node testes/bussola.mjs [porta]
import { createRequire } from "node:module";
import { conteudoLiberado, lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const somar = (d, n) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
const browser = await chromium.launch();
const l = lojaBase();
const novaPagina = async (tabelas) => {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  page.on("dialog", (x) => x.accept());
  const banco = await simular(page, { tabelas: { ...l.tabelas, ...conteudoLiberado(l.portal), loja_bussola: [], loja_estoque_itens: [], loja_boletos: [], loja_caixa: [], loja_equipe: [], loja_feedbacks: [], loja_posts: [], ...tabelas } });
  return { page, banco };
};

{
  // Rotina: monta a semana a partir da disponibilidade
  const { page, banco } = await novaPagina({});
  await page.goto(`${BASE}/bussola/rotina/`);
  await page.getByRole("button", { name: "Montar a minha semana" }).click();
  await page.getByText("Salvo.").waitFor();
  const b = banco.tabelas.loja_bussola[0];
  ok(b && b.blocos.length > 5, "monta a semana e grava");
  ok(b.blocos.some((x) => x.funcao === "feedback" && x.dia === 2), "feedback cai na terça pelo método");
  await page.getByRole("button", { name: "Remover" }).first().click();
  await page.waitForTimeout(300);
  ok(banco.tabelas.loja_bussola[0].blocos.length === b.blocos.length - 1, "remove um bloco com confirmação");
  await page.close();
}

{
  // Boletos: cria, marca como pago, edita e exclui
  const { page, banco } = await novaPagina({});
  await page.goto(`${BASE}/bussola/boletos/`);
  await page.getByLabel("O que é").fill("Fornecedor Aurora");
  await page.getByLabel("Valor").fill("1.250,00");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByText("Fornecedor Aurora").waitFor();
  ok(banco.tabelas.loja_boletos[0].valor === 1250 && banco.tabelas.loja_boletos[0].vence === hoje, "cria o boleto");
  await page.getByRole("button", { name: "Marcar como pago" }).click();
  await page.getByText("Pago ·").waitFor();
  ok(banco.tabelas.loja_boletos[0].pago === true, "marca como pago");
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByText("Nenhum boleto cadastrado.").waitFor();
  ok(banco.tabelas.loja_boletos.length === 0, "exclui com confirmação");
  await page.close();
}

{
  // Estoque parado: cria e vira objetivo da semana
  const { page, banco } = await novaPagina({});
  await page.goto(`${BASE}/bussola/estoque/`);
  await page.getByLabel("Produto ou linha").fill("Vestido midi");
  await page.getByLabel("Dias parado").fill("90");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByText("Vestido midi").waitFor();
  await page.getByRole("button", { name: "Virar objetivo da semana" }).click();
  await page.getByText("Objetivo da semana", { exact: true }).waitFor();
  ok(banco.tabelas.loja_estoque_itens[0].objetivo === true && banco.tabelas.loja_estoque_itens[0].dias_parado === 90, "cria o item e vira objetivo");
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByText("Nada cadastrado ainda.").waitFor();
  await page.close();
}

{
  // Hoje: alertas de queda, boleto vencido e peça parada sem post
  const dias = (v) => Array.from({ length: 7 }, (_, i) => ({ id: "c" + v + i, loja: null, dia: somar(hoje, v === "agora" ? -i : -7 - i), faturamento: 0, vendas: 0, pecas: 0, obs: null, pagamentos: null, malinha: null,
    vendedoras: [{ pessoa_id: "p1", nome: "Ana", faturamento: v === "agora" ? 500 : 1000, vendas: 5, pecas: 8 }] }));
  const { page } = await novaPagina({
    loja_equipe: [{ id: "p1", portal_id: l.portal.id, nome: "Ana Souza", funcao: "Vendedora", ativo: true }],
    loja_caixa: [...dias("agora"), ...dias("antes")],
    loja_boletos: [{ id: "b1", descricao: "Aluguel", valor: 3000, vence: somar(hoje, -2), pago: false }],
    loja_estoque_itens: [{ id: "i1", produto: "Jaqueta jeans", qtd: 6, dias_parado: 80, giro: "Lento", postado_em: null, objetivo: false, obs: null }],
  });
  await page.goto(`${BASE}/bussola/`);
  await page.getByText("Ana caiu 50% nesta semana").waitFor();
  await page.getByText("1 boleto(s) vencido(s)").waitFor();
  await page.getByText("Jaqueta jeans: 6 peça(s) paradas há 80 dias").waitFor();
  ok(true, "alertas de queda, boleto vencido e peça parada aparecem");
  await page.close();
}

await browser.close();
console.log("Tudo certo.");
