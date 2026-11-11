// Teste de tela: menu próprio por portal (ordem, nomes, esconder o Indique) e materiais com cadeado.
// Rode com o `next dev` ligado: node testes/menu-por-portal.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();

/** Os itens do primeiro nível do menu, na ordem em que aparecem (sem cadeado, presente e busca). */
const menu = (page) => page.evaluate(() => [...document.querySelectorAll(".nav > *")]
  .map((el) => (el.querySelector(".nav-item") ?? el).textContent.replace(/[🔒🎁]/gu, "").trim()).filter(Boolean));
const abrir = async (portal, extra = {}, caminho = "/guia/") => {
  const l = lojaBase({ tipo: "Consultoria" });
  Object.assign(l.tabelas.portais[0], portal);
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const banco = await simular(page, { ...extra, tabelas: { ...l.tabelas, ...(extra.tabelas ?? {}) } });
  await page.goto(`${BASE}${caminho}`);
  await page.locator(".nav-item", { hasText: "Como usar o Hub" }).waitFor();
  return { page, banco, l };
};

const PADRAO = ["INÍCIO", "PLANNER DE GESTÃO", "Fale com a Camilla", "Minha consultoria", "Minha loja", "Gestão estratégica", "Gestão de pessoas", "Vendas", "De cliente a fã", "Nossa marca", "Conteúdo", "CURSO", "Indique uma loja", "Como usar o Hub"];

{
  // Portal sem os campos novos (como vem do banco hoje) e com os campos vazios: o menu de sempre.
  for (const [nome, portal] of [["sem os campos", { menu_trancado: ["conteudo", "marca"] }], ["com os campos vazios", { menu_trancado: ["conteudo", "marca"], menu_ordem: [], menu_rotulos: {} }]]) {
    const { page } = await abrir(portal);
    ok(JSON.stringify(await menu(page)) === JSON.stringify(PADRAO), `portal ${nome}: menu na ordem e com os nomes de sempre`);
    await page.close();
  }
}
{
  // Portal com ordem e nomes próprios.
  const { page } = await abrir({
    menu_trancado: ["conteudo", "marca"],
    menu_oculto: ["loja", "/consultoria/planner"],
    menu_ordem: ["/inicio", "/assistente", "consultoria", "gestao", "vendas", "/gestao/canais", "/cursos", "/indique", "/guia"],
    menu_rotulos: { gestao: "Varejo", vendas: "Atacado", "/gestao/canais": "Site" },
  }, { tabelas: { loja_canais_medicao: [{ id: "m1", portal_id: "p-teste", ativa: true, fim: "2999-12-31" }] } });
  const itens = await menu(page);
  ok(JSON.stringify(itens.slice(0, 9)) === JSON.stringify(["INÍCIO", "Fale com a Camilla", "Minha consultoria", "Varejo", "Atacado", "Site", "CURSO", "Indique uma loja", "Como usar o Hub"]), "ordem do portal: o que está na lista vem primeiro, com os nomes novos");
  ok(JSON.stringify(itens.slice(9)) === JSON.stringify(["Gestão de pessoas", "De cliente a fã", "Nossa marca", "Conteúdo"]), "o que não está na lista fica abaixo, na ordem de sempre");
  ok(await page.locator('.nav > a.nav-item[href$="/gestao/canais/"], .nav > a.nav-item[href$="/gestao/canais"]').count() === 1, "a página da ordem (Vendas por canal) virou item do menu");
  await page.locator(".nav-grupo", { hasText: "Varejo" }).click();
  await page.locator(".nav-sub a", { hasText: "Fechamento de caixa" }).waitFor();
  ok(await page.locator(".nav-sub a", { hasText: /Site|Vendas por canal/ }).count() === 0, "e saiu de dentro do grupo");
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + "/menu-por-portal.png", fullPage: true });
  await page.close();
}
{
  // Esconder o Indique uma loja.
  const { page } = await abrir({ menu_oculto: ["/indique"] });
  ok(await page.locator(".nav-item", { hasText: "Indique uma loja" }).count() === 0, "/indique em menu_oculto: o Indique sai do menu");
  await page.goto(`${BASE}/indique/`);
  await page.waitForURL(/\/inicio\/?$/);
  ok(true, "e a loja não abre o Indique pelo link");
  await page.close();
}

// Materiais com cadeado. A leitura da tabela só traz para a loja o que foi liberado (regra do banco);
// o que tem cadeado chega pela função materiais_com_cadeado, só com título e data.
const daqui30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
const [a, m, d] = daqui30.split("-");
const texto = `Liberado em ${d}/${m}${a !== String(new Date().getFullYear()) ? `/${a}` : ""}`;
const liberado = { id: "m-ok", portal_id: "p-teste", titulo: "POP liberado", mes: null, entrega_id: null, conteudo: "Texto do POP liberado.", arquivo: null, liberado: true, liberado_em: null, created_at: "2026-10-01T12:00:00Z", updated_at: "2026-10-01T12:00:00Z" };
{
  // Sem nenhum material com cadeado (e sem a função no banco): como sempre.
  const { page } = await abrir({}, { tabelas: { consultoria_materiais: [liberado] } }, "/consultoria/materiais/");
  await page.getByText("POP liberado").waitFor();
  ok(await page.getByText("🔒", { exact: false }).locator("visible=true").filter({ hasText: "POP" }).count() === 0, "sem cadeado: a lista de materiais fica como sempre");
  await page.close();
}
{
  const rpc = { materiais_com_cadeado: () => [{ id: "m-cad", titulo: "POP com cadeado", mes: null, entrega_id: null, liberado_em: daqui30 }] };
  const { page } = await abrir({}, { tabelas: { consultoria_materiais: [liberado] }, rpc }, "/consultoria/materiais/");
  const cartao = page.getByRole("button", { name: /POP com cadeado/ });
  await cartao.waitFor();
  ok((await cartao.innerText()).includes("🔒") && (await cartao.innerText()).includes(texto), `material com data aparece com cadeado e "${texto}"`);
  ok(await page.locator('a[href*="m-cad"]').count() === 0, "o cadeado não leva ao conteúdo");
  await cartao.click();
  await page.getByText(`Este material ainda não abriu. ${texto}.`).waitFor();
  ok(/\/consultoria\/materiais\/?$/.test(new URL(page.url()).pathname), "ao clicar, avisa a data e continua na lista");
  ok(await page.locator('a[href*="m-ok"]').count() === 1, "o material liberado continua abrindo");
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + "/materiais-cadeado.png", fullPage: true });
  // Pelo link direto: só o cadeado.
  await page.goto(`${BASE}/consultoria/materiais/ver/?id=m-cad`);
  await page.getByRole("heading", { name: texto }).waitFor();
  ok(true, "pelo link direto, a loja vê só o cadeado com a data");
  // Rascunho sem data: nem pelo link.
  await page.goto(`${BASE}/consultoria/materiais/ver/?id=nao-existe`);
  await page.getByText("Material não encontrado.").waitFor();
  ok(true, "material sem data continua invisível para a loja");
  await page.close();
}
{
  // Equipe vendo como a loja: a tabela devolve tudo, e mesmo assim o conteúdo não abre.
  const rascunho = { ...liberado, id: "m-cad", titulo: "POP com cadeado", conteudo: "SEGREDO DO POP", liberado: false, liberado_em: daqui30 };
  const semData = { ...liberado, id: "m-rasc", titulo: "POP rascunho", conteudo: "SEGREDO DO RASCUNHO", liberado: false };
  const l = lojaBase({ tipo: "Consultoria" });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  await simular(page, { tabelas: { ...l.tabelas, consultoria_materiais: [liberado, rascunho, semData] }, rpc: { materiais_com_cadeado: () => [{ id: "m-cad", titulo: "POP com cadeado", mes: null, entrega_id: null, liberado_em: daqui30 }] } });
  await page.goto(`${BASE}/consultoria/materiais/ver/?id=m-cad`);
  await page.getByRole("heading", { name: texto }).waitFor();
  ok(!(await page.locator("main").innerText()).includes("SEGREDO"), "o texto do material com cadeado não aparece para a loja");
  await page.goto(`${BASE}/consultoria/materiais/ver/?id=m-rasc`);
  await page.getByText("Material não encontrado.").waitFor();
  ok(!(await page.locator("main").innerText()).includes("SEGREDO"), "o rascunho sem data não aparece para a loja");
  await page.goto(`${BASE}/consultoria/materiais/`);
  await page.getByRole("button", { name: /POP com cadeado/ }).waitFor();
  ok(await page.getByText("POP rascunho").count() === 0, "na lista, o rascunho sem data não aparece");
  await page.close();
}
{
  // Equipe: a tela do portal grava a ordem e os nomes; o editor do material grava a data do cadeado.
  const l = lojaBase({ tipo: "Consultoria" });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  const banco = await simular(page, { usuario: { id: "u-eq", email: "eq@teste.com" }, local: { "hub-portal": l.portal }, tabelas: {
    ...l.tabelas, perfis: [{ id: "u-eq", nome: "Equipe Teste", email: "eq@teste.com", papel: "equipe", portal_id: null, aprova: true, monta: true }],
    consultoria_materiais: [{ ...liberado, id: "m-rasc", titulo: "POP rascunho", liberado: false }],
  } });
  await page.goto(`${BASE}/equipe/portal/?id=${l.portal}`);
  await page.getByText("Menu próprio desta loja").click();
  await page.getByLabel("Ordem do menu").fill("/inicio\nconsultoria\n\n gestao ");
  await page.getByLabel("Nomes no menu").fill("gestao = Varejo\nlinha sem igual\n/gestao/canais=Site");
  await page.getByLabel("Ordem do menu").focus();
  await page.waitForFunction(() => true);
  await page.getByText("Menu próprio desta loja").focus();
  await page.waitForTimeout(800);
  const p = banco.tabelas.portais[0];
  ok(JSON.stringify(p.menu_ordem) === JSON.stringify(["/inicio", "consultoria", "gestao"]), "tela do portal grava menu_ordem como lista");
  ok(JSON.stringify(p.menu_rotulos) === JSON.stringify({ gestao: "Varejo", "/gestao/canais": "Site" }), "tela do portal grava menu_rotulos como objeto");
  await page.close();
}
await browser.close();
console.log("menu-por-portal: tudo certo");
