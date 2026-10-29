// O agente da leitura da semana: lê os números da loja (caixa, meta, plano do mês, a leitura anterior) e monta o
// rascunho (o que os números mostram + 3 ações). A equipe revisa e encaminha, a Camilla publica; cada publicação vira exemplo.
// Chamado pela equipe (um portal) ou pelo agendamento de segunda às 12h (todas, com a chave x-aviso).
// Sem a chave do Claude, monta o rascunho por regras (só com os números).
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHAVE = Deno.env.get("ANTHROPIC_API_KEY");
const MODELO = "claude-opus-5-5";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-aviso",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
const soma = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const segunda = (d: string) => { const x = new Date(`${d}T12:00:00Z`); return soma(d, -((x.getUTCDay() + 6) % 7)); };
/** Dias de loja aberta (sem domingo) entre duas datas. */
function diasDeLoja(de: string, ate: string) {
  let n = 0;
  for (let d = de; d <= ate; d = soma(d, 1)) if (new Date(`${d}T12:00:00Z`).getUTCDay() !== 0) n++;
  return n;
}
const fimDoMes = (mes: string) => { const [a, m] = mes.split("-").map(Number); return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10); };

type Caixa = { dia: string; faturamento: number; vendas: number; pecas: number; vendedoras: { nome: string; faturamento: number }[] | null };

async function numeros(admin: SupabaseClient, portalId: string) {
  const h = hoje(), esta = segunda(h), passada = soma(esta, -7), retrasada = soma(esta, -14), mes = h.slice(0, 7);
  const ini = [retrasada, `${mes}-01`].sort()[0];
  const [{ data: caixa }, { data: plano }, { data: anterior }, { data: informados }] = await Promise.all([
    admin.from("loja_caixa").select("dia, faturamento, vendas, pecas, vendedoras").eq("portal_id", portalId).gte("dia", ini).lte("dia", fimDoMes(mes)),
    admin.from("loja_plano_mes").select("dados, status").eq("portal_id", portalId).eq("mes", mes).maybeSingle(),
    admin.from("loja_leituras").select("semana, texto, acoes").eq("portal_id", portalId).eq("publicada", true).lt("semana", esta).order("semana", { ascending: false }).limit(1).maybeSingle(),
    admin.from("loja_numeros_semana").select("semana, faturamento, vendas, pecas, obs").eq("portal_id", portalId).gte("semana", retrasada),
  ]);
  const cx = (caixa ?? []) as Caixa[];
  const resumo = (de: string, ate: string) => {
    const l = cx.filter((c) => c.dia >= de && c.dia <= ate);
    // Loja que não lança o caixa no Hub: os números da semana que ela mandou.
    const inf = !l.length ? (informados ?? []).find((x) => x.semana === de) : null;
    if (inf) {
      const fat = Number(inf.faturamento), vendas = Number(inf.vendas), pecas = Number(inf.pecas);
      return { faturamento: Math.round(fat), vendas, pecas, ticket: vendas ? Math.round(fat / vendas) : null, pa: vendas ? +(pecas / vendas).toFixed(2) : null,
        dias_lancados: diasDeLoja(de, ate), dias_de_loja: diasDeLoja(de, ate), por_dia: [] as { dia: string; faturamento: number }[], por_vendedora: {} as Record<string, number>, informado_pela_loja: true, como_foi: inf.obs };
    }
    const fat = l.reduce((s, c) => s + Number(c.faturamento), 0), vendas = l.reduce((s, c) => s + Number(c.vendas), 0), pecas = l.reduce((s, c) => s + Number(c.pecas), 0);
    const porVendedora: Record<string, number> = {};
    l.forEach((c) => (c.vendedoras ?? []).forEach((v) => { porVendedora[v.nome] = (porVendedora[v.nome] ?? 0) + Number(v.faturamento); }));
    return { faturamento: Math.round(fat), vendas, pecas, ticket: vendas ? Math.round(fat / vendas) : null, pa: vendas ? +(pecas / vendas).toFixed(2) : null,
      dias_lancados: new Set(l.map((c) => c.dia)).size, dias_de_loja: diasDeLoja(de, ate), por_dia: l.map((c) => ({ dia: c.dia, faturamento: Math.round(Number(c.faturamento)) })), por_vendedora: porVendedora };
  };
  const d = (plano?.dados ?? {}) as { base?: number; crescimento?: number; premiacao?: string; semanas?: { foco?: string }[]; acoes?: { titulo: string; inicio?: string }[]; datas?: { titulo: string; trabalhar: boolean }[] };
  const meta = d.base ? Math.round((d.base * (1 + (d.crescimento ?? 20) / 100)) / 100) * 100 : null;
  const ontem = soma(h, -1);
  const noMes = resumo(`${mes}-01`, ontem);
  const ritmo = meta ? Math.round((meta / diasDeLoja(`${mes}-01`, fimDoMes(mes))) * diasDeLoja(`${mes}-01`, ontem)) : null;
  const semanaDoMes = Math.min(3, Math.floor((Number(h.slice(8)) - 1) / 7));
  return {
    hoje: h, semana_da_leitura: esta,
    semana_passada: { de: passada, ate: soma(esta, -1), ...resumo(passada, soma(esta, -1)) },
    semana_retrasada: { de: retrasada, ate: soma(passada, -1), ...resumo(retrasada, soma(passada, -1)) },
    mes_ate_ontem: { ...noMes, meta_do_mes: meta, deveria_ter_vendido_ate_ontem: ritmo },
    plano_do_mes: plano ? { status: plano.status, premiacao: d.premiacao ?? "", foco_desta_semana: d.semanas?.[semanaDoMes]?.foco ?? "", acoes: (d.acoes ?? []).map((a) => a.titulo), datas: (d.datas ?? []).filter((x) => x.trabalhar).map((x) => x.titulo) } : null,
    leitura_anterior: anterior ?? null,
  };
}

const ESQUEMA = {
  type: "object", additionalProperties: false, required: ["texto", "acoes", "para_camilla"],
  properties: { texto: { type: "string" }, acoes: { type: "array", items: { type: "string" } }, para_camilla: { type: "string" } },
};

type Saida = { texto: string; acoes: string[]; para_camilla: string };
type Nums = Awaited<ReturnType<typeof numeros>>;
const reais = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

/** Sem o Claude ligado: um rascunho por regras, só com os números. A Camilla ajusta e publica. */
function porRegras(nome: string, n: Nums, semGestao: boolean): Saida {
  const s = n.semana_passada, r = n.semana_retrasada, m = n.mes_ate_ontem;
  const poucos = s.dias_lancados < Math.ceil(s.dias_de_loja / 2);
  const frases: string[] = [];
  if (poucos) {
    frases.push(semGestao
      ? `${nome}, os números da semana passada ainda não chegaram, então ainda não dá para ler a semana com segurança.`
      : `${nome}, na semana passada só ${s.dias_lancados} de ${s.dias_de_loja} dias de caixa foram lançados no Hub, então ainda não dá para ler a semana com segurança.`);
    frases.push("Esta semana o foco é deixar os números em dia: é com eles que eu consigo te dizer exatamente onde agir.");
  } else {
    frases.push(`${nome}, na semana passada a loja vendeu ${reais(s.faturamento)} em ${s.vendas} vendas${s.ticket ? `, com ticket médio de ${reais(s.ticket)}` : ""}${s.pa ? ` e ${String(s.pa).replace(".", ",")} peças por venda` : ""}.`);
    if (r.faturamento > 0) {
      const v = Math.round(((s.faturamento - r.faturamento) / r.faturamento) * 100);
      frases.push(v >= 0 ? `Foi ${v}% a mais que a semana anterior.` : `Foi ${-v}% a menos que a semana anterior.`);
    }
    if (m.meta_do_mes && m.deveria_ter_vendido_ate_ontem && m.dias_lancados > 0) {
      const pct = Math.round((m.faturamento / m.deveria_ter_vendido_ate_ontem) * 100);
      frases.push(`No mês, você está em ${reais(m.faturamento)}: ${pct}% do que precisava ter vendido até ontem para bater a meta de ${reais(m.meta_do_mes)}.`);
    }
  }
  const acoes: string[] = [];
  if (poucos) acoes.push(semGestao
    ? "Mandar os números da semana no Início do Hub toda segunda até 12h (venda, número de vendas e peças)"
    : "Lançar o caixa todo dia até sábado (ou pedir à Camilla um acesso só do caixa para alguém da equipe lançar)");
  const naoFeita = (n.leitura_anterior?.acoes as { t: string; feita: boolean }[] | undefined)?.find((a) => !a.feita);
  if (naoFeita) acoes.push(`Retomar a ação da semana passada: ${naoFeita.t}`);
  const atras = m.meta_do_mes && m.deveria_ter_vendido_ate_ontem && m.dias_lancados > 0 && m.faturamento < m.deveria_ter_vendido_ate_ontem * 0.95;
  acoes.push(atras ? "Chamar 20 clientes da carteira no WhatsApp até quarta, com a ação do mês" : "Combinar com a equipe a meta desta semana e acompanhar todo fim de dia");
  if (n.plano_do_mes?.foco_desta_semana) acoes.push(`Foco da semana do seu plano: ${n.plano_do_mes.foco_desta_semana}`);
  acoes.push("Fazer a reunião de 15 minutos com a equipe na terça para combinar a semana");
  return { texto: frases.join(" "), acoes: acoes.slice(0, 3), para_camilla: "Rascunho automático por regras (o agente com IA ainda não está ligado): confira os números, ajuste o tom e as ações." };
}

async function rascunho(admin: SupabaseClient, portalId: string, todas = false) {
  const semana = segunda(hoje());
  const { data: atual } = await admin.from("loja_leituras").select("id, publicada, pronta").eq("portal_id", portalId).eq("semana", semana).maybeSingle();
  if (atual?.publicada) return { portal_id: portalId, pulou: "já publicada" };
  // Montando todas de uma vez, não passa por cima da leitura que a equipe já revisou e encaminhou.
  if (todas && atual?.pronta) return { portal_id: portalId, pulou: "já encaminhada" };
  const [{ data: portal }, { data: mem }, { data: exemplos }, nums] = await Promise.all([
    admin.from("portais").select("loja, responsavel, tipo, menu_oculto").eq("id", portalId).single(),
    admin.from("metodo").select("dados").eq("chave", "leitura_agente").single(),
    admin.from("leitura_exemplos").select("rascunho, final").order("created_at", { ascending: false }).limit(6),
    numeros(admin, portalId),
  ]);
  const instrucoes = (mem?.dados as { instrucoes: string })?.instrucoes ?? "";
  const out = CHAVE ? await comAgente(instrucoes, exemplos ?? [], portal, nums) : porRegras(String(portal?.responsavel ?? "").split(" ")[0] || "Oi", nums, ((portal?.menu_oculto ?? []) as string[]).includes("gestao"));
  const acoes = out.acoes.slice(0, 3).map((t) => ({ t, feita: false }));
  const linha = { texto: out.texto, acoes, rascunho: { texto: out.texto, acoes: out.acoes.slice(0, 3), para_camilla: out.para_camilla, agente: !!CHAVE, numeros: nums }, pronta: false, updated_at: new Date().toISOString() };
  if (atual) await admin.from("loja_leituras").update(linha).eq("id", atual.id);
  else await admin.from("loja_leituras").insert({ ...linha, portal_id: portalId, semana, autor_nome: "", publicada: false });
  return { portal_id: portalId, ok: true, agente: !!CHAVE };
}

async function comAgente(instrucoes: string, exemplos: { rascunho: unknown; final: unknown }[], portal: { loja?: string; responsavel?: string; tipo?: string } | null, nums: Nums): Promise<Saida> {
  const client = new Anthropic({ apiKey: CHAVE });
  const r = await client.beta.messages.stream({
    model: MODELO, max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    // @ts-ignore: fallbacks "default" ainda pode não estar no tipo do SDK
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA } },
    system: instrucoes,
    messages: [{ role: "user", content: [
      exemplos.length ? `Exemplos (rascunho do agente → versão final da Camilla):\n${exemplos.map((e) => `RASCUNHO: ${JSON.stringify(e.rascunho)}\nFINAL: ${JSON.stringify(e.final)}`).join("\n\n")}` : "Ainda não há exemplos aprovados.",
      `Loja: ${portal?.loja} (${portal?.tipo}). Lojista: ${portal?.responsavel ?? "—"}.`,
      `Números (R$; semana = segunda a domingo): ${JSON.stringify(nums)}`,
      "Monte a leitura desta semana. Responda só com o JSON pedido.",
    ].join("\n\n") }],
  }).finalMessage();
  const bloco = r.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") throw new Error("O agente não devolveu a leitura.");
  return JSON.parse(bloco.text) as Saida;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);
  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  const corpo = await req.json().catch(() => ({}));

  // Quem pode: o agendamento (chave do aviso) ou alguém da equipe logado.
  const { data: cfg } = await admin.rpc("push_config");
  const peloAgendamento = !!cfg?.aviso_chave && req.headers.get("x-aviso") === cfg.aviso_chave;
  if (!peloAgendamento) {
    const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: equipe } = await usuario.rpc("is_equipe");
    if (equipe !== true) return json({ erro: "Só a equipe pode rodar o agente da leitura." }, 403);
  }

  if (corpo?.portal_id) {
    try { return json(await rascunho(admin, String(corpo.portal_id))); } catch (e) { return json({ erro: (e as Error).message }, 500); }
  }
  if (corpo?.todas) {
    // Lojas ativas com acesso ao Hub ou com caixa lançado nas últimas 2 semanas.
    const [{ data: portais }, { data: perfis }, { data: caixa }] = await Promise.all([
      admin.from("portais").select("id, tipo").eq("ativo", true),
      admin.from("perfis").select("portal_id").not("portal_id", "is", null),
      admin.from("loja_caixa").select("portal_id").gte("dia", soma(hoje(), -14)),
    ]);
    const com = new Set([...(perfis ?? []), ...(caixa ?? [])].map((x) => x.portal_id));
    const lista = (portais ?? []).filter((p) => p.tipo !== "Curso" && com.has(p.id)).map((p) => p.id as string);
    // @ts-ignore: EdgeRuntime existe nas Edge Functions do Supabase
    EdgeRuntime.waitUntil((async () => { for (const id of lista) { try { await rascunho(admin, id, true); } catch (e) { console.error(id, (e as Error).message); } } })());
    return json({ ok: true, lojas: lista.length }, 202);
  }
  return json({ erro: "Informe portal_id ou todas." }, 400);
});
