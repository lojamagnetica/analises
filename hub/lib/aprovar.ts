"use client";

// Tudo o que espera a Camilla aprovar para as lojas verem (e as reuniões gravadas para revisar), num lugar só.
// Usado em "Esperando a Camilla" e na Caixa do dia.
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataCurta } from "@/lib/formato";
import { liberarDiagnostico } from "@/lib/diagnostico";
import { liberarGestao, type Area } from "@/lib/gestao";
import { analiseLiberar, extraLiberar } from "@/lib/instagram";
import { nomeMes } from "@/lib/plano-mes";
import { semanaDe } from "@/lib/leitura";

const AREAS: Record<string, string> = { estoque: "Estoque", compras: "Compras", linhas: "Linhas", fornecedores: "Fornecedores" };

export type ItemAprovar = {
  chave: string; portal: string | null; tipo: string; titulo: string; quando: string | null;
  /** Abre no portal da loja (destino) ou numa página da equipe (href). */
  destino?: string; href?: string;
  liberar?: () => Promise<unknown>;
};

export async function buscarParaAprovar(): Promise<{ itens: ItemAprovar[]; ativos: Map<string, string> }> {
  const sb = supabaseBrowser();
  const [portais, diag, gestao, analise, extra, planos, acoes, pautas, historias, leituras, preparo, diagTodos] = await Promise.all([
    sb.from("portais").select("id, loja").eq("ativo", true),
    sb.from("loja_diagnostico").select("portal_id, loja, updated_at").eq("status", "rascunho"),
    sb.from("loja_gestao").select("portal_id, area, loja, updated_at").eq("status", "rascunho"),
    sb.from("loja_analise_perfil").select("portal_id, updated_at").eq("status", "rascunho"),
    sb.from("loja_analise_extra").select("id, portal_id, instagram, updated_at").eq("status", "rascunho"),
    sb.from("loja_plano_mes").select("portal_id, mes, enviado_em").eq("status", "enviado"),
    sb.from("acoes").select("id, titulo, created_at").eq("publicada", false),
    sb.from("pautas").select("id, titulo, semana").eq("liberada", false),
    sb.from("loja_historia").select("id, portal_id, loja, updated_at").eq("narrativa_pronta", true).eq("narrativa_aprovada", false),
    sb.from("loja_leituras").select("portal_id, semana, updated_at").eq("pronta", true).eq("publicada", false).eq("semana", semanaDe()),
    sb.from("diagnostico_preparo").select("portal_id, agente, escolha, updated_at"),
    sb.from("loja_diagnostico").select("portal_id, status, updated_at").eq("loja", ""),
  ]);
  // O que o agente do Diagnóstico deixou pronto e espera a decisão da Camilla (antes de virar Diagnóstico da loja).
  const diagDe = new Map((diagTodos.data ?? []).map((d) => [d.portal_id as string, d as { status: string; updated_at: string }]));
  const ETAPA: Record<string, string> = { raiox: "Raio-X pronto: escolher o gargalo e a alavanca", mercado: "Pesquisa de concorrentes e mercado pronta", perguntas: "Perguntas do gargalo prontas para revisar e mandar à loja", solucao: "Solução, roteiro e PDF prontos para revisar", hub: "Nova versão do Diagnóstico pronta para comparar e aplicar", plano: "Plano de Ação pronto para revisar e aplicar" };
  const doAgente = (preparo.data ?? []).flatMap((x) => {
    const a = (x.agente ?? {}) as { estado?: string; parada?: string; fim?: string };
    if (a.estado !== "pronto" || !a.parada || !ETAPA[a.parada]) return [];
    if (a.parada === "raiox" && x.escolha) return [];
    const d = diagDe.get(x.portal_id as string);
    // A versão do Hub já aplicada (o Diagnóstico foi salvo depois dela) não aparece de novo.
    if (a.parada === "hub" && d && a.fim && Date.parse(d.updated_at) > Date.parse(a.fim)) return [];
    return [{ portal_id: x.portal_id as string, parada: a.parada, quando: a.fim ?? (x.updated_at as string), liberado: d?.status === "liberada" }];
  });
  const ativos = new Map((portais.data ?? []).map((p) => [p.id as string, p.loja as string]));
  const daLoja = (id: string) => ativos.has(id);
  const itens: ItemAprovar[] = [
    ...doAgente.filter((x) => daLoja(x.portal_id)).map((x) => ({
      chave: `ag${x.portal_id}`, portal: x.portal_id, tipo: "Preparação do Diagnóstico",
      titulo: ETAPA[x.parada] + (x.parada === "hub" && x.liberado ? " (o Diagnóstico atual está liberado: volte para rascunho antes de aplicar)" : ""),
      quando: x.quando, href: `/empresa/minha-central/diagnostico?p=${x.portal_id}`,
    })),
    ...(diag.data ?? []).filter((d) => daLoja(d.portal_id)).map((d) => ({
      chave: `d${d.portal_id}${d.loja}`, portal: d.portal_id, tipo: "Diagnóstico", titulo: d.loja ? `Diagnóstico · ${d.loja}` : "Diagnóstico",
      quando: d.updated_at, destino: "/painel", liberar: () => liberarDiagnostico(d.portal_id, d.loja, true),
    })),
    ...(gestao.data ?? []).filter((g) => daLoja(g.portal_id)).map((g) => ({
      chave: `g${g.portal_id}${g.area}${g.loja}`, portal: g.portal_id, tipo: "Gestão estratégica", titulo: `${AREAS[g.area] ?? g.area}${g.loja ? ` · ${g.loja}` : ""}`,
      quando: g.updated_at, destino: "/estoque", liberar: () => liberarGestao(g.portal_id, g.area as Area, g.loja, true),
    })),
    ...(analise.data ?? []).filter((a) => daLoja(a.portal_id)).map((a) => ({
      chave: `a${a.portal_id}`, portal: a.portal_id, tipo: "Análise do Instagram", titulo: "Análise do perfil",
      quando: a.updated_at, href: `/equipe/analise?p=${a.portal_id}`, liberar: () => analiseLiberar(a.portal_id, true),
    })),
    ...(extra.data ?? []).filter((x) => daLoja(x.portal_id)).map((x) => ({
      chave: `x${x.id}`, portal: x.portal_id, tipo: "Análise do Instagram", titulo: `Análise · ${x.instagram}`,
      quando: x.updated_at, href: `/equipe/analise?p=${x.portal_id}&x=${x.id}`, liberar: () => extraLiberar(x.id, true),
    })),
    ...(planos.data ?? []).filter((p) => daLoja(p.portal_id)).map((p) => ({
      chave: `p${p.portal_id}${p.mes}`, portal: p.portal_id, tipo: "Plano do mês", titulo: `Plano de ${nomeMes(p.mes)}`,
      quando: p.enviado_em, href: "/equipe/planos",
    })),
    ...(historias.data ?? []).filter((h) => h.portal_id && daLoja(h.portal_id)).map((h) => ({
      chave: `h${h.id}`, portal: h.portal_id as string, tipo: "Nossa história", titulo: `Storytelling · ${h.loja}`,
      quando: h.updated_at as string, href: "/empresa/historias",
    })),
    ...(leituras.data ?? []).filter((x) => daLoja(x.portal_id)).map((x) => ({
      chave: `l${x.portal_id}${x.semana}`, portal: x.portal_id as string, tipo: "Leitura da semana", titulo: `Leitura da semana de ${dataCurta(x.semana as string)}`,
      quando: x.updated_at as string, destino: "/inicio",
    })),
    ...(acoes.data ?? []).map((a) => ({
      chave: `c${a.id}`, portal: null, tipo: "Ação do Mês", titulo: a.titulo as string, quando: a.created_at as string, href: `/equipe/acao?id=${a.id}`,
    })),
    ...(pautas.data ?? []).map((p) => ({
      chave: `t${p.id}`, portal: null, tipo: "Pauta quente", titulo: `${p.titulo} (semana ${dataCurta(p.semana as string)})`, quando: p.semana as string, href: "/conteudo/pautas",
    })),
  ];
  // As reuniões que o agente do Tactiq deixou em rascunho esperam a revisão da Camilla.
  const { data: gravadas } = await sb.from("reunioes_gravadas").select("id, portal_id, titulo, data, criado_em").in("status", ["rascunho", "sem_loja"]);
  (gravadas ?? []).forEach((g) => itens.push({
    chave: `rg${g.id}`, portal: g.portal_id && daLoja(g.portal_id as string) ? (g.portal_id as string) : null, tipo: "Reunião gravada", titulo: `${g.titulo ?? "Reunião"}${g.data ? ` (${dataCurta(g.data as string)})` : ""}`,
    quando: (g.criado_em as string) ?? null, href: "/equipe/reunioes-revisar",
  }));
  return { itens, ativos };
}
