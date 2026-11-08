// Teste de tela: com a loja em foco, a equipe mostra só as pessoas daquela loja (quem não tem loja aparece nas duas).
// Rode com o site servido: node testes/loja-foco-pessoas.mjs [porta]
import { createRequire } from "node:module";
import { lojaBase, simular } from "./simulado.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = `http://localhost:${process.argv[2] ?? 3100}/analises/portal`;
const ok = (c, msg) => { if (!c) throw new Error("FALHOU: " + msg); console.log("✓", msg); };
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("erro na página:", e.message));
const l = lojaBase({ tipo: "Consultoria" });
l.tabelas.portais[0].lojas = ["Loja Um", "Loja Dois"];
const pessoa = (id, nome, loja) => ({ id, portal_id: l.portal, nome, funcao: "Vendedora", ativo: true, loja, respostas: null, perfil: null });
await simular(page, { tabelas: { ...l.tabelas,
  loja_equipe: [pessoa("a", "Aline da Um", "Loja Um"), pessoa("b", "Bruna da Dois", "Loja Dois"), pessoa("c", "Carla Sócia", null)],
  loja_feedbacks: [], loja_pdi: [], loja_reunioes: [],
  metodo: [{ chave: "pessoas", dados: { perguntas: [], perfis: {}, motores: {}, diagnostico: {}, estagios: {}, habilidades: [], modelos: {}, textos: {}, ensinar_passos: [], rotina: [] } }],
}, local: { [`loja-foco:${l.portal}`]: "Loja Dois" } });
await page.goto(`${BASE}/pessoas/`);
await page.getByText("Bruna da Dois").first().waitFor();
ok(await page.getByText("Aline da Um").count() === 0, "a loja em foco não mostra a colaboradora da outra loja");
ok(await page.getByText("Carla Sócia").count() >= 1, "quem não tem loja aparece nas duas");
await browser.close();
