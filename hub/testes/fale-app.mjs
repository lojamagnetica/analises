// Teste de tela: Fale com a Camilla como aplicativo do celular (/fale/, fora do portal) e o convite no portal.
// Rode com o site servido: node testes/fale-app.mjs [porta] [pasta de prints]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const PRINTS = process.argv[3] ?? ".";
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const ha = (min) => new Date(Date.now() - min * 60_000).toISOString();

const dados = () => {
  const l = lojaBase();
  return { l, tabelas: {
    ...l.tabelas,
    hub_config: [{ chave: "camilla", valor: { nome: "Camilla Ribeiro", foto: null } }],
    solicitacoes: [{ id: "s1", portal_id: l.portal, autor: "u-loja", autor_nome: "Ana Teste", tipo: "Dúvida", texto: "Como monto a vitrine desta semana?", audio: null, transcricao: null,
      status: "Respondida", responsavel: null, responsavel_nome: null, vinculo: null, created_at: ha(120), updated_at: ha(60) }],
    solicitacao_respostas: [{ id: "r1", solicitacao_id: "s1", portal_id: l.portal, autor: "u-eq", autor_nome: "Claudia", equipe: true, automatica: false,
      texto: "Comece pela peça que mais vende e monte dois looks com ela.", audio: null, transcricao: null, created_at: ha(60) }],
  } };
};

const browser = await chromium.launch();

// 1) O app: tela cheia, no tamanho de um celular.
const celular = await browser.newPage({ viewport: { width: 390, height: 780 } });
celular.on("pageerror", (e) => console.log("erro na página:", e.message));
const { tabelas } = dados();
const banco = await simular(celular, { tabelas });
await celular.goto(`${BASE}/fale/`);
await celular.getByText("Camilla Ribeiro").first().waitFor();
ok(await celular.getByText("Como monto a vitrine desta semana?").count() === 1, "mostra a mensagem da loja");
ok(await celular.getByText("Comece pela peça que mais vende").count() === 1, "mostra a resposta da Camilla");
ok(await celular.locator(".sidebar, nav.menu, .app").count() === 0, "sem menu do portal");
const caixa = await celular.locator(".wa.cheia").boundingBox();
ok(caixa && caixa.x === 0 && caixa.y === 0 && Math.round(caixa.width) === 390 && Math.round(caixa.height) === 780, "a conversa ocupa a tela inteira");
ok((await celular.locator('link[rel="manifest"]').getAttribute("href")).endsWith("/manifest-fale.webmanifest"), "usa o manifesto do app do Fale");
await celular.screenshot({ path: `${PRINTS}/fale-app.png` });
await celular.getByPlaceholder("Mensagem").fill("Obrigada, vou montar hoje.");
await celular.getByRole("button", { name: "Enviar" }).click();
await celular.getByText("Obrigada, vou montar hoje.").first().waitFor();
const envio = banco.chamadas.find((c) => c.tabela === "solicitacao_respostas" && c.metodo === "POST");
ok(envio && envio.corpo.equipe === false && envio.corpo.solicitacao_id === "s1", "a mensagem entra na conversa em aberto, como loja");
await celular.screenshot({ path: `${PRINTS}/fale-app-enviada.png` });

// 2) No portal: a conversa continua lá, com o convite para usar como aplicativo.
const portal = await browser.newPage({ viewport: { width: 1100, height: 900 } });
portal.on("pageerror", (e) => console.log("erro na página:", e.message));
await simular(portal, { tabelas: dados().tabelas });
await portal.goto(`${BASE}/assistente/`);
await portal.getByRole("heading", { name: "Fale com a Camilla" }).waitFor();
ok(await portal.getByText("Como monto a vitrine desta semana?").count() === 1, "o portal continua com a conversa");
ok(await portal.locator(".wa.cheia").count() === 0, "no portal a conversa não toma a tela inteira");
await portal.getByText("Use como aplicativo no celular").click();
ok((await portal.getByRole("link", { name: "Abrir o aplicativo" }).getAttribute("href")).endsWith("/fale/"), "o convite leva para o app");
await portal.screenshot({ path: `${PRINTS}/fale-portal.png`, fullPage: true });

await browser.close();
console.log("tudo certo");
