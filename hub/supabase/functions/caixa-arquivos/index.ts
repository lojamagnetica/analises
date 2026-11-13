// O agente dos arquivos do caixa: lê o que a loja anexou no dia (PDF, foto ou planilha do sistema) e tira os números
// do fechamento: faturamento, vendas, peças, formas de pagamento e venda por vendedora.
// - Pela loja (logada, com acesso ao caixa): { portal_id, dia, loja } → devolve o que achou, para o formulário preencher.
// - Pelo agendamento (chave x-aviso): { rodada: true } → últimos 7 dias; cria o dia que só tem arquivo e completa
//   só o que está faltando no dia lançado (nunca troca um número que a loja digitou).
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHAVE = Deno.env.get("ANTHROPIC_API_KEY");
const MODELO = "claude-opus-5-5";
const BALDE = "relatorios";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-aviso",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const soma = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
/** O mesmo nome de pasta do Hub (lib/rotina.ts pastaDaLoja). */
const pastaDaLoja = (loja: string) => (loja.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "geral");
const FORMAS = ["pix", "credito", "debito", "dinheiro", "crediario"] as const;

export type Lido = {
  achou: boolean; faturamento: number | null; vendas: number | null; pecas: number | null;
  pagamentos: Record<string, number> | null; vendedoras: { nome: string; faturamento: number; vendas: number; pecas: number }[] | null; observacao: string;
};
const ESQUEMA = {
  type: "object", additionalProperties: false,
  required: ["achou", "faturamento", "vendas", "pecas", "pagamentos", "vendedoras", "observacao"],
  properties: {
    achou: { type: "boolean" },
    faturamento: { type: ["number", "null"] }, vendas: { type: ["integer", "null"] }, pecas: { type: ["integer", "null"] },
    pagamentos: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: [...FORMAS], properties: Object.fromEntries(FORMAS.map((f) => [f, { type: "number" }])) }] },
    vendedoras: { anyOf: [{ type: "null" }, { type: "array", items: { type: "object", additionalProperties: false, required: ["nome", "faturamento", "vendas", "pecas"],
      properties: { nome: { type: "string" }, faturamento: { type: "number" }, vendas: { type: "integer" }, pecas: { type: "integer" } } } }] },
    observacao: { type: "string" },
  },
};
const INSTRUCOES = `Você lê os arquivos do fechamento de caixa de UM dia de uma loja de moda (relatórios do sistema, fotos de cupom, planilhas).
Tire só o que está escrito, sem estimar: faturamento do dia (R$), número de vendas (cupons/atendimentos), peças vendidas,
quanto entrou em cada forma de pagamento (pix, credito, debito, dinheiro, crediario; crediário inclui promissória/fiado; 0 quando não houver)
e, se o arquivo mostrar, a venda de cada vendedora (nome, faturamento, vendas, peças).
Use null no que o arquivo não mostra. Se o arquivo não for do fechamento deste dia, responda achou=false.
Em observacao, uma frase curta em português dizendo de onde tirou os números ou o que não deu para ler.`;

/** Os arquivos do caixa daquele dia, prontos para o agente (PDF e foto como estão; planilha vira texto). */
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
      const mt = tipo.startsWith("image/") ? tipo.replace("image/jpg", "image/jpeg") : `image/${nome.endsWith(".png") ? "png" : nome.endsWith(".webp") ? "webp" : nome.endsWith(".gif") ? "gif" : "jpeg"}`;
      blocos.push({ type: "image", source: { type: "base64", media_type: mt, data: b64() } });
    } else if (/\.(xlsx|xls|ods|csv)$/.test(nome)) {
      const wb = XLSX.read(buf, { type: "array" });
      const texto = wb.SheetNames.map((s) => `# ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`).join("\n\n").slice(0, 60000);
      blocos.push({ type: "text", text: `Planilha ${f.name}:\n${texto}` });
    }
  }
  return blocos;
}

async function ler(admin: SupabaseClient, portal: string, loja: string, dia: string): Promise<Lido | null> {
  if (!CHAVE) return null;
  const blocos = await arquivos(admin, portal, loja, dia);
  if (!blocos.length) return null;
  const client = new Anthropic({ apiKey: CHAVE });
  const r = await client.beta.messages.stream({
    model: MODELO, max_tokens: 3000,
    betas: ["server-side-fallback-2026-07-01"],
    // @ts-ignore: fallbacks "default" ainda pode não estar no tipo do SDK
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
    system: INSTRUCOES,
    messages: [{ role: "user", content: [...blocos, { type: "text", text: `Dia do fechamento: ${dia}${loja ? ` · loja ${loja}` : ""}. Responda só com o JSON pedido.` }] as never }],
  }).finalMessage();
  const bloco = r.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") return null;
  return JSON.parse(bloco.text) as Lido;
}

const n = (v: unknown) => Number(v) || 0;
/** Junta o que o arquivo trouxe com o que já está lançado: só preenche o que falta. */
function completar(atual: Record<string, unknown> | null, lido: Lido, equipe: { id: string; nome: string }[]) {
  const semAc = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().split(/\s+/)[0];
  const fat = n(atual?.faturamento) || n(lido.faturamento);
  const pagAtual = (atual?.pagamentos ?? null) as Record<string, number> | null;
  const pagLido = lido.pagamentos ? Object.fromEntries(Object.entries(lido.pagamentos).filter(([, v]) => n(v) > 0)) : null;
  const vendAtual = (atual?.vendedoras ?? null) as unknown[] | null;
  const vendLido = lido.vendedoras?.length ? lido.vendedoras.map((v) => {
    const p = equipe.find((e) => semAc(e.nome) === semAc(v.nome));
    return { pessoa_id: p?.id ?? null, nome: p ? p.nome : v.nome, faturamento: n(v.faturamento), vendas: n(v.vendas), pecas: n(v.pecas) };
  }) : null;
  return {
    faturamento: fat,
    vendas: n(atual?.vendas) || n(lido.vendas),
    pecas: n(atual?.pecas) || n(lido.pecas),
    pagamentos: pagAtual && Object.keys(pagAtual).length ? pagAtual : (pagLido && Object.keys(pagLido).length ? pagLido : null),
    vendedoras: vendAtual?.length ? vendAtual : vendLido,
  };
}

async function rodada(admin: SupabaseClient) {
  const de = soma(hoje(), -7);
  const { data: portais } = await admin.from("portais").select("id, lojas").eq("ativo", true).neq("tipo", "Curso");
  let feitos = 0;
  for (const p of portais ?? []) {
    const lojas: string[] = (p.lojas ?? []).length > 1 ? p.lojas : [""];
    const { data: equipe } = await admin.from("loja_equipe").select("id, nome").eq("portal_id", p.id).eq("ativo", true);
    for (const loja of lojas) {
      const { data: dias } = await admin.storage.from(BALDE).list(`${p.id}/gestao/${pastaDaLoja(loja)}`);
      for (const d of (dias ?? []).map((x) => x.name).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x) && x >= de && x <= hoje())) {
        let q = admin.from("loja_caixa").select("*").eq("portal_id", p.id).eq("dia", d);
        q = loja ? q.eq("loja", loja) : q.is("loja", null);
        const { data: atual } = await q.maybeSingle();
        if (atual?.justificativa) continue;
        if (atual) {
          const { data: ruim } = await admin.rpc("caixa_id_com_problema", { p_id: atual.id });
          if (!ruim) continue;
        }
        try {
          const lido = await ler(admin, p.id, loja, d);
          if (!lido?.achou) continue;
          const novo = completar(atual, lido, equipe ?? []);
          const obs = [atual?.obs, `Completado pelo agente com os arquivos do caixa. ${lido.observacao}`].filter(Boolean).join(" ").slice(0, 500);
          if (atual) await admin.from("loja_caixa").update({ ...novo, obs }).eq("id", atual.id);
          else await admin.from("loja_caixa").insert({ portal_id: p.id, loja: loja || null, dia: d, ...novo, obs });
          feitos++;
        } catch (e) { console.error(p.id, d, (e as Error).message); }
      }
    }
  }
  return feitos;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);
  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  const corpo = await req.json().catch(() => ({}));
  const { data: cfg } = await admin.rpc("push_config");
  const peloAgendamento = !!cfg?.aviso_chave && req.headers.get("x-aviso") === cfg.aviso_chave;

  if (corpo?.rodada) {
    if (!peloAgendamento) return json({ erro: "Só o agendamento roda a rodada." }, 403);
    // @ts-ignore: EdgeRuntime existe nas Edge Functions do Supabase
    EdgeRuntime.waitUntil(rodada(admin).then((n) => console.log("dias completados", n)).catch((e) => console.error(e)));
    return json({ ok: true }, 202);
  }
  const portal = String(corpo?.portal_id ?? ""), dia = String(corpo?.dia ?? ""), loja = String(corpo?.loja ?? "");
  if (!portal || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return json({ erro: "Informe portal_id e dia." }, 400);
  const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: pode } = await usuario.rpc("pode_caixa", { p: portal });
  if (pode !== true) return json({ erro: "Sem acesso ao caixa desta loja." }, 403);
  try {
    const lido = await ler(admin, portal, loja, dia);
    return json({ lido });
  } catch (e) { return json({ erro: (e as Error).message }, 500); }
});
