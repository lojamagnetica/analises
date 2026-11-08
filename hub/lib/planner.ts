"use client";

// Planner de gestão da consultoria: todas as demandas da gestão, separadas em diárias, semanais e mensais,
// por frente (Varejo, Atacado, Gestão, Equipe), com o passo a passo de cada uma e o dia fixo combinado.
// A loja marca o que fez em cada dia.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";

export const FRENTES = ["Varejo", "Atacado", "Gestão", "Equipe", "Conteúdo"] as const;
export type Frente = (typeof FRENTES)[number];
/** As frentes desta loja: Atacado só para quem tem atacado (o canal marcado em Equipe › portal ou demandas de atacado já no planner). */
export const frentesDa = (canais: string[] | null | undefined, blocos: { frente: string }[] = []) =>
  FRENTES.filter((f) => f !== "Atacado" || (canais ?? []).includes("atacado") || blocos.some((b) => b.frente === "Atacado"));
export const COR_FRENTE: Record<Frente, string> = { Varejo: "var(--red)", Atacado: "var(--ink)", Gestão: "var(--green)", Equipe: "var(--blue)", Conteúdo: "var(--purple)" };
export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type Freq = "diaria" | "semanal" | "mensal";
export const FREQS: { id: Freq; titulo: string; sub: string }[] = [
  { id: "diaria", titulo: "Todo dia", sub: "A rotina de cada dia de loja, de segunda a sábado." },
  { id: "semanal", titulo: "Toda semana", sub: "Cada demanda no seu dia fixo da semana." },
  { id: "mensal", titulo: "Todo mês", sub: "As datas fixas do mês." },
];

/** Uma demanda da gestão. dia: semanal 1 (seg) a 6 (sáb); mensal 1 a 28 ou 0 (último dia); null = a definir.
 * como: o passo a passo, um passo por linha. inicio: AAAA-MM em que a demanda começa a valer (vazio = já vale). */
export type Bloco = { id: string; freq: Freq; dia: number | null; frente: Frente; titulo: string; detalhe: string; como: string; quem: string; inicio?: string | null; situacao?: "certo" | "sem_constancia" | "nao_faz" };

/** A demanda já vale no mês da data (as que começam depois ficam fora do Hoje e da semana). */
export const ativa = (b: Bloco, d = hoje()) => !b.inicio || b.inicio <= d.slice(0, 7);
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "2027-01" → "jan/2027". */
export const mesCurto = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`;
// mensal: formato antigo (datas do mês numa lista separada); ao abrir, vira demanda mensal em blocos.
export type Planner = { blocos: Bloco[]; mensal: Bloco[]; feitos: Record<string, string[]>; liberado: boolean };

const id = () => crypto.randomUUID().slice(0, 8);

/** Modelo de partida (genérico). A Camilla ajusta para cada cliente antes de liberar. */
export function modeloPlanner(): Planner {
  const b = (freq: Freq, dia: number | null, frente: Frente, titulo: string, detalhe: string, como: string[]): Bloco =>
    ({ id: id(), freq, dia, frente, titulo, detalhe, como: como.join("\n"), quem: "" });
  return {
    liberado: false,
    feitos: {},
    mensal: [],
    blocos: [
      b("diaria", null, "Gestão", "Começo do dia: as 3 prioridades", "10 min antes de abrir", ["Abra o Planner e veja o Hoje", "Escolha as 3 coisas que precisam acontecer hoje", "O resto vai para o dia certo da semana"]),
      b("diaria", null, "Varejo", "Loja pronta para abrir", "Prateleiras cheias e preços visíveis", ["Repor as linhas que mais vendem", "Conferir preços e a frente da loja", "Caixa com troco"]),
      b("diaria", null, "Gestão", "Fechamento do dia", "Venda do dia lançada e o dia fechado", ["Lançar o fechamento do caixa no Hub", "Comparar a venda do dia com a meta", "Marcar o que foi feito e passar o que ficou para amanhã"]),
      b("semanal", 1, "Gestão", "Reunião de resultados da semana", "30 min: varejo × atacado", ["Venda da semana × meta, varejo e atacado", "O que funcionou e o que não funcionou", "Os 3 focos da semana e quem cuida de cada um"]),
      b("semanal", null, "Varejo", "Meta da semana da loja e de cada vendedor", "", ["Dividir a meta do mês pelas semanas", "Combinar com cada vendedor a meta dele", "Deixar a meta visível para o time"]),
      b("semanal", null, "Atacado", "Carteira do atacado: orçamentos e pedidos", "Nenhum orçamento sem retorno", ["Listar os orçamentos em aberto", "Dar retorno a cada um", "Anotar o próximo passo de cada cliente"]),
      b("semanal", null, "Gestão", "Compras e fornecedores", "Pelo giro de cada linha, dentro do orçamento", ["Ver a lista de faltas da semana", "Conferir o orçamento de compras do mês", "Fazer os pedidos"]),
      b("semanal", null, "Gestão", "Financeiro da semana", "Contas a pagar e a receber", ["Contas da próxima semana", "Recebimentos em atraso", "Saldo previsto do caixa"]),
      b("semanal", null, "Equipe", "Acompanhamento individual", "2 a 3 pessoas por semana, 15 min cada", ["O que foi bem na semana", "O que precisa melhorar", "Um combinado até a próxima conversa"]),
      b("mensal", 1, "Gestão", "Relatórios do sistema do mês anterior", "", ["Venda por caixa: varejo e atacado", "Mandar para a Camilla"]),
      b("mensal", 1, "Varejo", "Aniversariantes do mês: o convite", "Primeira semana do mês, para todas as aniversariantes", ["Lançar a missão Aniversariantes do mês para o time", "Cada vendedora manda o convite para as clientes da carteira dela (o presente vale o mês inteiro)", "No dia de cada uma: só o parabéns, sem falar do presente"]),
      b("mensal", 25, "Varejo", "Aniversariantes: lembrete e a lista do mês seguinte", "", ["Lembrete para quem ainda não usou o presente (faltam 5 dias para expirar)", "Puxar no sistema as aniversariantes do mês seguinte e dividir pela carteira de cada vendedora"]),
      b("mensal", 5, "Gestão", "Leitura dos indicadores por linha", "Venda, giro e margem: onde investir", ["Ver as linhas que mais vendem e as que pararam", "Decidir onde investir e o que liquidar"]),
      b("mensal", 15, "Varejo", "Plano do mês seguinte", "Pelo calendário de oportunidades", ["Escolher a ação do mês", "Montar o plano no PLANEJE AQUI até o dia 20"]),
      b("mensal", 0, "Gestão", "Fechamento do mês: varejo × atacado", "", ["Meta × realizado", "Margem e despesas do mês", "O que muda no mês seguinte"]),
    ],
  };
}

/** "Segunda" → 1 … "Sábado" → 6; o resto (sem dia fixo, sem equipe) → null. */
const diaSemana = (v: unknown) => { const i = DIAS_SEMANA.indexOf(String(v ?? "")); return i >= 1 ? i : null; };
/** "Dia 15" → 15; o resto → o padrão. */
const diaMes = (v: unknown, padrao: number | null) => { const m = /^Dia (\d+)$/.exec(String(v ?? "")); return m ? Number(m[1]) : padrao; };
/** A situação de hoje, do formulário da rotina: já faz, faz sem constância ou não faz. */
export type Situacao = "certo" | "sem_constancia" | "nao_faz";
export const SITUACAO_ROTULO: Record<Situacao, string> = { certo: "Já faz", sem_constancia: "Sem constância", nao_faz: "Começar" };
const situacao = (v: unknown): Situacao | undefined =>
  v === "Faço e funciona" ? "certo" : v === "Faço, mas sem constância" ? "sem_constancia" : v === "Não faço" ? "nao_faz" : undefined;

/** O padrão da mensagem de direção do dia no grupo da loja (o Meu dia preenche com os números). */
export const DIRECAO_PADRAO = [
  "Bom dia, time! Ontem: R$ [venda de ontem] de R$ [meta de ontem].",
  "Destaque: [nome], que [o que fez]. 👏",
  "Hoje a meta é R$ [meta de hoje]. Faltam R$ [falta no mês] em [dias] dias.",
  "Foco de hoje: [uma ação concreta].",
  "Missão das clientes: [x] contatos da sua carteira até as [hora].",
];

/**
 * Modelo da mentoria (rotina de gestão da Camilla), montado com o formulário da rotina de gestão (etapa 20):
 * cada demanda com o dia ou o momento que a loja respondeu e a situação de hoje. Sem equipe, saem as demandas de time;
 * o dia do conhecimento só vale a partir do 4º mês. Sem resposta, o dia fica "a definir".
 */
export function modeloMentoria(r: Record<string, unknown> | undefined, o: { solo?: boolean; inicio?: string | null; apoio?: string | null } = {}): Planner {
  const resp = r ?? {};
  const time = !o.solo && resp.s_reuniao_quando !== "Não tenho equipe" && resp.d_direcao_quando !== "Não tenho equipe";
  const momento = (id: string) => { const v = String(resp[`${id}_quando`] ?? ""); return v && !/^Não /.test(v) ? v : ""; };
  const b = (id: string, freq: Freq, dia: number | null, frente: Frente, titulo: string, detalhe: string, como: string[], inicio?: string | null): Bloco =>
    ({ id: `${id}-${crypto.randomUUID().slice(0, 4)}`, freq, dia, frente, titulo, detalhe, como: como.join("\n"), quem: "", inicio: inicio ?? null, situacao: situacao(resp[id]) });
  const sem = (id: string) => diaSemana(resp[`${id}_quando`]);
  const mes = (id: string, padrao: number) => diaMes(resp[`${id}_quando`], padrao);
  const depois3 = o.inicio ? (() => { const [a, m] = o.inicio!.slice(0, 7).split("-").map(Number); const t = a * 12 + m - 1 + 3; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`; })() : null;
  const crediario = resp.s_crediario_quando !== "Não vendo no crediário";
  const blocos: Bloco[] = [
    // Todo dia
    b("d_comeco", "diaria", null, "Gestão", "Começar o dia: a meta, como foi ontem e as prioridades", momento("d_comeco") || "Antes de abrir", ["Ver no Meu dia a meta de hoje e quanto falta no mês", "Ver como foi ontem (da loja e de cada pessoa)", "Escolher as 3 prioridades do dia"]),
    ...(time ? [b("d_direcao", "diaria", null, "Equipe", "Mensagem de direção do dia no grupo da loja", "Inegociável, mesmo quando você está fora", ["O Meu dia deixa a mensagem pronta com os números", ...DIRECAO_PADRAO])] : []),
    b("d_loja_pronta", "diaria", null, "Varejo", "Loja pronta: campeões repostos, araras e vitrine em ordem", momento("d_loja_pronta"), ["Repor o que mais vende", "Araras e vitrine em ordem", "Preços visíveis"]),
    b("d_conteudo", "diaria", null, "Conteúdo", "Conteúdos e estratégia de atração do dia", momento("d_conteudo"), ["Conferir o que vai ao ar hoje (stories e post)", "Ver a estratégia de atração do dia: novidade, data, peça parada", "Responder quem chamou no Instagram e no WhatsApp"]),
    b("d_pagamentos", "diaria", null, "Gestão", "Pagamentos do dia, recebimentos e cobrança", momento("d_pagamentos"), ["Pagar os boletos do dia", "Conferir o que entrou (cartão, Pix e parcelas)", ...(crediario ? ["Ver quem atrasou e mandar a cobrança"] : [])]),
    ...(time ? [b("d_pos_venda", "diaria", null, "Equipe", "Pós-venda em até 24 horas, sem oferecer nada", momento("d_pos_venda"), ["Cada pessoa manda para as clientes que atendeu", "Começa com \"Aqui é [nome], da [loja]\"", "O objetivo é ela responder e salvar o número"])] : []),
    // Toda semana
    b("s_analise", "semanal", sem("s_analise"), "Gestão", "Dia da análise de resultado", "Time, marcas e produtos, Instagram e vitrine", [...(time ? ["Resultado de cada pessoa: venda, PA e ticket"] : ["Venda da semana × meta"]), "Marcas e produtos: o que mais vendeu e o que parou", "Instagram: o que trouxe cliente e venda", "Vitrine: o que saiu dela vendeu?", "Revisar o plano do mês"]),
    b("s_carteira", "semanal", sem("s_carteira"), "Varejo", "Carteira e ativação da base", `Clientes sem comprar há mais de ${/^\d+/.test(String(resp.s_carteira_dias ?? "")) ? resp.s_carteira_dias : "60 dias"}`, [
      "Ver o resultado das ações da carteira da semana: quantas chamadas, respostas e vendas",
      `Puxar as clientes que não compram há mais de ${/^\d+/.test(String(resp.s_carteira_dias ?? "")) ? resp.s_carteira_dias : "60 dias"} (Minhas clientes › Resgate)`,
      "Montar o plano de CRM de ativação: quem chama cada uma, a mensagem e até quando",
      "A mensagem diz quem fala e conduz para o próximo passo, sem perguntar \"posso?\"",
    ]),
    b("s_experiencia", "semanal", sem("s_experiencia"), "Varejo", "Pós-venda e check da experiência das clientes", "O carimbo de conexão de cada venda", [
      "Conferir se toda venda da semana recebeu o pós-venda em até 24 horas, sem oferecer nada",
      "Ver quem respondeu e salvou o número",
      "Fazer o check da experiência: o que as clientes elogiaram e o que reclamaram",
      "Ajustar com o time o que apareceu no check",
    ]),
    b("s_vm", "semanal", sem("s_vm"), "Varejo", "VM geral: vitrine e arrumação da loja", "", ["Trocar a vitrine com o que precisa vender", "Arrumar as araras por cor e ocasião", "Destacar o que está parado na frente"]),
    b("s_conteudo", "semanal", sem("s_conteudo"), "Conteúdo", "Planejar os conteúdos da semana", o.apoio ? `Junto com ${o.apoio}` : "", ["Ver as datas e o que precisa vender", "Programar os conteúdos da semana", "Separar as peças"]),
    b("s_gravacao", "semanal", sem("s_gravacao"), "Conteúdo", "Gravar os vídeos", "Tudo de uma vez", ["Peças separadas e roteiro na mão", "Gravar todos os vídeos da semana"]),
    b("s_compras", "semanal", sem("s_compras"), "Gestão", "Compras da semana", resp.c_orcamento === "Tenho e respeito" ? "Dentro do orçamento do mês" : "Com um teto de compra por mês", ["Primeiro repor o que mais vende", "Conferir quanto ainda cabe no orçamento do mês", "Nada parecido com o que está parado"]),
    // Análise do estoque: na frequência que a loja respondeu (toda semana, junto com as compras; senão, uma vez por mês).
    resp.c_estoque_quando === "Toda semana"
      ? b("c_estoque", "semanal", sem("s_compras"), "Gestão", "Análise do estoque", "Antes das compras da semana", ["O que mais vende (curva ABC)", "O que está parado e há quanto tempo", "O que não comprar mais"])
      : b("c_estoque", "mensal", 10, "Gestão", "Análise do estoque", "", ["O que mais vende (curva ABC)", "O que está parado e há quanto tempo", "O que não comprar mais"]),
    b("s_parados", "semanal", sem("s_parados"), "Varejo", "Ação para as peças paradas", "", ["Separar as peças paradas há mais de 60 dias", "Levar primeiro para a carteira", "Vitrine, combo ou ação"]),
    ...(crediario ? [b("s_crediario", "semanal", sem("s_crediario"), "Gestão", "Crediário da semana: vendido, recebido e vencido", "", ["Quanto foi vendido no crediário", "Quanto foi recebido de parcelas", "Quem passou de 30 dias e a cobrança de cada uma"])] : []),
    // Todo mês
    b("m_planejamento", "mensal", mes("m_planejamento", 15), "Gestão", "Estratégia do mês seguinte", "Até o dia 20, no PLANEJE AQUI", ["Meta: o mesmo mês do ano passado +20%", "Estoque: o que comprar e o que girar", "Datas, calendário e as ações do mês", "Enviar o plano para a Camilla"]),
    b("m_analise", "mensal", mes("m_analise", 3), "Gestão", "Análise do mês que fechou", "O que foi bom, o que precisa melhorar e onde redobrar a atenção", ["Meta × realizado" + (time ? " da loja e de cada pessoa" : ""), "Marcas e produtos: o que vendeu e o que parou", "Revisar o plano: segue ou ajusta", "Os 3 combinados do mês"]),
    b("c_calendario", "mensal", mes("m_planejamento", 15), "Gestão", "Calendário de compras", "Junto com a estratégia do mês seguinte", ["Ver os pedidos de coleção já feitos e quando chegam", "Quanto ainda cabe no orçamento dos próximos meses", "Marcar as próximas feiras e coleções"]),
    b("m_relatorios", "mensal", mes("m_relatorios", 1), "Gestão", "Relatórios do sistema no Hub", "Vendas, estoque e clientes", ["Tirar os relatórios do mês que fechou", "Subir em Estoque e relatórios"]),
  ];
  if (time) blocos.push(
    b("s_reuniao", "semanal", sem("s_reuniao"), "Equipe", "Reunião semanal de resultados com o time", "30 minutos", ["O número de cada uma", "Reconhecimento público", "Os 3 focos da semana"]),
    b("s_individual", "semanal", sem("s_individual"), "Equipe", "Conversa individual com cada pessoa do time", "15 min cada", ["O número dela na semana", "O que ela já faz bem", "O combinado da semana sai dela"]),
    b("s_mural", "semanal", sem("s_mural"), "Equipe", "Atualizar o mural de resultados", "O placar do time à vista de todas", ["Venda da semana de cada pessoa × a meta", "Quem foi destaque e por quê", "Quanto falta para a meta do mês"]),
    b("s_missao", "semanal", sem("s_missao"), "Equipe", "Missão da semana das clientes", "Igual para o time, cada uma com a sua carteira", ["Escolher a missão da semana", "Cada pessoa chama as clientes da sua carteira", "Conferir no fim da semana"]),
    b("s_conhecimento", "semanal", sem("s_conhecimento"), "Equipe", "Dia do conhecimento implantado", "O time estuda e pratica um conhecimento", ["Escolher um conteúdo do curso", "Estudar junto com o time", "Praticar no atendimento da semana"], depois3),
    b("m_reuniao", "mensal", mes("m_reuniao", 5), "Equipe", "Reunião do mês com o time", "Logo depois da análise do mês", ["O que foi bom e o que precisa melhorar", "A meta do mês e a de cada pessoa", "A premiação e as ações"]),
    b("m_feedback", "mensal", mes("m_feedback", 15), "Equipe", "Feedback individual do meio do mês", "Ainda dá para virar o mês", ["O número dela até aqui × a meta", "O que ela já faz bem e a força do perfil", "A solução na prática e o combinado que sai dela (o quê, quanto, até quando)"]),
  );
  return { liberado: false, feitos: {}, mensal: [], blocos };
}

/** Converte o formato antigo (sem frequência, datas do mês separadas) para a lista única de demandas. */
export function normalizar(p: Planner): Planner {
  const velho = (b: Partial<Bloco>, freq: Freq) => ({ como: "", ...b, freq: b.freq ?? freq }) as Bloco;
  return { ...p, feitos: p.feitos ?? {}, blocos: [...(p.blocos ?? []).map((b) => velho(b, "semanal")), ...(p.mensal ?? []).map((b) => velho(b, "mensal"))], mensal: [] };
}

const sb = () => supabaseBrowser();

// Portal com mais de uma loja: cada loja tem o seu planner (loja '' = as lojas juntas, como antes).
// Loja sem planner ainda: nasce do planner geral, sem as marcações (ao salvar, vira o planner dela).
export async function buscarPlanner(portalId: string, loja = ""): Promise<Planner | null> {
  const { data } = await sb().from("loja_planner").select("blocos, mensal, feitos, liberado").eq("portal_id", portalId).eq("loja", loja).maybeSingle();
  if (data) return normalizar(data as Planner);
  if (!loja) return null;
  const geral = await buscarPlanner(portalId, "");
  return geral ? { ...geral, feitos: {} } : null;
}

export async function salvarPlanner(portalId: string, p: Planner, loja = "") {
  // Guarda só os últimos 60 dias de marcações.
  const limite = somarDias(hoje(), -60);
  const feitos = Object.fromEntries(Object.entries(p.feitos).filter(([d]) => d >= limite));
  const { error } = await sb().from("loja_planner").upsert({ portal_id: portalId, ...p, loja, feitos, updated_at: new Date().toISOString() }, { onConflict: "portal_id,loja" });
  if (error) throw new Error(error.message);
}

const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
const ultimoDia = (d: string) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate();

/** O que é de hoje: as diárias (fora o domingo), as semanais do dia e as mensais da data. */
export function deHoje(p: Planner, d = hoje()) {
  const n = Number(d.slice(8)), w = dow(d);
  return p.blocos.filter((b) => ativa(b, d) && (
    b.freq === "diaria" ? w !== 0
    : b.freq === "semanal" ? b.dia === w
    : b.dia === n || (b.dia === 0 && n === ultimoDia(d))));
}

/** "Segunda", "Dia 5", "Último dia do mês", "Dia a definir". */
export function rotuloDia(b: Bloco) {
  if (b.freq === "diaria") return "Todo dia";
  if (b.dia === null || b.dia === undefined) return "Dia a definir";
  if (b.freq === "semanal") return DIAS_SEMANA[b.dia];
  return b.dia === 0 ? "Último dia do mês" : `Dia ${b.dia}`;
}

/** Quanto do planner foi cumprido nos últimos 7 dias. */
export function cumprimento(p: Planner) {
  let previstos = 0, feitos = 0;
  for (let i = 1; i <= 7; i++) {
    const d = somarDias(hoje(), -i);
    const lista = deHoje(p, d);
    previstos += lista.length;
    feitos += lista.filter((b) => p.feitos[d]?.includes(b.id)).length;
  }
  return { previstos, feitos };
}

export const novoBloco = (freq: Freq, frente: Frente = "Gestão"): Bloco => ({ id: id(), freq, dia: null, frente, titulo: "", detalhe: "", como: "", quem: "" });
