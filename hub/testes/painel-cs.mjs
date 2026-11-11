// Teste de tela: Painel do dia da CS (alertas por assunto, só das lojas no acompanhamento, parabéns e "falei com todas").
// Rode com o site servido: node testes/painel-cs.mjs [porta]
import { createRequire } from "node:module";
import { simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const dia = (n) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date(Date.now() + n * 86400000));
const dow = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
let ontem = dia(-1); while (dow(ontem) === 0) ontem = dia(-2); // pula o domingo
const seg = (() => { const d = new Date(`${dia(0)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7); return d.toISOString().slice(0, 10); })();
const semanaPassada = Array.from({ length: 6 }, (_, i) => { const d = new Date(`${seg}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const mk = (id, loja) => ({ id, loja, tipo: "Mentoria", whatsapp: "81999990000", responsavel: "Dona " + loja, ativo: true, menu_oculto: [], cs_acompanha: true, sem_equipe: false });
const banco = await simular(page, { usuario: { id: "u-cs", email: "cs@teste.com" }, tabelas: {
  perfis: [{ id: "u-cs", nome: "Claudia Teste", email: "cs@teste.com", papel: "equipe", portal_id: null, aprova: false, monta: true, foto: null },
    ...["A", "B", "C"].map((id, i) => ({ id: "p" + id, nome: id, email: id + "@x.com", papel: "mentorado", portal_id: id, ultimo_acesso: new Date(Date.now() - (i === 2 ? 5 : 0) * 86400000).toISOString() }))],
  portais: [mk("A", "Loja Alfa"), mk("B", "Loja Beta"), mk("C", "Loja Gama"), { ...mk("D", "Loja Fora"), cs_acompanha: false }],
  // Alfa lançou o caixa de ontem e toda a semana passada; Beta e Gama não lançaram ontem.
  loja_caixa: [...semanaPassada.map((dd) => ({ portal_id: "A", dia: dd })), { portal_id: "A", dia: ontem }],
  loja_rotina: [{ portal_id: "A", feitos: Object.fromEntries([...semanaPassada, ontem].map((dd) => [dd, ["direcao"]])) }],
  loja_reunioes: [{ id: "r1", portal_id: "A", tipo: "analise_semana", data: semanaPassada[1], dados: { semana: seg } }],
  cs_contatos: [], reunioes: [], contratos: [], loja_leituras: [], loja_plano_mes: [],
} });
await page.goto(`${BASE}/empresa/cs/`);
await page.getByText("Painel do dia").first().waitFor();
await page.getByText("Caixa de ontem sem lançar").waitFor({ timeout: 10000 });
const t = await page.locator("main").innerText();
ok(/2 lojas · Caixa de ontem sem lançar/.test(t), "o caixa de ontem junta as 2 lojas que não lançaram");
ok(/Loja Beta/.test(t) && /Loja Gama/.test(t) && !/Loja Fora/.test(t), "só as lojas no acompanhamento entram");
ok(/1 loja · Sem entrar no Hub há mais de 2 dias/.test(t), "uma loja sem entrar há mais de 2 dias");
ok(/Parabéns: caixa lançado todos os dias/.test(t) && /Parabéns: análise da semana feita/.test(t), "os parabéns da semana passada aparecem");
ok(/Loja Alfa/.test(t), "a loja que fez aparece nos parabéns, com o nome");
const href = await page.getByRole("link", { name: "Mandar no WhatsApp" }).first().getAttribute("href");
ok(decodeURIComponent(href ?? "").includes("Aqui é a Claudia"), "a mensagem pronta é na voz da Claudia");
await page.getByRole("button", { name: "Falei com todas" }).first().click();
await page.waitForTimeout(800);
const linhas = banco.tabelas.cs_contatos ?? [];
ok(linhas.length === 2 && linhas.every((c) => c.tipo === "caixa" && c.ref === ontem), "registra o contato nas 2 lojas do alerta");
ok(!/2 lojas · Caixa de ontem sem lançar/.test(await page.locator("main").innerText()), "o alerta fecha depois de falar com todas");
await browser.close();
