"use client";

// Modelos de reunião prontos, já com os números da loja: abertura do dia (10 min), reta final do mês (15 min),
// individual com cada vendedora (15 min). A semanal e a do mês têm as suas ferramentas próprias.
import { moeda } from "@/lib/formato";
import { fmtPa, PA_IDEAL } from "@/lib/caixa";
import { JEITO, feedback, placar, type DadosMeuDia, type Vendedora } from "@/lib/meu-dia";

export type Bloco = { tempo: string; titulo: string; itens: string[] };
export type Modelo = { id: "abertura" | "reta_final" | "individual"; nome: string; duracao: string; quando: string; objetivo: string; blocos: Bloco[] };

const FOCO: Record<string, { foco: string; como: string }> = {
  pa: { foco: "Venda adicional: toda cliente sai com uma segunda peça ou acessório", como: "Depois que a cliente escolher, mostre uma peça que completa o look antes de ir para o caixa." },
  pm: { foco: "Mostrar primeiro as peças de maior valor", como: "Comece o atendimento pelas peças novas e de maior valor; a promoção fica para o fim." },
  volume: { foco: "Mais atendimentos: chamar a carteira e abordar toda cliente em até 1 minuto", como: "Cada vendedora chama 5 clientes da carteira antes do almoço." },
  ok: { foco: "Manter o ritmo e reconhecer o que está dando certo", como: "Peça para quem está melhor contar o que está fazendo." },
};

/** O foco do dia ou da semana: o problema que mais aparece no time. */
function focoDoTime(vs: Vendedora[]) {
  const conta = (["pa", "pm", "volume"] as const).map((p) => ({ p, n: vs.filter((v) => v.problema === p).length })).sort((a, b) => b.n - a.n);
  return FOCO[conta[0]?.n ? conta[0].p : "ok"];
}

export function montarModelos(d: DadosMeuDia, vs: Vendedora[]): Modelo[] {
  const p = placar(d);
  const f = focoDoTime(vs);
  const premio = d.plano?.dados.premiacao?.trim();
  const comNumero = vs.filter((v) => v.vendas > 0);
  const falta = p.meta ? Math.max(0, p.meta - p.vendido) : null;
  const porVendedora = comNumero.map((v) => {
    const restaV = v.meta ? Math.max(0, v.meta - v.faturamento) : null;
    return `${v.nome}: ${moeda(v.faturamento)}${v.meta ? ` de ${moeda(v.meta)} · falta ${moeda(restaV ?? 0)} (${moeda((restaV ?? 0) / p.restantes)}/dia)` : ""} · PA ${v.pa != null ? fmtPa(v.pa) : "—"}`;
  });

  const abertura: Modelo = {
    id: "abertura", nome: "Reunião de abertura", duracao: "10 min", quando: "Todo dia, antes de abrir a loja, em pé.",
    objetivo: "Todo mundo começa o dia sabendo a meta, o foco e o que fazer na primeira hora.",
    blocos: [
      { tempo: "0 a 2 min", titulo: "Como foi ontem", itens: [
        p.ontem != null ? `Ontem: ${moeda(p.ontem)}${p.metaOntem ? ` (a meta era ${moeda(p.metaOntem)})` : ""}.` : "Ontem: o caixa ainda não foi lançado. Lançar antes da reunião.",
        "Uma coisa boa de ontem (diga o nome de quem fez).",
      ] },
      { tempo: "2 a 5 min", titulo: "A meta de hoje", itens: [
        p.metaHoje ? `Meta da loja hoje: ${moeda(p.metaHoje)}.` : "Meta da loja hoje: coloque a meta do mês no PLANEJE AQUI para o Hub calcular.",
        ...(comNumero.length && p.metaHoje ? comNumero.filter((v) => v.meta).map((v) => `${v.nome}: ${moeda(Math.max(0, (v.meta! - v.faturamento) / p.restantes))} hoje.`) : ["Diga a meta de cada vendedora em voz alta."]),
      ] },
      { tempo: "5 a 8 min", titulo: "O foco do dia (um só)", itens: [f.foco + ".", f.como] },
      { tempo: "8 a 10 min", titulo: "Combinado e energia", itens: ["Quem chama quais clientes da carteira até o almoço.", "Frase de fechamento: \"Bora fazer a meta de hoje!\""] },
    ],
  };

  const retaFinal: Modelo = {
    id: "reta_final", nome: "Reunião de reta final", duracao: "15 min", quando: `Nos últimos 10 dias do mês, quando a loja está abaixo do ritmo (faltam ${p.restantes} dias de loja).`,
    objetivo: "Transformar o que falta em número por dia e por pessoa, com um plano para os últimos dias.",
    blocos: [
      { tempo: "0 a 3 min", titulo: "Onde estamos", itens: [
        p.meta ? `Vendemos ${moeda(p.vendido)} de ${moeda(p.meta)}. Faltam ${moeda(falta ?? 0)} em ${p.restantes} ${p.restantes === 1 ? "dia" : "dias"}: ${moeda((falta ?? 0) / p.restantes)} por dia.` : "Diga quanto vendemos e quanto falta para a meta.",
        p.abaixo ? `O ritmo está ${Math.round(p.abaixo * 100)}% abaixo do que precisa. Dá para chegar se o plano for seguido.` : "Estamos no ritmo: o objetivo é passar da meta.",
        "Tom: firme e animado. É um desafio, não uma bronca.",
      ] },
      { tempo: "3 a 7 min", titulo: "Quanto falta para cada uma", itens: porVendedora.length ? porVendedora : ["Lance o caixa por vendedora para o Hub mostrar o que falta para cada uma."] },
      { tempo: "7 a 11 min", titulo: "O plano dos últimos dias", itens: [
        "Carteira: cada vendedora chama 10 clientes por dia (as que mais compram primeiro).",
        f.foco + ".",
        "Uma ação para trazer gente para a loja (novidade nos stories, convite para provar, reserva de peças).",
      ] },
      { tempo: "11 a 14 min", titulo: "O combinado de cada uma", itens: ["O quê, quanto e até quando: cada vendedora fala o número dela em voz alta.", "Onde a gente acompanha: o fechamento do caixa de cada dia."] },
      { tempo: "14 a 15 min", titulo: "Fechamento", itens: [premio ? `Relembrar a premiação: ${premio.split("\n")[0]}` : "Relembrar o que o time ganha ao bater a meta.", "\"Faltam poucos dias e a meta é nossa.\""] },
    ],
  };

  const individual: Modelo = {
    id: "individual", nome: "Reunião individual", duracao: "15 min por pessoa", quando: "Uma vez por semana, no dia fixo da sua rotina, com cada vendedora.",
    objetivo: "Cada pessoa sai sabendo como está, o que melhorar e um combinado até a próxima conversa.",
    blocos: [
      { tempo: "0 a 2 min", titulo: "Abrir a conversa", itens: ["Pergunte como foi a semana dela antes de falar de número.", "Use o jeito do perfil dela (abaixo, em cada pessoa)."] },
      { tempo: "2 a 5 min", titulo: "O problema, com número", itens: ["Fale na segunda pessoa: \"você está vendendo...\", nunca \"as clientes estão levando...\". É ela quem muda o número.", `Venda × meta, PA e ticket (PA ideal: ${fmtPa(PA_IDEAL)}).`] },
      { tempo: "5 a 7 min", titulo: "O que ela já faz bem", itens: ["Pontue o que ela faz bem e a força do perfil dela, para ela usar na solução."] },
      { tempo: "7 a 11 min", titulo: "A solução, mostrada na prática", itens: ["Demonstre com um exemplo real: uma peça que ela vende muito e como poderia ter feito melhor (o que oferecer, como argumentar)."] },
      { tempo: "11 a 13 min", titulo: "A dificuldade", itens: ["Pergunte o que pode atrapalhar a execução e do que ela precisa."] },
      { tempo: "13 a 15 min", titulo: "O combinado (sai dela)", itens: ["Ela diz o que vai fazer, quanto e até quando. Você combina como vai acompanhar."] },
    ],
  };
  return [abertura, retaFinal, individual];
}

/** O roteiro de cada vendedora na reunião individual. */
export function roteiroIndividual(v: Vendedora) {
  const fb = feedback(v);
  const j = v.letra ? JEITO[v.letra] : null;
  return {
    abrir: j?.abre ?? "Comece perguntando como foi a semana dela.",
    numeros: v.vendas ? `${moeda(v.faturamento)}${v.meta ? ` de ${moeda(v.meta)}` : ""} · ${v.vendas} vendas · PA ${v.pa != null ? fmtPa(v.pa) : "—"} · ticket ${v.tkm != null ? moeda(v.tkm) : "—"}` : "Sem vendas lançadas no mês ainda.",
    situacao: v.diagnostico,
    passos: fb?.passos ?? [],
  };
}

/** O texto da pauta para copiar e mandar no grupo. */
export function pautaTexto(m: Modelo) {
  return [`*${m.nome}* (${m.duracao})`, m.objetivo, "", ...m.blocos.flatMap((b) => [`*${b.tempo} · ${b.titulo}*`, ...b.itens.map((i) => `• ${i}`), ""])].join("\n").trim();
}
