// O agente da leitura da semana: lê os números da loja (caixa, time, canais, meta, plano do mês, a leitura anterior)
// e os relatórios que a loja subiu na semana (vendas, estoque), e monta a análise nos pilares do método
// (performance da equipe, performance de produtos, estoque x giro) com as ações da semana. A equipe revisa e encaminha, a Camilla publica; cada publicação vira exemplo.
// Chamado pela equipe (um portal) ou pelo agendamento de domingo às 6h (uma chamada por loja que mandou tudo, com a chave x-aviso).
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
/** A semana da leitura: no domingo (quando o agendamento roda) já é a semana que começa amanhã, lendo a que acabou de fechar. */
const refSemana = () => { const h = hoje(); return new Date(`${h}T12:00:00Z`).getUTCDay() === 0 ? soma(h, 1) : h; };
/** Dias de loja aberta (sem domingo) entre duas datas. */
function diasDeLoja(de: string, ate: string) {
  let n = 0;
  for (let d = de; d <= ate; d = soma(d, 1)) if (new Date(`${d}T12:00:00Z`).getUTCDay() !== 0) n++;
  return n;
}
const fimDoMes = (mes: string) => { const [a, m] = mes.split("-").map(Number); return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10); };

type Caixa = { dia: string; faturamento: number; vendas: number; pecas: number; vendedoras: { pessoa_id: string | null; nome: string; faturamento: number; vendas: number; pecas: number }[] | null; justificativa: string | null };
const BALDE = "relatorios";

/** O time na semana: cada vendedora com venda, vendas, peças, P.A. e ticket. */
function timeDa(l: Caixa[]) {
  const m = new Map<string, { nome: string; pessoa_id: string | null; faturamento: number; vendas: number; pecas: number; dias: number }>();
  for (const c of l) for (const v of c.vendedoras ?? []) {
    const k = v.pessoa_id ?? v.nome;
    const x = m.get(k) ?? { nome: v.nome, pessoa_id: v.pessoa_id ?? null, faturamento: 0, vendas: 0, pecas: 0, dias: 0 };
    x.faturamento += Number(v.faturamento) || 0; x.vendas += Number(v.vendas) || 0; x.pecas += Number(v.pecas) || 0; x.dias++;
    m.set(k, x);
  }
  return [...m.values()].map((x) => ({ ...x, faturamento: Math.round(x.faturamento), pa: x.vendas ? +(x.pecas / x.vendas).toFixed(2) : null, ticket: x.vendas ? Math.round(x.faturamento / x.vendas) : null }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

/** Os relatórios que a loja subiu para a semana (vendas do sistema, estoque, crediário, fotos do caixa): vão para o agente ler. */
async function arquivosDaSemana(admin: SupabaseClient, portalId: string, de: string, ate: string) {
  const blocos: unknown[] = []; const nomes: string[] = []; let bytes = 0;
  const { data: lojas } = await admin.storage.from(BALDE).list(`${portalId}/gestao`);
  const caminhos: string[] = [];
  for (const l of (lojas ?? []).filter((x) => !x.id)) {
    const base = `${portalId}/gestao/${l.name}`;
    const { data: pastas } = await admin.storage.from(BALDE).list(base, { limit: 200 });
    for (const p of (pastas ?? []).filter((x) => !x.id)) {
      const dia = /^\d{4}-\d{2}-\d{2}$/.test(p.name) ? p.name : null;
      const mes = /^\d{4}-\d{2}$/.test(p.name) ? p.name : null;
      // A pasta da semana (estoque, crediário), os dias da semana (arquivos do caixa) e o mês (relatórios do mês subidos nesta semana).
      if (!(dia && dia >= soma(de, -1) && dia <= ate) && !(mes && mes >= soma(de, -40).slice(0, 7))) continue;
      const { data: fs } = await admin.storage.from(BALDE).list(`${base}/${p.name}`, { limit: 100 });
      for (const f of fs ?? []) {
        if (!f.id) continue;
        const subiu = String(f.created_at ?? "").slice(0, 10);
        if (mes && (subiu < de || subiu > soma(ate, 2))) continue;
        caminhos.push(`${base}/${p.name}/${f.name}`);
      }
    }
  }
  // Primeiro os relatórios da semana (estoque e vendas), depois os do caixa do dia.
  caminhos.sort((a, b) => Number(/\/caixa_/.test(a)) - Number(/\/caixa_/.test(b)));
  for (const c of caminhos) {
    if (blocos.length >= 10 || bytes > 18 * 1024 * 1024) break;
    const { data: b } = await admin.storage.from(BALDE).download(c);
    if (!b || b.size > 8 * 1024 * 1024) continue;
    const nome = c.split("/").slice(-2).join("/"), baixo = nome.toLowerCase();
    const buf = new Uint8Array(await b.arrayBuffer());
    const b64 = () => { let x = ""; for (let i = 0; i < buf.length; i += 0x8000) x += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return btoa(x); };
    if (baixo.endsWith(".pdf")) blocos.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64() }, title: nome });
    else if (/\.(png|jpe?g|webp)$/.test(baixo)) blocos.push({ type: "image", source: { type: "base64", media_type: baixo.endsWith(".png") ? "image/png" : baixo.endsWith(".webp") ? "image/webp" : "image/jpeg", data: b64() } });
    else if (/\.(xlsx|xls|ods|csv)$/.test(baixo)) {
      const XLSX = await import("npm:xlsx@0.18.5");
      const wb = XLSX.read(buf, { type: "array" });
      blocos.push({ type: "text", text: `Planilha ${nome}:\n${wb.SheetNames.map((n: string) => `# ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join("\n\n").slice(0, 40000)}` });
    } else continue;
    nomes.push(nome); bytes += b.size;
  }
  return { blocos, nomes };
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

async function numeros(admin: SupabaseClient, portalId: string) {
  const h = hoje(), esta = segunda(refSemana()), passada = soma(esta, -7), retrasada = soma(esta, -14), mes = h.slice(0, 7);
  const ini = [retrasada, `${mes}-01`].sort()[0];
  const [{ data: caixa }, { data: plano }, { data: anterior }, { data: informados }, { data: canais }] = await Promise.all([
    admin.from("loja_caixa").select("dia, faturamento, vendas, pecas, vendedoras, justificativa").eq("portal_id", portalId).gte("dia", ini).lte("dia", fimDoMes(mes)),
    admin.from("loja_plano_mes").select("dados, status").eq("portal_id", portalId).eq("mes", mes).maybeSingle(),
    admin.from("loja_leituras").select("semana, texto, acoes").eq("portal_id", portalId).eq("publicada", true).lt("semana", esta).order("semana", { ascending: false }).limit(1).maybeSingle(),
    admin.from("loja_numeros_semana").select("semana, faturamento, vendas, pecas, obs").eq("portal_id", portalId).gte("semana", retrasada),
    admin.from("loja_canais_registro").select("dia, canal, tipo, valor, pecas, minutos").eq("portal_id", portalId).gte("dia", retrasada).lt("dia", esta),
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
      dias_lancados: new Set(l.map((c) => c.dia)).size, dias_de_loja: diasDeLoja(de, ate),
      por_dia: l.map((c) => ({ dia: c.dia, faturamento: Math.round(Number(c.faturamento)), vendas: Number(c.vendas), pecas: Number(c.pecas) })), por_vendedora: porVendedora,
      time: timeDa(l),
      // Dias que a loja fechou com algo faltando ou que não bate, e o motivo que ela escreveu.
      fechados_com_motivo: l.filter((c) => c.justificativa?.trim()).map((c) => ({ dia: c.dia, motivo: c.justificativa as string })) };
  };
  // Vendas por canal (o link da equipe): cada lançamento é uma venda. Quanto cada canal vende, P.A., ticket e quanto rende por hora de trabalho.
  const porCanal = (de: string, ate: string) => {
    const rs = ((canais ?? []) as { dia: string; canal: string; tipo: string; valor: number; pecas: number; minutos: number }[]).filter((r) => r.dia >= de && r.dia <= ate);
    if (!rs.length) return null;
    const total = rs.filter((r) => r.tipo === "venda").reduce((t, r) => t + Number(r.valor), 0);
    return [...new Set(rs.map((r) => r.canal))].map((canal) => {
      const v = rs.filter((r) => r.canal === canal && r.tipo === "venda");
      const valor = v.reduce((t, r) => t + Number(r.valor), 0), pecas = v.reduce((t, r) => t + Number(r.pecas), 0);
      const min = rs.filter((r) => r.canal === canal && r.tipo === "tempo").reduce((t, r) => t + Number(r.minutos), 0);
      return { canal, vendas: v.length, faturamento: Math.round(valor), pct_da_venda_do_link: total ? Math.round((valor / total) * 100) : 0, pecas,
        pa: v.length ? +(pecas / v.length).toFixed(2) : null, ticket: v.length ? Math.round(valor / v.length) : null,
        horas_de_trabalho: +(min / 60).toFixed(1), vende_por_hora: min ? Math.round(valor / (min / 60)) : null };
    }).sort((a, b) => b.faturamento - a.faturamento);
  };
  const d = (plano?.dados ?? {}) as { metas?: Record<string, number>; base?: number; crescimento?: number; premiacao?: string; semanas?: { foco?: string }[]; acoes?: { titulo: string; inicio?: string }[]; datas?: { titulo: string; trabalhar: boolean }[] };
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
    plano_do_mes: plano ? { status: plano.status, metas_individuais_do_mes: d.metas ?? null, premiacao: d.premiacao ?? "", foco_desta_semana: d.semanas?.[semanaDoMes]?.foco ?? "", acoes: (d.acoes ?? []).map((a) => a.titulo), datas: (d.datas ?? []).filter((x) => x.trabalhar).map((x) => x.titulo) } : null,
    leitura_anterior: anterior ?? null,
    canais_semana_passada: porCanal(passada, soma(esta, -1)),
    canais_semana_retrasada: porCanal(retrasada, soma(passada, -1)),
  };
}

const ESQUEMA = {
  type: "object", additionalProperties: false, required: ["resumo", "equipe", "produtos", "estoque_giro", "canais", "acoes", "para_camilla"],
  properties: {
    resumo: { type: "string" }, equipe: { type: "string" }, produtos: { type: "string" }, estoque_giro: { type: "string" }, canais: { type: "string" },
    acoes: { type: "array", items: { type: "object", additionalProperties: false, required: ["pilar", "acao"], properties: { pilar: { type: "string" }, acao: { type: "string" } } } },
    para_camilla: { type: "string" },
  },
};
type Analise = { resumo: string; equipe: string; produtos: string; estoque_giro: string; canais: string; acoes: { pilar: string; acao: string }[]; para_camilla: string };
/** A análise em blocos vira o texto que a loja lê (um bloco por pilar) e as ações da semana. */
const juntar = (a: Analise): Saida => ({
  texto: [a.resumo, a.equipe && `PERFORMANCE DA EQUIPE\n${a.equipe}`, a.produtos && `PERFORMANCE DE PRODUTOS\n${a.produtos}`,
    a.estoque_giro && `ESTOQUE X GIRO\n${a.estoque_giro}`, a.canais && `CANAIS DE VENDA\n${a.canais}`].filter((x) => x && x.trim()).join("\n\n"),
  acoes: a.acoes.map((x) => (x.pilar ? `${x.pilar}: ${x.acao}` : x.acao)),
  para_camilla: a.para_camilla,
});

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

/** encaminhar: o rascunho já vai para a Camilla aprovar (Minha central › Para aprovar). É o caso do agendamento de domingo. */
async function rascunho(admin: SupabaseClient, portalId: string, todas = false, encaminhar = false) {
  const semana = segunda(refSemana());
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
  const conversas = await faleComCamilla(admin, portalId);
  const regras = await regrasDaLoja(admin, portalId).catch(() => "");
  const arquivos = CHAVE ? await arquivosDaSemana(admin, portalId, nums.semana_passada.de, nums.semana_passada.ate).catch(() => ({ blocos: [], nomes: [] })) : { blocos: [], nomes: [] };
  const out = CHAVE ? await comAgente(instrucoes, exemplos ?? [], portal, nums, conversas, arquivos, regras) : porRegras(String(portal?.responsavel ?? "").split(" ")[0] || "Oi", nums, ((portal?.menu_oculto ?? []) as string[]).includes("gestao"));
  // A Camilla sempre vê os dias fechados com motivo antes de aprovar.
  const motivos = ((nums.semana_passada as { fechados_com_motivo?: { dia: string; motivo: string }[] }).fechados_com_motivo ?? [])
    .map((x) => `${x.dia.slice(8)}/${x.dia.slice(5, 7)}: ${x.motivo}`);
  if (motivos.length) out.para_camilla = [out.para_camilla, `Caixa fechado com motivo (${motivos.length} ${motivos.length === 1 ? "dia" : "dias"}): ${motivos.join(" · ")}`].filter(Boolean).join("\n");
  const acoes = out.acoes.slice(0, 5).map((t) => ({ t, feita: false }));
  const linha = { texto: out.texto, acoes, rascunho: { texto: out.texto, acoes: out.acoes.slice(0, 5), para_camilla: out.para_camilla, agente: !!CHAVE, numeros: nums }, pronta: encaminhar, updated_at: new Date().toISOString() };
  if (atual) await admin.from("loja_leituras").update(linha).eq("id", atual.id);
  else await admin.from("loja_leituras").insert({ ...linha, portal_id: portalId, semana, autor_nome: "", publicada: false });
  return { portal_id: portalId, ok: true, agente: !!CHAVE };
}

/** O Fale com a Camilla da loja nas últimas 2 semanas: o que a loja contou, pediu ou combinou. */
async function faleComCamilla(admin: SupabaseClient, portalId: string) {
  const desde = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: pedidos }, { data: respostas }] = await Promise.all([
    admin.from("solicitacoes").select("created_at, autor_nome, texto, transcricao").eq("portal_id", portalId).gte("created_at", desde),
    admin.from("solicitacao_respostas").select("created_at, autor_nome, equipe, texto, transcricao, automatica").eq("portal_id", portalId).gte("created_at", desde),
  ]);
  const linhas = [
    ...(pedidos ?? []).map((x) => ({ em: x.created_at as string, quem: `${x.autor_nome ?? "Loja"} (loja)`, t: String(x.texto || x.transcricao || "") })),
    ...(respostas ?? []).filter((x) => !x.automatica).map((x) => ({ em: x.created_at as string, quem: x.equipe ? `${x.autor_nome ?? "Equipe"} (equipe)` : `${x.autor_nome ?? "Loja"} (loja)`, t: String(x.texto || x.transcricao || "") })),
  ].filter((x) => x.t.trim()).sort((a, b) => a.em.localeCompare(b.em));
  return linhas.map((x) => `${x.em.slice(8, 10)}/${x.em.slice(5, 7)} · ${x.quem}: ${x.t.replace(/\s+/g, " ").slice(0, 400)}`).join("\n").slice(-8000);
}

async function comAgente(instrucoes: string, exemplos: { rascunho: unknown; final: unknown }[], portal: { loja?: string; responsavel?: string; tipo?: string } | null, nums: Nums, conversas = "", arquivos: { blocos: unknown[]; nomes: string[] } = { blocos: [], nomes: [] }, regras = ""): Promise<Saida> {
  const client = new Anthropic({ apiKey: CHAVE });
  const r = await client.beta.messages.stream({
    model: MODELO, max_tokens: 12000,
    betas: ["server-side-fallback-2026-07-01"],
    // @ts-ignore: fallbacks "default" ainda pode não estar no tipo do SDK
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA } },
    system: instrucoes,
    messages: [{ role: "user", content: [...arquivos.blocos, { type: "text", text: [
      arquivos.nomes.length
        ? `Acima estão os relatórios que a loja subiu para esta semana (${arquivos.nomes.join(", ")}). Leia todos: é deles que saem os produtos que mais venderam, as categorias, as marcas, os tamanhos e o estoque de cada uma. Use só o que está escrito neles.`
        : "A loja não subiu relatório de vendas por produto nem de estoque nesta semana: nos blocos de produtos e de estoque, diga o que dá para ler pelo caixa e peça o relatório que falta (vendas por produto ou o estoque por categoria).",
      regras
        ? `${regras}\nUse essas regras para ler os relatórios e o caixa (o que é venda do dia e o que é só recebimento).`
        : "A loja ainda não respondeu as Regras do caixa no Hub. Se a diferença entre venda e recebido parecer vir de vale-presente, crédito da cliente, consórcio ou troca, diga isso em para_camilla e não trate como erro da loja.",
      exemplos.length ? `Exemplos de tom (rascunho do agente → versão final da Camilla; a estrutura agora é a dos pilares, use os exemplos só para o tom):\n${exemplos.map((e) => `RASCUNHO: ${JSON.stringify(e.rascunho)}\nFINAL: ${JSON.stringify(e.final)}`).join("\n\n")}` : "Ainda não há exemplos aprovados.",
      `Loja: ${portal?.loja} (${portal?.tipo}). Lojista: ${portal?.responsavel ?? "—"}.`,
      `Números (R$; semana = segunda a domingo): ${JSON.stringify(nums)}`,
      conversas
        ? `Fale com a Camilla da loja (últimas 2 semanas, o que a loja contou, pediu ou combinou):\n${conversas}\n\nSe algum ponto dessas conversas fizer sentido para esta semana (uma dificuldade, um pedido, um combinado, uma ação que ela planejou), use-o nas ações sugeridas, com as palavras dela. Não repita pergunta que ela já respondeu ali. Em para_camilla, diga em uma frase qual ponto da conversa você usou (ou que nada dali entrou).`
        : "A loja não escreveu no Fale com a Camilla nas últimas 2 semanas.",
      nums.canais_semana_passada
        ? "A loja mede as vendas por canal (canais_semana_passada e canais_semana_retrasada, lançadas pela equipe; cada lançamento é uma venda). Inclua na leitura o comparativo dos canais: qual mais vendeu, qual rende mais por hora de trabalho, o P.A. e o ticket de cada um, e qual toma tempo demais para o que traz. Diga com clareza em qual canal vale investir o tempo da equipe nesta semana e qual reduzir. Se a venda do link ficou bem abaixo do caixa da semana, avise que parte das vendas não foi lançada por canal (o comparativo fica parcial)."
        : "",
      "Monte a análise desta semana nos pilares. Responda só com o JSON pedido.",
    ].filter(Boolean).join("\n\n") }] }],
  }).finalMessage();
  const bloco = r.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") throw new Error("O agente não devolveu a leitura.");
  return juntar(JSON.parse(bloco.text) as Analise);
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
    try { return json(await rascunho(admin, String(corpo.portal_id), false, peloAgendamento)); } catch (e) { return json({ erro: (e as Error).message }, 500); }
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
