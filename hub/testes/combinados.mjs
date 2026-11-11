// Teste de tela: combinados da loja (Início da loja com check, "Claudia acompanha você") e o que chega para a CS.
// Rode com o site servido: node testes/combinados.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const browser = await chromium.launch();

// 1) A loja vê os combinados no Início e marca um como feito.
{
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const l = lojaBase();
  const banco = await simular(page, { tabelas: { ...l.tabelas, loja_equipe: [],
    loja_combinados: [
      { id: "c1", portal_id: l.portal, texto: "Lançar o caixa todos os dias", quem: "loja", prazo: amanha, status: "aberto", origem: "entrega" },
      { id: "c2", portal_id: l.portal, texto: "Combinado da Claudia com a Camilla", quem: "claudia", prazo: amanha, status: "aberto", origem: "entrega" },
    ],
  }, rpc: { combinado_marcar: () => null } });
  await page.addInitScript((id) => { try { localStorage.setItem("lm_portal", id); } catch {} }, l.portal);
  await page.goto(`${BASE}/inicio/`);
  await page.getByText("Seus combinados com a Camilla").first().waitFor({ timeout: 15000 });
  const t = await page.locator("main").innerText();
  ok(/Lançar o caixa todos os dias/.test(t), "a loja vê o combinado dela");
  ok(!/Combinado da Claudia com a Camilla/.test(t), "não mostra o que é da equipe");
  ok(/Claudia é a sua CS e acompanha você de perto/.test(t), "mostra quem acompanha a loja");
  await page.getByRole("checkbox").first().click();
  await page.waitForTimeout(500);
  ok(banco.chamadas.some((c) => c.rpc === "combinado_marcar" && c.args.p_feito === true && c.args.p_id === "c1"), "marcar o combinado chama o banco");
  await page.close();
}

// 2) A CS recebe a conversa de boas-vindas e a pergunta do combinado vencido.
{
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  await simular(page, { usuario: { id: "u-cs", email: "cs@teste.com" }, tabelas: {
    perfis: [{ id: "u-cs", nome: "Claudia Teste", email: "cs@teste.com", papel: "equipe", portal_id: null, aprova: false, monta: true, foto: null }, { id: "p1", nome: "Ana", email: "a@a.com", papel: "mentorado", portal_id: "A", ultimo_acesso: new Date().toISOString() }],
    portais: [{ id: "A", loja: "Loja Exemplo", tipo: "Mentoria", whatsapp: "81999990000", responsavel: "Ana Souza", ativo: true, menu_oculto: [], cs_acompanha: true }],
    loja_combinados: [{ id: "c1", portal_id: "A", texto: "Lançar o caixa todos os dias", quem: "loja", prazo: ontem, status: "aberto", origem: "entrega" }],
    cs_contatos: [], loja_caixa: [], reunioes: [], contratos: [], loja_leituras: [], loja_plano_mes: [],
  } });
  await page.goto(`${BASE}/empresa/cs/`);
  await page.getByText("Faça agora").first().waitFor();
  const t = await page.locator("main").innerText();
  ok(/fechou os combinados com a loja/.test(t) && !/boas-vindas/.test(t), "a CS confirma os combinados, sem boas-vindas");
  ok(/Combinado vencido/.test(t), "o combinado vencido vira pergunta para a CS");
  const href = await page.getByRole("link", { name: "Mandar no WhatsApp" }).first().getAttribute("href");
  ok(href !== null, "há mensagem pronta");
  await page.close();
}
// 3) A Camilla registra os combinados no fim da reunião de entrega e libera o acompanhamento da CS.
{
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  page.on("dialog", (d) => d.accept());
  const l = lojaBase();
  const banco = await simular(page, { usuario: { id: "u-eq", email: "e@e.com" }, tabelas: { ...l.tabelas,
    perfis: [{ id: "u-eq", nome: "Camilla Teste", email: "e@e.com", papel: "equipe", portal_id: null, aprova: true, monta: true, foto: null }],
    loja_combinados: [], fichas: [], contratos: [], plano_itens: [], reunioes: [] } });
  await page.goto(`${BASE}/equipe/entrega/?id=${l.portal}`);
  await page.getByText("Combinados da loja").first().waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /Lançar o caixa todos os dias/ }).click();
  await page.getByRole("button", { name: "Liberar o acompanhamento" }).click();
  await page.waitForTimeout(800);
  ok(banco.tabelas.loja_combinados?.length === 1 && banco.tabelas.loja_combinados[0].quem === "loja" && !!banco.tabelas.loja_combinados[0].prazo, "grava o combinado com prazo e quem faz");
  ok(banco.tabelas.portais.find((p) => p.id === l.portal)?.cs_acompanha === true, "passa a loja para o acompanhamento da CS");
  await page.close();
}
await browser.close();
