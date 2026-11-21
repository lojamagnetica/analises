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
Regra geral (quando a loja não tiver regra própria para o item): voucher, vale-troca, saldo de troca e crédito de devolução NÃO são recebimento: não entram em nenhuma forma de pagamento
e saem do faturamento (se o relatório só mostrar o total com o voucher dentro, desconte o voucher e diga isso em observacao).
Planilha de vendas peça por peça (ex.: "vendas com repasse" do TicTag, uma linha por peça com o número da venda):
vendas = quantos números de venda diferentes, peças = quantas linhas, faturamento = soma dos valores menos o que foi pago com voucher
(numa venda paga com voucher e outra forma, o relatório de formas de pagamento mostra quanto foi voucher; sem ele, use null nas formas e explique).
Nessas planilhas a data pode vir com dia e mês trocados (10/11 aparece como 11/10): se só bater trocando, é deste dia.
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

/** As regras do caixa que a loja respondeu (como cada forma de pagamento ou lançamento do sistema dela conta). */
async function regrasDaLoja(admin: SupabaseClient, portalId: string) {
  const { data } = await admin.from("loja_regras_caixa").select("itens, confirmado_em").eq("portal_id", portalId).maybeSingle();
  const r = (v: string) => (v === "sim" ? "conta" : v === "nao" ? "não conta" : v === "diferenca" ? "só a diferença" : "sem resposta");
  const linhas = ((data?.itens ?? []) as { titulo: string; faturamento: string; recebido: string; nome: string; obs: string; naoUso?: boolean }[])
    .filter((i) => i.titulo && (i.naoUso || i.faturamento || i.recebido))
    .map((i) => i.naoUso ? `- ${i.titulo}: a loja não usa.` : `- ${i.titulo}${i.nome ? ` (no relatório: ${i.nome})` : ""}: faturamento ${r(i.faturamento)}; recebido do dia ${r(i.recebido)}${i.obs ? `. ${i.obs}` : ""}.`);
  if (!linhas.length) return "";
  return `Regras do caixa desta loja (${data?.confirmado_em ? "confirmadas pela loja" : "respondidas pela loja, ainda sem confirmar"}). Elas valem acima de qualquer regra geral:\n${linhas.join("\n")}`;
}

async function ler(admin: SupabaseClient, portal: string, loja: string, dia: string): Promise<Lido | null> {
  if (!CHAVE) return null;
  const blocos = await arquivos(admin, portal, loja, dia);
  if (!blocos.length) return null;
  const regras = await regrasDaLoja(admin, portal).catch(() => "");
  const client = new Anthropic({ apiKey: CHAVE });
  const r = await client.beta.messages.stream({
    model: MODELO, max_tokens: 3000,
    betas: ["server-side-fallback-2026-07-01"],
    // @ts-ignore: fallbacks "default" ainda pode não estar no tipo do SDK
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
    system: INSTRUCOES,
    messages: [{ role: "user", content: [...blocos, { type: "text", text: `${regras ? `${regras}\n\n` : "A loja ainda não respondeu as Regras do caixa: siga a regra geral e diga em observacao o que você contou e o que deixou de fora (vale-presente, crédito da cliente, consórcio, troca).\n\n"}Dia do fechamento: ${dia}${loja ? ` · loja ${loja}` : ""}. Responda só com o JSON pedido.` }] as never }],
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

/** desde/portal: a equipe pode pedir para reler dias mais antigos de uma loja (ex.: um dia que ficou só com arquivo). */
/** substituir: refaz os dias pelos arquivos e as Regras do caixa (pedido da equipe, depois que a loja confirmou as regras). */
async function rodada(admin: SupabaseClient, desde?: string, portal?: string, substituir = false) {
  const de = desde && /^\d{4}-\d{2}-\d{2}$/.test(desde) ? desde : soma(hoje(), -7);
  let qp = admin.from("portais").select("id, lojas").eq("ativo", true).neq("tipo", "Curso");
  if (portal) qp = qp.eq("id", portal);
  const { data: portais } = await qp;
  let feitos = 0;
  for (const p of portais ?? []) {
    const lojas: string[] = (p.lojas ?? []).length > 1 ? p.lojas : [""];
    const { data: equipe } = await admin.from("loja_equipe").select("id, nome").eq("portal_id", p.id).eq("ativo", true);
    for (const loja of lojas) {
      const { data: dias } = await admin.storage.from(BALDE).list(`${p.id}/gestao/${pastaDaLoja(loja)}`);
      for (const d of (dias ?? []).map((x) => x.name).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x) && x >= de && x <= hoje())) {
        // Portal de uma loja só: o dia lançado pode ter o nome da loja ou ficar sem loja (16/11: o agente não achou
        // o lançamento com o nome e criou outro igual). Então acha qualquer lançamento do dia.
        let q = admin.from("loja_caixa").select("*").eq("portal_id", p.id).eq("dia", d);
        if (loja) q = q.eq("loja", loja);
        const { data: doDia } = await q.order("created_at").limit(1);
        const atual = (doDia ?? [])[0] ?? null;
        if (!substituir && atual?.justificativa) continue;
        if (!substituir && atual) {
          const { data: ruim } = await admin.rpc("caixa_id_com_problema", { p_id: atual.id });
          if (!ruim) continue;
        }
        try {
          const lido = await ler(admin, p.id, loja, d);
          if (!lido?.achou) continue;
          const novo = completar(substituir ? null : atual, lido, equipe ?? []);
          // Refazendo: o que o arquivo não trouxe (vendedoras, formas) continua como estava.
          if (substituir && atual) for (const k of ["vendedoras", "pagamentos", "vendas", "pecas"] as const) {
            const v = (novo as Record<string, unknown>)[k];
            if (v == null || (Array.isArray(v) && !v.length) || v === 0) (novo as Record<string, unknown>)[k] = atual[k];
          }
          const obs = (substituir ? `Refeito pelo agente com os relatórios do dia e as Regras do caixa da loja. ${lido.observacao}`
            : [atual?.obs, `Completado pelo agente com os arquivos do caixa. ${lido.observacao}`].filter(Boolean).join(" ")).slice(0, 500);
          if (atual) await admin.from("loja_caixa").update({ ...novo, obs }).eq("id", atual.id);
          else await admin.from("loja_caixa").insert({ portal_id: p.id, loja: loja || null, dia: d, ...novo, obs });
          feitos++;
        } catch (e) { console.error(p.id, d, (e as Error).message); }
      }
    }
  }
  return feitos;
}

/** Conferência depois que a loja confirma as Regras do caixa (um dia por chamada, para não estourar o tempo):
 *  relê o dia com os arquivos e as regras e compara com o Hub, sem mudar número. Quando o último dia da rodada termina,
 *  manda para a Camilla a lista do que bate e do que não bate e monta de novo a análise da semana. */
async function conferirDia(admin: SupabaseClient, run: string, portalId: string, loja: string, dia: string, total: number, chave: string) {
  const reais = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const dm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;
  let q = admin.from("loja_caixa").select("faturamento, vendas, pecas, pagamentos").eq("portal_id", portalId).eq("dia", dia);
  if (loja) q = q.eq("loja", loja);
  const { data: hubs } = await q.order("created_at").limit(1);
  const hub = (hubs ?? [])[0] ?? null;
  let lido: Lido | null = null, situacao = "bate", texto = "";
  try { lido = await ler(admin, portalId, loja, dia); } catch (e) { console.error(dia, (e as Error).message); }
  const nome = `${dm(dia)}${loja ? ` (${loja})` : ""}`;
  if (!lido?.achou) { situacao = "sem_arquivo"; texto = nome; }
  else {
    const fatHub = Number(hub?.faturamento ?? 0), fatLido = Number(lido.faturamento ?? 0);
    const recHub = Object.values((hub?.pagamentos ?? {}) as Record<string, number>).reduce((t, v) => t + (Number(v) || 0), 0);
    const recLido = Object.values(lido.pagamentos ?? {}).reduce((t, v) => t + (Number(v) || 0), 0);
    const dif: string[] = [];
    if (!hub) dif.push(`não está lançado no Hub; pelos arquivos e as regras: ${reais(fatLido)}, ${lido.vendas ?? "?"} vendas, ${lido.pecas ?? "?"} peças`);
    else {
      if (Math.abs(fatHub - fatLido) > 1) dif.push(`faturamento no Hub ${reais(fatHub)}, pelas regras ${reais(fatLido)}`);
      if (lido.vendas != null && Number(hub.vendas) !== lido.vendas) dif.push(`vendas ${hub.vendas} no Hub, ${lido.vendas} pelos arquivos`);
      if (lido.pecas != null && Number(hub.pecas) !== lido.pecas) dif.push(`peças ${hub.pecas} no Hub, ${lido.pecas} pelos arquivos`);
      if (recLido > 0 && Math.abs(recHub - recLido) > 1) dif.push(`recebido ${reais(recHub)} no Hub, ${reais(recLido)} pelas regras`);
    }
    if (dif.length) { situacao = "nao_bate"; texto = `${nome}: ${dif.join("; ")}. ${lido.observacao}`; } else texto = nome;
  }
  await admin.from("caixa_conferencias").insert({ run, portal_id: portalId, dia, loja: loja || null, total, situacao, texto: texto.slice(0, 1500) });
  // O último dia da rodada fecha a conferência.
  const { data: feitos } = await admin.from("caixa_conferencias").select("dia, situacao, texto").eq("run", run).order("dia");
  if ((feitos ?? []).length < total) return;
  const { data: ja } = await admin.from("caixa_conferencias").update({ fechada: true }).eq("run", run).eq("fechada", false).select("dia");
  if (!(ja ?? []).length) return;
  const { data: p } = await admin.from("portais").select("loja").eq("id", portalId).single();
  const de = (x: string) => (feitos ?? []).filter((f) => f.situacao === x).map((f) => f.texto as string);
  const naoBate = de("nao_bate"), bate = de("bate"), semArquivo = de("sem_arquivo");
  const msg = [`🧾 ${p?.loja}: a loja confirmou as Regras do caixa. Conferi ${total} dias com os arquivos e as regras dela. Nenhum número foi mudado.`,
    naoBate.length ? `Não bate (${naoBate.length}):\n• ${naoBate.join("\n• ")}` : "Todos os dias com arquivo batem com o Hub.",
    bate.length ? `Batem: ${bate.join(", ")}.` : "", semArquivo.length ? `Sem arquivo para conferir: ${semArquivo.join(", ")}.` : "",
    "A análise da semana foi montada de novo com as regras: está em Minha central › Esperando a sua aprovação."].filter(Boolean).join("\n\n");
  const { data: camilla } = await admin.from("perfis").select("id").eq("papel", "equipe").eq("aprova", true);
  const ids = (camilla ?? []).map((x) => x.id as string);
  await admin.from("equipe_conversas").insert(ids.map((id) => ({ portal_id: portalId, tipo: "Pedido", texto: msg.slice(0, 8000), autor: null, autor_nome: "Assistente Magnética", para: id })));
  await admin.rpc("avisar_equipe", { p_para: ids, p_texto: `${p?.loja}: conferência do caixa com as regras pronta (${naoBate.length} ${naoBate.length === 1 ? "dia não bate" : "dias não batem"}). Detalhes nas Conversas.`, p_link: "/equipe/conversas" });
  await fetch(`${URL}/functions/v1/leitura-rascunho`, { method: "POST", headers: { "Content-Type": "application/json", "x-aviso": chave }, body: JSON.stringify({ portal_id: portalId }) }).catch(() => null);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);
  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  const corpo = await req.json().catch(() => ({}));
  const { data: cfg } = await admin.rpc("push_config");
  const peloAgendamento = !!cfg?.aviso_chave && req.headers.get("x-aviso") === cfg.aviso_chave;

  if (corpo?.conferir_dia) {
    if (!peloAgendamento) return json({ erro: "Só o Hub pede a conferência." }, 403);
    const portal = String(corpo?.portal_id ?? ""), dia = String(corpo?.dia ?? ""), run = String(corpo?.run ?? "");
    if (!portal || !run || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return json({ erro: "Informe portal_id, run e dia." }, 400);
    // @ts-ignore: EdgeRuntime existe nas Edge Functions do Supabase
    EdgeRuntime.waitUntil(conferirDia(admin, run, portal, String(corpo?.loja ?? ""), dia, Number(corpo?.total) || 1, cfg.aviso_chave).catch((e) => console.error(e)));
    return json({ ok: true }, 202);
  }
  if (corpo?.rodada) {
    if (!peloAgendamento) return json({ erro: "Só o agendamento roda a rodada." }, 403);
    // @ts-ignore: EdgeRuntime existe nas Edge Functions do Supabase
    EdgeRuntime.waitUntil(rodada(admin, corpo?.desde, corpo?.portal_id, !!corpo?.substituir && !!corpo?.portal_id).then((n) => console.log("dias completados", n)).catch((e) => console.error(e)));
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
