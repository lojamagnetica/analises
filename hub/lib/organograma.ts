"use client";

// Organograma da loja: quem responde a quem. No topo a direção; abaixo as áreas (e as áreas dentro delas),
// cada uma com o responsável, as pessoas e o que a área faz.
import { supabaseBrowser } from "@/lib/supabase/client";

export type PessoaOrg = { nome: string; funcao: string };
export type Area = { id: string; nome: string; pai: string | null; lider: string; pessoas: PessoaOrg[]; responsabilidades: string };
export type Organograma = { topo: { nome: string; cargo: string }; areas: Area[] };

const id = () => crypto.randomUUID().slice(0, 8);
export const novaArea = (pai: string | null = null): Area => ({ id: id(), nome: "", pai, lider: "", pessoas: [], responsabilidades: "" });

// Em que área a pessoa entra no modelo de partida, pela função cadastrada.
const AREAS_FUNCAO: [RegExp, string][] = [
  [/atacado/, "Atacado"],
  [/entrega|motorista|rota/, "Entregas"],
  [/financ|fatur|administr|cobran/, "Administrativo e financeiro"],
  [/mkt|marketing|conte[uú]do|social/, "Marketing"],
  [/estoqu|compras|reposi/, "Estoque"],
  [/caixa/, "Caixa"],
];

/** Modelo de partida montado com a equipe cadastrada. A Camilla ajusta com a loja antes de liberar. */
export function modeloOrganograma(responsavel: string, equipe: { nome: string; funcao: string | null }[]): Organograma {
  const areas = new Map<string, Area>();
  const area = (nome: string) => areas.get(nome) ?? areas.set(nome, { ...novaArea(), nome }).get(nome)!;
  for (const p of equipe) {
    const f = (p.funcao ?? "").toLowerCase();
    const nome = /vend|atend|consult/.test(f) ? "Vendas" : AREAS_FUNCAO.find(([re]) => re.test(f))?.[1] ?? "Vendas";
    area(nome).pessoas.push({ nome: p.nome, funcao: p.funcao ?? "" });
  }
  if (!areas.size) ["Vendas", "Caixa", "Estoque", "Administrativo e financeiro"].forEach(area);
  return { topo: { nome: responsavel, cargo: "Direção" }, areas: [...areas.values()] };
}

const sb = () => supabaseBrowser();

export async function buscarOrganograma(portalId: string) {
  const { data } = await sb().from("loja_organograma").select("dados, liberado").eq("portal_id", portalId).maybeSingle();
  return data?.dados?.areas ? { org: data.dados as Organograma, liberado: !!data.liberado } : null;
}

export async function salvarOrganograma(portalId: string, org: Organograma, liberado: boolean) {
  const { error } = await sb().from("loja_organograma").upsert({ portal_id: portalId, dados: org, liberado, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** "Nome — função" por linha ↔ lista de pessoas. */
export const pessoasEmTexto = (ps: PessoaOrg[]) => ps.map((p) => (p.funcao ? `${p.nome} — ${p.funcao}` : p.nome)).join("\n");
export const textoEmPessoas = (t: string): PessoaOrg[] =>
  t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [nome, ...resto] = l.split(/\s+[—–-]\s+/);
    return { nome: nome.trim(), funcao: resto.join(" - ").trim() };
  });
