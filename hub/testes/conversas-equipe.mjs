// Teste de tela: Conversas da equipe (chat aberto da Central do Cliente, só Camilla e CS).
// Rode com o site servido: node testes/conversas-equipe.mjs [porta]
import { createRequire } from "node:module";
import { simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const tabelas = (perfil) => ({
  perfis: [perfil, { id: "u-cam", nome: "Camilla Ribeiro", email: "c@c.com", papel: "equipe", aprova: true, monta: true, conversas_equipe: true }],
  portais: [{ id: "A", loja: "Loja Alfa", tipo: "Mentoria", ativo: true, menu_oculto: [], cs_acompanha: true }],
  equipe_conversas: [{ id: "m1", portal_id: null, tipo: "Alinhamento", texto: "Claudia, a Riva pediu o estoque", autor: "u-cam", autor_nome: "Camilla", para: null, status: "aberta", created_at: new Date().toISOString() }],
  equipe_lembretes: [], reunioes: [], contratos: [], loja_leituras: [], loja_plano_mes: [], loja_caixa: [],
});

// 1) A CS vê o chat aberto, lê a mensagem, escreve e recolhe.
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const banco = await simular(page, { usuario: { id: "u-cs", email: "cs@teste.com" }, tabelas: tabelas({ id: "u-cs", nome: "Claudia CS", email: "cs@teste.com", papel: "equipe", aprova: false, monta: true, conversas_equipe: true, foto: null }) });
  await page.goto(`${BASE}/equipe/controle/`);
  await page.getByPlaceholder("Escreva uma mensagem").waitFor({ timeout: 15000 });
  ok(await page.getByText("Claudia, a Riva pediu o estoque").count() >= 1, "a conversa já aparece aberta, com a mensagem da Camilla");
  await page.getByPlaceholder("Escreva uma mensagem").fill("Vi, já peço hoje");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.waitForTimeout(700);
  ok((banco.tabelas.equipe_conversas ?? []).some((m) => m.texto === "Vi, já peço hoje" && m.autor === "u-cs"), "a mensagem é gravada com a autora");
  await page.getByRole("button", { name: "Recolher" }).click();
  ok(await page.getByPlaceholder("Escreva uma mensagem").count() === 0, "recolhe o chat");
  await page.getByTitle("Conversas da equipe").click();
  await page.getByPlaceholder("Escreva uma mensagem").waitFor({ timeout: 5000 });
  ok(true, "o ícone Conversas do cabeçalho abre o chat");
  await page.getByTitle("Conversas da equipe").click();
  ok(await page.getByPlaceholder("Escreva uma mensagem").count() === 0, "e fecha de novo, a qualquer momento");
  await page.reload();
  await page.getByRole("button", { name: "Abrir as conversas da equipe" }).waitFor({ timeout: 15000 });
  ok(true, "lembra que ficou recolhido");
  await page.close();
}
// 2) Quem não é da conversa (outra pessoa da equipe) não vê o chat.
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  await simular(page, { usuario: { id: "u-yan", email: "yan@teste.com" }, tabelas: tabelas({ id: "u-yan", nome: "Yan", email: "yan@teste.com", papel: "equipe", aprova: false, monta: false, conversas_equipe: false, foto: null }) });
  await page.goto(`${BASE}/equipe/controle/`);
  await page.getByText("Controle de clientes").first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  ok(await page.getByPlaceholder("Escreva uma mensagem").count() === 0 && await page.getByRole("button", { name: "Abrir as conversas da equipe" }).count() === 0, "outra pessoa da equipe não vê o chat");
  await page.goto(`${BASE}/equipe/conversas/`);
  await page.waitForTimeout(1500);
  ok(!/Conversas da equipe/.test(await page.locator("main").innerText().catch(() => "")), "nem a página abre pelo link");
  await page.close();
}

// 3) O app do celular (/conversas): tela cheia, anexo de arquivo e aviso para ativar.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const subidos = [];
  const banco = await simular(page, { usuario: { id: "u-cs", email: "cs@teste.com" }, tabelas: tabelas({ id: "u-cs", nome: "Claudia CS", email: "cs@teste.com", papel: "equipe", aprova: false, monta: true, conversas_equipe: true, foto: null }) });
  await page.route("**/storage/v1/object/**", (r) => {
    const u = r.request().url();
    if (u.includes("/object/sign/")) return r.fulfill({ json: { signedURL: "/object/sign/equipe-conversas/x?token=1" } });
    subidos.push(u); return r.fulfill({ json: { Key: "equipe-conversas/x" } });
  });
  await page.goto(`${BASE}/conversas/`);
  await page.getByPlaceholder("Escreva uma mensagem").waitFor({ timeout: 15000 });
  ok(await page.getByRole("button", { name: "Recolher" }).count() === 0, "no app a conversa ocupa a tela e não recolhe");
  await page.locator('input[type="file"]').setInputFiles({ name: "estoque riva.pdf", mimeType: "application/pdf", buffer: Buffer.from("pdf de teste") });
  ok(await page.getByText("estoque riva.pdf").count() >= 1, "o arquivo escolhido aparece antes de enviar");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.waitForTimeout(900);
  const msg = (banco.tabelas.equipe_conversas ?? []).find((m) => (m.arquivos ?? []).length);
  ok(subidos.length === 1 && msg && msg.arquivos[0].nome === "estoque riva.pdf" && msg.autor === "u-cs", "sobe o arquivo e grava a mensagem com o anexo");
  await page.close();
}
await browser.close();
