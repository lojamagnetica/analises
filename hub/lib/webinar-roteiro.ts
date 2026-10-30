"use client";

// O roteiro do webinar (a entrega do evento), montado pelo Mapa do Webinar: Abertura, História, Conteúdo e Oferta de
// agendamento. Cada guia vira perguntas; as respostas ficam em hub_config (chave "webinar_roteiro") e o roteiro final se
// monta sozinho, slide por slide, com as falas em linhas "> " para o Teleprompter.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Campo = { id: string; rotulo: string; exemplo?: string; tipo?: "texto" | "linha" | "escolha" | "check"; opcoes?: { v: string; r: string }[]; se?: (r: Respostas) => boolean };
export type Bloco = { id: string; titulo: string; ritmo?: string; dica?: string; campos: Campo[] };
export type Secao = { id: string; titulo: string; objetivo: string; blocos: Bloco[] };
export type Respostas = Record<string, string>;

const lista = (pref: string, n: number, rotulo: (i: number) => string, exemplo?: string): Campo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${pref}${i + 1}`, rotulo: rotulo(i + 1), tipo: "linha" as const, exemplo: i === 0 ? exemplo : undefined }));
const checks = (pref: string, itens: string[]): Campo[] => itens.map((r, i) => ({ id: `${pref}${i + 1}`, rotulo: r, tipo: "check" as const }));

const tipoA = (r: Respostas) => r["h.tipo"] !== "B";
const tipoB = (r: Respostas) => r["h.tipo"] === "B";

export const SECOES: Secao[] = [
  {
    id: "abertura", titulo: "1 · Abertura", objetivo: "Os primeiros 5 a 10 minutos, que fazem a lojista pensar: \"essa aula é EXATAMENTE o que eu preciso\".",
    blocos: [
      { id: "b1", titulo: "Promessa magnética (slide 1)", ritmo: "30 a 60 segundos", dica: "A promessa fica: \"Como [resultado] em [tempo] sem [obstáculo]\".", campos: [
        { id: "a.1.1", rotulo: "1.1 Qual é o RESULTADO que a lojista mais deseja?", exemplo: "Bater o recorde de vendas da loja" },
        { id: "a.1.2", rotulo: "1.2 Qual é a MAIOR COISA que atrapalha ou impede?", exemplo: "Sem depender de descontos" },
        { id: "a.1.3", rotulo: "1.3 Em quanto tempo dá para alcançar? (realista, mas atraente)", exemplo: "Neste fim de ano" },
      ] },
      { id: "b2", titulo: "Método diferenciado (slide 1, continuação)", dica: "\"Vou te ajudar a [resultado] mostrando [método]\" + [prova].", campos: [
        { id: "a.2.1", rotulo: "2.1 O que o método tem de ÚNICO ou DIFERENTE?" },
        { id: "a.2.2", rotulo: "2.2 Que PROVA ou RESULTADO valida isso? (escolha uma: clientes com resultado, seu resultado, benefício surpreendente)" },
      ] },
      { id: "b3", titulo: "Apresentação pessoal (slide 2)", dica: "⚠️ Só use \"reconhecida como\" ou \"considerada\" se puder dizer POR QUEM.", campos: [
        { id: "a.3.1", rotulo: "3.1 Nome", tipo: "linha" },
        { id: "a.3.2", rotulo: "3.2 Credencial principal (especialista em..., há X anos com isso, formação, ex-cargo)" },
        { id: "a.3.3", rotulo: "3.3 Como você gostaria de ser apresentada num palco para 1.000 clientes ideais?" },
        { id: "a.3.4", rotulo: "3.4 De 2 a 3 credenciais VERIFICÁVEIS (números, resultados, criações)" },
      ] },
      { id: "b4", titulo: "O que você vai aprender (slide 3)", dica: "Fórmulas: Como [resultado] sem [obstáculo] · Como [resultado] e ainda [benefício] · O segredo nº 1 para [resultado] · Os X erros que impedem você de [resultado].",
        campos: lista("a.4.", 5, (i) => `Aprendizado ${i}`, "Como atrair clientes novas sem gastar mais em anúncio") },
      { id: "b5", titulo: "Por que agora? (slide 4)", campos: [
        { id: "a.5.1", rotulo: "5.1 Que OBJEÇÃO ou CRENÇA LIMITANTE ela tem e você precisa quebrar?" },
        { id: "a.5.2", rotulo: "5.2 Que TENDÊNCIA DE MERCADO está acontecendo no nicho dela?" },
        { id: "a.5.3", rotulo: "5.3 Que PEDRA NO SAPATO está piorando ou ficando mais cara?" },
        { id: "a.5.4", rotulo: "5.4 O que é CONSTRANGEDOR ou FRUSTRANTE na situação atual dela?" },
      ] },
      { id: "b6", titulo: "Isso é para você? (slide 5)", campos: [
        { id: "a.6.1", rotulo: "Frase 1: Se você é [quem] e não conseguiu [resultado] porque [frustração], isso é para você." },
        { id: "a.6.2", rotulo: "Frase 2: Se você é [quem] e quer [desejo], isso é para você." },
        { id: "a.6.3", rotulo: "Frase 3: Se você está cansada de [frustração do dia a dia], isso é para você." },
        { id: "a.6.4", rotulo: "Frase 4: Se você tem medo de [medo específico], isso é para você." },
      ] },
      { id: "b7", titulo: "Regras importantes (slide 6)", dica: "Diferencie e afaste quem não é a cliente certa.", campos: [
        { id: "a.7.1", rotulo: "7.1 Que PROMESSA ABSURDA do mercado você precisa quebrar?" },
        { id: "a.7.2", rotulo: "7.2 Que ABORDAGEM técnica ou chata você NÃO vai usar?" },
        { id: "a.7.3", rotulo: "7.3 Que EXPECTATIVA IRREAL você precisa corrigir?" },
        { id: "a.7.4", rotulo: "7.4 Quem NÃO deve continuar assistindo?" },
      ] },
    ],
  },
  {
    id: "historia", titulo: "2 · História", objetivo: "De 5 a 10 minutos de história verdadeira que gera conexão e confiança, ligada ao conteúdo.",
    blocos: [
      { id: "h0", titulo: "Tipo de história e transição", dica: "Curta, verdadeira, ligada ao problema. Foco em conexão, não em parecer perfeita.", campos: [
        { id: "h.tipo", rotulo: "Tipo de história", tipo: "escolha", opcoes: [{ v: "A", r: "A · Avatar transformado: eu era como a cliente é hoje" }, { v: "B", r: "B · Socorrista: nunca tive o problema, mas decidi ajudar" }] },
        { id: "h.transicao", rotulo: "Transição", tipo: "escolha", opcoes: [{ v: "1", r: "1 · \"Isso aconteceu comigo também\"" }, { v: "2", r: "2 · \"Eu sei como você se sente\"" }, { v: "3", r: "3 · \"O segredo por trás\" (recomendada)" }] },
        { id: "h.frase", rotulo: "A frase da transição, do seu jeito" },
      ] },
      { id: "hA", titulo: "Estrutura · Avatar transformado", campos: [
        { id: "h.a1", rotulo: "1 · O início: em que momento você estava exatamente onde a cliente está? Qual era o problema?", se: tipoA },
        { id: "h.a2", rotulo: "2 · Dramatização: situações específicas, sentimentos, como isso afetava a sua vida", se: tipoA },
        { id: "h.a3", rotulo: "3 · Invalidação: 2 ou 3 soluções que você tentou e NÃO funcionaram, e por quê", se: tipoA },
        { id: "h.a4", rotulo: "4 · A virada: o que te fez decidir mudar e como descobriu a solução (breve)", se: tipoA },
        { id: "h.a5", rotulo: "5 · O método, resumido (sem detalhes)", se: tipoA },
        { id: "h.a6", rotulo: "6 · Resultado e transformação: quanto tempo levou, qual resultado, como a vida mudou", se: tipoA },
        { id: "h.a7", rotulo: "7 · Transição: \"Agora vou te mostrar como você pode usar esse método para [promessa] também!\"", se: tipoA },
      ] },
      { id: "hB", titulo: "Estrutura · Socorrista", campos: [
        { id: "h.b1", rotulo: "1 · O cruzamento: quando você descobriu o problema e o que te impactou", se: tipoB },
        { id: "h.b2", rotulo: "2 · A decisão de ajudar: o que te fez decidir", se: tipoB },
        { id: "h.b3", rotulo: "3 · O caminho até especialista (3 ou 4 passos)", se: tipoB },
        { id: "h.b4", rotulo: "4 · Como descobriu ou criou o método", se: tipoB },
        { id: "h.b5", rotulo: "5 · Primeiros resultados: com quem testou e o que aconteceu", se: tipoB },
        { id: "h.b6", rotulo: "6 · Missão atual: por que você faz isso", se: tipoB },
        { id: "h.b7", rotulo: "7 · Transição: \"E é isso que vou te mostrar agora...\"", se: tipoB },
      ] },
      { id: "hC", titulo: "Técnica avançada: história + características do método", dica: "Só se escolheu a transição 3: intercale a história com as características que fazem o método funcionar.",
        campos: lista("h.c", 5, (i) => `Característica ${i} e a história dela`).map((c) => ({ ...c, tipo: "texto" as const, se: (r: Respostas) => r["h.transicao"] === "3" })) },
      { id: "hD", titulo: "Checklist da história", dica: "Fórmula de ouro: 40% situações, 30% sentimentos, 20% como descobriu o método, 10% resultado.", campos: checks("h.k", [
        "Dura entre 5 e 10 minutos", "É verdadeira", "Conecta com o conteúdo que vou ensinar", "Mostra que eu era (ou conhecia alguém) como a cliente",
        "Dramatiza situações e sentimentos", "Invalida soluções que não funcionaram", "Mostra o momento da virada", "Introduz o método de leve",
        "Mostra resultado e transformação", "Termina com a transição para o conteúdo", "Gera valor, não só entretenimento",
      ]) },
    ],
  },
  {
    id: "conteudo", titulo: "3 · Conteúdo", objetivo: "De 15 a 25 minutos que ajudam DE VERDADE (nível 3: provar ajudando), ensinam O QUÊ fazer e criam a necessidade da reunião.",
    blocos: [
      { id: "c1", titulo: "Os maiores problemas da lojista e as suas soluções", campos: lista("c.p", 5, (i) => `Problema ${i} → a sua solução`) },
      { id: "c2", titulo: "Tema da aula", campos: [
        { id: "c.tema.tipo", rotulo: "Formato", tipo: "escolha", opcoes: [{ v: "A", r: "A · Os X pilares ou princípios" }, { v: "B", r: "B · Como alcançar [resultado] fazendo [método único]" }, { v: "C", r: "C · Os X segredos ou estratégias para [resultado]" }] },
        { id: "c.tema", rotulo: "O tema, escrito", tipo: "linha", exemplo: "Os 3 passos para bater o recorde de vendas no fim de ano" },
      ] },
      ...[1, 2, 3, 4, 5].map((n): Bloco => ({
        id: `ct${n}`, titulo: `Ponto ${n} do conteúdo`, dica: n === 1 ? "Para cada ponto: é prático? Faz sentido para o nível dela? Ela se vê fazendo? Não é técnico demais?" : undefined,
        campos: [
          { id: `c.t${n}.titulo`, rotulo: "Nome do ponto", tipo: "linha" },
          { id: `c.t${n}.oque`, rotulo: "O que é" },
          { id: `c.t${n}.como`, rotulo: "Como funciona (conceito, não execução)" },
          { id: `c.t${n}.porque`, rotulo: "Por que funciona ou é importante" },
          { id: `c.t${n}.transf`, rotulo: "A transformação que gera na loja dela" },
          { id: `c.t${n}.loop`, rotulo: "Loop aberto: o que você menciona e deixa para a reunião", exemplo: "Isso aqui é só uma pincelada, a execução completa tem mais detalhes..." },
        ],
      })),
      { id: "c3", titulo: "O QUÊ (no webinar) vs COMO (na reunião e na mentoria)", campos: [
        { id: "c.como", rotulo: "O que você NÃO vai ensinar no webinar (os detalhes de execução)" },
      ] },
      { id: "c4", titulo: "Criar a necessidade e passar para a oferta", campos: [
        { id: "c.necessidade", rotulo: "O problema novo que o conteúdo cria (e a reunião resolve)", exemplo: "O conceito você entendeu. Mas e na prática, na SUA loja, como fazer?" },
        { id: "c.transicao.tipo", rotulo: "Transição para a oferta", tipo: "escolha", opcoes: [{ v: "1", r: "1 · Problema → solução" }, { v: "2", r: "2 · Valor → mais valor" }, { v: "3", r: "3 · Recapitulação → oportunidade" }] },
        { id: "c.transicao", rotulo: "A frase da transição" },
      ] },
      { id: "c5", titulo: "Checklist do conteúdo", campos: checks("c.k", [
        "É prático, não teórico", "Ela consegue se ver fazendo", "Ensina O QUÊ fazer, não COMO em detalhes", "Sem detalhes técnicos demais",
        "Cria a necessidade que a reunião resolve", "Tem loops abertos evidentes", "Mostra a transformação em cada ponto", "Tem transição clara para a oferta",
        "Dura de 15 a 25 minutos", "Ela sai pensando: \"preciso de mais!\"",
      ]) },
    ],
  },
  {
    id: "oferta", titulo: "4 · Oferta de agendamento", objetivo: "Converter o webinar em pedidos de reunião.",
    blocos: [
      { id: "o1", titulo: "Etapa 1 · Transição", campos: [{ id: "o.1", rotulo: "A transição do conteúdo para a oportunidade", exemplo: "Sei que você deve estar pensando: ok, entendi. Mas como faço isso NA MINHA loja?" }] },
      { id: "o2", titulo: "Etapa 2 · O que vou fazer na reunião", campos: [
        { id: "o.2.1", rotulo: "Nome da reunião", tipo: "linha" },
        { id: "o.2.2", rotulo: "Duração (minutos)", tipo: "linha" },
        { id: "o.2.a1", rotulo: "Ação 1", tipo: "linha" }, { id: "o.2.a2", rotulo: "Ação 2", tipo: "linha" }, { id: "o.2.a3", rotulo: "Ação 3", tipo: "linha" },
      ] },
      { id: "o3", titulo: "Etapa 3 · Como funciona o agendamento", campos: [
        { id: "o.3", rotulo: "O passo a passo (clica no link, preenche, escolhe o horário, recebe a confirmação)" },
        { id: "o.3.vagas", rotulo: "Vagas disponíveis", tipo: "linha" },
      ] },
      { id: "o4", titulo: "Etapa 4 · Chamada para ação", campos: [
        { id: "o.4.onde", rotulo: "Onde aparece o link (botão na tela, chat, slide com QR code)", tipo: "linha" },
        { id: "o.4.link", rotulo: "Link do agendamento", tipo: "linha" },
        { id: "o.4.botao", rotulo: "Texto do botão", tipo: "linha", exemplo: "QUERO AGENDAR MINHA REUNIÃO" },
      ] },
      { id: "o5", titulo: "Etapa 5 · Incentivo para quem agendar agora (não é produto)", campos: [
        { id: "o.5.limite", rotulo: "Limite (primeiras X, só durante a aula, primeiras 24h)", tipo: "linha" },
        { id: "o.5.incentivo", rotulo: "O que recebe" },
      ] },
      { id: "o7", titulo: "Etapa 7 · Urgência real", campos: [
        { id: "o.7", rotulo: "A escassez (quantas vagas ou até quando) e o PORQUÊ" },
        { id: "o.7.consequencia", rotulo: "O que acontece se não agendar agora" },
      ] },
      { id: "o9", titulo: "Etapas 8 e 9 · Objeções (cada resposta termina com o convite para agendar)", campos: [
        ...["Isso funciona para a minha loja ou o meu nicho?", "Não tenho tempo para implementar agora", "Preciso de dinheiro para investir em anúncio", "Minha loja vive de indicação",
          "Não sei se a minha equipe está preparada", "Preciso organizar a casa primeiro", "Já tentei de tudo e não funcionou"].map((p, i) => ({ id: `o.9.${i + 1}`, rotulo: `"${p}"` })),
        { id: "o.9.8", rotulo: "Objeção 8 (sua, do nicho): pergunta e resposta" }, { id: "o.9.9", rotulo: "Objeção 9: pergunta e resposta" }, { id: "o.9.10", rotulo: "Objeção 10: pergunta e resposta" },
      ] },
      { id: "o10", titulo: "Etapa 10 · Fechamento", campos: [
        { id: "o.10", rotulo: "A última chamada", exemplo: "Se você ficou até aqui, é porque você QUER bater o seu recorde. A diferença entre quem consegue e quem não consegue é AÇÃO." },
      ] },
    ],
  },
];

const CHAVE = "webinar_roteiro";
export async function buscarRoteiro(): Promise<Respostas> {
  const { data } = await supabaseBrowser().from("hub_config").select("valor").eq("chave", CHAVE).maybeSingle();
  return ((data?.valor as { respostas?: Respostas } | null)?.respostas ?? {}) as Respostas;
}
export async function salvarRoteiro(respostas: Respostas) {
  const { error } = await supabaseBrowser().from("hub_config").upsert({ chave: CHAVE, valor: { respostas }, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Quanto de cada parte já foi respondido. */
export function progresso(s: Secao, r: Respostas) {
  const cs = s.blocos.flatMap((b) => b.campos).filter((c) => c.tipo !== "check" && (!c.se || c.se(r)));
  return { feitos: cs.filter((c) => (r[c.id] ?? "").trim()).length, total: cs.length };
}

/** O roteiro final, slide por slide, com as falas em linhas "> " (formato do Teleprompter). */
export function roteiroFinal(r: Respostas) {
  const v = (id: string, ph = "____") => (r[id] ?? "").trim() || ph;
  const tem = (id: string) => !!(r[id] ?? "").trim();
  // Cada linha do campo vira uma fala (um bloco por respiração)
  const falas = (...xs: string[]) => xs.flatMap((x) => x.split("\n")).map((x) => x.trim()).filter(Boolean).map((x) => `> ${x}`).join("\n");
  const partes: { titulo: string; texto: string }[] = [];
  partes.push({ titulo: "Slide 1 · Promessa", texto: falas(`Como ${v("a.1.1")} ${v("a.1.3")} sem ${v("a.1.2")}.`, `Vou te ajudar mostrando ${v("a.2.1")}.`, v("a.2.2")) });
  partes.push({ titulo: "Slide 2 · Apresentação", texto: falas(`Meu nome é ${v("a.3.1")}, ${v("a.3.3")}.`, v("a.3.4")) });
  partes.push({ titulo: "Slide 3 · O que você vai aprender", texto: falas("E durante essa aula você vai aprender:", ...[1, 2, 3, 4, 5].filter((i) => tem(`a.4.${i}`)).map((i) => `${i}. ${v(`a.4.${i}`)}`)) });
  partes.push({ titulo: "Slide 4 · Por que agora", texto: falas("Por que isso é importante para você agora?", ...["a.5.1", "a.5.2", "a.5.3", "a.5.4"].filter(tem).map((id) => v(id))) });
  partes.push({ titulo: "Slide 5 · Isso é para você", texto: falas("Isso é para você se:", ...["a.6.1", "a.6.2", "a.6.3", "a.6.4"].filter(tem).map((id) => v(id))) });
  partes.push({ titulo: "Slide 6 · Regras", texto: falas(...["a.7.1", "a.7.2", "a.7.3", "a.7.4"].filter(tem).map((id) => v(id))) });
  const hist = r["h.tipo"] === "B" ? ["h.b1", "h.b2", "h.b3", "h.b4", "h.b5", "h.b6", "h.b7"] : ["h.a1", "h.a2", "h.a3", "h.a4", "h.a5", "h.a6", "h.a7"];
  partes.push({ titulo: "História", texto: falas(v("h.frase", ""), ...hist.filter(tem).map((id) => v(id)), ...(r["h.transicao"] === "3" ? [1, 2, 3, 4, 5].filter((i) => tem(`h.c${i}`)).map((i) => v(`h.c${i}`)) : [])) });
  partes.push({ titulo: "Conteúdo", texto: [falas(`Agora vou te mostrar ${v("c.tema")}.`), ...[1, 2, 3, 4, 5].filter((n) => tem(`c.t${n}.titulo`)).map((n) =>
    `[Ponto ${n}: ${v(`c.t${n}.titulo`)}]\n${falas(...["oque", "como", "porque", "transf", "loop"].filter((k) => tem(`c.t${n}.${k}`)).map((k) => v(`c.t${n}.${k}`)))}`), falas(v("c.necessidade", ""), v("c.transicao", ""))].filter(Boolean).join("\n\n") });
  partes.push({ titulo: "Oferta", texto: [
    falas(v("o.1")),
    falas(`Vou abrir vagas para ${v("o.2.1")} de ${v("o.2.2")} minutos, onde eu vou:`, `→ ${v("o.2.a1")}`, `→ ${v("o.2.a2")}`, `→ ${v("o.2.a3")}`, "Você sai com um plano claro do que fazer."),
    falas(v("o.3"), `${v("o.4.onde")} está o link. Clica AGORA para garantir a sua vaga.`),
    falas(`${v("o.5.limite")}: quem agendar agora recebe ${v("o.5.incentivo")}.`),
    falas("Recapitulando:", `✓ ${v("o.2.1")} de ${v("o.2.2")} minutos, individual comigo`, `✓ ${v("o.2.a1")}, ${v("o.2.a2")} e ${v("o.2.a3")}`, `✓ ${v("o.5.incentivo")} se agendar agora`, "✓ Sem custo e sem compromisso", "Clica no link e agenda."),
    falas(v("o.7"), v("o.7.consequencia", "")),
    falas("Sei que você pode ter dúvidas. Vou responder as principais. E enquanto respondo, quem quiser já pode agendar pelo link.", ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((i) => tem(`o.9.${i}`)).map((i) => v(`o.9.${i}`))),
    falas(v("o.10"), "Quem já agendou, parabéns. Vou me preparar para te ajudar ao máximo.", "Se não agendou, sem problema. Mas essa chance não volta tão cedo.", "Nos vemos em breve!"),
  ].filter(Boolean).join("\n\n") });
  return partes;
}
