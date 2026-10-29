"use client";

// Os agentes do Hub (rodam no Supabase e usam o Claude). As instruções de cada um ficam na tabela metodo
// e a Camilla ajusta em Área da mentora › Agentes; cada versão salva guarda a anterior para poder voltar.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Versao = { instrucoes: string; em: string; por: string };
export type Agente = {
  chave: string; nome: string; faz: string; onde: string; href: string; aprende: string;
};

export const AGENTES: Agente[] = [
  {
    chave: "leitura_agente", nome: "Leitura da semana",
    faz: "Toda segunda às 12h lê os números de cada loja (caixa, meta do mês, plano do mês e a leitura anterior) e escreve o rascunho: o que os números mostram e as 3 ações da semana.",
    onde: "Início de cada loja e Lojas que precisam de atenção", href: "/empresa/acompanhamento",
    aprende: "Cada leitura que você publica vira um exemplo (o rascunho dele → a sua versão final). Ele lê os últimos 6 antes de escrever.",
  },
  {
    chave: "historia_agente", nome: "Storytelling da Nossa história",
    faz: "Lê as respostas e as legendas das fotos que a lojista mandou e monta a Nossa história para a equipe e a cultura da loja, sem mudar os fatos.",
    onde: "Central do Cliente › Histórias das lojas › Montar o storytelling", href: "/empresa/historias",
    aprende: "Aprende pelas instruções abaixo: quando corrigir um texto dele, escreva aqui a regra para ele não repetir.",
  },
  {
    chave: "analise_agente", nome: "Análise do Instagram",
    faz: "Recebe o @ da loja (e prints, se quiser), coleta o perfil e preenche a análise como rascunho, seguindo o método.",
    onde: "Área da mentora › Análises de perfil", href: "/equipe/analises",
    aprende: "Aprende pelas instruções abaixo e pelo exemplo de análise guardado com elas.",
  },
];

const sb = () => supabaseBrowser();

export async function buscarAgentes() {
  const [{ data: metodo }, { data: exemplos }] = await Promise.all([
    sb().from("metodo").select("chave, dados").in("chave", AGENTES.map((a) => a.chave)),
    sb().from("leitura_exemplos").select("portal_id, semana, rascunho, final, created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  const dados = Object.fromEntries((metodo ?? []).map((m) => [m.chave as string, (m.dados ?? {}) as Record<string, unknown>]));
  return {
    dados,
    exemplos: (exemplos ?? []) as { portal_id: string; semana: string; rascunho: { texto?: string; acoes?: string[] }; final: { texto?: string; acoes?: string[] }; created_at: string }[],
  };
}

/** Salva as instruções novas e guarda a anterior no histórico (as 10 últimas). */
export async function salvarInstrucoes(chave: string, atual: Record<string, unknown>, instrucoes: string, por: string) {
  const antes = String(atual.instrucoes ?? "");
  const historico = [{ instrucoes: antes, em: new Date().toISOString(), por } as Versao, ...((atual.historico ?? []) as Versao[])].slice(0, 10);
  const { error } = await sb().from("metodo").update({ dados: { ...atual, instrucoes: instrucoes.trim(), historico } }).eq("chave", chave);
  if (error) throw new Error(error.message);
}
