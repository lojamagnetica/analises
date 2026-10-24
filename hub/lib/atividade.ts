"use client";

// Atividade recente da equipe: junta o que o Hub já guarda (quem e quando), sem tabela nova.
// Entradas (último acesso), vendas, etapas da jornada, respostas ao Fale com a Camilla e contratos.
import { supabaseBrowser } from "@/lib/supabase/client";
import { ETAPAS } from "@/lib/jornada";

export type TipoAtividade = "entrada" | "venda" | "etapa" | "resposta" | "contrato";
export type Atividade = { id: string; tipo: TipoAtividade; quando: string; quem: string; texto: string; loja?: string; portal_id?: string };

export const ROTULO_ATIVIDADE: Record<TipoAtividade, string> = {
  entrada: "Entradas", venda: "Vendas", etapa: "Etapas", resposta: "Respostas", contrato: "Contratos",
};

const textoDoCheck = new Map(ETAPAS.flatMap((e) => e.checks.map((k) => [k.chave, k.texto] as const)));
const curto = (t: string) => (t.length > 90 ? `${t.slice(0, 87)}…` : t);

export async function buscarAtividades(): Promise<Atividade[]> {
  const sb = supabaseBrowser();
  const [portais, perfis, vendas, checks, respostas, gerados, modelos] = await Promise.all([
    sb.from("portais").select("id, loja"),
    sb.from("perfis").select("id, nome, email, ultimo_acesso").eq("papel", "equipe").not("ultimo_acesso", "is", null),
    sb.from("passagens").select("portal_id, vendido_por, criado_por, created_at").order("created_at", { ascending: false }).limit(20),
    sb.from("jornada_checks").select("portal_id, chave, por_nome, updated_at").eq("feito", true).order("updated_at", { ascending: false }).limit(30),
    sb.from("solicitacao_respostas").select("id, portal_id, autor_nome, created_at").eq("equipe", true).order("created_at", { ascending: false }).limit(30),
    sb.from("contratos_gerados").select("id, portal_id, status, gerado_por, created_at").order("created_at", { ascending: false }).limit(20),
    sb.from("contrato_modelos").select("plano_id, titulo, updated_by, updated_at").order("updated_at", { ascending: false }).limit(10),
  ]);
  const loja = new Map((portais.data ?? []).map((p) => [p.id as string, p.loja as string]));
  const quemFoi = (nome: string | null | undefined) => nome || "Alguém da equipe";
  const lista: Atividade[] = [];

  for (const p of perfis.data ?? []) {
    lista.push({ id: `e-${p.id}`, tipo: "entrada", quando: p.ultimo_acesso, quem: quemFoi(p.nome ?? p.email), texto: "entrou no Hub (último acesso)" });
  }
  for (const v of vendas.data ?? []) {
    lista.push({ id: `v-${v.portal_id}`, tipo: "venda", quando: v.created_at, quem: quemFoi(v.criado_por ?? v.vendido_por), texto: "registrou uma venda", loja: loja.get(v.portal_id), portal_id: v.portal_id });
  }
  for (const c of checks.data ?? []) {
    lista.push({ id: `c-${c.portal_id}-${c.chave}`, tipo: "etapa", quando: c.updated_at, quem: quemFoi(c.por_nome), texto: `marcou: ${curto(textoDoCheck.get(c.chave) ?? c.chave)}`, loja: loja.get(c.portal_id), portal_id: c.portal_id });
  }
  for (const r of respostas.data ?? []) {
    lista.push({ id: `r-${r.id}`, tipo: "resposta", quando: r.created_at, quem: quemFoi(r.autor_nome), texto: "respondeu no Fale com a Camilla", loja: loja.get(r.portal_id), portal_id: r.portal_id });
  }
  for (const g of gerados.data ?? []) {
    lista.push({ id: `g-${g.id}`, tipo: "contrato", quando: g.created_at, quem: quemFoi(g.gerado_por), texto: `gerou um contrato (${String(g.status).toLowerCase()})`, loja: loja.get(g.portal_id), portal_id: g.portal_id });
  }
  for (const m of modelos.data ?? []) {
    lista.push({ id: `m-${m.plano_id}`, tipo: "contrato", quando: m.updated_at, quem: quemFoi(m.updated_by), texto: `editou o modelo de contrato ${m.titulo}` });
  }
  return lista.sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 60);
}
