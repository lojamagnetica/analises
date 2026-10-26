// Teste de tela: Link da Bio (editor, página pública e cliques em Resultados). Rode com o `next dev` ligado: node testes/bio.mjs [porta]
import { createRequire } from "node:module";
import { conteudoLiberado, lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const browser = await chromium.launch();
const l = lojaBase();
const tabelas = {
  ...l.tabelas, ...conteudoLiberado(l.portal), loja_posts: [], bio_paginas: [], bio_cliques: [],
  loja_acoes: [{ id: "la1", portal_id: l.portal, acao_id: "a1", concluida: false }],
  acoes: [{ id: "a1", titulo: "Ação Teste", resumo: "Resumo da ação", oferta: "Leve 3, pague 2", inicio: "2026-01-01", fim: "2030-12-31", venda_inicio: hoje, data_acao: hoje, publicada: true }],
};
// As funções públicas do banco, com a mesma regra (só a página publicada)
const rpc = {
  bio_publica: ({ p_slug }, b) => {
    const p = b.tabelas.bio_paginas.find((x) => x.slug === p_slug && x.publicada);
    return p ? { slug: p.slug, perfil: p.perfil, blocos: p.blocos, aparencia: p.aparencia, acao: { titulo: "Ação Teste", resumo: "Resumo da ação", oferta: "Leve 3, pague 2", fim: "2030-12-31" } } : null;
  },
  bio_clique: ({ p_slug, p_bloco }, b) => {
    const p = b.tabelas.bio_paginas.find((x) => x.slug === p_slug && x.publicada);
    if (!p) return null;
    const c = b.tabelas.bio_cliques.find((x) => x.pagina_id === p.id && x.bloco === p_bloco);
    if (c) c.total++; else b.tabelas.bio_cliques.push({ pagina_id: p.id, bloco: p_bloco, total: 1 });
    return null;
  },
};

const page = await browser.newPage();
page.on("pageerror", (e) => console.log("erro na página:", e.message));
page.on("dialog", (d) => d.accept());
const banco = await simular(page, { tabelas, rpc });
await page.goto(`${BASE}/conteudo/bio/`);
await page.getByRole("heading", { name: "Perfil" }).waitFor();
ok(await page.locator(".bio-celular").getByText("Ação Teste").count() === 1, "prévia puxa a ação ativa de Vendas › Ações do Mês");
ok(await page.locator(".bio-celular a", { hasText: "Fale com a gente no WhatsApp" }).count() === 1, "WhatsApp como bloco principal");
await page.getByLabel("Nome").fill("Loja Teste Bio");
await page.getByLabel("Uma frase sobre a loja").fill("Moda boa perto de você.");
await page.getByLabel("Endereço da página").fill("loja-teste");
await page.getByLabel("Tipo de bloco").selectOption("link");
await page.getByRole("button", { name: "+ Adicionar bloco" }).click();
await page.getByLabel("Link", { exact: true }).last().fill("loja.exemplo.com");
await page.getByLabel("Tipo de bloco").selectOption("faq");
await page.getByRole("button", { name: "+ Adicionar bloco" }).click();
ok(await page.locator(".bio-celular details").count() === 1, "adiciona pergunta frequente");
await page.getByRole("button", { name: "Excluir" }).last().click();
ok(await page.locator(".bio-celular details").count() === 0, "exclui bloco com confirmação");
await page.getByRole("button", { name: "Subir bloco" }).last().click();
ok((await page.locator(".bio-celular").innerText()).indexOf("Meu link") < (await page.locator(".bio-celular").innerText()).indexOf("Como chegar"), "ordena os blocos");
await page.getByRole("tab", { name: "Aparência" }).click();
await page.getByRole("button", { name: /Noite/ }).click();
await page.getByRole("button", { name: "Reto" }).click();
const fundo = await page.locator(".bio-celular > div").evaluate((e) => getComputedStyle(e).backgroundColor);
ok(fundo === "rgb(20, 18, 16)", "prévia muda com o modelo");
await page.getByRole("button", { name: "Publicar", exact: true }).click();
await page.getByText("Página publicada!").waitFor();
const pg = banco.tabelas.bio_paginas[0];
ok(pg && pg.publicada && pg.slug === "loja-teste" && pg.aparencia.modelo === "noite" && pg.aparencia.botao === "reto", "publica a página");
ok(await page.getByRole("button", { name: "Copiar link" }).count() === 1, "botão Copiar link");
await page.screenshot({ path: process.env.SHOTS + "/bio-editor.png", fullPage: true });

// Página pública no celular, sem o layout do Hub
const cel = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
cel.on("pageerror", (e) => console.log("erro na página pública:", e.message));
const pub = await simular(cel, { tabelas: banco.tabelas, rpc });
await cel.goto(`${BASE}/bio/?l=loja-teste`);
await cel.getByText("Loja Teste Bio").waitFor();
ok(await cel.locator(".side").count() === 0, "página pública fora do layout logado");
ok(await cel.getByText("Leve 3, pague 2").count() === 1, "mostra a ação do mês");
const zap = await cel.locator("a", { hasText: "Fale com a gente no WhatsApp" }).getAttribute("href");
ok(zap.startsWith("https://wa.me/5581999990000?text="), "WhatsApp com mensagem pronta");
ok((await cel.locator("a", { hasText: "Meu link" }).getAttribute("href")) === "https://loja.exemplo.com/", "link livre vira https");
await cel.screenshot({ path: process.env.SHOTS + "/bio-publica.png", fullPage: true });
const [popup] = await Promise.all([cel.waitForEvent("popup"), cel.locator("a", { hasText: "Fale com a gente no WhatsApp" }).click()]);
await popup.close().catch(() => {});
await cel.waitForTimeout(500);
ok(pub.chamadas.some((c) => c.rpc === "bio_clique"), "conta o clique");
await cel.goto(`${BASE}/bio/?l=nao-existe`);
await cel.getByText("Página não encontrada").waitFor();
ok(true, "endereço inexistente avisa");

// Resultados mostra o total
await page.goto(`${BASE}/conteudo/resultados/`);
await page.getByText("Cliques no Link da Bio").waitFor();
ok(/1\s*cliques no total/.test(await page.locator(".card", { hasText: "Cliques no Link da Bio" }).innerText()), "total de cliques em Resultados");
await browser.close();
console.log("bio: tudo certo");
