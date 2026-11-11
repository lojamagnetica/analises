// Teste de tela: Início da CS (alertas por loja, mensagem pronta e semáforo). Rode com o site servido: node testes/inicio-cs.mjs [porta]
import { createRequire } from "node:module";
import { simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const ontem = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
await simular(page, { usuario: { id: "u-cs", email: "cs@teste.com" }, tabelas: {
  perfis: [{ id: "u-cs", nome: "Claudia Teste", email: "cs@teste.com", papel: "equipe", portal_id: null, aprova: false, monta: true, foto: null }, { id: "p1", nome: "Ana", email: "a@a.com", papel: "mentorado", portal_id: "A", ultimo_acesso: ontem(10) }],
  portais: [{ id: "A", loja: "Loja Atrasada", tipo: "Mentoria", whatsapp: "81999990000", responsavel: "Ana Souza", ativo: true, menu_oculto: [] }, { id: "B", loja: "Loja Em Dia", tipo: "Mentoria", whatsapp: null, responsavel: "Bia", ativo: true, menu_oculto: [] }],
  loja_caixa: [], reunioes: [], contratos: [], loja_leituras: [], loja_plano_mes: [],
} });
await page.goto(`${BASE}/empresa/cs/`);
await page.getByText("Faça agora").first().waitFor();
const t = await page.locator("main").innerText(); if (process.env.DEBUG) console.log(t.slice(0, 900));
ok(/Loja Atrasada/.test(t) && /Sem entrar no portal há 10 dias/.test(t), "mostra a loja sem entrar há 10 dias");
ok(await page.getByRole("link", { name: "Mandar no WhatsApp" }).first().getAttribute("href").then((h) => h?.includes("wa.me/5581999990000") && decodeURIComponent(h).includes("Aqui é a Claudia")), "o WhatsApp abre com a mensagem pronta no número da loja");
await page.getByRole("button", { name: /Todas as lojas/ }).click();
ok(await page.getByText("Loja Em Dia").count() >= 1, "a lista de todas as lojas mostra as duas");
await browser.close();
