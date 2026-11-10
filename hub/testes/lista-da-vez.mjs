// Teste de tela: Lista da vez. A equipe (link pessoal, sem login) e a gestora (fila, missão, resumo e links).
// Rode com o site servido: node testes/lista-da-vez.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const TOKEN = "11111111-2222-3333-4444-555555555555";
const agora = new Date().toISOString();
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());

// 1) A equipe, pelo link pessoal
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const painel = { pessoa: { id: "e1", nome: "Ana", loja: "" }, hoje, fila: [{ pessoa_id: "e2", nome: "Bia", status: "fila", chegou_em: agora, ordem_em: agora }],
    atend: [{ id: "a1", pessoa_id: "e1", nome: "Ana", inicio_em: agora, fim_em: agora, resultado: "nao_vendeu", motivo: "Preço", cliente: "" }],
    missoes: [{ id: "m1", texto: "Oferecer a segunda peça", feito: false }],
    mes: { faturamento: 20000, vendas: 20, pecas: 44, ate: hoje }, plano: { meta_loja: 80000, ajustes: {}, vendedoras: ["e1", "e2"] }, mural: { pa: 2.5, tkm: 800 } };
  const banco = await simular(page, { rpc: { vez_painel: () => painel, vez_entrar: () => null, vez_missao_marcar: () => null, vez_atender: () => "x" }, tabelas: lojaBase().tabelas });
  await page.goto(`${BASE}/vez/?t=${TOKEN}`);
  await page.getByText("Lista da vez").first().waitFor();
  ok(await page.getByText("Objetivo de hoje").count() === 1, "mostra o objetivo do dia");
  ok(await page.getByText("Oferecer a segunda peça").count() === 1, "mostra a missão do dia");
  ok(await page.getByText("Meus números do mês").count() === 1, "mostra a meta, o P.A. e o ticket médio");
  ok(await page.getByText("1ª da fila").count() === 0 && await page.getByRole("button", { name: /Entrar na vez/ }).count() === 1, "quem ainda não entrou vê o botão de entrar na vez");
  await page.getByRole("button", { name: /Entrar na vez/ }).click();
  await page.getByText("Oferecer a segunda peça").click();
  await page.waitForTimeout(400);
  ok(banco.chamadas.some((c) => c.rpc === "vez_entrar" && c.args.p_token === TOKEN), "entrar na vez chama o banco com o link da pessoa");
  ok(banco.chamadas.some((c) => c.rpc === "vez_missao_marcar" && c.args.p_feito === true), "dá o check na missão do dia");
  await page.close();
}
// 2) Link que não vale
{
  const page = await browser.newPage();
  await simular(page, { rpc: { vez_painel: () => null }, tabelas: lojaBase().tabelas });
  await page.goto(`${BASE}/vez/?t=${TOKEN}`);
  await page.getByText("Este link não vale mais").waitFor();
  ok(true, "link inválido mostra aviso");
  await page.close();
}
// 3) A gestora
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const l = lojaBase({ tipo: "Consultoria" });
  const A = (id, pessoa, nome, res, motivo) => ({ id, portal_id: l.portal, loja: "", dia: hoje, pessoa_id: pessoa, nome, inicio_em: agora, fim_em: agora, resultado: res, motivo, cliente: "", fora_da_vez: false });
  const banco = await simular(page, { tabelas: { ...l.tabelas,
    loja_equipe: [{ id: "e1", portal_id: l.portal, nome: "Ana Souza", funcao: "Vendedora", ativo: true, loja: null, vez_token: TOKEN }, { id: "e2", portal_id: l.portal, nome: "Bia Lima", funcao: "Vendedora", ativo: true, loja: null, vez_token: "99999999-2222-3333-4444-555555555555" }],
    loja_vez_fila: [{ portal_id: l.portal, loja: "", dia: hoje, pessoa_id: "e2", status: "fila", chegou_em: agora, ordem_em: agora }],
    loja_vez_atend: [A("a1", "e1", "Ana Souza", "vendeu", ""), A("a2", "e1", "Ana Souza", "nao_vendeu", "Preço"), A("a3", "e2", "Bia Lima", "nao_vendeu", "Preço")],
    loja_missao_dia: [{ id: "m1", portal_id: l.portal, dia: hoje, pessoa_id: "e1", texto: "Mostrar a vitrine nova", feito: true, feito_em: agora }],
  } });
  await page.goto(`${BASE}/gestao/vez/`);
  await page.getByRole("heading", { name: /Lista da vez/ }).waitFor();
  await page.getByText("Na lista agora").waitFor();
  ok(await page.getByText("Bia").first().isVisible(), "mostra quem está na lista");
  ok(await page.getByText("Conversão").first().isVisible() && await page.getByText("33%").count() >= 1, "mostra a conversão do dia (1 venda em 3 atendimentos)");
  ok(await page.getByText("Fluxo por horário").count() === 1, "mostra o fluxo por horário");
  ok(await page.getByText("Preço", { exact: true }).count() >= 1, "mostra os motivos que mais aparecem");
  ok(await page.getByText("Mostrar a vitrine nova").count() === 1, "mostra a missão do dia e o check");
  ok(await page.getByRole("link", { name: "Abrir" }).count() === 2, "mostra o link de cada vendedora");
  await browser.close();
}
