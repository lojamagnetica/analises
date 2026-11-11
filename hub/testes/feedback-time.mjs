// Teste de tela: Feedback do time em cartões (um por pessoa, com os 4 passos e o combinado). Rode com o site servido: node testes/feedback-time.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const l = lojaBase({ tipo: "Consultoria" });
const pessoas = [
  { nome: "Ana", funcao: "Vendas", problema: "Você vendeu R$ 10 mil e o P.A. está em 1,8.", forca: "Você vende bem as peças de valor alto.", solucao: "Leve a segunda peça junto.", dificuldade: "Cliente com pressa.", oque: "Oferecer a segunda peça", quanto: "P.A. 2,3", ate: "sexta" },
  { nome: "Bia", funcao: "Marketing", problema: "O estoque está em 8 meses de venda.", forca: "O conteúdo mostra a peça em uso.", solucao: "Três conteúdos do que está parado.", dificuldade: "Poucos tamanhos.", oque: "", quanto: "", ate: "" },
];
await simular(page, { usuario: { id: "u-eq", email: "e@e.com" }, tabelas: { ...l.tabelas,
  perfis: [{ id: "u-eq", nome: "Camilla", email: "e@e.com", papel: "equipe", portal_id: null, aprova: true, monta: true, foto: null }],
  loja_reunioes: [{ id: "r1", portal_id: l.portal, tipo: "feedback_time", data: hoje, pauta: "x", dados: { mes: hoje.slice(0, 7), loja: "", semana: hoje, campos: {}, combinados: [], validado: false, pessoas } }],
}, rpc: { meu_contrato: () => [] } });
await page.addInitScript((id) => { try { localStorage.setItem("lm_portal", id); } catch {} }, l.portal);
await page.goto(`${BASE}/consultoria/reunioes/`);
await page.getByText("Feedback do time ·").first().waitFor({ timeout: 15000 });
await page.getByRole("button", { name: "Ver", exact: true }).first().click(); await page.waitForTimeout(500);
const t = await page.locator("main").innerText(); if (process.env.DEBUG) console.log(t.slice(-900));
ok(/O problema, com número/i.test(t) && /Ana/.test(t) && /Bia/.test(t), "mostra um cartão por pessoa com os passos");
ok(/Oferecer a segunda peça/.test(t) && /A combinar com ela/.test(t), "mostra o combinado de quem já combinou e o espaço para quem ainda não");
await browser.close();
