// Teste de tela: Montador de carrossel (formatos e modelos do mês mudam a imagem). Rode com o `next dev` ligado: node testes/montador.mjs [porta]
import { createRequire } from "node:module";
import { conteudoLiberado, lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const l = lojaBase();
const identidade = {
  cores: { fundo: "#F7F2EA", apoio: "#E8DCCB", destaque: "#A8743F", texto: "#3A2A20" },
  linha_de_cima: { dupla: "COLEÇÃO · SEPAREI PRA VOCÊ", outros: "COLEÇÃO · O LOOK", capa: "COLEÇÃO · FIM DE ANO" },
  frase: "Para cada encontro, um look", rodape: "RODAPÉ DA COLEÇÃO", chamada: "Responde quero", precos_exemplo: "Vestido R$ 100",
  semanas: [{ rotulo: "Semana 1", titulo: "Para a semana 1" }],
};
const slides = [
  { tipo: "capa", kic: "CAPA", tit: "Título, da capa", pre: "RODAPÉ" },
  { tipo: "frase", kic: "VIRADA", tit: "Um slide só de texto", pre: "Explicação" },
  { tipo: "etiqueta", kic: "NÃO PASSOU NA CURADORIA!", tit: "Um mito", pre: "A resposta" },
  { tipo: "foto", kic: "01 · Para a confra", tit: "", pre: "Vestido R$ 189" },
  { tipo: "cena", kic: "Encontro 1 · A confra", tit: "Com bolsa", pre: "" },
  { tipo: "preco", kic: "Para a amiga", tit: "R$ 88", pre: "Lenço" },
];
const tabelas = {
  ...l.tabelas, ...conteudoLiberado(l.portal),
  loja_montadores: [{ id: "m1", portal_id: l.portal, colecao: "TESTE", ativo: true, liberado: true, identidade, created_at: "2026-11-21T00:00:00Z" }],
  modelos_mes: [{ id: "mm1", mes: "2026-11", segmento: "Multimarca feminina", ordem: 1, nome: "Modelo de teste", descricao: "d", referencia_url: null, referencia_perfil: null, referencia_data: null, curtidas: null, comentarios: null, slides, liberado: true }],
};

const page = await browser.newPage();
page.on("pageerror", (e) => console.log("erro na página:", e.message));
await simular(page, { tabelas });
await page.goto(`${BASE}/conteudo/montador/`);
await page.getByRole("button", { name: "Usar no montador" }).waitFor();
await page.waitForTimeout(800);
const imagem = () => page.locator("canvas").evaluate((c) => c.toDataURL());
const tamanho = () => page.locator("canvas").evaluate((c) => `${c.width}x${c.height}`);

const vistas = new Set();
for (const f of ["Separei pra você", "Look do encontro", "Capa de carrossel", "Stories"]) {
  await page.getByRole("button", { name: f, exact: true }).click();
  await page.waitForTimeout(250);
  vistas.add(await imagem());
  if (f === "Stories") ok(await tamanho() === "1080x1920", "Stories em 1080x1920");
}
ok(vistas.size === 4, "cada formato desenha uma imagem diferente");
await page.getByRole("button", { name: "Separei pra você", exact: true }).click();
await page.waitForTimeout(250);
ok(await tamanho() === "1080x1350", "volta para 1080x1350");

await page.getByRole("button", { name: "Usar no montador" }).click();
await page.waitForTimeout(300);
const dosSlides = new Set();
for (const n of ["1", "2", "3", "4", "5", "6"]) {
  await page.locator("#montar .chips button", { hasText: new RegExp(`^${n}`) }).first().click();
  await page.waitForTimeout(250);
  dosSlides.add(await imagem());
}
ok(dosSlides.size === 6, "cada slide do modelo desenha uma imagem diferente");
await page.getByRole("button", { name: "Look do encontro", exact: true }).click();
await page.waitForTimeout(250);
ok(!dosSlides.has(await imagem()), "sair do modelo para um formato muda a imagem");
await page.screenshot({ path: (process.env.SHOTS ?? "/tmp") + "/montador.png", fullPage: true });
await browser.close();
console.log("montador ok");
