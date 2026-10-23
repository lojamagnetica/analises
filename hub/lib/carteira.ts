"use client";

// A Carteira: a ficha única de cada loja (só a equipe vê), com plano e contratos.
import { supabaseBrowser } from "@/lib/supabase/client";

export const SITUACOES = ["Não iniciada", "Em andamento", "Acompanhamento", "Finalizada"] as const;
export const TERMOMETROS = ["Verde", "Amarelo", "Vermelho"] as const;
export const ETAPAS_JORNADA = [
  "", "Primeiros passos", "Diagnóstico", "Rota", "Implementação", "Revisão 90 dias", "Implementação 2", "Encerramento", "Concluída",
];
export const FUNDAMENTOS = [
  "01.1 Indicadores", "01.2 Curva ABC", "01.3 Estoque com giro", "01.4 Metas",
  "02.1 Papéis e combinados", "02.2 Rotina diária", "02.3 Atendimento padrão", "02.4 Reunião semanal",
  "03.1 Carteira de clientes", "03.2 Pós-venda", "03.3 Recompra", "03.4 Ações estratégicas",
  "04.1 Perfil magnético", "04.2 Calendário estratégico", "04.3 Vitrine", "04.4 Atrair clientes novos",
];

export type Plano = { id: string; nome: string; tipo: string; meses: number | null; valor: number | null; vendendo: boolean; ordem: number };
export type Contrato = {
  id: string; portal_id: string; plano_id: string | null; inicio: string | null; fim: string | null;
  valor: number | null; condicao: string | null; status: "Ativo" | "Encerrado" | "Renovado";
};
export type Ficha = {
  portal_id: string; plano_id: string | null; programa_notion: string | null; jornada: string | null;
  situacao: (typeof SITUACOES)[number]; etapa: number | null; termometro: (typeof TERMOMETROS)[number] | null;
  termometro_em: string | null; resultado_n1: string | null; indicador: string | null; fundamentos: string[];
  condicao_especial: string | null; instagram: string | null; grupo_whatsapp: string | null; pasta_interna: string | null;
  notion_url: string | null; data_diagnostico: string | null; responsavel_cs: string | null; observacoes: string | null;
  updated_at: string;
};
export type Loja = {
  id: string; loja: string; responsavel: string | null; whatsapp: string | null; email: string | null; tipo: string;
  inicio: string | null; ativo: boolean; fichas: Ficha | null; contratos: Contrato[];
};
export type PessoaEquipe = { id: string; nome: string | null; email: string | null; funcao: string | null; ultimo_acesso: string | null };

export const corTermometro = (t: string | null) =>
  t === "Vermelho" ? "erro" : t === "Amarelo" ? "alerta" : t === "Verde" ? "feito" : "espera";

/** O contrato que vale agora: o ativo mais recente (ou o mais recente de todos). */
export function contratoAtual(l: Pick<Loja, "contratos">) {
  const ord = [...l.contratos].sort((a, b) => (b.inicio ?? "").localeCompare(a.inicio ?? ""));
  return ord.find((c) => c.status === "Ativo") ?? ord[0] ?? null;
}

export async function buscarCarteira() {
  const sb = supabaseBrowser();
  const [{ data: lojas }, { data: planos }, { data: equipe }] = await Promise.all([
    sb.from("portais").select("id, loja, responsavel, whatsapp, email, tipo, inicio, ativo, fichas(*), contratos(*)").order("loja"),
    sb.from("planos").select("*").order("ordem"),
    sb.from("perfis").select("id, nome, email, funcao, ultimo_acesso").eq("papel", "equipe").order("nome"),
  ]);
  return {
    lojas: (lojas ?? []) as unknown as Loja[],
    planos: (planos ?? []) as Plano[],
    equipe: (equipe ?? []) as PessoaEquipe[],
  };
}
