// O agente do Diagnóstico: prepara a reunião de diagnóstico da Camilla em paradas, seguindo o Método Loja Magnética
// (instruções na tabela metodo, chave 'diagnostico_agente'). Lê a passagem do Comercial, os Dados da loja, o caixa,
// a equipe, a Análise do Instagram, os relatórios que a loja (ou a Camilla) subiu e as transcrições coladas.
// Paradas: raiox → perguntas → solucao → hub (a versão do Diagnóstico da loja, que a Camilla compara e aplica). Cada parada espera a decisão
// da Camilla. Só quem monta (Camilla e CS) chama. Precisa da chave do Claude.
// Com muito material o Claude passa do tempo máximo de uma função do Supabase (150 s). Por isso o pedido vai como lote
// (Message Batches): a função entrega o pedido e guarda o número do lote em agente.lote; a tela chama de novo com
// { conferir: true } a cada pouco, e quando o lote termina a resposta é guardada.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";
import { strFromU8, unzipSync } from "npm:fflate@0.8.2";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { extractText, getDocumentProxy } from "npm:unpdf@1.9.1";

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

// Limites do Claude por pedido: 600 páginas de PDF, 32 MB e a janela de 1 milhão de tokens (cada página de PDF
// enviada como documento vira texto + imagem, uns 2.500 tokens). Por isso os PDFs com texto (relatórios de venda,
// estoque, ticket) vão só como texto, umas 4 vezes mais leve; os escaneados e o formulário (com caixinhas marcadas)
// vão como documento. O texto lido fica guardado em relatorios/<loja>/_texto/ para as próximas etapas.
// Os arquivos entram por ordem de importância; antes de enviar, o pedido é contado de verdade (count_tokens)
// e os menos importantes saem até caber. O que sai é avisado.
const MAX_TEXTO_PDF = 1_600_000; // letras de PDFs lidos como texto, somadas
const MAX_PAGINAS = 550;
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_IMAGENS = 20;
const MAX_IMAGEM = 5 * 1024 * 1024;
const MAX_TOKENS_ENTRADA = 700_000; // folga para a resposta e para não pesar no custo de cada parada

/** Páginas de um PDF lidas por um leitor de PDF de verdade (conta certo também nos PDFs com páginas comprimidas).
 *  Devolve null quando o PDF tem senha ou está quebrado: o Claude também não conseguiria ler. */
async function paginasPdf(buf: Uint8Array): Promise<number | null> {
  try {
    const doc = await PDFDocument.load(buf, { updateMetadata: false, throwOnInvalidObject: false });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

/** O texto de um PDF, página por página. null quando não dá para ler. Recebe uma cópia: o leitor consome o buffer. */
async function textoPdf(buf: Uint8Array): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: false });
    return (text as string[]).map((t, i) => `--- página ${i + 1} ---\n${t}`).join("\n");
  } catch {
    return null;
  }
}

/** Tipo real da imagem pelos primeiros bytes (a extensão do arquivo pode mentir, ex.: foto HEIC salva como .jpg). */
function tipoImagem(b: Uint8Array) {
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  return null;
}

/** Ordem de leitura: formulário e diagnóstico, depois o ano atual (vendas, ticket, estoque), depois o resto e por último os anos anteriores e pedidos. */
function prioridade(nome: string) {
  const n = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const ano = new Date().getFullYear();
  if (/formul|diagnostico/.test(n)) return 0;
  if (/adobe-scan|relatorio|tiket|ticket|ultimos|estoque/.test(n) && !n.includes(String(ano - 1))) return 1;
  if (n.includes(String(ano))) return 2;
  if (/pedido|contrato|guia|photo|\.jpe?g$|\.png$/.test(n)) return 5;
  if (n.includes(String(ano - 1))) return 4;
  return 3;
}

/** Tempo máximo de leitura de PDFs novos por chamada. O Supabase derruba a função quando passa do tempo de
 *  processamento ("CPU Time exceeded"); por isso a leitura vai em partes e a função se chama de novo para continuar. */
const MAX_LEITURA_MS = 400;
class Continua extends Error { constructor(public faltam: number) { super(faltam ? `Lendo os arquivos: faltam ${faltam}` : "Arquivos lidos: montando o pedido"); } }

/** Um arquivo pronto para entrar no pedido, com a estimativa de tokens (para escolher quem sai se não couber). */
type Item = { nome: string; blocos: Bloco[]; est: number };

async function arquivos(admin: SupabaseClient, portalId: string, filtro?: RegExp) {
  const itens: Item[] = [];
  const avisos: string[] = [];
  const { data: todos } = await admin.storage.from("relatorios").list(portalId, { limit: 300, sortBy: { column: "created_at", order: "desc" } });
  // O mesmo arquivo importado duas vezes do Drive (mesmo final de nome e tamanho) entra uma vez só.
  const vistos = new Set<string>();
  const lista = (todos ?? []).filter((x) => x.id && (!filtro || filtro.test(x.name))).filter((x) => {
    const chave = `${x.name.slice(-50)}|${x.metadata?.size ?? ""}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  }).sort((a, b) => prioridade(a.name) - prioridade(b.name));
  let texto = 0, paginas = 0, bytes = 0, imagens = 0, textoPdfs = 0;
  // Textos de PDF já lidos em outra etapa.
  const { data: guardados } = await admin.storage.from("relatorios").list(`${portalId}/_texto`, { limit: 1000 });
  const jaLidos = new Set((guardados ?? []).map((x) => x.name));
  const guardar = (nome: string, conteudo: string) =>
    admin.storage.from("relatorios").upload(`${portalId}/_texto/${nome}`, new Blob([conteudo], { type: "text/plain" }), { upsert: true });

  // 1) Enquanto houver PDF novo, a chamada só lê PDFs (o pedido é montado na chamada seguinte, com tudo lido).
  const novos = lista.filter((f) => f.name.toLowerCase().endsWith(".pdf") && prioridade(f.name) > 0
    && !jaLidos.has(`${f.name}.txt`) && Number(f.metadata?.size ?? 0) <= MAX_ARQUIVO);
  if (novos.length) {
    let lendo = 0, feitos = 0;
    for (const f of novos) {
      if (lendo > MAX_LEITURA_MS) break;
      const guardado = `${f.name}.txt`;
      // Uma chamada anterior caiu lendo este PDF: ele vai como documento, sem tentar ler de novo.
      if (jaLidos.has(`${guardado}.lendo`)) { await guardar(guardado, ""); feitos++; continue; }
      await guardar(`${guardado}.lendo`, "1");
      const { data: blob } = await admin.storage.from("relatorios").download(`${portalId}/${f.name}`);
      const t0 = performance.now();
      const txt = blob ? await textoPdf(new Uint8Array(await blob.arrayBuffer())) : null;
      lendo += performance.now() - t0;
      // Guarda mesmo quando não deu para ler, para não tentar de novo a cada chamada.
      await guardar(guardado, txt ?? "");
      feitos++;
    }
    return { itens, avisos, faltam: novos.length - feitos, leu: true };
  }

  // 2) Tudo lido: monta o pedido.
  for (const f of lista) {
    const nome = f.name;
    const ext = nome.split(".").pop()?.toLowerCase() ?? "";
    const tam = Number(f.metadata?.size ?? 0);
    const ehImagem = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
    if (tam > MAX_ARQUIVO) { avisos.push(`${nome}: grande demais (${Math.round(tam / 1048576)} MB), não foi lido`); continue; }
    if (ehImagem && tam > MAX_IMAGEM) { avisos.push(`${nome}: imagem acima de 5 MB, não foi lida`); continue; }
    if (ehImagem && imagens >= MAX_IMAGENS) { avisos.push(`${nome}: ficou de fora (já entraram ${MAX_IMAGENS} imagens)`); continue; }
    if (ehImagem && bytes + tam > MAX_BYTES) { avisos.push(`${nome}: ficou de fora (o pedido já estava no limite de tamanho)`); continue; }
    const { data: blob } = await admin.storage.from("relatorios").download(`${portalId}/${nome}`);
    if (!blob) { avisos.push(`${nome}: não deu para abrir`); continue; }
    const buf = new Uint8Array(await blob.arrayBuffer());
    if (ext === "pdf") {
      const cabeca = new TextDecoder("latin1").decode(buf.subarray(0, 1024));
      if (!cabeca.includes("%PDF")) { avisos.push(`${nome}: não é um PDF de verdade, não foi lido`); continue; }
      // Formulário e diagnóstico vão sempre como documento (as caixinhas marcadas só aparecem na imagem).
      let txt: string | null = null;
      if (prioridade(nome) > 0) {
        const guardado = `${nome}.txt`;
        if (jaLidos.has(guardado)) {
          const { data: b } = await admin.storage.from("relatorios").download(`${portalId}/_texto/${guardado}`);
          txt = b ? await b.text() : null;
        }
        if (txt === "") txt = null; // não deu para ler o texto: vai como documento
      }
      // As páginas vêm do texto já lido; sem ele, do leitor de PDF (que também acusa PDF com senha ou quebrado).
      const pg = txt ? Math.max(1, (txt.match(/^--- página \d+ ---$/gm) ?? []).length) : await paginasPdf(buf);
      if (pg === null) { avisos.push(`${nome}: PDF com senha ou danificado, não foi lido (salve de novo como PDF, sem senha, e suba)`); continue; }
      // Com texto de verdade (não escaneado), vai como texto.
      if (txt && txt.length / pg >= 800) {
        if (textoPdfs + txt.length > MAX_TEXTO_PDF) { avisos.push(`${nome}: ficou de fora (o limite de texto dos relatórios já estava cheio)`); continue; }
        textoPdfs += txt.length;
        itens.push({ nome, est: Math.ceil(txt.length / 3), blocos: [{ type: "text", text: `Arquivo: ${nome} (texto do PDF)\n${txt}` }] });
        continue;
      }
      if (bytes + buf.length > MAX_BYTES) { avisos.push(`${nome}: ficou de fora (o pedido já estava no limite de tamanho)`); continue; }
      if (paginas + pg > MAX_PAGINAS) { avisos.push(`${nome}: ficou de fora (${pg} páginas; o limite de páginas de PDF já estava cheio)`); continue; }
      paginas += pg; bytes += buf.length;
      itens.push({ nome, est: pg * 2500, blocos: [
        { type: "text", text: `Arquivo: ${nome}` },
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64(buf) } },
      ] });
    } else if (ehImagem) {
      const tipo = tipoImagem(buf);
      if (!tipo) { avisos.push(`${nome}: formato de imagem que o Claude não lê (ex.: HEIC do iPhone), não foi lida`); continue; }
      imagens++; bytes += buf.length;
      itens.push({ nome, est: 1600, blocos: [
        { type: "text", text: `Imagem: ${nome}` },
        { type: "image", source: { type: "base64", media_type: tipo as "image/png", data: base64(buf) } },
      ] });
    } else if (["xlsx", "xls", "csv", "txt", "ods", "docx"].includes(ext)) {
      let conteudo = "";
      try {
        if (ext === "csv" || ext === "txt") conteudo = new TextDecoder().decode(buf);
        else if (ext === "docx") conteudo = textoWord(buf);
        else {
          const wb = XLSX.read(buf, { type: "array" });
          conteudo = wb.SheetNames.map((s) => `--- aba ${s} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[s], { blankrows: false })}`).join("\n");
        }
      } catch { avisos.push(`${nome}: não deu para ler (salve como PDF e suba de novo)`); continue; }
      if (texto + conteudo.length > MAX_TEXTO) {
        const cabe = Math.max(0, MAX_TEXTO - texto);
        avisos.push(`${nome}: só as primeiras ${cabe.toLocaleString("pt-BR")} de ${conteudo.length.toLocaleString("pt-BR")} letras couberam na leitura`);
        conteudo = conteudo.slice(0, cabe);
      }
      texto += conteudo.length;
      if (conteudo) itens.push({ nome, est: Math.ceil(conteudo.length / 3), blocos: [{ type: "text", text: `Arquivo: ${nome}\n${conteudo}` }] });
    } else avisos.push(`${nome}: formato .${ext} não é lido (use PDF, Word, planilha, CSV ou imagem)`);
  }
  return { itens, avisos, faltam: 0, leu: false };
}

/** Conta o pedido de verdade e tira os arquivos menos importantes (os últimos da lista) até caber na janela do Claude. */
async function caber(system: string, itens: Item[], fim: () => string, avisos: string[]) {
  const client = new Anthropic({ apiKey: CHAVE });
  for (let volta = 0; volta < 5; volta++) {
    const conteudo: Bloco[] = [...itens.flatMap((i) => i.blocos), { type: "text", text: fim() }];
    let total: number;
    try {
      // @ts-ignore: documentos em base64 entram na contagem como no pedido
      total = (await client.messages.countTokens({ model: MODELO, ...(system ? { system } : {}), messages: [{ role: "user", content: conteudo }] })).input_tokens;
    } catch (e) {
      const msg = (e as Error).message;
      // Erro que não é de tamanho (ex.: um PDF que o Claude não consegue abrir): diz qual foi, sem enviar o lote.
      if (!/too long|too large|maximum|exceed/i.test(msg)) throw new Error(`O Claude não aceitou o material: ${msg.slice(0, 300)}`);
      total = Number.MAX_SAFE_INTEGER;
    }
    if (total <= MAX_TOKENS_ENTRADA) return { conteudo, total };
    // Tira do fim (menos importante) até a estimativa cobrir o excesso, com folga.
    let falta = total === Number.MAX_SAFE_INTEGER ? Math.ceil(itens.reduce((s, i) => s + i.est, 0) * 0.15) : Math.ceil((total - MAX_TOKENS_ENTRADA) * 1.1);
    if (!itens.length) break;
    while (falta > 0 && itens.length) {
      const i = itens.pop()!;
      falta -= i.est;
      avisos.push(`${i.nome}: ficou de fora (o material todo passou do tamanho que o Claude lê de uma vez)`);
    }
  }
  throw new Error("O material desta loja é grande demais mesmo sem os arquivos menos importantes. Tire arquivos repetidos ou antigos da pasta e tente de novo.");
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
  if (docs.leu) throw new Continua(docs.faltam);
  const memoria = (mem?.dados ?? {}) as { instrucoes?: string; exemplo?: string };
  const tr = (prep?.transcricoes ?? {}) as Record<string, string>;
  const partes = [
    `Loja: ${base.loja}. Dona ou dono: ${base.responsavel || "—"}. Hoje: ${hoje.slice(0, 10)}.`,
    `Dados que estão no Hub: ${JSON.stringify(base.dados)}`,
    tr.comercial ? `Transcrição da reunião do Comercial:\n${tr.comercial}` : "Transcrição da reunião do Comercial: não colada.",
    tr.onboarding ? `Transcrição do onboarding com a CS:\n${tr.onboarding}` : "Transcrição do onboarding: não colada.",
    tr.outras ? `Outras anotações e conversas:\n${tr.outras}` : "",
    "@@ARQUIVOS@@",
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
  partes.push(TAREFA[parada], parada === "mercado" ? "Responda só no formato pedido, com os três marcadores."
    : parada === "hub" ? `Responda só com um JSON válido (sem texto antes ou depois), seguindo exatamente este esquema JSON: ${JSON.stringify(ESQUEMAS.hub)}`
    : "Responda só com o JSON pedido.");
  const system = memoria.instrucoes ?? "";
  // A lista de arquivos lidos e os avisos entram no texto depois de saber o que coube.
  const fim = () => partes.filter(Boolean).join("\n\n").replace("@@ARQUIVOS@@", [
    docs.itens.length ? `Arquivos lidos: ${docs.itens.map((i) => i.nome).join(", ")}.` : "Nenhum relatório foi subido no Hub para esta loja.",
    docs.avisos.length ? `Avisos sobre os arquivos (conte isso nas pendências): ${docs.avisos.join("; ")}.` : "",
  ].filter(Boolean).join("\n\n"));
  const { conteudo } = await caber(system, docs.itens, fim, docs.avisos);
  return { system, conteudo, avisos: docs.avisos };
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
  // O esquema do Hub é grande demais para a resposta presa ao esquema ("compiled grammar is too large"):
  // ele vai escrito no pedido e a resposta é lida como JSON solto.
  if (parada === "hub") return { model: MODELO, max_tokens: 32000, system, messages: mensagens, output_config: { effort: "medium" } };
  return {
    model: MODELO, max_tokens: 32000, system, messages: mensagens,
    output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMAS[parada as Exclude<Parada, "mercado">] } },
  };
}

/** O JSON da resposta, mesmo quando vem entre ``` ou com texto em volta. */
function lerJson(texto: string) {
  try { return JSON.parse(texto); } catch { /* segue */ }
  const i = texto.indexOf("{"), f = texto.lastIndexOf("}");
  if (i < 0 || f <= i) throw new Error("O Claude não devolveu o JSON pedido. Tente de novo.");
  return JSON.parse(texto.slice(i, f + 1));
}

async function entregar(parada: Parada, system: string, mensagens: Anthropic.MessageParam[]) {
  const client = new Anthropic({ apiKey: CHAVE });
  // @ts-ignore: output_config e a busca na internet podem não estar no tipo desta versão do SDK
  const lote = await client.messages.batches.create({ requests: [{ custom_id: parada, params: parametros(parada, system, mensagens) }] });
  return lote.id;
}

/** Monta o pedido da parada e entrega ao Claude como lote. */
async function rodar(admin: SupabaseClient, portalId: string, parada: Parada, inicio = new Date().toISOString()) {
  const marcar = (agente: Record<string, unknown>) => marcarEm(admin, portalId, { parada, inicio, ...agente });
  try {
    const pd = await pedido(admin, portalId, parada, inicio);
    const lote = await entregar(parada, pd.system, [{ role: "user", content: pd.conteudo as Anthropic.ContentBlockParam[] }]);
    await marcar({ estado: "trabalhando", lote, avisos: pd.avisos });
  } catch (e) {
    if (e instanceof Continua) {
      // Ainda há PDFs para ler: guarda o andamento e chama a função de novo para continuar.
      await marcar({ estado: "trabalhando", lendo: e.message });
      await chamarDeNovo(admin, portalId, parada);
      return;
    }
    await marcar({ estado: "erro", fim: new Date().toISOString(), msg: (e as Error).message.slice(0, 500) });
  }
}

/** A função chama a si mesma (com a chave interna) para seguir lendo os arquivos. */
async function chamarDeNovo(admin: SupabaseClient, portalId: string, parada: Parada) {
  const { data } = await admin.from("chaves_internas").select("valor").eq("nome", "diagnostico").maybeSingle();
  if (!data?.valor) throw new Error("Falta a chave interna do Diagnóstico.");
  await fetch(`${URL}/functions/v1/diagnostico-agente`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, "x-hub-interno": data.valor },
    body: JSON.stringify({ portal_id: portalId, parada, continuar: true }),
  });
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
      const saida = lerJson(bloco.text);
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
  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  // Quem monta (Camilla e CS) roda o agente; liberar para a loja continua só com a Camilla.
  // O próprio banco também pode chamar (chave guardada em chaves_internas, nome "diagnostico"), como a agenda.
  const interno = req.headers.get("x-hub-interno");
  let liberado = false;
  if (interno) {
    const { data } = await admin.from("chaves_internas").select("valor").eq("nome", "diagnostico").maybeSingle();
    liberado = !!data?.valor && data.valor.length >= 32 && data.valor === interno;
  }
  if (!liberado) {
    const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: monta } = await usuario.rpc("pode_montar");
    if (monta !== true) return json({ erro: "Só a Camilla e a CS usam o agente do Diagnóstico." }, 403);
  }
  if (!CHAVE) return json({ erro: "Falta a chave do Claude no Supabase." }, 412);

  const { portal_id, parada, conferir: so_conferir, continuar } = await req.json().catch(() => ({}));
  if (so_conferir) {
    if (!portal_id) return json({ erro: "Informe a loja." }, 400);
    const { data } = await admin.from("diagnostico_preparo").select("agente").eq("portal_id", portal_id).maybeSingle();
    const a = (data?.agente ?? {}) as Record<string, unknown>;
    if (a.estado !== "trabalhando" || !a.lote) return json({ estado: a.estado ?? null });
    return json({ estado: await conferir(admin, portal_id, a) });
  }
  if (!portal_id || !PARADAS.includes(parada)) return json({ erro: "Informe a loja e a parada." }, 400);
  // Continuação da leitura em partes (só a própria função chama assim).
  if (continuar && liberado) {
    const { data: c } = await admin.from("diagnostico_preparo").select("agente").eq("portal_id", portal_id).maybeSingle();
    const a = (c?.agente ?? {}) as { estado?: string; parada?: string; inicio?: string; lote?: string };
    if (a.estado !== "trabalhando" || a.parada !== parada || a.lote) return json({ ok: false, motivo: "nada para continuar" });
    // @ts-ignore: EdgeRuntime existe nas Edge Functions do Supabase
    EdgeRuntime.waitUntil(rodar(admin, portal_id, parada as Parada, a.inicio));
    return json({ ok: true }, 202);
  }
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
