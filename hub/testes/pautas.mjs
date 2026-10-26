// Teste de tela: Pautas quentes (equipe escreve e libera; loja usa na semana). Rode com o `next dev` ligado: node testes/pautas.mjs [porta]
import { createRequire } from "node:module";
import { conteudoLiberado, lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const d = new Date(`${hoje}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
const segunda = d.toISOString().slice(0, 10);
const browser = await chromium.launch();
const l = lojaBase();

{
  // Equipe: escreve, edita, libera e exclui
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  page.on("dialog", (x) => x.accept());
  const banco = await simular(page, { usuario: { id: "u-eq", email: "eq@teste.com" }, tabelas: {
    perfis: [{ id: "u-eq", nome: "Equipe Teste", email: "eq@teste.com", papel: "equipe", portal_id: null }], pautas: [],
  } });
  await page.goto(`${BASE}/empresa/conteudo/pautas/`);
  await page.getByRole("button", { name: "+ Nova pauta" }).click();
  await page.getByLabel("O assunto").fill("Pauta Um");
  await page.getByLabel("O ângulo da loja").fill("Mostre três peças da cor. Depois chame no direct.");
  await page.getByRole("button", { name: "Salvar como rascunho" }).click();
  await page.getByText("1. Pauta Um").waitFor();
  ok(!banco.tabelas.pautas[0].liberada && banco.tabelas.pautas[0].semana === segunda, "nova pauta entra como rascunho da semana");
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("O assunto").fill("Pauta Um editada");
  await page.getByRole("button", { name: "Salvar como rascunho" }).click();
  await page.getByText("1. Pauta Um editada").waitFor();
  await page.getByRole("button", { name: "Liberar para as lojas" }).click();
  await page.getByText("Liberada", { exact: true }).waitFor();
  ok(banco.tabelas.pautas[0].liberada === true, "libera a pauta");
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByText("Nenhuma pauta nesta semana ainda.").waitFor();
  ok(banco.tabelas.pautas.length === 0, "exclui com confirmação");
  await page.close();
}

const pauta = (id, ordem, extra = {}) => ({ id, semana: segunda, titulo: "Pauta " + id, porque: "Está em alta.", angulo: `Ângulo ${id}. Mais detalhes.`, objetivo: "Vender", segmentos: [], liberada: true, ordem, ...extra });
const tabelasLoja = () => ({
  ...lojaBase().tabelas, ...conteudoLiberado(l.portal), loja_posts: [], datas_comerciais: [], loja_acoes: [], acoes: [],
  pautas: [pauta("A", 1), pauta("B", 2), pauta("C", 3), pauta("D", 4), pauta("R", 5, { liberada: false }), pauta("S", 6, { segmentos: ["Infantil"] })],
});
{
  // Loja: página de pautas e "Colocar na minha semana"
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const banco = await simular(page, { tabelas: tabelasLoja() });
  await page.goto(`${BASE}/conteudo/pautas/`);
  await page.getByText("🔥 Pauta A").waitFor();
  ok(await page.getByText("🔥 Pauta R").count() === 0, "loja não vê rascunho");
  ok(await page.getByText("🔥 Pauta S").count() === 0, "pauta de outro segmento não aparece");
  await page.locator(".card", { hasText: "🔥 Pauta B" }).getByRole("button", { name: "Colocar na minha semana" }).click();
  await page.getByRole("button", { name: "Criar o post" }).click();
  await page.getByText("Post criado em").waitFor();
  const post = banco.tabelas.loja_posts[0];
  ok(post && post.origem === "pauta" && post.gancho === "Ângulo B." && post.roteiro.includes("Ângulo B. Mais detalhes.") && post.legenda.includes("direct"), "cria o post com origem pauta, gancho, roteiro e legenda");
  await page.screenshot({ path: process.env.SHOTS + "/pautas.png", fullPage: true });

  // Faixa no topo da Programação com as 3 primeiras
  await page.goto(`${BASE}/conteudo/semana/`);
  await page.getByText("🔥 Pautas quentes da semana").waitFor();
  ok(await page.locator(".card", { hasText: "🔥 Pauta" }).count() === 3, "faixa da Programação mostra as 3 primeiras");

  // Criar roteiro preenchido
  await page.locator(".card", { hasText: "🔥 Pauta A" }).getByRole("link", { name: "Criar roteiro" }).click();
  await page.getByText("🔥 Pauta quente: Pauta A").waitFor();
  ok((await page.locator("pre").first().innerText()).includes("Ângulo A."), "roteiro abre com o gancho da pauta");
  await page.close();
}
await browser.close();
console.log("pautas: tudo certo");
