"use client";

// Planner de gestão da consultoria: todas as demandas da gestão, separadas em diárias, semanais e mensais,
// por frente (Varejo, Atacado, Gestão, Equipe), com o passo a passo de cada uma e o dia fixo combinado.
// A loja marca o que fez em cada dia.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";

export const FRENTES = ["Varejo", "Atacado", "Gestão", "Equipe"] as const;
export type Frente = (typeof FRENTES)[number];
export const COR_FRENTE: Record<Frente, string> = { Varejo: "var(--red)", Atacado: "var(--ink)", Gestão: "var(--green)", Equipe: "var(--blue)" };
export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type Freq = "diaria" | "semanal" | "mensal";
export const FREQS: { id: Freq; titulo: string; sub: string }[] = [
  { id: "diaria", titulo: "Todo dia", sub: "A rotina de cada dia de loja, de segunda a sábado." },
  { id: "semanal", titulo: "Toda semana", sub: "Cada demanda no seu dia fixo da semana." },
  { id: "mensal", titulo: "Todo mês", sub: "As datas fixas do mês." },
];

/** Uma demanda da gestão. dia: semanal 1 (seg) a 6 (sáb); mensal 1 a 28 ou 0 (último dia); null = a definir.
 * como: o passo a passo, um passo por linha. inicio: AAAA-MM em que a demanda começa a valer (vazio = já vale). */
export type Bloco = { id: string; freq: Freq; dia: number | null; frente: Frente; titulo: string; detalhe: string; como: string; quem: string; inicio?: string | null };

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

/** Converte o formato antigo (sem frequência, datas do mês separadas) para a lista única de demandas. */
export function normalizar(p: Planner): Planner {
  const velho = (b: Partial<Bloco>, freq: Freq) => ({ como: "", ...b, freq: b.freq ?? freq }) as Bloco;
  return { ...p, feitos: p.feitos ?? {}, blocos: [...(p.blocos ?? []).map((b) => velho(b, "semanal")), ...(p.mensal ?? []).map((b) => velho(b, "mensal"))], mensal: [] };
}

const sb = () => supabaseBrowser();

export async function buscarPlanner(portalId: string): Promise<Planner | null> {
  const { data } = await sb().from("loja_planner").select("blocos, mensal, feitos, liberado").eq("portal_id", portalId).maybeSingle();
  return data ? normalizar(data as Planner) : null;
}

export async function salvarPlanner(portalId: string, p: Planner) {
  // Guarda só os últimos 60 dias de marcações.
  const limite = somarDias(hoje(), -60);
  const feitos = Object.fromEntries(Object.entries(p.feitos).filter(([d]) => d >= limite));
  const { error } = await sb().from("loja_planner").upsert({ portal_id: portalId, ...p, feitos, updated_at: new Date().toISOString() });
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
