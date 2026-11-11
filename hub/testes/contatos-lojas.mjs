// Teste de tela: Contatos das lojas (registrar contato sem alerta, lembrete do próximo passo e linha do tempo).
// Rode com o site servido: node testes/contatos-lojas.mjs [porta]
import { createRequire } from "node:module";
import { simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const banco = await simular(page, { usuario: { id: "u-cs", email: "cs@teste.com" }, tabelas: {
  perfis: [{ id: "u-cs", nome: "Claudia CS", email: "cs@teste.com", papel: "equipe", aprova: false, monta: true, conversas_equipe: true, foto: null }],
  portais: [{ id: "A", loja: "Loja Alfa", tipo: "Mentoria", ativo: true, menu_oculto: [], cs_acompanha: true }, { id: "B", loja: "Loja Beta", tipo: "Mentoria", ativo: true, menu_oculto: [], cs_acompanha: false }],
  cs_contatos: [{ id: "c0", portal_id: "A", tipo: "geral", ref: "x", feito_em: new Date(Date.now() - 9 * 86400000).toISOString(), feito_por: "Claudia", resumo: "Conversa antiga sobre o estoque", precisa_ajuda: false, canal: "WhatsApp", arquivos: [] }],
  loja_combinados: [{ id: "k1", portal_id: "A", texto: "Lançar o caixa todos os dias", quem: "loja", prazo: amanha, status: "aberto", origem: "entrega", created_at: new Date().toISOString() }],
  equipe_conversas: [], equipe_lembretes: [],
} });
await page.goto(`${BASE}/equipe/contatos/`);
await page.getByText("Registrar contato").first().waitFor({ timeout: 15000 });
let t = await page.locator("main").innerText();
ok(/lojas sem conversa há 7 dias ou mais/.test(t) && /Loja Alfa · 9 dias/.test(t), "mostra a loja acompanhada há mais de 7 dias sem contato");
await page.locator("#novo select").first().selectOption("A");
await page.getByText("Conversa antiga sobre o estoque").waitFor({ timeout: 8000 });
t = await page.locator("main").innerText();
ok(/Conversa antiga sobre o estoque/.test(t) && /Lançar o caixa todos os dias/.test(t), "a linha do tempo junta o contato e o combinado");
await page.getByPlaceholder(/Com as palavras dela/).fill("Disse que vai lançar o caixa hoje; travou no relatório");
await page.getByLabel("Tem uma dificuldade em que precisamos ajudar").check();
await page.getByPlaceholder("Ex.: perguntar se lançou o caixa").fill("Perguntar se lançou o caixa");
await page.locator('input[type="date"]').fill(amanha);
await page.getByRole("button", { name: "Registrar contato" }).click();
await page.waitForTimeout(900);
const novo = (banco.tabelas.cs_contatos ?? []).find((c) => c.id !== "c0");
ok(novo && novo.portal_id === "A" && novo.canal === "WhatsApp" && novo.precisa_ajuda === true && novo.proximo_em === amanha, "grava o contato com canal, ajuda e próximo passo");
ok((banco.tabelas.equipe_lembretes ?? []).some((l) => l.texto === "Perguntar se lançou o caixa" && l.responsavel === "u-cs" && l.quando === amanha), "o próximo passo vira lembrete da Claudia");
t = await page.locator("main").innerText();
ok(/Disse que vai lançar o caixa hoje/.test(t) && /pediu ajuda/.test(t), "o contato novo aparece na linha do tempo");
await browser.close();
