// Pós-venda do dia: lê a lista de vendas de ontem que a loja anexou no caixa e deixa, na área de cada vendedora,
// as clientes que compraram com ela, com a mensagem pronta (carimbo de conexão: sem oferecer nada, pedindo para salvar o número).
// Depois completa as 10 clientes de resgate de cada vendedora (chamar_resgate_do_dia).
// Pelo agendamento (chave x-aviso): { } = todas as lojas com vendedoras no link; { portal_id, dia } = uma loja e um dia.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHAVE = Deno.env.get("ANTHROPIC_API_KEY");
const MODELO = "claude-opus-5-5";
const BALDE = "relatorios";
const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { "Content-Type": "application/json" } });
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const soma = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const pastaDaLoja = (loja: string) => (loja.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "geral");
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const primeiro = (s: string) => sem(s).split(" ")[0] ?? "";
const cap = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());

type Venda = { cliente: string; vendedora: string; produtos: string };
const ESQUEMA = { type: "object", additionalProperties: false, required: ["vendas"], properties: { vendas: { type: "array", items: {
  type: "object", additionalProperties: false, required: ["cliente", "vendedora", "produtos"],
  properties: { cliente: { type: "string" }, vendedora: { type: "string" }, produtos: { type: "string" } } } } } };
const INSTRUCOES = `Você lê os relatórios de vendas de UM dia de uma loja de moda (lista de vendas do sistema, cupons, planilhas).
Liste cada venda que tem o NOME da cliente: o nome como está escrito, a vendedora que fez a venda e, em poucas palavras, o que levou
(ex.: "vestido midi e sandália"). Junte as vendas da mesma cliente no mesmo dia. Ignore vendas sem nome de cliente (consumidor final, cliente padrão, sem nome)
e vendas pagas só com vale-troca. Não invente nada que não esteja no arquivo. Se não houver nenhuma venda com nome, devolva a lista vazia.`;

async function arquivos(admin: SupabaseClient, portal: string, loja: string, dia: string) {
  const base = `${portal}/gestao/${pastaDaLoja(loja)}/${dia}`;
  const { data } = await admin.storage.from(BALDE).list(base);
  const blocos: unknown[] = [];
  for (const f of (data ?? []).filter((x) => x.id && x.name.startsWith("caixa_"))) {
    if (Number(f.metadata?.size ?? 0) > 15 * 1024 * 1024) continue;
    const { data: b } = await admin.storage.from(BALDE).download(`${base}/${f.name}`);
    if (!b) continue;
    const nome = f.name.toLowerCase(), tipo = b.type || "";
    const buf = new Uint8Array(await b.arrayBuffer());
    const b64 = () => { let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return btoa(s); };
    if (tipo === "application/pdf" || nome.endsWith(".pdf")) blocos.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64() } });
    else if (/^image\/(png|jpe?g|webp|gif)$/.test(tipo) || /\.(png|jpe?g|webp|gif)$/.test(nome)) {
      const mt = tipo.startsWith("image/") ? tipo.replace("image/jpg", "image/jpeg") : `image/${nome.endsWith(".png") ? "png" : nome.endsWith(".webp") ? "webp" : "jpeg"}`;
      blocos.push({ type: "image", source: { type: "base64", media_type: mt, data: b64() } });
    } else if (/\.(xlsx|xls|ods|csv)$/.test(nome)) {
      const wb = XLSX.read(buf, { type: "array" });
      blocos.push({ type: "text", text: `Planilha ${f.name}:\n${wb.SheetNames.map((s) => `# ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`).join("\n\n").slice(0, 60000)}` });
    }
  }
  return blocos;
}

async function lerVendas(blocos: unknown[], dia: string): Promise<Venda[]> {
  if (!CHAVE || !blocos.length) return [];
  const client = new Anthropic({ apiKey: CHAVE });
  const r = await client.beta.messages.stream({
    model: MODELO, max_tokens: 4000, betas: ["server-side-fallback-2026-07-01"],
    // @ts-ignore: fallbacks "default" ainda pode não estar no tipo do SDK
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
    system: INSTRUCOES,
    messages: [{ role: "user", content: [...blocos, { type: "text", text: `Dia das vendas: ${dia}. Responda só com o JSON pedido.` }] as never }],
  }).finalMessage();
  const b = r.content.find((x) => x.type === "text");
  return b && b.type === "text" ? ((JSON.parse(b.text) as { vendas: Venda[] }).vendas ?? []) : [];
}

/** Uma loja num dia: cria o pós-venda de cada cliente na área da vendedora (sem repetir). */
async function posVenda(admin: SupabaseClient, portal: { id: string; loja: string; lojas: string[] | null }, dia: string) {
  // Portal de uma loja só guarda os arquivos na pasta "geral" (como o caixa-arquivos).
  const lojas = (portal.lojas ?? []).length > 1 ? portal.lojas! : [""];
  const { data: equipe } = await admin.from("loja_equipe").select("id, nome, loja, funcao").eq("portal_id", portal.id).eq("ativo", true).not("vez_token", "is", null);
  if (!(equipe ?? []).length) return 0;
  let feitos = 0;
  for (const loja of lojas) {
    const vendas = await lerVendas(await arquivos(admin, portal.id, loja, dia), dia);
    for (const v of vendas) {
      if (!v.cliente?.trim()) continue;
      const doTime = (equipe ?? []).filter((e) => !loja || !e.loja || e.loja === loja);
      const pessoa = doTime.find((e) => primeiro(e.nome) === primeiro(v.vendedora)) ?? (equipe ?? []).find((e) => primeiro(e.nome) === primeiro(v.vendedora));
      if (!pessoa) continue;
      // O WhatsApp vem do cadastro de clientes (nome igual; ou nome e sobrenome iguais).
      const { data: cads } = await admin.from("loja_clientes").select("nome, whatsapp").eq("portal_id", portal.id).ilike("nome", `${v.cliente.trim().split(/\s+/)[0]}%`).limit(50);
      const alvo = sem(v.cliente);
      const cad = (cads ?? []).find((c) => sem(c.nome) === alvo) ?? (cads ?? []).find((c) => { const a = sem(c.nome).split(" "), b = alvo.split(" "); return a[0] === b[0] && a.length > 1 && b.length > 1 && a[1] === b[1]; });
      const nome = cap(v.cliente.trim().split(/\s+/).slice(0, 2).join(" "));
      const { data: ja } = await admin.from("loja_chamar").select("id").eq("pessoa_id", pessoa.id).eq("tipo", "pos_venda").eq("dia", soma(dia, 1)).ilike("nome", nome).limit(1);
      if ((ja ?? []).length) continue;
      const marca = loja || portal.loja;
      const mensagem = `Oi, ${nome.split(" ")[0]}! Aqui é a ${pessoa.nome.split(" ")[0]}, da ${marca}. Foi um prazer te receber ontem. Salva o meu número que eu te aviso das novidades e te ajudo no que precisar :)`;
      const { error } = await admin.from("loja_chamar").insert({ portal_id: portal.id, pessoa_id: pessoa.id, nome, whatsapp: cad?.whatsapp ?? "", resumo: `Comprou ontem (${dia.slice(8)}/${dia.slice(5, 7)})`, comprou: v.produtos ?? "", mensagem, ordem: feitos, tipo: "pos_venda", dia: soma(dia, 1) });
      if (error) { console.error("pós-venda", portal.id, nome, error.message); continue; }
      feitos++;
    }
  }
  return feitos;
}

async function rodada(admin: SupabaseClient, portalId?: string, dia?: string) {
  const d = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : soma(hoje(), -1);
  let q = admin.from("portais").select("id, loja, lojas").eq("ativo", true);
  if (portalId) q = q.eq("id", portalId);
  const { data: portais } = await q;
  let total = 0;
  for (const p of portais ?? []) {
    try { total += await posVenda(admin, p as { id: string; loja: string; lojas: string[] | null }, d); } catch (e) { console.error(p.id, (e as Error).message); }
    await admin.rpc("chamar_resgate_do_dia", { p_portal: p.id });
  }
  return total;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);
  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: cfg } = await admin.rpc("push_config");
  if (!cfg?.aviso_chave || req.headers.get("x-aviso") !== cfg.aviso_chave) return json({ erro: "Só o agendamento roda o pós-venda." }, 403);
  const corpo = await req.json().catch(() => ({}));
  // @ts-ignore: EdgeRuntime existe nas Edge Functions do Supabase
  EdgeRuntime.waitUntil(rodada(admin, corpo?.portal_id, corpo?.dia).then((n) => console.log("pós-venda criados", n)).catch((e) => console.error(e)));
  return json({ ok: true }, 202);
});
