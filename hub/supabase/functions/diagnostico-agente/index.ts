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

type Parada = "raiox" | "mercado" | "perguntas" | "solucao" | "hub" | "plano";
const PARADAS: Parada[] = ["raiox", "mercado", "perguntas", "solucao", "hub", "plano"];
type Bloco = Anthropic.Beta.BetaContentBlockParam;

// ───── Esquemas da resposta de cada parada ─────
const t = { type: "string" };
const n = { type: "number" };
const nulo = (x: unknown) => ({ anyOf: [x, { type: "null" }] });
const lista = (items: unknown) => ({ type: "array", items });
const obj = (props: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
const PILARES = ["Gestão Analítica", "Gestão Pessoas", "Processos Comerciais", "MKT Conteúdo"];
const NIVEL = { type: "string", enum: ["ok", "atencao", "critico"] };

// Os campos de Dados da loja (cópia de hub/lib/conteudo.ts, ETAPAS; atualizar junto quando mudar).
const CAMPOS_TEXTO = "1 A loja hoje: tempo_loja (Há quanto tempo a loja existe?); segmento (Segmento; uma de: Multimarca feminina | Multimarca masculina | Moda praia | Infantil | Plus size | Marca própria | Outro); faturamento_medio (Faturamento médio mensal (R$); número); maior_desafio (Hoje, qual é o maior desafio da loja?); o_que_funciona (O que já funciona bem?); onde_quer_chegar (Onde você quer que a loja esteja daqui a 12 meses?); o_que_movimenta (O que hoje você acredita que mais movimenta a loja?); objetivos (Quais são os seus objetivos com a mentoria? Liste em ordem de prioridade, do mais importante para o menos importante.); faturamento_12m (Faturamento e peças vendidas em cada um dos últimos 12 meses)\n9 Gestão da loja: freq_reuniao (Com que frequência você faz reunião com o time?; uma de: Toda semana | A cada 15 dias | Uma vez por mês | Só quando precisa | Não faço reunião); reconhece (Quando você faz as reuniões, costuma mostrar o resultado de todos e reconhecer publicamente?); rotina_dona (Me descreva a sua rotina hoje na loja); ultimo_treinamento (Qual foi a última vez que foi feito um treinamento com o seu time? Conte um pouco sobre o resultado.); processos (Vocês têm processos escritos na loja (metas, roteiro de venda, rotinas do time)?; uma de: Sim, temos e o time segue | Temos algo, mas é informal | Não temos nada escrito); vm (Vitrine e arrumação da loja: quem cuida e de quanto em quanto tempo vocês trocam?); sistema (Qual sistema vocês usam para vendas e estoque?)\n10 Ações e resultados: acao_sucesso (Qual a ação de maior sucesso da loja até hoje? Me descreva como foi feita e qual resultado teve.); acao_sem_retorno (Em qual ação você fez um grande investimento de energia ou dinheiro e não teve o retorno esperado? Descreva com detalhes.)\n5 Time de vendas: tamanho_time (Quantas pessoas atendem?; número); comissao (Como funciona a comissão?); equipe_detalhe (Para cada pessoa: horário, salário fixo, comissão e benefícios); desafio_time (Qual é o maior desafio do time no atendimento hoje?)\n3 Cliente ideal: idade (Faixa de idade); perfil (Como ela é? (profissão, rotina, estilo)); valoriza (O que ela mais valoriza na sua loja?); objecoes (Objeções que mais aparecem); pos_venda (Como é o depois da compra? Vocês fazem pós-venda, reativação ou acompanhamento? Como?); carteira (Você trabalha a sua carteira de clientes (reativação, relacionamento, recompra)?; uma de: Sim, tenho um processo para isso | Faço de vez em quando | Ainda não faço); malinha (Vocês trabalham com malinha (condicional)? Como funciona?)\n4 Mix de produtos e preços: marcas (Principais marcas); categorias (Categorias que mais vendem); faixa_preco (Faixa de preço (da peça mais barata à mais cara)); markup (Markup médio; número); estoque (Como está o estoque hoje?; uma de: Equilibrado | Muita peça parada | Falta peça boa | Não sei)\n8 Estoque e relatórios: valor_estoque (Quanto você tem em estoque, a preço de venda (R$)?; número); pecas_estoque (Quantas peças tem em estoque?; número); pm_estoque (Preço médio das peças do estoque (R$); número); linhas (Principais linhas e quanto cada uma representa); fornecedores (Principais fornecedores (até 5) e quanto cada um representa); compra_mes (Quanto você compra por mês, em média (R$)?; número); parado (Que parte do estoque está parada há mais de 3 meses?; uma de: Quase nada (até 10%) | Um pouco (10% a 30%) | Bastante (30% a 50%) | Mais da metade); receber_manual (Sem o relatório de contas a receber? Escreva quanto você tem a receber no crediário e quanto está atrasado.); crediario_pct (Quanto do faturamento é vendido no crediário ou fiado (boleto, nota, carnê)? (%); número); crediario_como (Como funciona o crediário: em quantas vezes, quem libera e como vocês cobram?)\n7 Canais e conteúdo: canais (Onde você vende hoje?; várias de: Loja física | WhatsApp | Instagram (Direct) | Site / e-commerce | Malinha / condicional); principal (Qual canal traz mais faturamento?); base_clientes (Quantas clientes tem na base (com WhatsApp)?; número); freq_posts (Com que frequência você posta os conteúdos da loja hoje?; uma de: Todo dia | 3 a 5 vezes por semana | 1 a 2 vezes por semana | Menos de 1 vez por semana | Quase nunca); como_pensa (Como você pensa nos conteúdos hoje?); dificuldade_conteudo (O que você acha mais difícil na hora de produzir os conteúdos da loja?); resultado_conteudo (O quanto você acha que postar conteúdo hoje traz resultado para a loja?; uma de: Traz muito resultado | Traz algum resultado | Traz pouco resultado | Não traz resultado | Não sei dizer); instagram (Qual é o @ do Instagram da loja?); quem_posta (Quem cria e quem posta os conteúdos?); inspiracoes (Quais perfis te inspiram? Coloque o @ de cada um.); concorrentes (Quais são os @ dos seus principais concorrentes?); trafego (Vocês investem em anúncio pago (tráfego)? Quanto por mês e como sabem se deu resultado?); insta_numeros (Sem os prints do Instagram? Escreva os números do Painel Profissional dos últimos 30 dias.); loja_descricao (Sem vídeo ou fotos da loja? Descreva como ela é.)";
const CAMPOS: Record<number, Record<string, string>> = {"1":{"tempo_loja":"texto","segmento":"opcao","faturamento_medio":"numero","maior_desafio":"textarea","o_que_funciona":"textarea","onde_quer_chegar":"textarea","o_que_movimenta":"textarea","objetivos":"textarea","faturamento_12m":"textarea"},"3":{"idade":"texto","perfil":"textarea","valoriza":"textarea","objecoes":"textarea","pos_venda":"textarea","carteira":"opcao","malinha":"textarea"},"4":{"marcas":"textarea","categorias":"textarea","faixa_preco":"texto","markup":"numero","estoque":"opcao"},"5":{"tamanho_time":"numero","comissao":"textarea","equipe_detalhe":"textarea","desafio_time":"textarea"},"7":{"canais":"multi","principal":"texto","base_clientes":"numero","freq_posts":"opcao","como_pensa":"textarea","dificuldade_conteudo":"textarea","resultado_conteudo":"opcao","instagram":"texto","quem_posta":"texto","inspiracoes":"textarea","concorrentes":"textarea","trafego":"textarea","insta_numeros":"textarea","loja_descricao":"textarea"},"8":{"valor_estoque":"numero","pecas_estoque":"numero","pm_estoque":"numero","linhas":"textarea","fornecedores":"textarea","compra_mes":"numero","parado":"opcao","receber_manual":"textarea","crediario_pct":"numero","crediario_como":"textarea"},"9":{"freq_reuniao":"opcao","reconhece":"textarea","rotina_dona":"textarea","ultimo_treinamento":"textarea","processos":"opcao","vm":"textarea","sistema":"texto"},"10":{"acao_sucesso":"textarea","acao_sem_retorno":"textarea"}};

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
    // O que já foi informado vai direto para as áreas do portal (só nos campos vazios).
    dados_da_loja: lista(obj({ etapa: n, campo: t, valor: t, situacao: { type: "string", enum: ["tenho", "estimado", "nao_tenho"] }, fonte: t })),
    equipe: lista(obj({ nome: t, funcao: t })),
    contato: obj({ whatsapp: t, cidade: t, instagram: t, email: t }),
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
  // O Plano de Ação: tema e tarefas de cada mês e, para cada pedido da cliente, em que mês ele é atendido.
  plano: obj({
    resumo: t,
    meses: lista(obj({ mes: n, tema: t, porque: t, tarefas: lista(t) })),
    pedidos: lista(obj({ pedido: t, fonte: t, mes: n, como: t })),
    fora: lista(obj({ pedido: t, porque: t })),
  }),
};

const TAREFA: Record<Parada, string> = {
  raiox: [
    "Faça a PARADA 1 (Raio-X e proposta de gargalo e alavanca). Em \"faltando\", liste o que falta e para que serve.",
    "SEJA EXTREMAMENTE MINUCIOSO: leia todo o material (formulário, planilhas de respostas, contrato, pedidos de fornecedor, relatórios, transcrições, anotações, Análise do Instagram) antes de dizer que algo falta. Nunca liste em \"faltando\" o que já está no material, nem em parte: diga o que já tem e peça só o resto.",
    "Em \"dados_da_loja\", preencha TODOS os campos dos Dados da loja que estão vazios no Hub (veja dados_da_loja em \"Dados que estão no Hub\") e cuja resposta está no material, um item por campo, com a etapa e o id do campo exatamente como na lista abaixo, o valor em linguagem simples (número sem R$ nem pontos nos campos de número; nas opções, exatamente uma das opções; em \"várias de\", as opções separadas por \" | \") e a fonte. situacao: \"tenho\" quando o dado está escrito no material; \"estimado\" quando você calculou ou montou (ex.: a cliente ideal pela Análise do Instagram, pelas marcas, pelo ticket e pela forma de pagamento; o tempo de loja pela data do CNPJ); \"nao_tenho\" quando o material mostra que a loja não tem esse dado (ex.: não controla a base de clientes) e não vale pedir de novo. Não repita campo já preenchido no Hub.",
    "Em \"equipe\", cada pessoa que trabalha na loja (nome e função), se o material trouxer. Em \"contato\", o WhatsApp da dona, a cidade (cidade-UF), o @ e o e-mail que aparecem no material (contrato, pedidos, formulário); vazio quando não tiver.",
    `Campos dos Dados da loja (etapa título: id (pergunta; tipo)):\n${CAMPOS_TEXTO}`,
  ].join("\n"),
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
  plano: [
    "Monte o PLANO DE AÇÃO desta loja, mês a mês, do jeito da Camilla (veja os planos de outras lojas abaixo: o tamanho das tarefas, o tom e a ordem). É o que a dona vai ver e marcar no Hub.",
    "1) PRIMEIRO, LISTE OS DESEJOS DA CLIENTE COM AS PALAVRAS DELA: loja que veio do Drive = as respostas do formulário \"Diagnóstico da Sua Loja\" (objetivos na ordem de prioridade que ela deu, o que quer ter construído ao fim da mentoria, os desafios que marcou); loja que entrou direto pelo portal = as respostas dela no Hub. NUNCA tire desejo do resumo do Comercial, do Raio-X ou de outro agente (no máximo como apoio, e nunca um número que ela não disse). Cada desejo vira uma linha em \"pedidos\", com a fonte (a pergunta do formulário ou do Hub) e o mês em que o plano entrega. O que não couber vai em \"fora\" com o motivo (e só se não couber mesmo).",
    "2) A ORDEM DOS MESES: OS DOIS PRIMEIROS MESES DEPOIS DA ENTREGA DO PORTAL TÊM DE ENTREGAR OS DESEJOS QUE ELA LISTOU PRIMEIRO: é isso que define a satisfação dela com o plano. O gargalo e a alavanca do Diagnóstico entram junto, como o caminho para esses desejos. Depois vêm os desejos seguintes, em ordem lógica (um mês prepara o outro).",
    "3) CADA MÊS tem UMA CORREÇÃO de gestão e processos e PELO MENOS UM IMPULSIONADOR de resultado (venda, cliente, faturamento). O tema do mês segue \"Correção: … · Impulsionador: …\", na linguagem da cliente, com o porquê em uma frase e de 4 a 7 tarefas (primeiro as da correção, depois as do impulsionador). Meta do mês = mesmo mês do ano anterior +20%, salvo número que a própria cliente deu. Tarefa começa com verbo, é concreta (o quê, quem, com que número ou ferramenta do Hub) e cabe no mês. Use os números do Diagnóstico e o nome das pessoas do time quando ajudar.",
    "4) NÃO REPITA o que já está no plano atual da loja (lista abaixo): complete. Siga as regras do método (pós-venda em 24 h sem oferecer nada, aniversariantes, mensagem que diz quem fala, CTA que conduz, carteira por vendedora e missão da semana igual para o time) e a linha de gestão (a responsabilidade com a pessoa, o combinado sai dela). Nunca use \"balcão\".",
  ].join("\n"),
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
const MAX_BYTES = 14 * 1024 * 1024; // em base64 vira uns 19 MB; o pedido todo tem de ficar abaixo de 32 MB
const MAX_IMAGENS = 20;
const MAX_IMAGEM = 5 * 1024 * 1024;
const MAX_TOKENS_ENTRADA = 850_000; // a janela é de 1 milhão; o resto fica para a resposta

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

/** Deixa o texto de um relatório mais leve sem perder dado: junta espaços repetidos e tira as linhas que se
 *  repetem em quase todas as páginas (cabeçalho e rodapé do sistema), mantendo a primeira vez que aparecem. */
function compactar(txt: string) {
  if (!txt) return txt;
  const paginas = txt.split(/^(?=--- página \d+ ---$)/m).map((p) => p.split("\n").map((l) => l.replace(/[ \t\u00a0]+/g, " ").trim()).filter(Boolean));
  if (paginas.length >= 3) {
    // Só conta como cabeçalho a linha comprida que aparece uma vez por página (dado de tabela, como "UN", fica).
    const vezes = new Map<string, number>(), total = new Map<string, number>();
    for (const p of paginas) {
      for (const l of p) total.set(l, (total.get(l) ?? 0) + 1);
      for (const l of new Set(p)) vezes.set(l, (vezes.get(l) ?? 0) + 1);
    }
    const repetidas = new Set([...vezes].filter(([l, v]) => l.length >= 12 && !/^--- página/.test(l)
      && v >= paginas.length * 0.5 && (total.get(l) ?? 0) <= v * 1.2).map(([l]) => l));
    // Só sai do topo e do pé de cada página (até 8 linhas de cada lado); o meio da página, onde ficam os dados, fica inteiro.
    const vistas = new Set<string>();
    for (let k = 0; k < paginas.length; k++) {
      const p = paginas[k], n = p.length;
      paginas[k] = p.filter((l, i) => {
        if (!repetidas.has(l) || (i > 8 && i < n - 8)) return true;
        if (vistas.has(l)) return false;
        vistas.add(l);
        return true;
      });
    }
  }
  return paginas.map((p) => p.join("\n")).join("\n");
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
  if (/adobe-scan|relatorio|tiket|ticket|ultimos|estoque|fechamento|caixa|faturamento|analise/.test(n) && !n.includes(String(ano - 1))) return 1;
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
          txt = b ? compactar(await b.text()) : null;
        }
        if (txt === "") txt = null; // não deu para ler o texto: vai como documento
      }
      // As páginas vêm do texto já lido; sem ele, do leitor de PDF (que também acusa PDF com senha ou quebrado).
      const pg = txt ? Math.max(1, (txt.match(/^--- página \d+ ---$/gm) ?? []).length) : await paginasPdf(buf);
      if (pg === null) { avisos.push(`${nome}: PDF com senha ou danificado, não foi lido (salve de novo como PDF, sem senha, e suba)`); continue; }
      // Com texto de verdade (não escaneado), vai como texto.
      if (txt && txt.length / pg >= 400) {
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
  const contagens: (number | string)[] = [];
  for (let volta = 0; volta < 8; volta++) {
    const conteudo: Bloco[] = [...itens.flatMap((i) => i.blocos), { type: "text", text: fim() }];
    let total: number;
    try {
      // @ts-ignore: documentos em base64 entram na contagem como no pedido
      total = (await client.messages.countTokens({ model: MODELO, ...(system ? { system } : {}), messages: [{ role: "user", content: conteudo }] })).input_tokens;
    } catch (e) {
      const msg = (e as Error).message;
      // Erro que não é de tamanho (ex.: um PDF que o Claude não consegue abrir): diz qual foi, sem enviar o lote.
      if (!/too long|too large|maximum|exceed/i.test(msg)) throw new Error(`O Claude não aceitou o material: ${msg.slice(0, 300)}`);
      contagens.push(msg.slice(0, 200));
      // "prompt is too long: 1229074 tokens > 1000000": o número de verdade vem no erro.
      const m = msg.match(/(\d{6,})\s*tokens/);
      if (m) total = Number(m[1]);
      else {
        // Passou de páginas de PDF ou de tamanho do pedido (não de tokens): saem só PDFs escaneados e imagens,
        // do menos importante para o mais, até tirar um quarto deles. Os relatórios lidos como texto ficam.
        const pesados = itens.filter((i) => i.blocos.some((b) => b.type === "document" || b.type === "image"));
        let tirar = Math.ceil(pesados.reduce((s, i) => s + i.est, 0) * 0.25);
        for (let k = itens.length - 1; k >= 0 && tirar > 0; k--) {
          const i = itens[k];
          if (!pesados.includes(i) || k === 0) continue;
          itens.splice(k, 1);
          tirar -= i.est;
          avisos.push(`${i.nome}: ficou de fora (o pedido passou do tamanho de arquivos que o Claude aceita de uma vez)`);
        }
        if (!pesados.length) break;
        continue;
      }
    }
    contagens.push(total);
    if (total <= MAX_TOKENS_ENTRADA) return { conteudo, total, contagens };
    // A estimativa por arquivo é acertada pela contagem de verdade (tabela de números pesa mais que texto corrido),
    // para não tirar arquivo a mais. Tira do fim (menos importante) até cobrir o excesso, com 5% de folga.
    const estimado = itens.reduce((s, i) => s + i.est, 0) + Math.ceil(fim().length / 3);
    const fator = Math.max(0.5, total / Math.max(1, estimado));
    let falta = Math.ceil((total - MAX_TOKENS_ENTRADA) * 1.05);
    if (!itens.length) break;
    while (falta > 0 && itens.length) {
      const i = itens.pop()!;
      falta -= i.est * fator;
      avisos.push(`${i.nome}: ficou de fora (o material todo passou do tamanho que o Claude lê de uma vez)`);
    }
  }
  throw new Error("O material desta loja é grande demais mesmo sem os arquivos menos importantes. Tire arquivos repetidos ou antigos da pasta e tente de novo.");
}

async function juntar(admin: SupabaseClient, portalId: string) {
  const desde = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: portal }, { data: ficha }, { data: contratos }, { data: passagem }, { data: pers }, { data: caixa }, { data: semanas }, { data: equipe }, { data: insta }] = await Promise.all([
    admin.from("portais").select("loja, responsavel, tipo, inicio, canais, lojas, plano_meses").eq("id", portalId).single(),
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
  if (parada === "plano") {
    const [{ data: diag }, { data: itens }, { data: portalP }, { data: outros }] = await Promise.all([
      admin.from("loja_diagnostico").select("status, dados").eq("portal_id", portalId).eq("loja", "").maybeSingle(),
      admin.from("plano_itens").select("mes, texto, feito").eq("portal_id", portalId).order("mes").order("ordem"),
      admin.from("portais").select("plano_titulos").eq("id", portalId).single(),
      admin.from("plano_itens").select("portal_id, mes, texto").neq("portal_id", portalId).order("portal_id").order("mes").order("ordem").limit(400),
    ]);
    const plano = (base.dados.passagem_do_comercial as { plano_id?: string } | null)?.plano_id ?? (base.dados.ficha as { plano_id?: string } | null)?.plano_id ?? "";
    // Meses do plano: o da loja quando foi ajustado (ex.: Start estendido para 5); senão, Start 4 e os outros 3.
    const meses = Number((base.dados.loja as { plano_meses?: number | null } | null)?.plano_meses) || (plano === "start" ? 4 : 3);
    // Até 3 planos de outras lojas, como exemplo do jeito da Camilla montar.
    const exemplos = new Map<string, string[]>();
    for (const x of outros ?? []) { const l = exemplos.get(x.portal_id) ?? []; if (exemplos.size < 3 || exemplos.has(x.portal_id)) { l.push(`Mês ${x.mes}: ${x.texto}`); exemplos.set(x.portal_id, l); } }
    partes.push(
      `Solução e missões preparadas para a reunião: ${JSON.stringify(prep?.solucao ?? null)}`,
      `Perguntas do gargalo e respostas da loja: ${JSON.stringify(prep?.perguntas ?? [])}\n${prep?.respostas || "(sem respostas ainda)"}`,
      `Diagnóstico da loja no Hub (${diag?.status ?? "não existe"}): ${JSON.stringify(diag?.dados ?? prep?.hub ?? null)}`,
      `Plano: ${plano || "não informado"}. Monte ${meses} meses (mes de 1 a ${meses}).`,
      `Temas que a Camilla já escreveu para esta loja: ${JSON.stringify(portalP?.plano_titulos ?? {})} (mantenha se fizer sentido).`,
      `Plano atual da loja (não repita, complete): ${(itens ?? []).map((i) => `Mês ${i.mes}: ${i.texto}${i.feito ? " (feito)" : ""}`).join(" | ") || "vazio"}`,
      `Planos de outras lojas feitos pela Camilla (só o jeito de montar; não copie): ${[...exemplos.values()].map((l, i) => `Loja ${i + 1}: ${l.join(" | ")}`).join("\n") || "nenhum"}`,
    );
  }
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
  const { conteudo, total, contagens } = await caber(system, docs.itens, fim, docs.avisos);
  return { system, conteudo, avisos: docs.avisos, tokens: total, lidos: docs.itens.length, contagens };
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
    await marcar({ estado: "trabalhando", lote, avisos: pd.avisos, tokens: pd.tokens, lidos: pd.lidos, contagens: pd.contagens });
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

/** Leva para o portal o que o Raio-X achou no material: só campos vazios dos Dados da loja (nunca troca resposta da loja),
 *  conclui a etapa que ficou completa, cadastra a equipe se ainda não tem ninguém e completa o contato da loja. */
async function preencher(admin: SupabaseClient, portalId: string, saida: Record<string, unknown>) {
  const hoje = new Date().toISOString().slice(0, 10);
  const vazio = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
  const itens = (saida.dados_da_loja ?? []) as { etapa: number; campo: string; valor: string; situacao: string; fonte: string }[];
  const { data: pers } = await admin.from("personalizacao").select("etapa, respostas, concluida").eq("portal_id", portalId);
  const porEtapa = new Map((pers ?? []).map((p) => [p.etapa as number, { respostas: (p.respostas ?? {}) as Record<string, unknown>, concluida: !!p.concluida, mudou: false, fontes: new Set<string>() }]));
  for (const i of itens) {
    const tipo = CAMPOS[i.etapa]?.[i.campo];
    if (!tipo) continue;
    const e = porEtapa.get(i.etapa) ?? { respostas: {}, concluida: false, mudou: false, fontes: new Set<string>() };
    porEtapa.set(i.etapa, e);
    const r = e.respostas;
    if (!vazio(r[i.campo]) || r[`${i.campo}__st`] === "nao_tenho") continue;
    if (i.situacao === "nao_tenho") { r[`${i.campo}__st`] = "nao_tenho"; if (i.valor) r[`${i.campo}_obs`] = i.valor; }
    else {
      const v = String(i.valor ?? "").trim();
      if (!v) continue;
      r[i.campo] = tipo === "multi" ? v.split("|").map((x) => x.trim()).filter(Boolean) : tipo === "numero" ? v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "") : v;
      if (vazio(r[i.campo])) continue;
      r[`${i.campo}__st`] = i.situacao === "estimado" ? "estimado" : "tenho";
    }
    e.mudou = true;
    if (i.fonte) e.fontes.add(i.fonte);
  }
  for (const [etapa, e] of porEtapa) {
    if (!e.mudou) continue;
    const r = e.respostas;
    r._origem = [r._origem, `Preenchido pelo agente do Diagnóstico em ${hoje}: ${[...e.fontes].join("; ")}`].filter(Boolean).join(" · ");
    const completa = Object.keys(CAMPOS[etapa] ?? {}).every((c) => !vazio(r[c]) || r[`${c}__st`] === "nao_tenho");
    await admin.from("personalizacao").upsert({ portal_id: portalId, etapa, respostas: r, concluida: e.concluida || completa, updated_at: new Date().toISOString() }, { onConflict: "portal_id,etapa" });
  }
  const equipe = ((saida.equipe ?? []) as { nome: string; funcao: string }[]).filter((p) => p.nome?.trim());
  if (equipe.length) {
    const { count } = await admin.from("loja_equipe").select("id", { count: "exact", head: true }).eq("portal_id", portalId);
    if (!count) await admin.from("loja_equipe").insert(equipe.map((p) => ({ portal_id: portalId, nome: p.nome.trim(), funcao: p.funcao?.trim() || null, ativo: true })));
  }
  const c = (saida.contato ?? {}) as { whatsapp?: string; instagram?: string; email?: string };
  const { data: portal } = await admin.from("portais").select("whatsapp, email").eq("id", portalId).single();
  const novo: Record<string, string> = {};
  if (!portal?.whatsapp && c.whatsapp?.trim()) novo.whatsapp = c.whatsapp.trim();
  if (!portal?.email && c.email?.trim()) novo.email = c.email.trim();
  if (Object.keys(novo).length) await admin.from("portais").update(novo).eq("id", portalId);
  if (c.instagram?.trim()) await admin.from("fichas").update({ instagram: c.instagram.trim() }).eq("portal_id", portalId).is("instagram", null);
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
      if (parada === "raiox") await preencher(admin, portalId, saida).catch(() => {});
      campo = parada === "raiox" ? { raiox: saida } : parada === "perguntas" ? { perguntas: saida.perguntas } : parada === "solucao" ? { solucao: saida } : parada === "plano" ? { plano: saida } : { hub: saida };
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

  const { portal_id, parada, conferir: so_conferir, continuar, medir } = await req.json().catch(() => ({}));
  // Conferência sem custo (só a chave interna): monta o pedido da parada, conta e devolve o que coube, sem enviar ao Claude.
  if (medir && liberado && portal_id && PARADAS.includes(parada)) {
    try {
      const pd = await pedido(admin, portal_id, parada as Parada, new Date().toISOString());
      return json({ tokens: pd.tokens, lidos: pd.lidos, fora: pd.avisos.length, contagens: pd.contagens, avisos: pd.avisos });
    } catch (e) {
      return json({ erro: (e as Error).message });
    }
  }
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
