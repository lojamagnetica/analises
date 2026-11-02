"use client";

// Reuniões de gestão dos donos: a análise do mês que fechou (entender) e o planejamento do mês seguinte (transformar em ação).
// Ficam em loja_reunioes (tipo "analise" e "planejamento"), um registro por mês. A Camilla valida.
import { supabaseBrowser } from "@/lib/supabase/client";
import { MESES } from "@/lib/conteudo";

export type TipoGestao = "analise" | "planejamento";
export type Campo = { chave: string; titulo: string; ajuda: string };
export type Combinado = { tipo: "erro" | "potencializar" | "atencao"; oque: string; quem: string; ate: string };
export type DadosGestao = {
  mes: string; // "2026-10"
  campos: Record<string, string>;
  combinados: Combinado[];
  meta_ano_passado?: number; meta?: number;
  conferencia?: "" | "segue" | "ajusta";
  validado?: boolean;
};
export type ReuniaoGestao = { id: string; tipo: TipoGestao; data: string; dados: DadosGestao };

/** Reunião 1: entender em que momento a loja está. */
export const CAMPOS_ANALISE: Campo[] = [
  { chave: "vendedoras", titulo: "Venda por vendedora", ajuda: "Valor, PA, ticket médio e meta × realizado de cada uma, nas duas lojas." },
  { chave: "cadastros", titulo: "Cadastros e recorrência", ajuda: "Quantas vendas foram passadas no nome da cliente. Quantas clientes novas e quantas voltaram." },
  { chave: "produtos", titulo: "Produtos e marcas que mais venderam", ajuda: "Onde esteve a performance do mês." },
  { chave: "semanas", titulo: "Semana a semana", ajuda: "Qual foi a semana mais forte e o que foi feito nela (conteúdo, sazonalidade, ação), para repetir. Onde falhamos." },
  { chave: "marketing", titulo: "Marketing: conteúdos e resultados", ajuda: "O que performou, o que virou venda, planejado × feito. Fazer mais, melhorar e não refazer." },
  { chave: "marcas", titulo: "Marcas: quanto custam × quanto trazem", ajuda: "Boletos do mês × venda de cada marca, estoque e giro, pedidos que vão chegar. Se vai mal: falta de foco e estratégia, ou a marca não performa?" },
];

/** Reunião 2: pegar a análise e transformar em ação. */
export const CAMPOS_PLANO: Campo[] = [
  { chave: "estoque", titulo: "Estoque", ajuda: "O que precisa girar e o que está em falta (produto em falta não vale o foco). Por loja, linha e marca." },
  { chave: "ano_passado", titulo: "O mesmo mês do ano passado", ajuda: "Os produtos que mais venderam e quanto tem deles hoje no estoque. Mostra o desejo da época." },
  { chave: "desejo", titulo: "Linha de desejo", ajuda: "O que atrai a cliente nesta época e precisa vender." },
  { chave: "giro", titulo: "Linha de giro", ajuda: "O que está parado e precisa sair neste mês." },
  { chave: "datas", titulo: "Datas, eventos e sazonalidade", ajuda: "Datas comemorativas, eventos específicos e o que está acontecendo (troca de coleção, calor)." },
  { chave: "calendario", titulo: "Calendário estratégico", ajuda: "Semana a semana: o foco, o produto, a ação e o conteúdo." },
  { chave: "acoes", titulo: "Ações e quem faz", ajuda: "Cada ação com quem faz e até quando." },
  { chave: "proximas", titulo: "As próximas datas", ajuda: "Dia da análise do mês, dia da reunião com o time e dia do próximo planejamento (até o dia 20)." },
];

export const TIPOS_COMBINADO: { tipo: Combinado["tipo"]; titulo: string }[] = [
  { tipo: "erro", titulo: "Onde erramos" },
  { tipo: "potencializar", titulo: "O que está dando certo e vamos potencializar" },
  { tipo: "atencao", titulo: "Onde redobrar a atenção" },
];

export const nomeMes = (mes: string) => { const [a, m] = mes.split("-").map(Number); return `${MESES[m - 1]} de ${a}`; };
/** Mês ("2026-10") somado de n meses. */
export function somarMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const sb = () => supabaseBrowser();
async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

export async function buscarReunioesGestao(portalId: string) {
  const { data, error } = await sb().from("loja_reunioes").select("id, tipo, data, dados").eq("portal_id", portalId).in("tipo", ["analise", "planejamento"]).order("data", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReuniaoGestao[];
}

/** O texto da reunião, para guardar junto (e copiar). */
export function textoDaReuniao(tipo: TipoGestao, d: DadosGestao) {
  const campos = tipo === "analise" ? CAMPOS_ANALISE : CAMPOS_PLANO;
  const l = [`${tipo === "analise" ? "Análise" : "Planejamento"} · ${nomeMes(d.mes)}`];
  if (tipo === "planejamento" && d.meta) l.push(`Meta: ${d.meta}`);
  for (const c of campos) if (d.campos[c.chave]?.trim()) l.push("", c.titulo, d.campos[c.chave].trim());
  if (d.combinados.length) {
    l.push("", "Combinados");
    for (const c of d.combinados) l.push(`- ${TIPOS_COMBINADO.find((t) => t.tipo === c.tipo)?.titulo}: ${c.oque}${c.quem ? ` (${c.quem}` : ""}${c.ate ? `${c.quem ? ", " : " ("}até ${c.ate}` : ""}${c.quem || c.ate ? ")" : ""}`);
  }
  return l.join("\n");
}

export const reuniaoGestaoSalvar = (portalId: string, id: string | null, tipo: TipoGestao, data: string, d: DadosGestao) => {
  const linha = { tipo, data, dados: d, pauta: textoDaReuniao(tipo, d).slice(0, 20000) };
  return id
    ? ok(sb().from("loja_reunioes").update(linha).eq("id", id))
    : ok(sb().from("loja_reunioes").insert({ portal_id: portalId, ...linha }));
};
export const reuniaoGestaoExcluir = (id: string) => ok(sb().from("loja_reunioes").delete().eq("id", id));
