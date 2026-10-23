"use client";

// Ações do Mês: ações de mercado validadas, montadas uma vez pela equipe e executadas por cada loja.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";

export type Decisao = { pergunta: string; opcoes: string[] };
export type Acao = {
  id: string; titulo: string; resumo: string; publico: string | null; oferta: string | null; contexto: string | null;
  data_acao: string; inicio: string; venda_inicio: string | null; fim: string; aumento: number; publicada: boolean; decisoes: Decisao[];
};
export type Etapa = { id: string; acao_id: string; ordem: number; quando: string; dias: number | null; titulo: string; tarefas: string[] };
export type Material = { id: string; acao_id: string; ordem: number; tipo: "Mensagem" | "Conteúdo" | "Script" | "Vitrine"; titulo: string; texto: string };
export type LojaAcao = {
  id: string; portal_id: string; acao_id: string; base_diaria: number | null; meta: number | null; meta_pa: number | null;
  meta_cadastros: number | null; plano: Record<string, string>; feitas: string[]; repetir: string | null; cortar: string | null; concluida: boolean;
};
export type Venda = { loja_acao_id: string; data: string; valor: number; pa: number | null; cadastros: number | null };

export const TIPOS_MATERIAL: Material["tipo"][] = ["Mensagem", "Conteúdo", "Script", "Vitrine"];
export const ROTULO_TIPO: Record<Material["tipo"], string> = {
  Mensagem: "Mensagens de WhatsApp", Conteúdo: "Conteúdo para o Instagram", Script: "Scripts de atendimento", Vitrine: "Vitrine e sinalização",
};

const sb = () => supabaseBrowser();
const dia = (d: string) => Date.parse(d.slice(0, 10)) / 86_400_000;
export const somarDias = (d: string, n: number) => new Date((dia(d) + n) * 86_400_000).toISOString().slice(0, 10);
export const diasEntre = (a: string, b: string) => Math.round(dia(b) - dia(a)) + 1;

/** Dias de venda da ação (de venda_inicio, ou da data da ação, até o fim). */
export const diasDeVenda = (a: Acao) => Math.max(1, diasEntre(a.venda_inicio ?? a.data_acao, a.fim));
export const metaSugerida = (a: Acao, base: number) => Math.round((base * diasDeVenda(a) * (1 + a.aumento / 100)) / 100) * 100;
export const dataDaEtapa = (a: Acao, e: Etapa) => (e.dias == null ? null : somarDias(a.data_acao, e.dias));

/** A etapa da vez: a primeira cuja data ainda não passou. */
export function etapaAtual(a: Acao, etapas: Etapa[]) {
  const h = hoje();
  return etapas.find((e) => { const d = dataDaEtapa(a, e); return d == null || d >= h; }) ?? null;
}

export function situacao(a: Acao) {
  const h = hoje();
  if (h < a.inicio) return { texto: "em breve", classe: "espera" };
  if (h > a.fim) return { texto: "encerrada", classe: "espera" };
  if (h >= (a.venda_inicio ?? a.data_acao)) return { texto: "vendendo agora", classe: "feito" };
  return { texto: "preparação", classe: "andamento" };
}

export async function buscarAcoes() {
  const { data } = await sb().from("acoes").select("*").order("data_acao");
  return (data ?? []) as Acao[];
}

export async function buscarAcao(id: string, portalId: string | null) {
  const [a, e, m, la] = await Promise.all([
    sb().from("acoes").select("*").eq("id", id).maybeSingle(),
    sb().from("acao_etapas").select("*").eq("acao_id", id).order("ordem"),
    sb().from("acao_materiais").select("*").eq("acao_id", id).order("ordem"),
    portalId ? sb().from("loja_acoes").select("*").eq("acao_id", id).eq("portal_id", portalId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const loja = la.data as LojaAcao | null;
  const vendas = loja ? ((await sb().from("loja_acao_vendas").select("*").eq("loja_acao_id", loja.id).order("data")).data ?? []) as Venda[] : [];
  return { acao: a.data as Acao | null, etapas: (e.data ?? []) as Etapa[], materiais: (m.data ?? []) as Material[], loja, vendas };
}

export function placar(la: LojaAcao | null, vendas: Venda[]) {
  const total = vendas.reduce((s, v) => s + Number(v.valor), 0);
  const comPa = vendas.filter((v) => v.pa != null && Number(v.pa) > 0);
  const pa = comPa.length ? comPa.reduce((s, v) => s + Number(v.pa), 0) / comPa.length : null;
  const cadastros = vendas.reduce((s, v) => s + (v.cadastros ?? 0), 0);
  return { total, pa, cadastros, pct: la?.meta ? Math.round((total / Number(la.meta)) * 100) : null };
}

async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

// ───── Loja ─────

export const ativarAcao = (portalId: string, acaoId: string, d: { base: number; meta: number; meta_pa: number | null; meta_cadastros: number | null; plano: Record<string, string> }) =>
  ok(sb().from("loja_acoes").upsert({ portal_id: portalId, acao_id: acaoId, base_diaria: d.base || null, meta: d.meta || null, meta_pa: d.meta_pa, meta_cadastros: d.meta_cadastros, plano: d.plano }, { onConflict: "portal_id,acao_id" }));
export const marcarTarefa = (la: LojaAcao, chave: string, feita: boolean) =>
  ok(sb().from("loja_acoes").update({ feitas: feita ? [...new Set([...la.feitas, chave])] : la.feitas.filter((x) => x !== chave) }).eq("id", la.id));
export const lancarVenda = (la: LojaAcao, data: string, valor: number, pa: number | null, cadastros: number | null) =>
  ok(sb().from("loja_acao_vendas").upsert({ loja_acao_id: la.id, portal_id: la.portal_id, data, valor, pa, cadastros }));
export const concluirAcao = (la: LojaAcao, repetir: string, cortar: string) =>
  ok(sb().from("loja_acoes").update({ repetir: repetir.slice(0, 2000) || null, cortar: cortar.slice(0, 2000) || null, concluida: true }).eq("id", la.id));

// ───── Equipe ─────

const linhas = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);
/** "Pergunta: opção 1 | opção 2" por linha. */
export const lerDecisoes = (t: string): Decisao[] =>
  linhas(t).map((l) => { const [p, o = ""] = l.split(/:(.*)/s); return { pergunta: p.trim(), opcoes: o.split("|").map((x) => x.trim()).filter(Boolean) }; }).filter((d) => d.pergunta && d.opcoes.length);
export const escreverDecisoes = (d: Decisao[]) => d.map((x) => `${x.pergunta}: ${x.opcoes.join(" | ")}`).join("\n");

export async function acaoSalvar(id: string | null, form: FormData) {
  const t = (k: string) => String(form.get(k) ?? "").trim();
  const dados = {
    titulo: t("titulo").slice(0, 200), resumo: t("resumo").slice(0, 4000), publico: t("publico") || null, oferta: t("oferta") || null,
    contexto: t("contexto") || null, data_acao: t("data_acao"), inicio: t("inicio"), venda_inicio: t("venda_inicio") || null, fim: t("fim"),
    aumento: Number(t("aumento")) || 0, decisoes: lerDecisoes(t("decisoes")),
  };
  if (!dados.titulo || !dados.data_acao || !dados.inicio || !dados.fim) throw new Error("Preencha título e as datas.");
  if (id) { await ok(sb().from("acoes").update(dados).eq("id", id)); return id; }
  const r = await sb().from("acoes").insert(dados).select("id").single();
  if (r.error) throw new Error(r.error.message);
  return r.data.id as string;
}
export const acaoPublicar = (id: string, publicada: boolean) => ok(sb().from("acoes").update({ publicada }).eq("id", id));

export async function etapaSalvar(acaoId: string, id: string | null, form: FormData) {
  const t = (k: string) => String(form.get(k) ?? "").trim();
  const dados = { acao_id: acaoId, ordem: Number(t("ordem")) || 0, quando: t("quando"), dias: t("dias") === "" ? null : Number(t("dias")), titulo: t("titulo"), tarefas: linhas(t("tarefas")) };
  if (!dados.quando || !dados.titulo) throw new Error("Preencha quando e o título da etapa.");
  return ok(id ? sb().from("acao_etapas").update(dados).eq("id", id) : sb().from("acao_etapas").insert(dados));
}
export const etapaApagar = (id: string) => ok(sb().from("acao_etapas").delete().eq("id", id));

export async function materialSalvar(acaoId: string, id: string | null, form: FormData) {
  const t = (k: string) => String(form.get(k) ?? "").trim();
  const dados = { acao_id: acaoId, ordem: Number(t("ordem")) || 0, tipo: t("tipo") as Material["tipo"], titulo: t("titulo"), texto: String(form.get("texto") ?? "").trim() };
  if (!dados.titulo || !dados.texto) throw new Error("Preencha o título e o texto.");
  return ok(id ? sb().from("acao_materiais").update(dados).eq("id", id) : sb().from("acao_materiais").insert(dados));
}
export const materialApagar = (id: string) => ok(sb().from("acao_materiais").delete().eq("id", id));

/** Resultado de todas as lojas numa ação (painel da equipe). */
export async function resultadosDaAcao(acaoId: string) {
  const [la, v, p] = await Promise.all([
    sb().from("loja_acoes").select("*").eq("acao_id", acaoId),
    sb().from("loja_acao_vendas").select("*"),
    sb().from("portais").select("id, loja"),
  ]);
  const lojas = (la.data ?? []) as LojaAcao[];
  const vendas = (v.data ?? []) as Venda[];
  return lojas.map((l) => ({ ...l, loja: (p.data ?? []).find((x) => x.id === l.portal_id)?.loja ?? "—", placar: placar(l, vendas.filter((x) => x.loja_acao_id === l.id)) }));
}
