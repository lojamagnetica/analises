"use client";

// Gestão de Pessoas da loja, no Método Loja Magnética (Formação Gerencial).
// Aqui fica só a lógica. Os textos do método (perguntas do teste, perfis, roteiros, pautas, rotina do líder,
// habilidades) ficam no banco, na tabela "metodo", e chegam por buscarMetodo().
import { supabaseBrowser } from "@/lib/supabase/client";

export type Letra = "D" | "I" | "S" | "C";
export type Motor = "Ganho" | "Reconhecimento" | "Pertencimento" | "Consequência";
export type Estagio = "Começando" | "Evoluindo" | "Pronto";
export type Falta = "Saber" | "Poder" | "Querer";
export type Pessoa = {
  id: string; portal_id: string; nome: string; funcao: string | null; entrada: string | null; ativo: boolean;
  respostas: Letra[] | null; perfil: Record<Letra, number> | null; respondido_por: "pessoa" | "gestor" | null;
  perfil_em: string | null; motor: Motor | null;
};
export type Retorno = { id: string; pessoa_id: string; tipo: string; situacao: string; roteiro: string; feito: boolean; created_at: string };
export type Ficha = {
  id: string; pessoa_id: string; estagio: Estagio; competencia: string; objetivo: string; acoes: string;
  prazo: string | null; status: "Em andamento" | "Concluído"; acompanhamento: string | null; created_at: string;
};
export type Reuniao = { id: string; tipo: "semanal" | "mensal"; data: string; dados: Record<string, unknown>; pauta: string; created_at: string };

export type Perfil = {
  nome: string; letra: Letra; cor: string; resumo: string; forte: string[]; cuidado: string[];
  motivar: string; retorno: string; cobrar: string; ensinar: string; evitar: string; rende: string;
};
export type Habilidade = { nome: string; treino: string; medida: string; aula?: string };
export type Metodo = {
  perguntas: { pergunta: string; opcoes: Record<Letra, string> }[];
  perfis: Record<Letra, Perfil>;
  motores: Record<Motor, string>;
  diagnostico: Record<Falta, { sinal: string; lider: string }>;
  estagios: Record<Estagio, { sinal: string; lider: string }>;
  habilidades: Habilidade[];
  modelos: Record<string, string[]>;
  textos: Record<string, string>;
  ensinar_passos: string[];
  rotina: { quando: string; oque: string; tempo: string; link: string | null }[];
};

export const LETRAS: Letra[] = ["D", "I", "S", "C"];
export const MOTORES: Motor[] = ["Ganho", "Reconhecimento", "Pertencimento", "Consequência"];
export const FALTAS: Falta[] = ["Saber", "Poder", "Querer"];
export const ESTAGIOS: Estagio[] = ["Começando", "Evoluindo", "Pronto"];

let metodo: Promise<Metodo> | null = null;
/** O método vem do banco uma vez por sessão. */
export function buscarMetodo(): Promise<Metodo> {
  metodo ??= (async () => {
    const r = await supabaseBrowser().from("metodo").select("dados").eq("chave", "pessoas").single();
    if (r.error || !r.data) { metodo = null; throw new Error(r.error?.message ?? "Método não encontrado"); }
    return r.data.dados as Metodo;
  })();
  return metodo;
}

/** Preenche {chave} com os valores; uma linha "{@lista}" vira as linhas da lista. */
export function preencherModelo(linhas: string[], v: Record<string, string | string[] | undefined>) {
  const out: string[] = [];
  for (const l of linhas) {
    const lista = l.match(/^\{@(\w+)\}$/);
    if (lista) out.push(...((v[lista[1]] as string[] | undefined) ?? []));
    else out.push(l.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? "")));
  }
  return out.join("\n");
}
export const texto = (m: Metodo, chave: string, v: Record<string, string> = {}) => preencherModelo([m.textos[chave] ?? ""], v);

export function pontuar(respostas: Letra[]): Record<Letra, number> {
  const p: Record<Letra, number> = { D: 0, I: 0, S: 0, C: 0 };
  respostas.forEach((l) => { p[l] += 1; });
  return p;
}

/** Perfil principal (e o secundário quando está perto). */
export function principal(perfil: Record<Letra, number> | null) {
  if (!perfil) return null;
  const ord = (Object.keys(perfil) as Letra[]).sort((a, b) => perfil[b] - perfil[a]);
  return { letra: ord[0], segunda: perfil[ord[1]] >= perfil[ord[0]] - 1 && perfil[ord[1]] > 0 ? ord[1] : null };
}

// ───── Dar retorno: cobrar e reconhecer ─────

const generaliza = /\b(sempre|nunca|todo dia|toda vez|ningu[eé]m)\b/i;

export function alertasTexto(m: Metodo, ...textos: string[]) {
  const a: string[] = [];
  if (textos.some((t) => generaliza.test(t))) a.push(m.textos.alerta_generaliza);
  if (!textos.some((t) => /\d/.test(t))) a.push(m.textos.alerta_numero);
  return a;
}

export function roteiroCobranca(m: Metodo, p: { nome: string; perfil: Letra | null; falta: Falta; combinado: string; aconteceu: string; impacto: string; novo: string; retorno: string }) {
  const t = m.textos;
  const nome = p.nome.split(" ")[0];
  const perfil = p.perfil ? m.perfis[p.perfil] : null;
  const tom = perfil ? ["", `Tom com o perfil ${perfil.nome}: ${p.falta === "Saber" ? perfil.ensinar : perfil.retorno}`] : [];
  const v = {
    nome, combinado: p.combinado, aconteceu: p.aconteceu, tom,
    impacto: p.impacto || t.padrao_impacto, novo: p.novo || t.padrao_novo, retorno: p.retorno || t.padrao_retorno,
    novo_saber: p.novo ? `combine "${p.novo}"` : "combine o próximo passo",
    retorno_saber: p.retorno ? p.retorno.charAt(0).toLowerCase() + p.retorno.slice(1) : "no fim da semana",
  };
  return preencherModelo(m.modelos[`cobranca_${p.falta.toLowerCase()}`], v);
}

export function roteiroReconhecimento(m: Metodo, p: { nome: string; perfil: Letra | null; fez: string; importou: string; mostra: string }) {
  const dica = p.perfil ? ["", `Com o perfil ${m.perfis[p.perfil].nome}: ${m.textos[`reconhecer_dica_${p.perfil}`]}`] : [];
  return preencherModelo(m.modelos.reconhecer, { nome: p.nome.split(" ")[0], fez: p.fez, importou: p.importou, mostra: p.mostra || m.textos.padrao_mostra, dica });
}

// ───── Números → comportamento → ação ─────

export type NumerosPessoa = { pessoa_id: string; nome: string; venda: number; meta: number; ticket: number; pa: number; conversao: number | null };
export type ChaveLeitura = "ticket" | "pa" | "conversao" | "carteira";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v: number, c = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
/** "Sinal → ação" → "ação" */
export const acaoDaLeitura = (txt: string) => txt.split("→ ")[1] ?? txt;

/** Leitura da semana: compara cada pessoa com a média da própria loja (a loja com ela mesma). */
export function leitura(m: Metodo, linhas: NumerosPessoa[]) {
  const validas = linhas.filter((l) => l.venda > 0 || l.meta > 0);
  const mTicket = media(validas.map((l) => l.ticket).filter(Boolean));
  const mPa = media(validas.map((l) => l.pa).filter(Boolean));
  const mConv = media(validas.map((l) => l.conversao).filter((x): x is number => x != null && x > 0));
  return validas.map((l) => {
    const pct = l.meta ? Math.round((l.venda / l.meta) * 100) : null;
    const chaves: ChaveLeitura[] = [];
    if (l.ticket && mTicket && l.ticket < mTicket * 0.9) chaves.push("ticket");
    if (l.pa && mPa && l.pa < mPa * 0.9) chaves.push("pa");
    if (l.conversao && mConv && l.conversao < mConv * 0.9) chaves.push("conversao");
    if (pct != null && pct < 90 && !chaves.length) chaves.push("carteira");
    return { ...l, pct, chaves, acoes: chaves.map((c) => m.textos[`leitura_${c}`]) };
  });
}

export function pautaSemanal(m: Metodo, d: { data: string; linhas: NumerosPessoa[]; funcionou: string; travou: string; foco: string; destaque: { nome: string; fez: string; importou: string } | null; combinado: { oque: string; quanto: string; ate: string; como: string } }) {
  const t = m.textos;
  const l = leitura(m, d.linhas);
  const venda = l.reduce((s, x) => s + x.venda, 0), meta = l.reduce((s, x) => s + x.meta, 0);
  const sugestoes = [...new Set(l.flatMap((x) => x.acoes.map(acaoDaLeitura)))];
  const combinado = [d.combinado.oque, d.combinado.quanto, d.combinado.ate, d.combinado.como].filter(Boolean).join(" · ");
  return preencherModelo(m.modelos.semanal, {
    data: d.data.split("-").reverse().join("/"),
    numeros: l.length ? l.map((x) => `   • ${x.nome}: ${brl(x.venda)}${x.pct != null ? ` (${x.pct}% da meta)` : ""} · ticket ${brl(x.ticket)} · PA ${num(x.pa)}${x.conversao ? ` · conversão ${num(x.conversao, 0)}%` : ""}`) : [`   • ${t.semanal_sem_numeros}`],
    loja: meta ? [`   Loja: ${brl(venda)} de ${brl(meta)} (${Math.round((venda / meta) * 100)}%)`] : [],
    funcionou: d.funcionou || t.semanal_pergunte,
    travou: d.travou || t.semanal_pergunte,
    leitura: l.some((x) => x.acoes.length) ? l.filter((x) => x.acoes.length).map((x) => `   • ${x.nome}: ${x.acoes.join("; ")}`) : [`   • ${t.semanal_sem_leitura}`],
    foco: d.foco || sugestoes[0] || t.semanal_foco_padrao,
    destaque: d.destaque && d.destaque.nome ? texto(m, "semanal_destaque", d.destaque) : t.semanal_destaque_vazio,
    combinado: combinado || t.semanal_combinado_vazio,
  });
}

export type LinhaMes = { pessoa_id: string; nome: string; venda: number; meta: number; ticket: number; pa: number };

export function metasSugeridas(linhas: LinhaMes[], metaLoja: number) {
  const total = linhas.reduce((s, l) => s + l.venda, 0);
  return linhas.map((l) => ({ ...l, proxima: total && metaLoja ? Math.round(((l.venda / total) * metaLoja) / 100) * 100 : 0 }));
}

export function pautaMensal(m: Metodo, d: { mes: string; metaLoja: number; vendaLoja: number; ticketLoja: number; paLoja: number; anterior: { venda: number; ticket: number; pa: number } | null; linhas: LinhaMes[]; funcionou: string; travou: string; foco: string; metaProxima: number; metas: { nome: string; proxima: number }[] }) {
  const t = m.textos;
  const pct = d.metaLoja ? Math.round((d.vendaLoja / d.metaLoja) * 100) : null;
  const var_ = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%` : "");
  const ranking = [...d.linhas].map((l) => ({ ...l, pct: l.meta ? Math.round((l.venda / l.meta) * 100) : null })).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const tMed = media(d.linhas.map((l) => l.ticket).filter(Boolean)), paMed = media(d.linhas.map((l) => l.pa).filter(Boolean));
  const focoAuto = d.anterior && d.anterior.pa && d.paLoja < d.anterior.pa ? t.foco_pa
    : d.anterior && d.anterior.ticket && d.ticketLoja < d.anterior.ticket ? t.foco_ticket
    : pct != null && pct < 100 ? t.foco_meta : t.foco_batida;
  return preencherModelo(m.modelos.mensal, {
    mes: d.mes,
    venda: `Venda: ${brl(d.vendaLoja)}${d.metaLoja ? ` de ${brl(d.metaLoja)} (${pct}% da meta)` : ""}${d.anterior?.venda ? ` · ${var_(d.vendaLoja, d.anterior.venda)} sobre o mês anterior` : ""}`,
    ticket_pa: `Ticket médio: ${brl(d.ticketLoja)}${d.anterior?.ticket ? ` (${var_(d.ticketLoja, d.anterior.ticket)})` : ""} · PA: ${num(d.paLoja)}${d.anterior?.pa ? ` (${var_(d.paLoja, d.anterior.pa)})` : ""}`,
    ranking: ranking.length ? ranking.map((l) => `   • ${l.nome}: ${brl(l.venda)}${l.pct != null ? ` (${l.pct}% da meta)` : ""} · ticket ${brl(l.ticket)} · PA ${num(l.pa)}${tMed && l.ticket < tMed * 0.9 ? ` · ${t.mensal_treino_ticket}` : ""}${paMed && l.pa < paMed * 0.9 ? ` · ${t.mensal_treino_pa}` : ""}`) : [`   • ${t.mensal_sem_numeros}`],
    reconhecimento: ranking[0] ? texto(m, "mensal_reconhecimento", { nome: ranking[0].nome.split(" ")[0], pct: String(ranking[0].pct ?? "—") }) : t.mensal_reconhecimento_vazio,
    funcionou: d.funcionou || t.mensal_pergunte,
    travou: d.travou || t.mensal_pergunte,
    foco: d.foco || focoAuto,
    metas: [...(d.metas.length ? d.metas.map((x) => `   • ${x.nome}: ${brl(x.proxima)}`) : [`   • ${t.mensal_metas_vazio}`]), ...(d.metaProxima ? [`   Loja: ${brl(d.metaProxima)}`] : [])],
  });
}

// ───── Dados ─────

const sb = () => supabaseBrowser();

export async function buscarPessoas(portalId: string) {
  const [e, f, d, r] = await Promise.all([
    sb().from("loja_equipe").select("*").eq("portal_id", portalId).order("nome"),
    sb().from("loja_feedbacks").select("*").eq("portal_id", portalId).order("created_at", { ascending: false }),
    sb().from("loja_pdi").select("*").eq("portal_id", portalId).order("created_at", { ascending: false }),
    sb().from("loja_reunioes").select("*").eq("portal_id", portalId).order("data", { ascending: false }),
  ]);
  return {
    pessoas: (e.data ?? []) as Pessoa[], retornos: (f.data ?? []) as Retorno[],
    fichas: (d.data ?? []) as Ficha[], reunioes: (r.data ?? []) as Reuniao[],
  };
}

async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

export const pessoaSalvar = (portalId: string, id: string | null, form: FormData) => {
  const dados = {
    nome: String(form.get("nome") ?? "").trim().slice(0, 120),
    funcao: String(form.get("funcao") ?? "").trim().slice(0, 80) || null,
    entrada: String(form.get("entrada") ?? "") || null,
    motor: (String(form.get("motor") ?? "") || null) as Motor | null,
  };
  if (!dados.nome) throw new Error("Escreva o nome.");
  return ok(id ? sb().from("loja_equipe").update(dados).eq("id", id) : sb().from("loja_equipe").insert({ ...dados, portal_id: portalId }));
};
export const pessoaDesligar = (id: string, ativo: boolean) => ok(sb().from("loja_equipe").update({ ativo }).eq("id", id));
export const perfilSalvar = (id: string, respostas: Letra[], por: "pessoa" | "gestor") =>
  ok(sb().from("loja_equipe").update({ respostas, perfil: pontuar(respostas), respondido_por: por, perfil_em: new Date().toISOString().slice(0, 10) }).eq("id", id));
export const retornoSalvar = (portalId: string, pessoaId: string, tipo: string, situacao: string, roteiro: string) =>
  ok(sb().from("loja_feedbacks").insert({ portal_id: portalId, pessoa_id: pessoaId, tipo, situacao: situacao.slice(0, 2000), roteiro: roteiro.slice(0, 8000) }));
export const retornoFeito = (id: string, feito: boolean) => ok(sb().from("loja_feedbacks").update({ feito }).eq("id", id));
export const reuniaoSalvar = (portalId: string, tipo: "semanal" | "mensal", data: string, dados: object, pauta: string) =>
  ok(sb().from("loja_reunioes").insert({ portal_id: portalId, tipo, data, dados, pauta: pauta.slice(0, 20000) }));
export const fichaSalvar = (portalId: string, id: string | null, form: FormData) => {
  const dados = {
    pessoa_id: String(form.get("pessoa_id") ?? ""),
    estagio: String(form.get("estagio") ?? "Começando") as Estagio,
    competencia: String(form.get("competencia") ?? "").trim().slice(0, 200),
    acoes: String(form.get("acoes") ?? "").trim().slice(0, 2000),
    objetivo: String(form.get("objetivo") ?? "").trim().slice(0, 1000),
    prazo: String(form.get("prazo") ?? "") || null,
    status: String(form.get("status") ?? "Em andamento") as Ficha["status"],
    acompanhamento: String(form.get("acompanhamento") ?? "").trim().slice(0, 4000) || null,
  };
  if (!dados.pessoa_id || !dados.competencia) throw new Error("Escolha a pessoa e a habilidade do mês.");
  return ok(id ? sb().from("loja_pdi").update(dados).eq("id", id) : sb().from("loja_pdi").insert({ ...dados, portal_id: portalId }));
};
