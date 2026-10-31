"use client";

// Central do Cliente: a jornada de cada cliente por etapa (Mapa da Jornada Magnética), com o checklist de cada etapa,
// o dia de mentoria e os alertas de prazo. A passagem do Comercial abre a jornada.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";

export type Check = { chave: string; texto: string; prazo?: number; data?: boolean; ajuda?: string; acao?: "contrato" | "acesso" | "pendencias" | "diagnostico" | "plano" | "reunioes" | "boasvindas" };
export type Etapa = { n: number; nome: string; quem: string; janela: [number, number]; checks: Check[] };

/** prazo = dia útil (contado do pagamento) até quando o item deve estar feito. */
export const ETAPAS: Etapa[] = [
  { n: 0, nome: "Venda e passagem", quem: "Comercial", janela: [0, 1], checks: [
    { chave: "passagem", texto: "Passagem registrada pelo Comercial (portal + dados da venda)", prazo: 1 },
    { chave: "recebida", texto: "Passagem recebida pela CS", prazo: 1 },
  ] },
  { n: 1, nome: "Primeiros passos", quem: "CS", janela: [0, 7], checks: [
    { chave: "contrato", texto: "Contrato gerado e enviado para assinatura", prazo: 0, acao: "contrato" },
    { chave: "grupo", texto: "Grupo individual criado + boas-vindas e envio do contrato (mensagens 1 e 2)", prazo: 0, acao: "boasvindas" },
    { chave: "onboarding_marcado", texto: "Contrato assinado e onboarding marcado (mensagens 3 e 4)", prazo: 0, data: true, acao: "boasvindas" },
    { chave: "clube", texto: "Cliente adicionada ao Clube da Loja Magnética (mensagens 5 e 6)", prazo: 1, acao: "boasvindas" },
    { chave: "onboarding", texto: "Onboarding feito e acesso ao Hub enviado na call", prazo: 1, acao: "acesso" },
    { chave: "pendencias", texto: "Mensagem de Pendências enviada no grupo", prazo: 1, acao: "pendencias" },
    { chave: "lembrete", texto: "Lembrete do dia 3 (só o que falta)", prazo: 4, acao: "pendencias" },
    { chave: "ligacao", texto: "Ligação do dia 5, se ainda faltar algo", prazo: 6 },
    { chave: "documentos", texto: "Documentos completos", prazo: 6, acao: "pendencias" },
    { chave: "diag_marcado", texto: "Diagnóstico marcado (até 5 dias úteis depois dos documentos)", prazo: 11, data: true },
  ] },
  { n: 2, nome: "Diagnóstico", quem: "Camilla", janela: [8, 14], checks: [
    { chave: "gargalo", texto: "Segunda: Camilla escolheu o gargalo e a CS mandou as perguntas do gargalo" },
    { chave: "respostas", texto: "Terça: respostas da cliente recebidas" },
    { chave: "teste_lojista", texto: "Teste do lojista respondido pelos sócios e gerente (link na ficha da loja)" },
    { chave: "raiox", texto: "Diagnóstico da loja revisado pela Camilla", acao: "diagnostico" },
    { chave: "reuniao_diag", texto: "Reunião de diagnóstico feita (1h30)", acao: "reunioes" },
    { chave: "resumo_diag", texto: "Resumo e gravação publicados em até 24h", acao: "reunioes" },
    { chave: "foco", texto: "Contrato de Foco com o \"de acordo\" da cliente" },
  ] },
  { n: 3, nome: "Rota de 90 dias", quem: "Camilla + CS", janela: [12, 21], checks: [
    { chave: "rota_rascunho", texto: "Quinta e sexta: rascunho da Rota" },
    { chave: "rota_revisao", texto: "Segunda: Camilla revisou e gravou o vídeo" },
    { chave: "rota_publicada", texto: "Até terça: Rota publicada no Plano de Ação e cliente avisada", acao: "plano" },
    { chave: "primeiro_marco", texto: "Primeiro marco iniciado" },
  ] },
  { n: 4, nome: "Implementação", quem: "CS", janela: [19, 105], checks: [
    { chave: "pesquisa_30", texto: "Pesquisa de 30 dias" },
    { chave: "mes2", texto: "Mês 2: encontro de ajuste (Premium) ou planejamento analisado no Hub (Gold e Start)" },
    { chave: "mes3", texto: "Mês 3: missões do mês aprovadas pela Camilla" },
    { chave: "checkpoint_60", texto: "Start: checkpoint dos 60 dias no hotseat" },
  ] },
  { n: 5, nome: "Revisão de 90 dias", quem: "Camilla", janela: [100, 110], checks: [
    { chave: "numeros_90", texto: "Números coletados 3 dias antes" },
    { chave: "revisao_90", texto: "Encontro de revisão feito (antes e depois, decisão do ciclo 2)", acao: "reunioes" },
    { chave: "foco_2", texto: "Novo Contrato de Foco e mês 4" },
    { chave: "depoimento_90", texto: "Depoimento pedido (se o resultado foi bom)" },
  ] },
  { n: 6, nome: "Implementação 2", quem: "CS", janela: [105, 150], checks: [
    { chave: "mes5", texto: "Gold: planejamento do mês 5 analisado no Hub" },
    { chave: "processos", texto: "Processos da loja documentados" },
    { chave: "trimestre", texto: "A cliente apresentou o próximo trimestre sozinha" },
  ] },
  { n: 7, nome: "Encerramento", quem: "CS + Camilla", janela: [150, 180], checks: [
    { chave: "reta_final", texto: "Dia 150: reta final aberta (fundamentos que faltam)" },
    { chave: "antes_depois", texto: "Dia 170: antes e depois + Manual da Sua Loja Magnética" },
    { chave: "encerramento", texto: "Encontro (Premium) ou hotseat de encerramento", acao: "reunioes" },
    { chave: "pesquisa_fim", texto: "Pesquisa de encerramento" },
    { chave: "continuidade", texto: "Passado ao Comercial: continuidade em até 48h" },
  ] },
  { n: 8, nome: "Concluída", quem: "", janela: [180, 9999], checks: [] },
];

/** O Start (4 meses) não tem a revisão de 90 dias nem a Implementação 2: o encerramento vem no dia 105 a 120. */
export function etapasDoPlano(plano: string | null) {
  if (plano === "start") {
    return ETAPAS.filter((e) => e.n !== 5 && e.n !== 6).map((e) => (e.n === 4 ? { ...e, janela: [19, 105] as [number, number] } : e.n === 7 ? { ...e, janela: [105, 120] as [number, number] } : e));
  }
  return ETAPAS;
}

const sb = () => supabaseBrowser();

export function diasUteisDepois(base: string, n: number) {
  const d = new Date(`${base}T12:00:00-03:00`);
  let resta = n;
  while (resta > 0) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) resta--;
  }
  return d.toISOString().slice(0, 10);
}

export function diaDeMentoria(inicio: string | null) {
  if (!inicio) return null;
  return Math.floor((new Date(`${hoje()}T12:00:00`).getTime() - new Date(`${inicio}T12:00:00`).getTime()) / 86_400_000);
}

export type Passagem = {
  portal_id: string; vendido_por: string | null; plano_id: string | null; valor: number | null; pagamento_em: string | null;
  forma_pagamento: string | null; resultado_90: string | null; alinhado: boolean; origem: string | null; observacoes: string | null;
  criado_por: string | null; created_at: string; recebida_em: string | null; recebida_por: string | null;
  contratante_nome: string | null; contratante_doc: string | null; contratante_endereco: string | null; representante: string | null;
  representante_cargo: string | null; representante_cpf: string | null; lojas_mentoradas: string | null; email_contrato: string | null;
  bonus: boolean; garantia: boolean;
};
export type CheckFeito = { portal_id: string; chave: string; feito: boolean; marcado_para: string | null; obs: string | null; por_nome: string | null; updated_at: string };
export type ClienteJornada = {
  id: string; loja: string; responsavel: string | null; email: string | null; whatsapp: string | null; tipo: string; inicio: string | null;
  etapa: number; plano: string | null; termometro: string | null; passagem: Passagem | null; checks: Map<string, CheckFeito>;
  dia: number | null; base: string | null;
};

/** Item em atraso: tem prazo, não foi feito e o prazo já passou. */
export function atrasado(c: ClienteJornada, k: Check) {
  if (k.prazo == null || !c.base || c.checks.get(k.chave)?.feito) return false;
  return diasUteisDepois(c.base, k.prazo) < hoje();
}
export function prazoDoItem(c: ClienteJornada, k: Check) {
  return k.prazo != null && c.base ? diasUteisDepois(c.base, k.prazo) : null;
}

/** -1 = cliente que já estava na casa antes da Central e ainda não tem etapa marcada. */

/** Próximo item a fazer na etapa atual e se a cliente está fora da janela da etapa. */
export function situacao(c: ClienteJornada) {
  if (c.etapa < 0) return { etapa: null, proximo: null, atrasos: [] as Check[], alerta: false, foraDaJanela: false };
  const etapa = etapasDoPlano(c.plano).find((e) => e.n === c.etapa) ?? ETAPAS[0];
  const proximo = etapa.checks.find((k) => !c.checks.get(k.chave)?.feito) ?? null;
  const atrasos = etapa.checks.filter((k) => atrasado(c, k));
  const foraDaJanela = c.dia != null && c.etapa < 8 && c.dia > etapa.janela[1];
  return { etapa, proximo, atrasos, alerta: atrasos.length > 0 || foraDaJanela, foraDaJanela };
}

export async function buscarJornada(portalId?: string): Promise<ClienteJornada[]> {
  let q = sb().from("portais").select("id, loja, responsavel, email, whatsapp, tipo, inicio, fichas(etapa, plano_id, termometro), contratos(plano_id, inicio, status)").eq("ativo", true).order("loja");
  if (portalId) q = q.eq("id", portalId);
  const [{ data: portais }, { data: passagens }, { data: checks }] = await Promise.all([
    q,
    portalId ? sb().from("passagens").select("*").eq("portal_id", portalId) : sb().from("passagens").select("*"),
    portalId ? sb().from("jornada_checks").select("*").eq("portal_id", portalId) : sb().from("jornada_checks").select("*"),
  ]);
  return (portais ?? []).map((p) => {
    const f = (Array.isArray(p.fichas) ? p.fichas[0] : p.fichas) as { etapa: number | null; plano_id: string | null; termometro: string | null } | null;
    const contratos = (p.contratos ?? []) as { plano_id: string | null; inicio: string | null; status: string }[];
    const ct = [...contratos].sort((a, b) => (b.inicio ?? "").localeCompare(a.inicio ?? "")).find((c) => c.status === "Ativo") ?? contratos[0];
    const pas = ((passagens ?? []) as Passagem[]).find((x) => x.portal_id === p.id) ?? null;
    const base = pas?.pagamento_em ?? ct?.inicio ?? (p.inicio as string | null);
    const mapa = new Map(((checks ?? []) as CheckFeito[]).filter((x) => x.portal_id === p.id).map((x) => [x.chave, x]));
    // A passagem registrada já conta como feita; recebida também, quando a CS confirmou.
    if (pas) mapa.set("passagem", { portal_id: p.id, chave: "passagem", feito: true, marcado_para: null, obs: null, por_nome: pas.criado_por, updated_at: pas.created_at });
    if (pas?.recebida_em) mapa.set("recebida", { portal_id: p.id, chave: "recebida", feito: true, marcado_para: null, obs: null, por_nome: pas.recebida_por, updated_at: pas.recebida_em });
    return {
      id: p.id, loja: p.loja, responsavel: p.responsavel, email: p.email, whatsapp: p.whatsapp, tipo: p.tipo, inicio: p.inicio,
      etapa: f?.etapa ?? (pas ? (pas.recebida_em ? 1 : 0) : -1), plano: f?.plano_id ?? pas?.plano_id ?? ct?.plano_id ?? null,
      termometro: f?.termometro ?? null, passagem: pas, checks: mapa, dia: diaDeMentoria(base), base,
    } as ClienteJornada;
  });
}

export async function marcarCheck(portalId: string, chave: string, valores: { feito?: boolean; marcado_para?: string | null; obs?: string | null }, porNome: string) {
  const { error } = await sb().from("jornada_checks").upsert({ portal_id: portalId, chave, feito: valores.feito ?? true, ...valores, por_nome: porNome, updated_at: new Date().toISOString() }, { onConflict: "portal_id,chave" });
  if (error) throw new Error(error.message);
}

export async function mudarEtapa(portalId: string, etapa: number) {
  const { error } = await sb().from("fichas").update({ etapa, updated_at: new Date().toISOString() }).eq("portal_id", portalId);
  if (error) throw new Error(error.message);
}

export async function receberPassagem(portalId: string, porNome: string) {
  const { error } = await sb().from("passagens").update({ recebida_em: new Date().toISOString(), recebida_por: porNome }).eq("portal_id", portalId);
  if (error) throw new Error(error.message);
  await mudarEtapa(portalId, 1);
}

/** Mensagem de boas-vindas que a Claudia manda no grupo assim que cria (com o horário do onboarding, se já marcado). */
/** Meses de cada plano, para as mensagens do CS. */
const MESES_DO_PLANO: Record<string, number> = { premium: 6, gold: 6, start: 4 };

export type MensagemCS = { chave: string; titulo: string; quando: string; baloes: string[] };

/** As mensagens padrão do CS, na ordem da entrada da cliente. Cada balão é uma mensagem separada no WhatsApp.
 *  O que o Hub sabe entra sozinho; o resto fica entre colchetes para a CS completar. */
export function mensagensCS(c: ClienteJornada): MensagemCS[] {
  const nome = (c.responsavel ?? "").trim().split(/\s+/)[0] || "[NOME]";
  const meses = c.plano && MESES_DO_PLANO[c.plano] ? `${MESES_DO_PLANO[c.plano]} meses` : "[X MESES]";
  const marcado = c.checks.get("onboarding_marcado")?.marcado_para;
  const quando = marcado && !Number.isNaN(new Date(marcado).getTime()) ? marcado : null;
  const dia = quando ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", weekday: "long", day: "2-digit", month: "2-digit" }).format(new Date(quando)) : "[DIA]";
  const hora = quando ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" }).format(new Date(quando)) : "[HORÁRIO]";
  return [
    { chave: "boasvindas", titulo: "1 · Boas-vindas", quando: "Assim que o grupo individual for criado", baloes: [
      `Olá, ${nome}! Seja muito bem-vinda! 🧡`,
      "Aqui é a Cláudia, do time da Camilla Ribeiro, e é uma alegria enorme ter você aqui!",
      "A partir de agora, vou te acompanhar bem de pertinho nessa jornada dentro da Loja Magnética.",
      `Esse grupo será o nosso canal oficial de acompanhamento, onde vamos centralizar todas as informações, direcionamentos e próximos passos da mentoria durante esses primeiros ${meses}.`,
      "Para darmos o start, já vou enviar o contrato para assinatura e formalizarmos sua entrada.",
      "Fique à vontade para falar comigo por aqui para qualquer coisa que precisar. Estou aqui para te ajudar em cada etapa!",
    ] },
    { chave: "contrato", titulo: "2 · Envio do contrato", quando: "Assim que o contrato estiver disponível", baloes: [
      `@${nome}, acabei de enviar o contrato da sua participação na Loja Magnética para o seu e-mail. Para facilitar, vou deixar o link por aqui também:`,
      "[LINK DO CONTRATO]",
      "Assim que conseguir assinar, me avisa por aqui, por favor. Depois disso, seguimos com os próximos passos da sua entrada 💛",
    ] },
    { chave: "assinado", titulo: "3 · Contrato assinado + marcar o onboarding", quando: "Depois que a cliente assinar (abra o e-mail do suporte e assine também)", baloes: [
      `Perfeito, ${nome}! Contrato assinado por aqui também!`,
      "Agora vamos para o próximo passo da sua entrada na Loja Magnética: o nosso onboarding.",
      "Nesse encontro, vamos alinhar o início da sua jornada, te orientar sobre como vai funcionar o acompanhamento e organizar os próximos passos por aqui.",
      "Teríamos horário [DIA] às [X]h e [DIA] às [Y]h. Qual fica melhor pra você?",
    ] },
    { chave: "agendado", titulo: "4 · Onboarding agendado", quando: "Depois de confirmar o horário (marque o horário no checklist para entrar aqui sozinho)", baloes: [
      `Perfeito, ${nome}! Seu Onboarding ficou agendado para ${dia}, às ${hora}. 🧲`,
      "Esse será o nosso primeiro passo para organizar a sua jornada dentro da Loja Magnética e garantir que você saiba exatamente como aproveitar o acompanhamento desde o início.",
      "Segue o link do nosso Onboarding:",
      "[LINK DO ONBOARDING]",
    ] },
    { chave: "clube_aviso", titulo: "5 · Entrada no Clube", quando: "No grupo individual, antes de adicionar ao Clube", baloes: [
      "Agora vou te adicionar ao nosso Clube da Loja Magnética 🧲",
      "É nesse grupo que você vai estar junto com os outros lojistas que fazem parte da mentoria e também vai receber todos os avisos importantes sobre o acompanhamento, como datas e horários dos nossos encontros 🚀",
    ] },
    { chave: "clube_boasvindas", titulo: "6 · Boas-vindas no Clube", quando: "No grupo do Clube, logo depois de adicionar", baloes: [
      `Seja muito bem-vinda à Loja Magnética, ${nome}! 🧲✨`,
      "É uma alegria enorme te receber no nosso Clube!",
      "Você agora faz parte de um grupo de lojistas que vivem os mesmos desafios e objetivos que você. Aqui a gente cresce junto!",
      `@${nome}, se apresenta aqui pra gente? Conta de onde você é, qual é a sua loja e deixa seu @ do Insta pra gente te acompanhar de pertinho!`,
      "Time, bora acolher nossa nova magnética? 👇",
      "Deixa aqui seu oi e seu @ também pra darmos as boas-vindas com muito carinho!",
    ] },
  ];
}
