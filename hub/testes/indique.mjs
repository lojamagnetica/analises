// Teste de tela: Indique uma loja (/indique) e o selo "indicada por" nos leads. Rode com o `next dev` ligado: node testes/indique.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const l = lojaBase();

// Indicações em memória, com a mesma regra das funções do banco
const indicacoes = [{ id: "i1", nome: "Bia Exemplo", loja: "Loja Exemplo", whatsapp: "81988887777", instagram: null, situacao: "Em conversa", criada_em: "2026-10-01T12:00:00Z" }];
const rpc = {
  indicacoes_da_loja: () => indicacoes,
  indicar_loja: (a) => { indicacoes.unshift({ id: "i" + (indicacoes.length + 1), nome: a.p_nome, loja: a.p_loja, whatsapp: a.p_whatsapp, instagram: a.p_instagram, situacao: "Recebida", criada_em: new Date().toISOString() }); return "x"; },
  editar_indicacao: (a) => { Object.assign(indicacoes.find((i) => i.id === a.p_id), { nome: a.p_nome }); },
  retirar_indicacao: (a) => { indicacoes.splice(indicacoes.findIndex((i) => i.id === a.p_id), 1); },
};

{
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  page.on("dialog", (d) => d.accept());
  const banco = await simular(page, { tabelas: { ...l.tabelas, hub_config: [] }, rpc });
  await page.goto(`${BASE}/indique/`);
  await page.getByRole("heading", { name: "Quem você quer indicar?" }).waitFor();
  ok(await page.getByText("Prêmio da indicação").count() === 0, "sem prêmio cadastrado, a página funciona sem ele");
  ok(await page.locator(".nav-item", { hasText: "Indique uma loja" }).count() === 1, "item no fim do menu");
  ok(await page.getByText("Em conversa").count() === 1, "mostra a situação simplificada");
  await page.getByLabel("Nome *").fill("Carla Teste");
  ok((await page.locator("pre").innerText()).includes("Oi, Carla!"), "mensagem pronta usa o nome");
  await page.getByLabel("WhatsApp com DDD *").fill("81 97777-6666");
  await page.getByRole("button", { name: "Enviar indicação" }).click();
  ok(banco.chamadas.every((c) => c.rpc !== "indicar_loja"), "não envia sem a caixa ela sabe que vou indicar");
  await page.getByLabel("Ela sabe que vou indicar").check();
  await page.getByRole("button", { name: "Enviar indicação" }).click();
  await page.getByText("Indicação enviada!").waitFor();
  ok(banco.chamadas.some((c) => c.rpc === "indicar_loja" && c.args.p_nome === "Carla Teste"), "envia a indicação");
  ok(await page.getByText("Recebida").count() === 1, "indicação nova aparece como Recebida");
  await page.getByRole("button", { name: "Editar" }).click();
  await page.locator('form input[name="nome"]').last().fill("Carla Nova");
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.getByText("Carla Nova").waitFor();
  ok(true, "edita a indicação");
  await page.getByRole("button", { name: "Retirar" }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Carla Nova"));
  ok(true, "retira a indicação com confirmação");
  await page.screenshot({ path: process.env.SHOTS + "/indique.png", fullPage: true });
  await page.close();
}
{
  // Com prêmio cadastrado
  const page = await browser.newPage();
  await simular(page, { tabelas: { ...lojaBase().tabelas, hub_config: [{ chave: "indique_premio", valor: { texto: "Um presente da equipe." } }] }, rpc });
  await page.goto(`${BASE}/indique/`);
  await page.getByText("Um presente da equipe.").waitFor();
  ok(true, "mostra o prêmio quando preenchido");
  await page.close();
}
{
  // Equipe: selo nos leads
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("erro na página:", e.message));
  await simular(page, { usuario: { id: "u-eq", email: "eq@teste.com" }, tabelas: {
    perfis: [{ id: "u-eq", nome: "Equipe Teste", email: "eq@teste.com", papel: "equipe", portal_id: null }],
    portais: lojaBase().tabelas.portais,
    leads: [{ id: "L1", nome: "Carla", loja: null, whatsapp: "81977776666", origem: "Indicação", etapa: "Novo", indicado_por: l.portal, created_at: new Date().toISOString(), etapa_em: new Date().toISOString() }],
  } });
  await page.goto(`${BASE}/equipe/comercial/leads/`);
  await page.getByText("indicada por Loja Teste").waitFor();
  ok(true, "leads mostram indicada por <loja>");
  await page.close();
}
await browser.close();
console.log("indique: tudo certo");
