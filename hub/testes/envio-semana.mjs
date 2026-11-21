// Teste de tela: o aviso do caixa da semana (prazo até enviar, parabéns depois e "a Camilla liberou" com a análise publicada).
// Rode com o site servido: node testes/envio-semana.mjs [porta]
import { createRequire } from "node:module";
import { simular, lojaBase } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const dia = (d) => ({ portal_id: "", dia: d, loja: null, faturamento: 1000, vendas: 5, pecas: 10, pagamentos: { pix: 1000 }, vendedoras: [], origem: null, justificativa: null });
const semana = (seg) => [0, 1, 2, 3, 4, 5].map((i) => { const d = new Date(`${seg}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });

async function cena(agora, dias, leituras = []) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  await page.clock.setFixedTime(new Date(agora));
  const l = lojaBase();
  await simular(page, { tabelas: { ...l.tabelas, loja_caixa: dias.map((d) => ({ ...dia(d), portal_id: l.portal })), loja_equipe: [],
    loja_leituras: leituras.map((x) => ({ portal_id: l.portal, texto: "A semana foi boa.", acoes: [], autor_nome: "Camilla", rascunho: null, publicada: true, pronta: false, updated_at: x.publicada_em, ...x })) } });
  await page.goto(`${BASE}/envios/`);
  await page.getByText("Caixa desta semana").first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  const t = await page.locator("main").innerText();
  await page.close();
  return t;
}

// Sábado 21/11, caixa completo e sem análise: parabéns, sem o prazo.
let t = await cena("2026-11-21T15:00:00-03:00", semana("2026-11-16"));
ok(/Parabéns, você mandou o caixa da semana/.test(t) && !/último dia/.test(t), "sábado com tudo enviado: parabéns e sem o aviso de prazo");
// Sábado sem o dia de hoje: ainda mostra o prazo.
t = await cena("2026-11-21T15:00:00-03:00", semana("2026-11-16").slice(0, 5));
ok(/Hoje é o último dia/.test(t) && !/Parabéns/.test(t), "sábado faltando o dia: mostra o prazo");
// Sábado com a análise publicada depois da sexta: a Camilla liberou.
t = await cena("2026-11-21T15:00:00-03:00", semana("2026-11-16"), [{ id: "l1", semana: "2026-11-16", publicada_em: "2026-11-21T17:00:00Z" }]);
ok(/A Camilla liberou a sua análise/.test(t), "com a análise publicada: a Camilla liberou");
// Segunda 23/11, semana passada completa e análise ainda não publicada: parabéns.
t = await cena("2026-11-23T10:00:00-03:00", semana("2026-11-16"));
ok(/Parabéns/.test(t), "segunda com a semana passada enviada: parabéns até a análise sair");
// Segunda, com a análise publicada na segunda: a Camilla liberou.
t = await cena("2026-11-23T15:00:00-03:00", semana("2026-11-16"), [{ id: "l2", semana: "2026-11-23", publicada_em: "2026-11-23T16:00:00Z" }]);
ok(/A Camilla liberou a sua análise/.test(t), "segunda com a análise publicada: a Camilla liberou");
await browser.close();
