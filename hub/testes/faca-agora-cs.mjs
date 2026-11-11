// Teste de tela: Faça agora da CS (um cartão por loja, check da análise liberada e registro de conversa).
// Rode com o site servido: node testes/faca-agora-cs.mjs [porta]
import { createRequire } from "node:module";
import { simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const d = new Date(`${hoje}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
const semana = d.toISOString().slice(0, 10);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const banco = await simular(page, { usuario: { id: "u-cs", email: "cs@teste.com" }, tabelas: {
  perfis: [{ id: "u-cs", nome: "Claudia Teste", email: "cs@teste.com", papel: "equipe", portal_id: null, aprova: false, monta: true, foto: null }, { id: "p1", nome: "Ana", email: "a@a.com", papel: "mentorado", portal_id: "A", ultimo_acesso: new Date(Date.now() - 86400000).toISOString() }],
  portais: [{ id: "A", loja: "Loja Exemplo", tipo: "Mentoria", whatsapp: "81999990000", responsavel: "Ana Souza", ativo: true, menu_oculto: [], cs_acompanha: true }],
  loja_leituras: [{ id: "L1", portal_id: "A", semana, publicada: true, pronta: false, publicada_em: new Date(Date.now() - 3600000).toISOString() }],
  cs_contatos: [], loja_caixa: [], reunioes: [], contratos: [], loja_plano_mes: [],
} });
await page.goto(`${BASE}/empresa/cs/`);
await page.getByText("Faça agora").first().waitFor();
const t = await page.locator("main").innerText();
ok(/A Camilla liberou a análise da semana/.test(t), "a análise liberada vira um check para a CS");
ok(/Ainda não entrou no Hub desde a liberação|Já entrou no Hub depois/.test(t), "mostra se a loja já entrou depois da liberação");
const bloco = page.locator("div:has(> div:text-matches(\"^A Camilla liberou a análise da semana\"))").first();
const href = await bloco.getByRole("link", { name: "Mandar no WhatsApp" }).first().getAttribute("href");
console.log("href:", decodeURIComponent(href ?? "").slice(0, 200)); ok(decodeURIComponent(href ?? "").includes("Vi que a Camilla já liberou a sua análise da semana"), "a mensagem pronta é na voz da Claudia");
await bloco.getByRole("button", { name: "Conversei" }).click();
await page.getByPlaceholder(/viu, entendeu/).fill("Viu e entendeu, vai começar pelo caixa");
await page.getByRole("button", { name: "Salvar a conversa" }).click();
await page.waitForTimeout(800);
const t2 = await page.locator("main").innerText();
ok(!/A Camilla liberou a análise da semana/.test(t2), "registrar a conversa fecha o alerta");
const linhas = banco.tabelas?.cs_contatos ?? banco.cs_contatos ?? [];
ok(Array.isArray(linhas) ? linhas.length === 1 && linhas[0].tipo === "leitura" : true, "a conversa foi gravada com o tipo leitura");
await browser.close();
