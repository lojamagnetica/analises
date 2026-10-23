"use client";

// Gestão de Pessoas da loja, no Método Loja Magnética (Formação Gerencial):
// ciclo do líder Combinar → Ensinar → Acompanhar → Dar retorno, toda semana.
// O perfil tipo DISC é um apoio para ajustar o tom; a regra é a mesma para todos.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Letra = "D" | "I" | "S" | "C";
export type Pessoa = {
  id: string; portal_id: string; nome: string; funcao: string | null; entrada: string | null; ativo: boolean;
  respostas: Letra[] | null; perfil: Record<Letra, number> | null; respondido_por: "pessoa" | "gestor" | null;
  perfil_em: string | null; motor: Motor | null;
};
export type Motor = "Ganho" | "Reconhecimento" | "Pertencimento" | "Consequência";
export type Retorno = { id: string; pessoa_id: string; tipo: string; situacao: string; roteiro: string; feito: boolean; created_at: string };
export type Ficha = {
  id: string; pessoa_id: string; estagio: Estagio; competencia: string; objetivo: string; acoes: string;
  prazo: string | null; status: "Em andamento" | "Concluído"; acompanhamento: string | null; created_at: string;
};
export type Estagio = "Começando" | "Evoluindo" | "Pronto";
export type Reuniao = { id: string; tipo: "semanal" | "mensal"; data: string; dados: Record<string, unknown>; pauta: string; created_at: string };

// ───── Teste de perfil (tipo DISC), com situações de loja ─────

export const PERGUNTAS: { pergunta: string; opcoes: Record<Letra, string> }[] = [
  { pergunta: "Quando a loja está cheia, eu…", opcoes: { D: "assumo o comando e resolvo rápido", I: "puxo conversa e animo todo mundo", S: "atendo com calma, uma cliente de cada vez", C: "sigo o passo a passo para não errar" } },
  { pergunta: "Quando recebo uma meta, eu…", opcoes: { D: "quero bater e passar dela", I: "me empolgo e conto para a equipe", S: "preciso entender como chegar lá, com tempo", C: "quero ver os números e o cálculo" } },
  { pergunta: "A cliente diz \"está caro\". Eu…", opcoes: { D: "vou direto ao ponto e mostro por que vale", I: "conquisto pela conversa e pela história da peça", S: "escuto com paciência e ofereço opções", C: "explico tecido, acabamento e detalhes" } },
  { pergunta: "Quando muda uma regra na loja, eu…", opcoes: { D: "aceito rápido se fizer sentido", I: "topo se o clima continuar bom", S: "prefiro que me expliquem antes e com tempo", C: "quero entender o porquê e como vai funcionar" } },
  { pergunta: "Meu ponto forte é…", opcoes: { D: "decisão e iniciativa", I: "simpatia e persuasão", S: "paciência e constância", C: "organização e capricho" } },
  { pergunta: "O que mais me incomoda é…", opcoes: { D: "lentidão e enrolação", I: "ambiente pesado e sem reconhecimento", S: "conflito e mudança de última hora", C: "bagunça e falta de critério" } },
  { pergunta: "Quando eu erro, eu…", opcoes: { D: "corrijo e sigo em frente", I: "levo na leveza e tento de novo", S: "sinto e preciso de apoio", C: "analiso em detalhe o que deu errado" } },
  { pergunta: "Na vitrine e na exposição, eu…", opcoes: { D: "faço rápido e do meu jeito", I: "quero que chame atenção e fique linda", S: "mantenho como foi combinado", C: "sigo as regras de cor, volume e ponto focal" } },
  { pergunta: "Com uma cliente nova, eu…", opcoes: { D: "abordo logo e conduzo a compra", I: "faço amizade e peço o Instagram", S: "deixo à vontade e ajudo sem pressão", C: "pergunto tamanho, estilo e ocasião antes de mostrar" } },
  { pergunta: "Eu trabalho melhor quando…", opcoes: { D: "tenho desafio e autonomia", I: "tenho gente por perto e posso conversar", S: "sei exatamente o que esperam de mim", C: "tenho tempo para fazer bem feito" } },
  { pergunta: "Na reunião da equipe, eu…", opcoes: { D: "quero ir direto aos números", I: "gosto de falar e dar ideias", S: "prefiro ouvir e falo quando perguntam", C: "trago dados e pergunto detalhes" } },
  { pergunta: "O elogio que mais me motiva é…", opcoes: { D: "\"você bateu a meta antes de todo mundo\"", I: "\"todo mundo adora ser atendido por você\"", S: "\"a loja pode contar com você\"", C: "\"seu trabalho é impecável\"" } },
];

export function pontuar(respostas: Letra[]): Record<Letra, number> {
  const p: Record<Letra, number> = { D: 0, I: 0, S: 0, C: 0 };
  respostas.forEach((l) => { p[l] += 1; });
  return p;
}

/** Perfil principal (e o secundário quando está perto). */
export function principal(perfil: Record<Letra, number> | null) {
  if (!perfil) return null;
  const ord = (Object.keys(perfil) as Letra[]).sort((a, b) => perfil[b] - perfil[a]);
  return { letra: ord[0], segunda: perfil[ord[1]] >= perfil[ord[0]] - 1 && perfil[ord[1]] > 0 ? ord[1] : null };
}

export const PERFIS: Record<Letra, {
  nome: string; letra: Letra; cor: string; resumo: string; forte: string[]; cuidado: string[];
  motivar: string; retorno: string; cobrar: string; ensinar: string; evitar: string; rende: string;
}> = {
  D: {
    nome: "Executor(a)", letra: "D", cor: "var(--red)",
    resumo: "Rápido(a), direto(a) e competitivo(a). Gosta de desafio e de resultado.",
    forte: ["Iniciativa", "Fechar a venda", "Resolver problema", "Bater meta"],
    cuidado: ["Atropela colegas e clientes", "Impaciência com rotina", "Pode pular o processo"],
    motivar: "Desafio claro, meta individual, ranking e autonomia para fazer do seu jeito dentro do combinado.",
    retorno: "Curto, olho no olho e com número. Vá direto ao fato; nada de rodeio. Termine com o desafio da semana.",
    cobrar: "Número na mesa e prazo. Pergunte: \"O que você precisa para chegar na meta até sexta?\"",
    ensinar: "Desafio prático e rápido. Mostre o ganho no número. Depois do passo 3, ponha para ensinar os outros.",
    evitar: "Microgerenciar, discurso longo e corrigir na frente dos outros.",
    rende: "Fechamento de venda, peças de maior valor, liderar ações e campanhas.",
  },
  I: {
    nome: "Comunicador(a)", letra: "I", cor: "var(--orange)",
    resumo: "Falante, animado(a) e criativo(a). Adora gente e ser visto(a).",
    forte: ["Abordagem", "Encantar a cliente", "Relacionamento", "Conteúdo para o Instagram"],
    cuidado: ["Dispersa no meio do dia", "Esquece cadastro e rotina", "Promete mais do que cumpre"],
    motivar: "Reconhecimento na frente do time, clima bom, palco (gravar conteúdo, ensinar) e novidade.",
    retorno: "Comece pela relação e pelo que funciona. No combinado, seja muito específico(a) e peça para repetir: sem anotação, esquece.",
    cobrar: "Combinados curtos, no quadro ou no grupo, com conferência no fim do dia.",
    ensinar: "Simulação em dupla e dinâmica. Treino de 10 minutos antes de abrir funciona muito bem.",
    evitar: "Ambiente frio, tarefas longas e solitárias sem prazo, crítica em público.",
    rende: "Atendimento, conteúdo, eventos e ações, recompra com a carteira (com checklist).",
  },
  S: {
    nome: "Apoiador(a)", letra: "S", cor: "var(--green)",
    resumo: "Calmo(a), leal, paciente e constante. Gosta de saber o que esperam dele(a).",
    forte: ["Atendimento acolhedor", "Rotina", "Fidelizar clientes", "Trabalho em equipe"],
    cuidado: ["Resiste a mudança", "Evita conflito e não fala o que pensa", "Demora a fechar a venda"],
    motivar: "Segurança, previsibilidade, pertencimento ao time e reconhecimento sincero.",
    retorno: "No particular, com calma. Explique o porquê e mostre o passo a passo. Deixe claro que você está junto.",
    cobrar: "Meta em etapas pequenas, rotina clara e prazos avisados com antecedência.",
    ensinar: "Os 4 passos sem pular nenhum: eu faço, fazemos juntos, você faz e eu vejo, você faz sozinho(a). Dê tempo.",
    evitar: "Mudança de surpresa, pressão em público e cobrança agressiva.",
    rende: "Pós-venda, carteira de clientes, abertura e fechamento, clientes fiéis.",
  },
  C: {
    nome: "Analista", letra: "C", cor: "var(--blue)",
    resumo: "Detalhista, organizado(a) e criterioso(a). Gosta de regra e de dado.",
    forte: ["Organização", "Estoque e caixa", "Vitrine pelas regras", "Qualidade"],
    cuidado: ["Perfeccionismo", "Demora para decidir", "Atendimento menos caloroso"],
    motivar: "Critério claro, dado, tempo para fazer bem feito e reconhecimento da qualidade.",
    retorno: "Com fato e número, lógico e sem drama. Se puder, deixe o combinado por escrito.",
    cobrar: "Indicador e padrão claros, checklist e prazo realista.",
    ensinar: "Material escrito, roteiro e o porquê de cada passo.",
    evitar: "Improviso, combinado vago e crítica sem dado.",
    rende: "Estoque, caixa, conferência, vitrine e exposição, planilhas e indicadores.",
  },
};

export const MOTORES: Record<Motor, string> = {
  Ganho: "comissão, meta com prêmio",
  Reconhecimento: "ser visto(a), citado(a), ganhar confiança e espaço",
  Pertencimento: "fazer parte de um time que vence junto",
  Consequência: "saber que o combinado vai ser olhado e cobrado",
};

// ───── Dar retorno: cobrar e reconhecer ─────

export const DIAGNOSTICO = {
  Saber: { sinal: "faz errado ou pela metade", lider: "ensina de novo, mostrando" },
  Poder: { sinal: "quer, mas não consegue", lider: "tira o obstáculo e dá a ferramenta" },
  Querer: { sinal: "sabe, consegue e não faz", lider: "conversa, combina e cobra" },
} as const;
export type Falta = keyof typeof DIAGNOSTICO;

const generaliza = /\b(sempre|nunca|todo dia|toda vez|ningu[eé]m)\b/i;

export function alertasTexto(...textos: string[]) {
  const a: string[] = [];
  if (textos.some((t) => generaliza.test(t))) a.push("Evite generalizar (\"sempre\", \"nunca\"). Fale de um fato, com número.");
  if (!textos.some((t) => /\d/.test(t))) a.push("Coloque um número no fato. Ex.: \"Combinamos 10 mensagens por dia. Essa semana foram 3.\"");
  return a;
}

export function roteiroCobranca(p: { nome: string; perfil: Letra | null; falta: Falta; combinado: string; aconteceu: string; impacto: string; novo: string; retorno: string }) {
  const nome = p.nome.split(" ")[0];
  const tom = p.perfil ? PERFIS[p.perfil].retorno : null;
  if (p.falta === "Saber") {
    return [
      `Diagnóstico: falta SABER. Cobrar quem não sabe gera medo: aqui o caminho é ensinar.`,
      ``,
      `Ensinar em 4 passos, uma coisa por vez:`,
      `1. Eu faço, você vê: mostre para ${nome} como fazer "${p.combinado}".`,
      `2. Fazemos juntos: no balcão, com cliente real ou numa simulação de 10 minutos antes de abrir.`,
      `3. Você faz, eu vejo: corrija com calma, sem plateia.`,
      `4. Você faz sozinho(a): ${p.novo ? `combine "${p.novo}"` : "combine o próximo passo"} e olhe junto ${p.retorno ? p.retorno.charAt(0).toLowerCase() + p.retorno.slice(1) : "no fim da semana"}.`,
      ...(tom ? [``, `Tom com o perfil ${PERFIS[p.perfil!].nome}: ${PERFIS[p.perfil!].ensinar}`] : []),
    ].join("\n");
  }
  if (p.falta === "Poder") {
    return [
      `Diagnóstico: falta PODER. ${nome} quer, mas não consegue. Tire o obstáculo e dê a ferramenta antes de cobrar.`,
      ``,
      `1. Fato: "Combinamos ${p.combinado}. ${p.aconteceu}."`,
      `2. Pergunta: "O que está te impedindo? Do que você precisa para conseguir?"`,
      `3. Obstáculo: anote o que ${nome} disser e resolva o que é seu (tempo, ferramenta, lista, acesso).`,
      `4. Novo combinado: "${p.novo || "O que você consegue fazer até sexta?"}"`,
      `5. Retorno: "${p.retorno || "Sexta no fim do dia"} a gente olha junto."`,
      ...(tom ? [``, `Tom com o perfil ${PERFIS[p.perfil!].nome}: ${tom}`] : []),
    ].join("\n");
  }
  return [
    `Cobrança em 5 passos · no particular, com número, na semana.`,
    ``,
    `1. Fato: "Combinamos ${p.combinado}. ${p.aconteceu}."`,
    `2. Impacto: "${p.impacto || "Sem isso, a cliente não volta e a sua meta fica mais longe."}"`,
    `3. Pergunta: "O que aconteceu? O que te impediu?" (se a resposta for "não sei fazer", a cobrança vira treino)`,
    `4. Novo combinado: "${p.novo || "O que você consegue fazer até sexta?"}"`,
    `5. Retorno: "${p.retorno || "Sexta no fim do dia"} a gente olha junto."`,
    ``,
    `Lembre: cobrança é sobre o combinado, não sobre a pessoa. Nunca no grupo nem na frente de cliente.`,
    ...(tom ? [``, `Tom com o perfil ${PERFIS[p.perfil!].nome}: ${tom}`] : []),
  ].join("\n");
}

export function roteiroReconhecimento(p: { nome: string; perfil: Letra | null; fez: string; importou: string; mostra: string }) {
  const nome = p.nome.split(" ")[0];
  const dica: Record<Letra, string> = {
    D: "Ligue ao resultado e ao desafio: \"Quero ver isso de novo amanhã.\"",
    I: "Faça na frente do time e, se fizer sentido, no grupo da equipe. Esse perfil cresce com palco.",
    S: "Reconheça na frente do time, curto e sincero, e reforce depois no particular: \"A loja conta com você.\"",
    C: "Seja específico(a) no detalhe que ficou bem feito. Elogio genérico não convence esse perfil.",
  };
  return [
    `Reconhecimento · específico, no mesmo dia e na frente do time.`,
    ``,
    `Fez: "${nome}, ${p.fez}."`,
    `Importou: "${p.importou}."`,
    `Mostra: "${p.mostra || "É isso que eu quero ver no time todo."}"`,
    ``,
    `O que é reconhecido se repete.`,
    ...(p.perfil ? [``, `Com o perfil ${PERFIS[p.perfil].nome}: ${dica[p.perfil]}`] : []),
  ].join("\n");
}

// ───── Números → comportamento → ação ─────

export type NumerosPessoa = { pessoa_id: string; nome: string; venda: number; meta: number; ticket: number; pa: number; conversao: number | null };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v: number, c = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Leitura da semana: compara cada pessoa com a média da própria loja (a loja com ela mesma). */
export function leitura(linhas: NumerosPessoa[]) {
  const validas = linhas.filter((l) => l.venda > 0 || l.meta > 0);
  const mTicket = media(validas.map((l) => l.ticket).filter(Boolean));
  const mPa = media(validas.map((l) => l.pa).filter(Boolean));
  const conv = validas.map((l) => l.conversao).filter((x): x is number => x != null && x > 0);
  const mConv = media(conv);
  return validas.map((l) => {
    const pct = l.meta ? Math.round((l.venda / l.meta) * 100) : null;
    const acoes: string[] = [];
    if (l.ticket && mTicket && l.ticket < mTicket * 0.9) acoes.push("Ticket abaixo da loja → treinar o look completo");
    if (l.pa && mPa && l.pa < mPa * 0.9) acoes.push("PA abaixo da loja → treinar a oferta da segunda peça");
    if (l.conversao && mConv && l.conversao < mConv * 0.9) acoes.push("Conversão abaixo da loja → acompanhar atendimentos ao vivo");
    if (pct != null && pct < 90 && !acoes.length) acoes.push("Meta atrás com indicadores bons → ativar a carteira");
    return { ...l, pct, acoes };
  });
}

export function pautaSemanal(d: { data: string; linhas: NumerosPessoa[]; funcionou: string; travou: string; foco: string; destaque: { nome: string; fez: string; importou: string } | null; combinado: { oque: string; quanto: string; ate: string; como: string } }) {
  const l = leitura(d.linhas);
  const venda = l.reduce((s, x) => s + x.venda, 0), meta = l.reduce((s, x) => s + x.meta, 0);
  const sugestoes = [...new Set(l.flatMap((x) => x.acoes.map((a) => a.split("→ ")[1])))];
  return [
    `REUNIÃO DE NÚMEROS · ${d.data.split("-").reverse().join("/")} · 20 a 30 min`,
    ``,
    `1. Números da semana, por pessoa (5 min)`,
    ...(l.length ? l.map((x) => `   • ${x.nome}: ${brl(x.venda)}${x.pct != null ? ` (${x.pct}% da meta)` : ""} · ticket ${brl(x.ticket)} · PA ${num(x.pa)}${x.conversao ? ` · conversão ${num(x.conversao, 0)}%` : ""}`) : ["   • (lance os números de cada pessoa)"]),
    ...(meta ? [`   Loja: ${brl(venda)} de ${brl(meta)} (${Math.round((venda / meta) * 100)}%)`] : []),
    ``,
    `2. O que funcionou (5 min)`,
    `   ${d.funcionou || "Pergunte ao time e anote."}`,
    ``,
    `3. O que travou (5 min)`,
    `   ${d.travou || "Pergunte ao time e anote."}`,
    ``,
    `4. Número → comportamento → ação (5 min)`,
    ...(l.some((x) => x.acoes.length) ? l.filter((x) => x.acoes.length).map((x) => `   • ${x.nome}: ${x.acoes.join("; ")}`) : ["   • Ninguém abaixo da média da loja nesta semana."]),
    ``,
    `5. O foco da semana (um só: cinco pedidos ao mesmo tempo viram nenhum)`,
    `   ${d.foco || sugestoes[0] || "Escolha um comportamento para a semana."}`,
    ``,
    `6. Destaque da semana (reconheça na frente do time)`,
    d.destaque && d.destaque.nome ? `   "${d.destaque.nome}, ${d.destaque.fez}. ${d.destaque.importou}. É isso que eu quero ver no time todo."` : "   Escolha um comportamento certo para reconhecer, mesmo antes do resultado aparecer.",
    ``,
    `7. Combinado (o quê · quanto · até quando · como vou olhar)`,
    `   ${[d.combinado.oque, d.combinado.quanto, d.combinado.ate, d.combinado.como].filter(Boolean).join(" · ") || "Feche um combinado em 4 partes."}`,
    `   Peça para repetir: "Me conta o que ficou combinado?" e registre no grupo ou no quadro.`,
  ].join("\n");
}

export type LinhaMes = { pessoa_id: string; nome: string; venda: number; meta: number; ticket: number; pa: number };

export function metasSugeridas(linhas: LinhaMes[], metaLoja: number) {
  const total = linhas.reduce((s, l) => s + l.venda, 0);
  return linhas.map((l) => ({ ...l, proxima: total && metaLoja ? Math.round(((l.venda / total) * metaLoja) / 100) * 100 : 0 }));
}

export function pautaMensal(d: { mes: string; metaLoja: number; vendaLoja: number; ticketLoja: number; paLoja: number; anterior: { venda: number; ticket: number; pa: number } | null; linhas: LinhaMes[]; funcionou: string; travou: string; foco: string; metaProxima: number; metas: { nome: string; proxima: number }[] }) {
  const pct = d.metaLoja ? Math.round((d.vendaLoja / d.metaLoja) * 100) : null;
  const var_ = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%` : "");
  const ranking = [...d.linhas].map((l) => ({ ...l, pct: l.meta ? Math.round((l.venda / l.meta) * 100) : null })).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const tMed = media(d.linhas.map((l) => l.ticket).filter(Boolean)), paMed = media(d.linhas.map((l) => l.pa).filter(Boolean));
  const focoAuto = d.anterior && d.anterior.pa && d.paLoja < d.anterior.pa ? "PA caiu: treinar a oferta da segunda peça"
    : d.anterior && d.anterior.ticket && d.ticketLoja < d.anterior.ticket ? "Ticket caiu: treinar o look completo"
    : pct != null && pct < 100 ? "Meta não batida: ativar a carteira toda semana"
    : "Meta batida: subir o desafio e pôr quem está pronto para ensinar";
  return [
    `REUNIÃO DO MÊS · ${d.mes} · fechamento do mês e metas individuais · 45 min`,
    ``,
    `1. Abertura (5 min)`,
    `   O objetivo da reunião: olhar o mês com número, reconhecer quem fez acontecer e sair com a meta de cada um.`,
    ``,
    `2. O resultado da loja (10 min)`,
    `   Venda: ${brl(d.vendaLoja)}${d.metaLoja ? ` de ${brl(d.metaLoja)} (${pct}% da meta)` : ""}${d.anterior?.venda ? ` · ${var_(d.vendaLoja, d.anterior.venda)} sobre o mês anterior` : ""}`,
    `   Ticket médio: ${brl(d.ticketLoja)}${d.anterior?.ticket ? ` (${var_(d.ticketLoja, d.anterior.ticket)})` : ""} · PA: ${num(d.paLoja)}${d.anterior?.pa ? ` (${var_(d.paLoja, d.anterior.pa)})` : ""}`,
    `   Leitura: o número diz onde olhar; o comportamento diz o que fazer.`,
    ``,
    `3. Placar por pessoa (10 min) · o número da loja esconde quem está carregando o time`,
    ...(ranking.length ? ranking.map((l) => `   • ${l.nome}: ${brl(l.venda)}${l.pct != null ? ` (${l.pct}% da meta)` : ""} · ticket ${brl(l.ticket)} · PA ${num(l.pa)}${tMed && l.ticket < tMed * 0.9 ? " · treinar look completo" : ""}${paMed && l.pa < paMed * 0.9 ? " · treinar segunda peça" : ""}`) : ["   • (lance os números de cada pessoa)"]),
    ``,
    `4. Reconhecimento (5 min) · na frente do time, específico`,
    ranking[0] ? `   "${ranking[0].nome.split(" ")[0]}, você fechou o mês com ${ranking[0].pct ?? "—"}% da meta. [o comportamento que fez isso acontecer]. É isso que eu quero ver no time todo."` : "   Escolha quem e o comportamento.",
    `   Sem custo: destaque na reunião, escolher a folga, ser escolhido(a) para ensinar o time, mais autonomia.`,
    ``,
    `5. O que funcionou e o que travou (5 min)`,
    `   Funcionou: ${d.funcionou || "pergunte ao time"}`,
    `   Travou: ${d.travou || "pergunte ao time"}`,
    ``,
    `6. O foco do próximo mês (5 min) · um comportamento, 30 dias`,
    `   ${d.foco || focoAuto}`,
    ``,
    `7. Metas individuais do próximo mês (5 min)`,
    ...(d.metas.length ? d.metas.map((m) => `   • ${m.nome}: ${brl(m.proxima)}`) : ["   • Defina a meta de cada pessoa."]),
    ...(d.metaProxima ? [`   Loja: ${brl(d.metaProxima)}`] : []),
    `   Feche com: "Me conta qual é a sua meta e o que você vai fazer diferente na primeira semana?"`,
  ].join("\n");
}

// ───── Desenvolvimento: uma habilidade por mês, por pessoa ─────

export const HABILIDADES: { nome: string; treino: string; medida: string; aula?: string }[] = [
  { nome: "Oferecer a segunda peça em todo atendimento", treino: "10 min de simulação antes de abrir, 2 vezes por semana", medida: "PA sobe (ex.: de 1,4 para 1,8 em 30 dias)", aula: "02.3" },
  { nome: "Montar o look completo", treino: "Simulação com peças A da curva: montar 3 looks por dia com a equipe", medida: "Ticket médio sobe", aula: "02.3" },
  { nome: "Abordagem e os 7 passos do atendimento", treino: "Acompanhar 2 atendimentos ao vivo por dia e dar retorno no fim do dia", medida: "Conversão sobe", aula: "02.3" },
  { nome: "Contornar objeções", treino: "Cartas de treino com \"está caro\", \"vou pensar\", \"volto depois\"", medida: "Conversão sobe", aula: "02.3" },
  { nome: "Cadastrar toda venda", treino: "Conferir o cadastro no fechamento do caixa, todo dia", medida: "% de vendas com cadastro chega a 90%", aula: "03.1" },
  { nome: "Pós-venda e recompra com a carteira", treino: "10 mensagens por dia para a carteira, com a régua pronta", medida: "Clientes que voltaram no mês", aula: "03.2" },
  { nome: "Rotina e checklist", treino: "Checklist de abertura e fechamento feito com a pessoa por 5 dias", medida: "Checklist completo 5 dias seguidos", aula: "02.2" },
  { nome: "Vitrine e exposição", treino: "Montar junto pelas regras de cor, volume e ponto focal", medida: "Trocas no prazo, peças A na frente", aula: "04.3" },
  { nome: "Conteúdo para o Instagram", treino: "Gravar 1 conteúdo por dia pelo roteiro de 35 segundos", medida: "Conteúdos gravados por semana", aula: "04.2" },
  { nome: "Pontualidade e combinados", treino: "Combinado em 4 partes e conferência diária", medida: "Dias no horário combinado" },
];

export const ESTAGIOS: Record<Estagio, { sinal: string; lider: string }> = {
  "Começando": { sinal: "não sabe fazer", lider: "ensina passo a passo e acompanha de perto" },
  Evoluindo: { sinal: "sabe, mas oscila", lider: "treina junto e dá retorno toda semana" },
  Pronto: { sinal: "sabe e faz sozinho(a)", lider: "desafia, dá autonomia e põe para ensinar os outros" },
};

// ───── Dados ─────

const sb = () => supabaseBrowser();

export async function buscarPessoas(portalId: string) {
  const [e, f, d, r] = await Promise.all([
    sb().from("loja_equipe").select("*").eq("portal_id", portalId).order("nome"),
    sb().from("loja_feedbacks").select("*").eq("portal_id", portalId).order("created_at", { ascending: false }),
    sb().from("loja_pdi").select("*").eq("portal_id", portalId).order("created_at", { ascending: false }),
    sb().from("loja_reunioes").select("*").eq("portal_id", portalId).order("data", { ascending: false }),
  ]);
  return {
    pessoas: (e.data ?? []) as Pessoa[], retornos: (f.data ?? []) as Retorno[],
    fichas: (d.data ?? []) as Ficha[], reunioes: (r.data ?? []) as Reuniao[],
  };
}

async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

export const pessoaSalvar = (portalId: string, id: string | null, form: FormData) => {
  const dados = {
    nome: String(form.get("nome") ?? "").trim().slice(0, 120),
    funcao: String(form.get("funcao") ?? "").trim().slice(0, 80) || null,
    entrada: String(form.get("entrada") ?? "") || null,
    motor: (String(form.get("motor") ?? "") || null) as Motor | null,
  };
  if (!dados.nome) throw new Error("Escreva o nome.");
  return ok(id ? sb().from("loja_equipe").update(dados).eq("id", id) : sb().from("loja_equipe").insert({ ...dados, portal_id: portalId }));
};
export const pessoaDesligar = (id: string, ativo: boolean) => ok(sb().from("loja_equipe").update({ ativo }).eq("id", id));
export const perfilSalvar = (id: string, respostas: Letra[], por: "pessoa" | "gestor") =>
  ok(sb().from("loja_equipe").update({ respostas, perfil: pontuar(respostas), respondido_por: por, perfil_em: new Date().toISOString().slice(0, 10) }).eq("id", id));
export const retornoSalvar = (portalId: string, pessoaId: string, tipo: string, situacao: string, roteiro: string) =>
  ok(sb().from("loja_feedbacks").insert({ portal_id: portalId, pessoa_id: pessoaId, tipo, situacao: situacao.slice(0, 2000), roteiro: roteiro.slice(0, 8000) }));
export const retornoFeito = (id: string, feito: boolean) => ok(sb().from("loja_feedbacks").update({ feito }).eq("id", id));
export const reuniaoSalvar = (portalId: string, tipo: "semanal" | "mensal", data: string, dados: object, pauta: string) =>
  ok(sb().from("loja_reunioes").insert({ portal_id: portalId, tipo, data, dados, pauta: pauta.slice(0, 20000) }));
export const fichaSalvar = (portalId: string, id: string | null, form: FormData) => {
  const dados = {
    pessoa_id: String(form.get("pessoa_id") ?? ""),
    estagio: String(form.get("estagio") ?? "Começando") as Estagio,
    competencia: String(form.get("competencia") ?? "").trim().slice(0, 200),
    acoes: String(form.get("acoes") ?? "").trim().slice(0, 2000),
    objetivo: String(form.get("objetivo") ?? "").trim().slice(0, 1000),
    prazo: String(form.get("prazo") ?? "") || null,
    status: String(form.get("status") ?? "Em andamento") as Ficha["status"],
    acompanhamento: String(form.get("acompanhamento") ?? "").trim().slice(0, 4000) || null,
  };
  if (!dados.pessoa_id || !dados.competencia) throw new Error("Escolha a pessoa e a habilidade do mês.");
  return ok(id ? sb().from("loja_pdi").update(dados).eq("id", id) : sb().from("loja_pdi").insert({ ...dados, portal_id: portalId }));
};
