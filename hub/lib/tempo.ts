"use client";

// Onde está o meu tempo: a dona tira tudo da cabeça, separa o que é só dela, vê o retrato,
// monta a semana com os blocos fixos e passa as tarefas para a equipe. Por semana: só 3 prioridades.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Grupo = "so_eu" | "passar" | "agendar" | "parar";
export const GRUPOS: { id: Grupo; nome: string; icone: string; ajuda: string }[] = [
  { id: "so_eu", nome: "Só eu posso fazer", icone: "👑", ajuda: "Metas, números, compras, decisões, acompanhar a equipe." },
  { id: "passar", nome: "Passo para alguém", icone: "🤝", ajuda: "Outra pessoa pode fazer, com você ensinando." },
  { id: "agendar", nome: "Faço, mas com dia e hora", icone: "📅", ajuda: "Sai do \"o tempo todo\" e ganha um horário fixo." },
  { id: "parar", nome: "Paro de fazer", icone: "✋", ajuda: "Não traz resultado." },
];

/** Horas por semana (a dona escolhe uma faixa). */
export const FAIXAS = [{ h: 0.5, rotulo: "menos de 1h" }, { h: 2, rotulo: "1 a 3h" }, { h: 4.5, rotulo: "3 a 6h" }, { h: 8, rotulo: "mais de 6h" }];

type Tipica = { nome: string; sugestao: Grupo; dona?: boolean };
/** As tarefas mais comuns de quem tem loja. dona = tarefa de dona: se não está na semana, está abandonada. */
export const TIPICAS: { area: string; tarefas: Tipica[] }[] = [
  { area: "Salão e atendimento", tarefas: [
    { nome: "Atender clientes no salão", sugestao: "passar" },
    { nome: "Abrir e fechar a loja", sugestao: "passar" },
    { nome: "Fechar o caixa do dia", sugestao: "passar" },
    { nome: "Repor e organizar araras e prateleiras", sugestao: "passar" },
    { nome: "Montar a vitrine", sugestao: "agendar" },
  ] },
  { area: "Estoque e compras", tarefas: [
    { nome: "Receber e conferir mercadoria", sugestao: "passar" },
    { nome: "Etiquetar e colocar preço", sugestao: "passar" },
    { nome: "Fazer pedidos com fornecedores", sugestao: "agendar" },
    { nome: "Decidir o que e quanto comprar", sugestao: "so_eu", dona: true },
    { nome: "Ir a feiras e showrooms", sugestao: "agendar" },
  ] },
  { area: "Online", tarefas: [
    { nome: "Postar stories", sugestao: "passar" },
    { nome: "Responder WhatsApp e Direct", sugestao: "passar" },
    { nome: "Gravar vídeos para o Instagram", sugestao: "agendar" },
  ] },
  { area: "Administrativo e financeiro", tarefas: [
    { nome: "Pagar contas", sugestao: "agendar" },
    { nome: "Conferir extrato e cartões", sugestao: "agendar" },
    { nome: "Resolver banco, contador e notas", sugestao: "agendar" },
    { nome: "Cobrir falta de funcionário", sugestao: "parar" },
  ] },
  { area: "Gestão: o que é da dona", tarefas: [
    { nome: "Olhar os números da semana (meta, vendas, ticket, PA)", sugestao: "so_eu", dona: true },
    { nome: "Planejar o mês (Planeje)", sugestao: "so_eu", dona: true },
    { nome: "Definir as metas e a premiação da equipe", sugestao: "so_eu", dona: true },
    { nome: "Reunião com a equipe", sugestao: "so_eu", dona: true },
    { nome: "Dar feedback e acompanhar cada pessoa", sugestao: "so_eu", dona: true },
    { nome: "Pensar as campanhas e ações do mês", sugestao: "so_eu", dona: true },
    { nome: "Cuidar das clientes mais importantes", sugestao: "so_eu", dona: true },
  ] },
];
export const DE_DONA = TIPICAS.flatMap((a) => a.tarefas.filter((t) => t.dona).map((t) => t.nome));
export const sugestaoDe = (nome: string) => TIPICAS.flatMap((a) => a.tarefas).find((t) => t.nome === nome)?.sugestao ?? null;

export const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
/** Ponto de partida da semana da dona (ela muda à vontade). */
export const BLOCOS_SUGERIDOS = [
  { dia: 0, hora: "08:00", oque: "Olhar os números da semana (meta, vendas, ticket, PA)" },
  { dia: 1, hora: "08:30", oque: "Reunião com a equipe" },
  { dia: 3, hora: "14:00", oque: "Decidir o que e quanto comprar" },
  { dia: 4, hora: "09:00", oque: "Dar feedback e acompanhar cada pessoa" },
];

export type Tarefa = { id: string; nome: string; area: string; horas: number; grupo: Grupo | null; quem?: string; inicio?: string; como?: string; passou?: boolean };
export type Bloco = { id: string; dia: number; hora: string; oque: string };
export type DadosTempo = { tarefas: Tarefa[]; blocos: Bloco[]; prioridades?: { semana: string; itens: string[]; feitas?: boolean[] } };
export const novoId = () => crypto.randomUUID().slice(0, 8);

/** A semana de hoje (segunda), para as 3 prioridades valerem só nela. */
export function semanaAtual() {
  const d = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Recife" }) + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** O retrato: quanto do tempo vai para o que é da dona e o que de dona está abandonado. */
export function retrato(d: DadosTempo) {
  const total = d.tarefas.reduce((s, t) => s + t.horas, 0);
  const daDona = d.tarefas.filter((t) => t.grupo === "so_eu").reduce((s, t) => s + t.horas, 0);
  const podePassar = d.tarefas.filter((t) => t.grupo === "passar" || t.grupo === "parar").reduce((s, t) => s + t.horas, 0);
  // Tarefa de dona que está na lista ou num bloco da semana não está abandonada.
  const nomes = new Set([...d.tarefas.map((t) => t.nome), ...d.blocos.map((b) => b.oque.trim())]);
  const abandonadas = DE_DONA.filter((n) => !nomes.has(n));
  return { total, daDona, podePassar, pct: total ? Math.round((podePassar / total) * 100) : 0, abandonadas };
}

const sb = () => supabaseBrowser();
export async function buscarTempo(portalId: string): Promise<DadosTempo> {
  const { data } = await sb().from("loja_tempo").select("dados").eq("portal_id", portalId).maybeSingle();
  const d = (data?.dados ?? {}) as Partial<DadosTempo>;
  return { tarefas: d.tarefas ?? [], blocos: d.blocos ?? [], prioridades: d.prioridades };
}
export async function salvarTempo(portalId: string, dados: DadosTempo) {
  const { error } = await sb().from("loja_tempo").upsert({ portal_id: portalId, dados, updated_at: new Date().toISOString() }, { onConflict: "portal_id" });
  if (error) throw new Error(error.message);
}
