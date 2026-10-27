"use client";

// Planner de gestão da consultoria: em que dia acontece cada etapa da gestão, separado por frente
// (Atacado, Varejo, Gestão, Equipe), e as datas fixas do mês. A loja marca o que fez em cada dia.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";

export const FRENTES = ["Varejo", "Atacado", "Gestão", "Equipe"] as const;
export type Frente = (typeof FRENTES)[number];
export const COR_FRENTE: Record<Frente, string> = { Varejo: "var(--red)", Atacado: "var(--ink)", Gestão: "var(--green)", Equipe: "var(--blue)" };
export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type Bloco = { id: string; dia: number; frente: Frente; titulo: string; detalhe: string; quem: string };
export type Planner = { blocos: Bloco[]; mensal: Bloco[]; feitos: Record<string, string[]>; liberado: boolean };

const id = () => crypto.randomUUID().slice(0, 8);

/** Modelo de partida (genérico). A Camilla ajusta para cada cliente antes de liberar. */
export function modeloPlanner(): Planner {
  const b = (dia: number, frente: Frente, titulo: string, detalhe = "", quem = ""): Bloco => ({ id: id(), dia, frente, titulo, detalhe, quem });
  return {
    liberado: false,
    feitos: {},
    blocos: [
      b(1, "Gestão", "Reunião de resultados da semana", "30 min: varejo × atacado, o que funcionou e o foco da semana"),
      b(1, "Varejo", "Meta da semana para a equipe da loja"),
      b(2, "Atacado", "Carteira do atacado: orçamentos e pedidos", "Retorno de todo orçamento em aberto"),
      b(2, "Atacado", "Escolas e clientes institucionais", "Contato, propostas e prazos"),
      b(3, "Gestão", "Compras e fornecedores", "Pedidos pelo giro de cada linha, dentro do orçamento"),
      b(3, "Varejo", "Exposição e reposição da loja"),
      b(4, "Equipe", "Acompanhamento individual", "2 a 3 pessoas por semana, 15 min cada"),
      b(4, "Varejo", "Ação comercial e conteúdo da semana"),
      b(5, "Gestão", "Financeiro: caixa, contas a pagar e a receber"),
      b(5, "Gestão", "Indicadores da semana: varejo × atacado"),
      b(6, "Varejo", "Presença na loja: atendimento, equipe e clientes"),
    ],
    mensal: [
      b(1, "Gestão", "Relatórios do sistema do mês anterior"),
      b(5, "Gestão", "Leitura mensal dos indicadores por linha", "Venda, giro e margem: onde investir"),
      b(15, "Varejo", "Preparar a ação do mês seguinte", "Pelo calendário de oportunidades"),
      b(0, "Gestão", "Fechamento do mês: varejo × atacado"),
    ],
  };
}

const sb = () => supabaseBrowser();

export async function buscarPlanner(portalId: string): Promise<Planner | null> {
  const { data } = await sb().from("loja_planner").select("blocos, mensal, feitos, liberado").eq("portal_id", portalId).maybeSingle();
  return (data as Planner | null) ?? null;
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

/** O que é de hoje: os blocos do dia da semana e as datas fixas do mês. */
export function deHoje(p: Planner, d = hoje()) {
  const n = Number(d.slice(8));
  const mensais = p.mensal.filter((m) => m.dia === n || (m.dia === 0 && n === ultimoDia(d)));
  return [...mensais, ...p.blocos.filter((b) => b.dia === dow(d))];
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

export const novoBloco = (dia: number, frente: Frente): Bloco => ({ id: id(), dia, frente, titulo: "", detalhe: "", quem: "" });
