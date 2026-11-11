// Teste de tela: Caixa do dia (o que não está realizado continua aparecendo todos os dias).
// Rode com o site servido: node testes/caixa-do-dia.mjs [porta]
import { createRequire } from "node:module";
import { simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const dia = (n) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date(Date.now() + n * 86400000));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const item = (id, data, contato, status, extra = {}) => ({ id, perfil: "camilla", data, contato, mentorado: null, resumo: null, resposta_sugerida: null, prioridade: "Hoje", delegar_para: null, origem: "Reunião", status, tempo_min: null, ...extra });
const banco = await simular(page, { usuario: { id: "u-cs", email: "cs@teste.com" }, tabelas: {
  perfis: [{ id: "u-cs", nome: "Claudia CS", email: "cs@teste.com", papel: "equipe", aprova: false, monta: true, conversas_equipe: true }],
  portais: [{ id: "A", loja: "Loja Alfa", tipo: "Mentoria", ativo: true, menu_oculto: [] }],
  reunioes_gravadas: [{ id: "g1", tactiq_id: "t1", portal_id: "A", titulo: "ALFA - Reunião", data: dia(-4), status: "rascunho", criado_em: new Date(Date.now() - 4 * 86400000).toISOString() }],
  loja_diagnostico: [{ portal_id: "A", loja: "", status: "rascunho", updated_at: new Date(Date.now() - 5 * 86400000).toISOString() }],
  solicitacoes: [{ id: "s1", portal_id: "A", tipo: "Pedido", texto: "Preciso ajustar a meta do mês", status: "Recebida", created_at: new Date(Date.now() - 2 * 86400000).toISOString(), portal: { loja: "Loja Alfa", tipo: "Mentoria", inicio: null } }],
  caixa_dia: [
    item("a", dia(-3), "Tarefa antiga aberta", "A fazer"),
    item("b", dia(-3), "Tarefa antiga já realizada", "Feito"),
    item("c", dia(-1), "Delegada de ontem", "Delegado", { delegar_para: "Claudia" }),
    item("d", dia(0), "Tarefa de hoje", "A fazer"),
  ],
} });
await page.addInitScript(() => { try { localStorage.setItem("lm_conversa_aberta", "0"); } catch {} });
await page.goto(`${BASE}/empresa/caixa-do-dia/`);
await page.getByText("Tarefa de hoje").first().waitFor({ timeout: 15000 });
let t = await page.locator("main").innerText();
ok(/Tarefa antiga aberta/.test(t) && /há 3 dias/.test(t), "o que ficou aberto de 3 dias atrás continua aparecendo hoje, com os dias de atraso");
ok(/Delegada de ontem/.test(t) && /há 1 dia/.test(t), "a delegada de ontem também continua");
ok(!/Tarefa antiga já realizada/.test(t), "o que já está realizado não volta");
await page.getByRole("button", { name: "Marcar como realizado" }).first().click();
await page.waitForTimeout(700);
ok(banco.tabelas.caixa_dia.find((i) => i.id === "a").status === "Feito", "marcar como realizado grava o status");
t = await page.locator("main").innerText();
ok(!/Tarefa antiga aberta/.test(t), "depois de realizada, a tarefa sai da lista de abertas");
t = await page.locator("main").innerText();
ok(/Precisa de ação/i.test(t) && /Esperando aprovação/.test(t) && /ALFA - Reunião/.test(t) && /Diagnóstico/.test(t), "mostra o que espera aprovação (reunião gravada e diagnóstico)");
ok(/Pedidos das lojas/.test(t) && /Preciso ajustar a meta do mês/.test(t), "mostra o pedido de ajuste que chegou da loja");
ok(/parado há 5 dias|parado há 4 dias/.test(t), "avisa há quantos dias o mentorado está parado");
await browser.close();
