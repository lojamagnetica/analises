// Teste de tela: modelo Lookbook editorial do Montador (abertura, fichas do look numeradas e enquete).
// Rode com o `next dev` ligado: node testes/montador-lookbook.mjs [porta] [pasta-com-fotos]
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { conteudoLiberado, lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const FOTOS = process.argv[3];
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const l = lojaBase();
const identidade = { cores: { fundo: "#EDE6E0", apoio: "#E2D8CF", destaque: "#B0925A", texto: "#2B2B2B" }, rodape: "LOOKS DO MOMENTO" };
const ficha = (n) => ({ tipo: "ficha", kic: "NOME DA LOJA · MARCA", tit: "Cinto corset | Broches removíveis", pre: `Look ${n}: o jeans ganha destaque com o cinto que marca a cintura. | Os broches dão charme e deixam a produção única.` });
const slides = [
  { tipo: "abertura", kic: "Looks do momento", tit: "O jeans é o momento!", pre: "Três propostas, três personalidades e uma peça protagonista." },
  ficha(1), ficha(2), ficha(3),
  { tipo: "enquete", kic: "Looks do momento", tit: "Qual é o seu look do momento?", pre: "*Romântico, sofisticado ou descomplicado:* comenta 1, 2 ou 3." },
];
const tabelas = {
  ...l.tabelas, ...conteudoLiberado(l.portal),
  loja_montadores: [{ id: "m1", portal_id: l.portal, colecao: "TESTE", ativo: true, liberado: true, identidade, created_at: "2026-11-21T00:00:00Z" }],
  modelos_mes: [{ id: "mm1", mes: "2026-11", segmento: "Multimarca", ordem: 1, nome: "Lookbook editorial", descricao: "d", referencia_url: null, referencia_perfil: null, referencia_data: null, curtidas: null, comentarios: null, slides, liberado: true }],
};

const page = await browser.newPage();
page.on("pageerror", (e) => console.log("erro na página:", e.message));
await simular(page, { tabelas });
await page.goto(`${BASE}/conteudo/montador/`);
await page.getByRole("button", { name: "Usar no montador" }).click();
await page.waitForTimeout(800);
const imagem = () => page.locator('canvas[aria-label="Imagem montada"]').evaluate((c) => c.toDataURL());

const vistas = [];
for (let i = 1; i <= 5; i++) {
  await page.getByRole("button", { name: `Slide ${i}`, exact: true }).click();
  await page.waitForTimeout(250);
  if (FOTOS) {
    const inputs = page.locator('#montar input[type="file"]');
    if (i === 1) await inputs.nth(0).setInputFiles(`${FOTOS}/capa.jpg`);
    if (i >= 2 && i <= 4) { await inputs.nth(0).setInputFiles(`${FOTOS}/look.jpg`); await inputs.nth(1).setInputFiles(`${FOTOS}/peca.jpg`); }
    await page.waitForTimeout(500);
  }
  const url = await imagem();
  vistas.push(url);
  if (process.env.SHOTS) writeFileSync(`${process.env.SHOTS}/lookbook-${i}.png`, Buffer.from(url.split(",")[1], "base64"));
}
ok(new Set(vistas).size === 5, "cada slide do lookbook desenha uma imagem diferente (as fichas trazem números diferentes)");
await page.getByRole("button", { name: "Ficha do look", exact: true }).click();
await page.waitForTimeout(250);
ok(await page.getByText("Foto 2 · a peça sozinha").count() === 1, "o formato avulso Ficha do look pede a foto da peça");
await browser.close();
console.log("lookbook ok");
