// Teste de tela: o Planeje do mês não apaga o que mudou por fora, não muda sozinho depois de aprovado e avisa quando a meta vira "ação".
// Rode com o site servido: node testes/planeje-protegido.mjs [porta]
import { createRequire } from "node:module";
import { simular, lojaBase } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const MES = "2027-03";
const plano = (status, dados) => ({ portal_id: "p-teste", mes: MES, status, dados, retorno: null, enviado_em: null });
const dados = () => ({ base: 50000, base_fonte: "Teste", crescimento: 20, acoes_passadas: [], datas: [], acoes: [{ titulo: "Live de março", inicio: `${MES}-10` }], produtos: [], semanas: [{ foco: "", conteudo: "", exposicao: "" }, { foco: "", conteudo: "", exposicao: "" }, { foco: "", conteudo: "", exposicao: "" }, { foco: "", conteudo: "", exposicao: "" }], obs: "", premiacao: "Premiação de antes" });

async function abrir(linha) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const l = lojaBase(); l.tabelas.loja_equipe[0].nome = "Ana";
  const banco = await simular(page, { tabelas: { ...l.tabelas, loja_plano_mes: [linha], datas_comerciais: [], planeje: [], acoes: [], loja_caixa: [] } });
  await page.goto(`${BASE}/planeje/mes/?m=${MES}`);
  await page.getByText("As ações deste mês").waitFor({ timeout: 15000 }).catch(async (e) => { console.log((await page.locator("body").innerText()).slice(0, 400)); throw e; });
  return { page, banco };
}

// 1) Página aberta há tempo: por fora mudou a premiação; a loja mexe numa ação; a premiação de fora fica.
{
  const { page, banco } = await abrir(plano("rascunho", dados()));
  banco.tabelas.loja_plano_mes[0].dados = { ...banco.tabelas.loja_plano_mes[0].dados, premiacao: "Premiação nova de fora" };
  await page.getByPlaceholder("Nome da ação").first().fill("Live de março com as parceiras");
  await page.waitForTimeout(1800);
  const d = banco.tabelas.loja_plano_mes[0].dados;
  ok(d.acoes[0].titulo === "Live de março com as parceiras" && d.premiacao === "Premiação nova de fora", "grava só o que a loja mudou, sem apagar o que mudou por fora");
  await page.close();
}
// 2) Plano aprovado: mexer não grava sozinho; meta escrita como ação ganha o aviso.
{
  const { page, banco } = await abrir(plano("ok", dados()));
  await page.getByPlaceholder("Nome da ação").first().fill("Metas de março: loja R$ 90 mil");
  await page.waitForTimeout(1800);
  ok(banco.tabelas.loja_plano_mes[0].dados.acoes[0].titulo === "Live de março", "plano aprovado não muda sozinho");
  ok(await page.getByText(/não é uma ação de venda/).count() === 1, "meta escrita como ação ganha o aviso");
  ok(await page.getByText(/vale quando mandar de novo/).count() === 1, "avisa que a mudança vale quando mandar de novo");
  await page.close();
}
await browser.close();
