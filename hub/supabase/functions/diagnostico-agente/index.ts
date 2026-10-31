// O agente do Diagnóstico: prepara a reunião de diagnóstico da Camilla em paradas, seguindo o Método Loja Magnética
// (instruções na tabela metodo, chave 'diagnostico_agente'). Lê a passagem do Comercial, os Dados da loja, o caixa,
// a equipe, a Análise do Instagram, os relatórios que a loja (ou a Camilla) subiu e as transcrições coladas.
// Paradas: raiox → perguntas → solucao → hub (a versão do Diagnóstico da loja, que a Camilla compara e aplica). Cada parada espera a decisão
// da Camilla. Só quem aprova chama. Precisa da chave do Claude.
// Com muito material o Claude passa do tempo máximo de uma função do Supabase (150 s). Por isso o pedido vai como lote
// (Message Batches): a função entrega o pedido e guarda o número do lote em agente.lote; a tela chama de novo com
// { conferir: true } a cada pouco, e quando o lote termina a resposta é guardada.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";
import { strFromU8, unzipSync } from "npm:fflate@0.8.2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHAVE = Deno.env.get("ANTHROPIC_API_KEY");
const MODELO = "claude-opus-5-5";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Parada = "raiox" | "mercado" | "perguntas" | "solucao" | "hub";
const PARADAS: Parada[] = ["raiox", "mercado", "perguntas", "solucao", "hub"];
type Bloco = Anthropic.Beta.BetaContentBlockParam;

// ───── Esquemas da resposta de cada parada ─────
const t = { type: "string" };
const n = { type: "number" };
const nulo = (x: unknown) => ({ anyOf: [x, { type: "null" }] });
const lista = (items: unknown) => ({ type: "array", items });
const obj = (props: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
const PILARES = ["Gestão Analítica", "Gestão Pessoas", "Processos Comerciais", "MKT Conteúdo"];
const NIVEL = { type: "string", enum: ["ok", "atencao", "critico"] };

// A pesquisa de mercado responde em texto (com as fontes da busca), sem esquema.
const ESQUEMAS: Record<Exclude<Parada, "mercado">, unknown> = {
  raiox: obj({
    resumo: t,
    pilares: lista(obj({ pilar: { type: "string", enum: PILARES }, nota: n, justificativa: t, bem: t, fraco: t })),
    numeros: lista(obj({ rotulo: t, valor: t, fonte: t })),
    inconsistencias: lista(t),
    gargalo: obj({ pilar: { type: "string", enum: PILARES }, tema: t, porque: t, alternativa: t }),
    alavanca: obj({ tipo: { type: "string", enum: ["Base de clientes", "Instagram"] }, porque: t }),
    faltando: lista(obj({ item: t, para_que: t })),
  }),
  perguntas: obj({ perguntas: lista(t) }),
  solucao: obj({
    frase: t,
    resultado1: obj({ pilar: t, numeros: t, hoje: t, meta: t }),
    solucao: obj({ titulo: t, texto: t, decisoes: lista(t) }),
    roteiro: lista(obj({ tempo: t, bloco: t, falas: t })),
    missoes: lista(obj({ tipo: { type: "string", enum: ["correcao", "aceleracao"] }, titulo: t, passos: lista(t), responsavel: t, prazo: t })),
    filtro: lista(obj({ pergunta: t, resposta: t })),
    amanha: t,
    estacionamento: lista(obj({ tema: t, quando: t, porque: t })),
    pdf: obj({ notas: lista(obj({ pilar: t, nota: n })), frase: t, resultado: t, missoes: lista(t) }),
    faltando: lista(t),
  }),
  hub: obj({
    data_base: t, fontes: t,
    cenario: obj({ resumo: t, objetivo: t, foco: lista(t) }),
    performance: obj({ meses: lista(obj({ mes: t, valor: nulo(n), anterior: nulo(n), meta: nulo(n) })), leitura: t }),
    estoque: obj({ indicadores: lista(obj({ rotulo: t, valor: t, ideal: t, nivel: NIVEL, nota: t })), leitura: t }),
    alertas: lista(obj({ nivel: NIVEL, alerta: t, dado: t, acao: t, prazo: t, quem: t })),
    abc: obj({ titulo: t, coluna: t, nota: t, linhas: lista(obj({ nome: t, pecas: nulo(n), pct: nulo(n), curva: { type: "string", enum: ["A", "B", "C", ""] }, faturado: nulo(n), pm: nulo(n), faixa: t, estoque: nulo(n) })) }),
    marcas: lista(obj({ nome: t, participacao: t, parado: t, nivel: NIVEL, leitura: t, acao: t })),
    linhas: lista(obj({ nome: t, parado: t, nivel: NIVEL, leitura: t, desejo: t })),
    equipe: obj({ leitura: t, pessoas: lista(obj({ nome: t, funcao: t, nota: t })) }),
  }),
};

const TAREFA: Record<Parada, string> = {
  raiox: "Faça a PARADA 1 (Raio-X e proposta de gargalo e alavanca). Em \"faltando\", liste o que falta e para que serve.",
  mercado: [
    "Faça a PESQUISA DE CONCORRENTES E MERCADO desta loja, pesquisando na internet. É material para a Camilla revisar; depois pode ir para a loja ler. Escreva para a dona ler: linguagem simples, do dia a dia.",
    "ORDEM OBRIGATÓRIA:",
    "1) CONCORRENTES QUE A LOJA CITOU. A maioria das lojas da mentoria fica no interior, então o concorrente local pesa muito. Use os concorrentes e as referências que a loja citou (campo da Camilla abaixo e o formulário de diagnóstico) e a cidade. Para cada concorrente: o que é (posicionamento, faixa de preço, público, canais, frequência e formato de venda, o que se vê publicamente). Depois, a comparação com a loja: onde ela já tem VANTAGEM e onde está o DESAFIO DE DIFERENCIAÇÃO, com fatos. Se não achar um perfil, diga e peça para a Camilla confirmar o @.",
    "2) O MERCADO DO SEGMENTO. Abra o olhar para o segmento específico da loja (ex.: brechó, moda praia, plus size, fitness): tamanho e tendência com fonte e ano, e as práticas das REFERÊNCIAS GRANDES E VALIDADAS do segmento (marcas e lojas conhecidas, com resultado público e comprovado). Nunca use como inspiração uma loja ou perfil pequeno demais: a referência tem de mostrar onde a cliente pode chegar.",
    "3) O QUE ISSO MUDA PARA A LOJA: 3 a 6 hipóteses práticas, ligadas ao gargalo e à alavanca escolhidos, cada uma com o que testar em 2 semanas e como medir. Hipótese, não regra.",
    "Regras: todo número com fonte e ano; diga quando é prática observada e quando é número; não invente. Não use o nome de pessoas da equipe nem dados internos da loja (financeiro, desabafos). Nunca use \"balcão\".",
    "FORMATO DA RESPOSTA (exatamente estes três marcadores, nesta ordem):",
    "=== RESUMO ===\n(5 a 8 linhas para a dona ler primeiro)\n=== PESQUISA ===\n(a pesquisa completa, com títulos numerados: 1. Concorrentes da cidade, 2. O mercado do segmento, 3. O que isso muda para a loja)\n=== FONTES ===\n(uma fonte por linha: título — link)",
  ].join("\n"),
  perguntas: "Faça a PARADA 2: as perguntas do gargalo que a Camilla escolheu (veja a escolha dela abaixo). Antes de escrever cada pergunta, procure a resposta no formulário, nas transcrições de áudio e de reunião, nas anotações, no planner e nos arquivos. Se já está respondida, não pergunte. Se está em parte, a pergunta começa pelo que ela já contou e pede só o que falta (ex.: \"Você contou que fotografa as peças e manda o preço no grupo para a Su. Quanto tempo leva, em média, da sacola chegar até a peça estar na arara?\"). Poucas perguntas e certeiras valem mais que muitas.",
  solucao: "Faça a PARADA 3 (rascunho da solução, roteiro de 1h30, as 2 missões, o filtro anti-excesso, a frase do que ela faz amanhã, o estacionamento e o conteúdo do PDF), usando o gargalo e a alavanca escolhidos e as respostas da loja.",
  hub: "Monte o Diagnóstico da loja no Hub (o que a lojista vai ver), no formato e no padrão dos exemplos liberados, com o que foi preparado e decidido. Valores em reais como número (sem R$) nos campos numéricos; mês como AAAA-MM.",
};

// ───── Os dados da loja ─────
const MAX_TEXTO = 350_000; // caracteres de planilhas e textos somados (o que passar disso é avisado, nunca cortado em silêncio)
const MAX_ARQUIVO = 9 * 1024 * 1024;

function base64(buf: Uint8Array) {
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

/** O texto de um Word (.docx é um zip; o texto fica em word/document.xml), com parágrafos e células de tabela. */
function textoWord(buf: Uint8Array) {
  const xml = strFromU8(unzipSync(buf, { filter: (f) => f.name === "word/document.xml" })["word/document.xml"]);
  return xml
    .replace(/<w:tab\/>/g, "\t").replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:tc>/g, " | ").replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}

async function arquivos(admin: SupabaseClient, portalId: string, filtro?: RegExp) {
  const blocos: Bloco[] = [];
  const avisos: string[] = [];
  const { data: todos } = await admin.storage.from("relatorios").list(portalId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  const lista = (todos ?? []).filter((x) => !filtro || filtro.test(x.name));
  let texto = 0;
  for (const f of lista.filter((x) => x.id)) {
    const nome = f.name;
    const ext = nome.split(".").pop()?.toLowerCase() ?? "";
    const tam = Number(f.metadata?.size ?? 0);
    if (tam > MAX_ARQUIVO) { avisos.push(`${nome}: grande demais (${Math.round(tam / 1048576)} MB), não foi lido`); continue; }
    const { data: blob } = await admin.storage.from("relatorios").download(`${portalId}/${nome}`);
    if (!blob) { avisos.push(`${nome}: não deu para abrir`); continue; }
    const buf = new Uint8Array(await blob.arrayBuffer());
    if (ext === "pdf") {
      blocos.push({ type: "text", text: `Arquivo: ${nome}` });
      blocos.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64(buf) } });
    } else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      blocos.push({ type: "text", text: `Imagem: ${nome}` });
      blocos.push({ type: "image", source: { type: "base64", media_type: (ext === "jpg" ? "image/jpeg" : `image/${ext}`) as "image/png", data: base64(buf) } });
    } else if (["xlsx", "xls", "csv", "txt", "ods", "docx"].includes(ext)) {
      let conteudo = "";
      if (ext === "csv" || ext === "txt") conteudo = new TextDecoder().decode(buf);
      else if (ext === "docx") {
        try { conteudo = textoWord(buf); } catch { avisos.push(`${nome}: não deu para ler o Word (salve como PDF e suba de novo)`); continue; }
      }
      else {
        const wb = XLSX.read(buf, { type: "array" });
        conteudo = wb.SheetNames.map((s) => `--- aba ${s} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[s], { blankrows: false })}`).join("\n");
      }
      if (texto + conteudo.length > MAX_TEXTO) {
        const cabe = Math.max(0, MAX_TEXTO - texto);
        avisos.push(`${nome}: só as primeiras ${cabe.toLocaleString("pt-BR")} de ${conteudo.length.toLocaleString("pt-BR")} letras couberam na leitura`);
        conteudo = conteudo.slice(0, cabe);
      }
      texto += conteudo.length;
      if (conteudo) blocos.push({ type: "text", text: `Arquivo: ${nome}\n${conteudo}` });
    } else avisos.push(`${nome}: formato .${ext} não é lido (use PDF, Word, planilha, CSV ou imagem)`);
  }
  return { blocos, avisos, nomes: lista.filter((x) => x.id).map((x) => x.name) };
}

async function juntar(admin: SupabaseClient, portalId: string) {
  const desde = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: portal }, { data: ficha }, { data: contratos }, { data: passagem }, { data: pers }, { data: caixa }, { data: semanas }, { data: equipe }, { data: insta }] = await Promise.all([
    admin.from("portais").select("loja, responsavel, tipo, inicio, canais, lojas").eq("id", portalId).single(),
    admin.from("fichas").select("plano_id, etapa, termometro, situacao, instagram, resultado_n1, indicador, observacoes, data_diagnostico").eq("portal_id", portalId).maybeSingle(),
    admin.from("contratos").select("plano_id, inicio, fim, status").eq("portal_id", portalId),
    admin.from("passagens").select("plano_id, valor, pagamento_em, resultado_90, origem, observacoes, lojas_mentoradas, bonus, garantia").eq("portal_id", portalId).maybeSingle(),
    admin.from("personalizacao").select("etapa, respostas, concluida").eq("portal_id", portalId).order("etapa"),
    admin.from("loja_caixa").select("loja, dia, faturamento, vendas, pecas, vendedoras").eq("portal_id", portalId).gte("dia", desde),
    admin.from("loja_numeros_semana").select("semana, faturamento, vendas, pecas, obs").eq("portal_id", portalId).gte("semana", desde),
    admin.from("loja_equipe").select("nome, funcao, ativo, perfil, motor, entrada").eq("portal_id", portalId),
    admin.from("loja_analise_perfil").select("status, dados").eq("portal_id", portalId).maybeSingle(),
  ]);
  // O caixa vai resumido por mês (e por vendedora), não dia a dia.
  const meses: Record<string, { faturamento: number; vendas: number; pecas: number; dias: number; vendedoras: Record<string, number> }> = {};
  for (const c of caixa ?? []) {
    const m = String(c.dia).slice(0, 7);
    const x = (meses[m] ??= { faturamento: 0, vendas: 0, pecas: 0, dias: 0, vendedoras: {} });
    x.faturamento += Number(c.faturamento); x.vendas += Number(c.vendas); x.pecas += Number(c.pecas); x.dias++;
    for (const v of (c.vendedoras ?? []) as { nome: string; faturamento: number }[]) x.vendedoras[v.nome] = (x.vendedoras[v.nome] ?? 0) + Number(v.faturamento);
  }
  const d = (insta?.dados ?? {}) as Record<string, unknown>;
  return {
    loja: portal?.loja ?? "", responsavel: portal?.responsavel ?? "",
    dados: {
      loja: portal, ficha, contratos, passagem_do_comercial: passagem,
      dados_da_loja: (pers ?? []).map((p) => ({ etapa: p.etapa, concluida: p.concluida, respostas: p.respostas })),
      caixa_por_mes: meses, numeros_da_semana: semanas ?? [], equipe: equipe ?? [],
      analise_do_instagram: insta ? { status: insta.status, nicho: d.nicho, numeros: d.numeros, estrategia: d.estrategia, conclusao: d.conclusao } : null,
    },
  };
}

// ───── O trabalho de cada parada ─────
const marcarEm = (admin: SupabaseClient, portalId: string, agente: Record<string, unknown>) =>
  admin.from("diagnostico_preparo").update({ agente, updated_at: new Date().toISOString() }).eq("portal_id", portalId);

/** Monta o pedido da parada (o que o Claude lê). A pesquisa de mercado lê só o formulário e o que já foi preparado. */
async function pedido(admin: SupabaseClient, portalId: string, parada: Parada, hoje: string) {
  const [{ data: prep }, { data: mem }, base, docs] = await Promise.all([
    admin.from("diagnostico_preparo").select("*").eq("portal_id", portalId).single(),
    admin.from("metodo").select("dados").eq("chave", "diagnostico_agente").single(),
    juntar(admin, portalId),
    arquivos(admin, portalId, parada === "mercado" ? /formul|diagnostico-da-sua-loja/i : undefined),
  ]);
  const memoria = (mem?.dados ?? {}) as { instrucoes?: string; exemplo?: string };
  const conteudo: Bloco[] = [...docs.blocos];
  const tr = (prep?.transcricoes ?? {}) as Record<string, string>;
  const partes = [
    `Loja: ${base.loja}. Dona ou dono: ${base.responsavel || "—"}. Hoje: ${hoje.slice(0, 10)}.`,
    `Dados que estão no Hub: ${JSON.stringify(base.dados)}`,
    tr.comercial ? `Transcrição da reunião do Comercial:\n${tr.comercial}` : "Transcrição da reunião do Comercial: não colada.",
    tr.onboarding ? `Transcrição do onboarding com a CS:\n${tr.onboarding}` : "Transcrição do onboarding: não colada.",
    tr.outras ? `Outras anotações e conversas:\n${tr.outras}` : "",
    docs.nomes.length ? `Arquivos lidos: ${docs.nomes.join(", ")}.` : "Nenhum relatório foi subido no Hub para esta loja.",
    docs.avisos.length ? `Avisos sobre os arquivos (conte isso nas pendências): ${docs.avisos.join("; ")}.` : "",
    memoria.exemplo && parada !== "mercado" ? `Exemplo de referência de um diagnóstico da Camilla (só para o padrão de profundidade e de frase, não copie números): ${memoria.exemplo}` : "",
  ];
  if (parada === "mercado") partes.push(`Concorrentes, referências e cidade que a Camilla anotou: ${prep?.concorrentes || "(não anotou; procure no formulário de diagnóstico e nas transcrições)"}`);
  if (parada !== "raiox") partes.push(`Raio-X já preparado: ${JSON.stringify(prep?.raiox ?? null)}`, `Escolha da Camilla: ${JSON.stringify(prep?.escolha ?? null)}`);
  if (parada === "solucao" || parada === "hub") partes.push(`Perguntas do gargalo: ${JSON.stringify(prep?.perguntas ?? [])}`, `Respostas da loja:\n${prep?.respostas || "(ainda não chegaram)"}`);
  if (parada === "hub") {
    partes.push(`Preparação da reunião (solução, missões e estacionamento): ${JSON.stringify(prep?.solucao ?? null)}`);
    const { data: ex } = await admin.from("loja_diagnostico").select("dados").eq("status", "liberada").neq("portal_id", portalId).order("liberada_em", { ascending: false }).limit(2);
    partes.push(`Dois Diagnósticos liberados pela Camilla, de outras lojas, para o formato e o tom (não copie o conteúdo): ${JSON.stringify((ex ?? []).map((x) => x.dados))}`);
  }
  const ajuste = ((prep?.ajustes ?? {}) as Record<string, string>)[parada];
  if (ajuste) partes.push(`AJUSTES QUE A CAMILLA PEDIU NESTA VERSÃO (siga à risca): ${ajuste}`);
  partes.push(TAREFA[parada], parada === "mercado" ? "Responda só no formato pedido, com os três marcadores." : "Responda só com o JSON pedido.");
  conteudo.push({ type: "text", text: partes.filter(Boolean).join("\n\n") });
  return { system: memoria.instrucoes ?? "", conteudo, avisos: docs.avisos };
}

/** Os parâmetros do pedido ao Claude. A pesquisa de mercado usa a busca na internet; as outras paradas respondem em JSON. */
function parametros(parada: Parada, system: string, mensagens: Anthropic.MessageParam[]) {
  if (parada === "mercado") {
    return {
      model: MODELO, max_tokens: 32000, system, messages: mensagens,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 30 }],
      output_config: { effort: "medium" },
    };
  }
  return {
    model: MODELO, max_tokens: 32000, system, messages: mensagens,
    output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMAS[parada as Exclude<Parada, "mercado">] } },
  };
}

async function entregar(parada: Parada, system: string, mensagens: Anthropic.MessageParam[]) {
  const client = new Anthropic({ apiKey: CHAVE });
  // @ts-ignore: output_config e a busca na internet podem não estar no tipo desta versão do SDK
  const lote = await client.messages.batches.create({ requests: [{ custom_id: parada, params: parametros(parada, system, mensagens) }] });
  return lote.id;
}

/** Monta o pedido da parada e entrega ao Claude como lote. */
async function rodar(admin: SupabaseClient, portalId: string, parada: Parada) {
  const inicio = new Date().toISOString();
  const marcar = (agente: Record<string, unknown>) => marcarEm(admin, portalId, { parada, inicio, ...agente });
  try {
    const pd = await pedido(admin, portalId, parada, inicio);
    const lote = await entregar(parada, pd.system, [{ role: "user", content: pd.conteudo as Anthropic.ContentBlockParam[] }]);
    await marcar({ estado: "trabalhando", lote, avisos: pd.avisos });
  } catch (e) {
    await marcar({ estado: "erro", fim: new Date().toISOString(), msg: (e as Error).message.slice(0, 500) });
  }
}

/** Separa a resposta da pesquisa nos três blocos e junta as fontes que a busca citou. */
function lerMercado(m: Anthropic.Message) {
  const texto = m.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join("");
  const parte = (de: string, ate?: string) => {
    const i = texto.indexOf(de);
    if (i < 0) return "";
    const f = ate ? texto.indexOf(ate, i) : -1;
    return texto.slice(i + de.length, f < 0 ? undefined : f).trim();
  };
  const citadas = new Map<string, string>();
  for (const b of m.content) {
    if (b.type !== "text") continue;
    for (const c of ((b as { citations?: { url?: string; title?: string }[] }).citations ?? [])) if (c.url) citadas.set(c.url, c.title ?? c.url);
  }
  let fontes = parte("=== FONTES ===");
  for (const [url, titulo] of citadas) if (!fontes.includes(url)) fontes += `\n${titulo} — ${url}`;
  const pesquisa = parte("=== PESQUISA ===", "=== FONTES ===");
  return { resumo: parte("=== RESUMO ===", "=== PESQUISA ==="), texto: pesquisa || texto.trim(), fontes: fontes.trim(), em: new Date().toISOString() };
}

/** Confere o lote da parada; quando terminou, guarda a resposta. Devolve o estado do agente. */
async function conferir(admin: SupabaseClient, portalId: string, ag: Record<string, unknown>) {
  const parada = ag.parada as Parada;
  const marcar = (x: Record<string, unknown>) => marcarEm(admin, portalId, { ...ag, ...x });
  const client = new Anthropic({ apiKey: CHAVE });
  try {
    const lote = await client.messages.batches.retrieve(String(ag.lote));
    if (lote.processing_status !== "ended") return "trabalhando";
    let msg: Anthropic.Message | null = null;
    for await (const r of await client.messages.batches.results(lote.id)) {
      if (r.result.type === "errored") {
        const e = (r.result.error as { error?: { type?: string; message?: string } }).error;
        throw new Error(`O Claude deu erro (${e?.type ?? "erro"}${e?.message ? `: ${e.message}` : ""}). Tente de novo.`);
      }
      if (r.result.type !== "succeeded") throw new Error("O pedido expirou sem resposta. Tente de novo.");
      msg = r.result.message;
    }
    if (!msg) throw new Error("O Claude não devolveu a resposta.");
    if (msg.stop_reason === "refusal") throw new Error("O Claude recusou esta parada. Tente de novo.");
    if (msg.stop_reason === "max_tokens") throw new Error("A resposta ficou longa demais e foi cortada. Tente de novo pedindo mais objetividade nos ajustes.");
    // A pesquisa na internet pode pausar no meio: manda de novo o que já foi feito para ela continuar (até 6 vezes).
    if (msg.stop_reason === "pause_turn") {
      const voltas = Number(ag.voltas ?? 0);
      if (voltas >= 6) throw new Error("A pesquisa ficou longa demais. Tente de novo pedindo foco nos ajustes.");
      const pd = await pedido(admin, portalId, parada, String(ag.inicio ?? new Date().toISOString()));
      const anteriores = (ag.continua ?? []) as Anthropic.ContentBlockParam[];
      const feito = [...anteriores, ...(msg.content as unknown as Anthropic.ContentBlockParam[])];
      const novo = await entregar(parada, pd.system, [{ role: "user", content: pd.conteudo as Anthropic.ContentBlockParam[] }, { role: "assistant", content: feito }]);
      await marcar({ lote: novo, voltas: voltas + 1, continua: feito });
      return "trabalhando";
    }
    const agente = { ...ag, continua: undefined, estado: "pronto", fim: new Date().toISOString(), uso: msg.usage };
    let campo: Record<string, unknown>;
    if (parada === "mercado") campo = { mercado: lerMercado({ ...msg, content: [...((ag.continua ?? []) as Anthropic.ContentBlock[]), ...msg.content] }) };
    else {
      const bloco = msg.content.find((b) => b.type === "text");
      if (!bloco || bloco.type !== "text") throw new Error("O Claude não devolveu a resposta.");
      const saida = JSON.parse(bloco.text);
      campo = parada === "raiox" ? { raiox: saida } : parada === "perguntas" ? { perguntas: saida.perguntas } : parada === "solucao" ? { solucao: saida } : { hub: saida };
    }
    await admin.from("diagnostico_preparo").update({ ...campo, agente, updated_at: new Date().toISOString() }).eq("portal_id", portalId);
    return "pronto";
  } catch (e) {
    await marcar({ estado: "erro", continua: undefined, fim: new Date().toISOString(), msg: (e as Error).message.slice(0, 500) });
    return "erro";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);
  const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: aprova } = await usuario.rpc("pode_aprovar");
  if (aprova !== true) return json({ erro: "Só a Camilla usa o agente do Diagnóstico." }, 403);
  if (!CHAVE) return json({ erro: "Falta a chave do Claude no Supabase." }, 412);

  const { portal_id, parada, conferir: so_conferir } = await req.json().catch(() => ({}));
  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  if (so_conferir) {
    if (!portal_id) return json({ erro: "Informe a loja." }, 400);
    const { data } = await admin.from("diagnostico_preparo").select("agente").eq("portal_id", portal_id).maybeSingle();
    const a = (data?.agente ?? {}) as Record<string, unknown>;
    if (a.estado !== "trabalhando" || !a.lote) return json({ estado: a.estado ?? null });
    return json({ estado: await conferir(admin, portal_id, a) });
  }
  if (!portal_id || !PARADAS.includes(parada)) return json({ erro: "Informe a loja e a parada." }, 400);
  const { data: prep } = await admin.from("diagnostico_preparo").select("agente, raiox, escolha").eq("portal_id", portal_id).maybeSingle();
  const ag = (prep?.agente ?? {}) as { estado?: string; inicio?: string; lote?: string };
  // Com lote entregue, espera até 3 horas; sem lote (a entrega caiu no meio), libera depois de 5 minutos.
  const espera = ag.lote ? 180 * 60_000 : 5 * 60_000;
  if (ag.estado === "trabalhando" && Date.now() - Date.parse(ag.inicio ?? "0") < espera) return json({ erro: "O agente já está trabalhando nesta loja. Aguarde terminar." }, 409);
  if (parada !== "raiox" && parada !== "mercado" && !prep?.escolha) return json({ erro: "Escolha o gargalo e a alavanca antes de seguir." }, 400);

  const agente = { parada, estado: "trabalhando", inicio: new Date().toISOString() };
  if (prep) await admin.from("diagnostico_preparo").update({ agente, updated_at: new Date().toISOString() }).eq("portal_id", portal_id);
  else await admin.from("diagnostico_preparo").insert({ portal_id, agente });
  // @ts-ignore: EdgeRuntime existe nas Edge Functions do Supabase
  EdgeRuntime.waitUntil(rodar(admin, portal_id, parada as Parada));
  return json({ ok: true }, 202);
});
