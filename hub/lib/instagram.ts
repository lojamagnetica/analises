"use client";

// Conteúdo no portal da loja: a Análise do Perfil (feita pela equipe), a programação da semana,
// o gerador de roteiro e os resultados. Os textos do método vêm do banco (metodo, chave 'conteudo').
import { erroDaFuncao, supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";

export type Linha = { rotulo: string; fala: string; nota: string };
export type Roteiro = { id: string; nome: string; formato: string; objetivo: Objetivo; quando: string; linhas: Linha[] };
export type Regra = { emoji: string; titulo: string; texto: string };
export type Ideia = { formato: string; objetivo?: Objetivo; titulo: string; texto: string };
export type Cta = { situacao: string; fala: string; porque: string };
export type Passo = { quando?: string; titulo: string; texto: string };
export type Correcao = { titulo: string; texto: string; prazo: string };
export type Objetivo = "Atrair" | "Conectar" | "Vender";
export type Status = "Ideia" | "Roteiro" | "Gravado" | "Programado" | "Publicado";

export type MetodoConteudo = {
  algoritmo: Regra[]; vender_sem_catalogo: { titulo: string; texto: string }; checklist: string[];
  pare: string[]; comece: string[]; estrategia: Regra[];
  objetivos: Record<Objetivo, { sinal: string; texto: string }>; formatos: string[];
  roteiros: Roteiro[]; ganchos: { tipo: string; texto: string }[]; ideias: Ideia[]; ctas: Cta[];
  legenda: { linhas: string[]; regras: string[] }; workflow: Passo[]; ferramentas: string[]; cronograma: Passo[];
  bio: { limite: number; linhas: string[]; regras: string[] }; destaques: string[]; correcoes: Correcao[];
  semana: { dia: number; papel: string; roteiro: string; objetivo: Objetivo; formato: string }[];
  desafio?: Desafio;
  codigos: { n: number; titulo: string; principio: string; pratica: string }[];
  fundamentos: { titulo: string; texto: string; pratica: string }[];
  complementar: string[]; rotina: { quando: string; oque: string; detalhe: string }[]; caminho: string;
  textos: Record<string, string>;
};
export type Missao = { dia: number; titulo: string; objetivo: string; tarefas: string[]; roteiro?: string; dica?: string };
export type Desafio = { nome: string; sub: string; regras: string[]; semanas: { n: number; nome: string; foco: string; meta: string; formatos: string[] }[]; missoes: Missao[] };

/** Tudo o que a equipe escreve na Análise do Perfil de uma loja. */
export type Analise = {
  instagram: string; cidade: string; nicho: string; data: string; video_url: string; lede: string;
  numeros: { destaques_de: string; destaques_para: string; frequencia: string; meta_views: string };
  correcoes: Correcao[]; bio: string; destaques: string[];
  reels: { nome: string; views: number; rosto: boolean }[]; conclusao: string;
  posts: { titulo: string; views: string; acerto: boolean; errado: string; certo: string }[];
  pare: string[]; comece: string[]; estrategia: Regra[]; roteiros: Roteiro[]; workflow: Passo[];
  ganchos: string[]; ideias: Ideia[]; ctas: Cta[]; ferramentas: string[]; cronograma: Passo[];
  // Lojas fora da moda: a programação própria (papel de cada dia, posts complementares e os 2 roteiros de
  // campanha das datas comerciais) no lugar da padrão do Método, que fala de look e provador.
  semana?: MetodoConteudo["semana"]; complementar?: string[]; campanha?: [string, string];
};
/** O que o agente de análise está fazendo (preenchido pela função analise-perfil). */
export type Agente = {
  estado?: "coletando" | "analisando" | "pronta" | "erro"; instagram?: string; inicio?: string; fim?: string;
  fonte?: string; msg?: string; pendencias?: string[]; roteiro_video?: string;
};
export type AnaliseLinha = { portal_id: string; status: "rascunho" | "liberada"; dados: Partial<Analise>; agente?: Agente; liberada_em: string | null; updated_at: string };
export type Ajustes = { dias?: number[]; hora?: string; serie?: string; por_dia?: 1 | 2 };
export type LojaConteudo = { portal_id: string; feitas: string[]; ajustes: Ajustes; desafio: { inicio?: string; feitas?: string[] } };
export type Post = {
  id: string; portal_id: string; data: string; hora: string | null; formato: string; objetivo: Objetivo; tema: string; gancho: string;
  roteiro: string; legenda: string; cta: string; origem: string | null; status: Status; com_rosto: boolean | null;
  views: number | null; comentarios: number | null; mensagens: number | null; vendas: number | null;
  alcance: number | null; envios: number | null; salvamentos: number | null; modelo: string | null; created_at: string;
};

export const STATUS: Status[] = ["Ideia", "Roteiro", "Gravado", "Programado", "Publicado"];
export const OBJETIVOS: Objetivo[] = ["Atrair", "Conectar", "Vender"];
export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const COR_OBJETIVO: Record<Objetivo, string> = { Atrair: "var(--blue)", Conectar: "var(--purple)", Vender: "var(--green)" };

const sb = () => supabaseBrowser();
async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

let metodo: Promise<MetodoConteudo> | null = null;
/** O método vem do banco uma vez por sessão. */
export function buscarMetodoConteudo(): Promise<MetodoConteudo> {
  metodo ??= (async () => {
    const r = await sb().from("metodo").select("dados").eq("chave", "conteudo").single();
    if (r.error || !r.data) { metodo = null; throw new Error(r.error?.message ?? "Método não encontrado"); }
    return r.data.dados as MetodoConteudo;
  })();
  return metodo;
}

/** A análise nova já nasce com o padrão do método; a equipe ajusta para a loja. */
export function analiseInicial(m: MetodoConteudo, loja: { instagram?: string; cidade?: string }): Analise {
  return {
    instagram: loja.instagram ?? "", cidade: loja.cidade ?? "", nicho: "Multimarca de Moda", data: hoje(), video_url: "", lede: "",
    numeros: { destaques_de: "", destaques_para: "7", frequencia: "2/dia", meta_views: "1.000+" },
    correcoes: m.correcoes.map((c) => ({ ...c })), bio: "", destaques: [...m.destaques],
    reels: [], conclusao: "", posts: [],
    pare: [...m.pare], comece: [...m.comece], estrategia: m.estrategia.map((r) => ({ ...r })),
    roteiros: m.roteiros.slice(0, 3).map((r) => ({ ...r, linhas: r.linhas.map((l) => ({ ...l })) })),
    workflow: m.workflow.map((p) => ({ ...p })), ganchos: m.ganchos.map((g) => `${g.tipo}: "${g.texto}"`),
    ideias: m.ideias.map((i) => ({ ...i })), ctas: m.ctas.map((c) => ({ ...c })),
    ferramentas: [...m.ferramentas], cronograma: m.cronograma.map((p) => ({ ...p })),
  };
}

/** Junta a análise salva com o padrão, para nunca faltar campo. */
export const completar = (m: MetodoConteudo, d: Partial<Analise>): Analise => ({ ...analiseInicial(m, {}), ...d, numeros: { ...analiseInicial(m, {}).numeros, ...(d.numeros ?? {}) } });

export async function buscarConteudo(portalId: string) {
  const [a, c, p] = await Promise.all([
    sb().from("loja_analise_perfil").select("*").eq("portal_id", portalId).maybeSingle(),
    sb().from("loja_conteudo").select("*").eq("portal_id", portalId).maybeSingle(),
    sb().from("loja_posts").select("*").eq("portal_id", portalId).order("data").order("hora"),
  ]);
  return {
    analise: (a.data ?? null) as AnaliseLinha | null,
    conteudo: (c.data ?? { portal_id: portalId, feitas: [], ajustes: {}, desafio: {} }) as LojaConteudo,
    posts: (p.data ?? []) as Post[],
  };
}

export const analiseSalvar = (portalId: string, dados: Analise) =>
  ok(sb().from("loja_analise_perfil").upsert({ portal_id: portalId, dados, updated_at: new Date().toISOString() }, { onConflict: "portal_id" }));
export const analiseLiberar = (portalId: string, liberar: boolean) =>
  ok(sb().from("loja_analise_perfil").update({ status: liberar ? "liberada" : "rascunho", liberada_em: liberar ? new Date().toISOString() : null }).eq("portal_id", portalId));
// ───── Análises extras (portal com mais de um Instagram) ─────

export type AnaliseExtra = { id: string; portal_id: string; instagram: string; status: string; dados: Partial<Analise>; liberada_em: string | null };

export async function buscarExtras(portalId: string) {
  const { data } = await sb().from("loja_analise_extra").select("*").eq("portal_id", portalId).order("created_at");
  return (data ?? []) as AnaliseExtra[];
}
export async function extraCriar(portalId: string, instagram: string) {
  const ig = instagram.trim().startsWith("@") ? instagram.trim() : `@${instagram.trim()}`;
  const { data, error } = await sb().from("loja_analise_extra").insert({ portal_id: portalId, instagram: ig }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
export const extraSalvar = (id: string, dados: Analise) =>
  ok(sb().from("loja_analise_extra").update({ dados, instagram: dados.instagram || undefined, updated_at: new Date().toISOString() }).eq("id", id));
export const extraLiberar = (id: string, liberar: boolean) =>
  ok(sb().from("loja_analise_extra").update({ status: liberar ? "liberada" : "rascunho", liberada_em: liberar ? new Date().toISOString() : null }).eq("id", id));

export async function buscarAnalises() {
  const [p, a] = await Promise.all([
    sb().from("portais").select("id, loja, responsavel, tipo, ativo").eq("ativo", true).order("loja"),
    sb().from("loja_analise_perfil").select("portal_id, status, liberada_em, updated_at"),
  ]);
  return { portais: (p.data ?? []) as { id: string; loja: string; responsavel: string | null; tipo: string }[], analises: (a.data ?? []) as Omit<AnaliseLinha, "dados">[] };
}

export const conteudoSalvar = (c: LojaConteudo) =>
  ok(sb().from("loja_conteudo").upsert({ portal_id: c.portal_id, feitas: c.feitas, ajustes: c.ajustes, desafio: c.desafio, updated_at: new Date().toISOString() }, { onConflict: "portal_id" }));

type PostNovo = Omit<Post, "id" | "created_at" | "views" | "comentarios" | "mensagens" | "vendas" | "com_rosto" | "alcance" | "envios" | "salvamentos" | "modelo"> & { com_rosto?: boolean | null; modelo?: string | null };
export const postsCriar = (posts: PostNovo[]) => ok(sb().from("loja_posts").insert(posts));
export const postSalvar = (id: string, campos: Partial<Post>) => ok(sb().from("loja_posts").update(campos).eq("id", id));
export const postApagar = (id: string) => ok(sb().from("loja_posts").delete().eq("id", id));

// ───── Roteiros e legenda ─────

/** Os roteiros da loja: os da análise primeiro (ajustados pela equipe), depois o resto do método. */
export function roteirosDaLoja(m: MetodoConteudo, a: Analise | null) {
  const proprios = a?.roteiros ?? [];
  // Com programação própria (loja fora da moda), só os roteiros da loja: os do Método falam de look e provador.
  if (a?.semana?.length && proprios.length) return proprios;
  const ids = new Set(proprios.map((r) => r.id));
  return [...proprios, ...m.roteiros.filter((r) => !ids.has(r.id))];
}

/** "[peça de trabalho]" → campo para a loja preencher. */
export function camposDe(textos: string[]) {
  return [...new Set(textos.flatMap((t) => [...t.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1])))];
}
export const preencherCampos = (t: string, v: Record<string, string>) => t.replace(/\[([^\]]+)\]/g, (x, k: string) => v[k]?.trim() || x);

export function textoDoRoteiro(r: Roteiro, v: Record<string, string>) {
  return r.linhas.map((l) => `${l.rotulo.toUpperCase()}: ${preencherCampos(l.fala, v)}${l.nota ? `\n   (${l.nota})` : ""}`).join("\n\n");
}
const linhaDe = (r: Roteiro, ...rotulos: string[]) => r.linhas.find((l) => rotulos.some((x) => l.rotulo.toLowerCase().startsWith(x)));
export const ganchoDe = (r: Roteiro, v: Record<string, string> = {}) => preencherCampos((linhaDe(r, "gancho", "capa", "no dia") ?? r.linhas[0])?.fala ?? "", v);
export const ctaDe = (r: Roteiro, v: Record<string, string> = {}) => preencherCampos(linhaDe(r, "cta")?.fala ?? "", v);

export function montarLegenda(m: MetodoConteudo, v: Record<string, string>) {
  return m.legenda.linhas.map((l) => preencherCampos(l, v)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ───── A semana ─────

export const segundaDe = (d: string) => {
  const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
  return somarDias(d, dow === 0 ? -6 : 1 - dow);
};
export const diaDaSemana = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

type Lancamento = { titulo: string; data: string };
type DataComercial = { mes: number; dia: number | null; titulo: string };

/** Datas comerciais que caem até 9 dias depois do dia: a campanha roda na semana anterior. */
export function datasProximas(datas: DataComercial[], de: string, ate = 9) {
  const ano = Number(de.slice(0, 4));
  return datas
    .filter((d) => d.dia != null)
    .flatMap((d) => [ano, ano + 1].map((y) => ({ titulo: d.titulo, data: `${y}-${String(d.mes + 1).padStart(2, "0")}-${String(d.dia).padStart(2, "0")}` })))
    .filter((d) => d.data > de && d.data <= somarDias(de, ate));
}

/**
 * Monta a semana no Método: o papel de cada dia (série fixa, looks numerados, bastidor…),
 * 3 dias de espera antes de cada lançamento das Ações do Mês e campanha na semana anterior a cada data comercial.
 * Dias que já têm post ficam como estão.
 */
export function gerarSemana(p: {
  m: MetodoConteudo; analise: Analise | null; portalId: string; segunda: string; ajustes: Ajustes;
  existentes: Post[]; lancamentos: Lancamento[]; datas: DataComercial[]; vars: Record<string, string>;
  /** Produtos em destaque do plano do mês (PLANEJE AQUI): entram no tema dos posts. */
  destaques?: string[];
}): PostNovo[] {
  const { m, analise, portalId, segunda, ajustes, vars } = p;
  const roteiros = roteirosDaLoja(m, analise);
  const porId = (id: string) => roteiros.find((r) => r.id === id) ?? roteiros[0];
  const dias = ajustes.dias?.length ? ajustes.dias : [0, 1, 2, 3, 4, 5, 6];
  const hora = ajustes.hora || m.textos.hora_padrao || "08:30";
  const ideias = analise?.ideias?.length ? analise.ideias : m.ideias;
  const novos: PostNovo[] = [];
  const usadas = new Set<string>();
  const base = { portal_id: portalId, hora, legenda: "", status: "Ideia" as Status };

  const doRoteiro = (r: Roteiro, extra: Partial<PostNovo>): PostNovo => ({
    ...base, data: segunda, formato: r.formato, objetivo: r.objetivo, tema: r.nome, origem: "ideia", modelo: r.id,
    gancho: ganchoDe(r, vars), roteiro: textoDoRoteiro(r, vars), cta: ctaDe(r, vars), ...extra,
  });

  // Cadência dupla do Método Loja Viral: 1 reel + 1 post complementar (carrossel, look do dia, prova social).
  const semanaDoMetodo = analise?.semana?.length ? analise.semana : m.semana;
  const complementares = analise?.complementar?.length ? analise.complementar : m.complementar;
  function complemento(dataC: string, n: number) {
    if ((ajustes.por_dia ?? 2) < 2 || !complementares?.length) return;
    const rc = porId(complementares[n % complementares.length]);
    novos.push(doRoteiro(rc, { data: dataC, hora: "12:00", origem: "complementar", tema: `Post complementar · ${rc.nome}` }));
  }

  for (let i = 0; i < 7; i++) {
    const data = somarDias(segunda, i);
    const dow = diaDaSemana(data);
    const temPost = p.existentes.some((x) => x.data === data) || data < hoje();

    // Lançamento das Ações do Mês: espera nos stories 3 dias e 1 dia antes, reels no dia.
    for (const l of p.lancamentos) {
      const chegou = porId("chegou-na-loja");
      const [antes3, antes1, noDia] = chegou.linhas;
      const passo = data === somarDias(l.data, -3) ? antes3 : data === somarDias(l.data, -1) ? antes1 : data === l.data ? noDia : null;
      if (!passo || p.existentes.some((x) => x.data === data && x.origem === "acao") || data < hoje()) continue;
      novos.push({
        ...base, data, formato: data === l.data ? "Reels" : "Stories", objetivo: "Vender", origem: "acao", modelo: chegou.id,
        tema: `${l.titulo} · ${passo.rotulo}`, gancho: preencherCampos(passo.fala, { ...vars, "dia da chegada": "dia " + l.data.slice(8, 10) + "/" + l.data.slice(5, 7) }),
        roteiro: `${passo.fala}\n   (${passo.nota})`, cta: ctaDe(chegou, vars),
      });
    }
    if (temPost || !dias.includes(dow)) continue;

    // Data comercial chegando: campanha antes, não no dia.
    const dc = datasProximas(p.datas, data, 9).find((d) => !usadas.has(d.titulo));
    if (dc && (dow === 2 || dow === 5)) {
      usadas.add(dc.titulo);
      const [idCampanha, idCampanha2] = analise?.campanha ?? ["looks-numerados", "pov-provador"];
      const r = porId(idCampanha);
      const gancho = analise?.campanha ? ganchoDe(r, { ...vars, data: dc.titulo }) : `Looks para ${dc.titulo}: do mais básico ao mais arrumado.`;
      novos.push(doRoteiro(r, { data, origem: "data", tema: `${dc.titulo} (${dc.data.slice(8, 10)}/${dc.data.slice(5, 7)}) · ${r.nome}`, gancho }));
      const pov = porId(idCampanha2);
      if ((ajustes.por_dia ?? 2) >= 2) novos.push(doRoteiro(pov, { data, origem: "data", tema: `${dc.titulo} · ${pov.nome}` }));
      continue;
    }

    const papel = semanaDoMetodo.find((s) => s.dia === dow) ?? semanaDoMetodo[i % semanaDoMetodo.length];
    const serie = ajustes.serie && dow === 1 ? porId(ajustes.serie) : null;
    const r = serie ?? porId(papel.roteiro);
    const ideia = ideias.find((x) => !usadas.has(x.titulo) && x.formato === r.formato && (!x.objetivo || x.objetivo === r.objetivo));
    if (ideia) usadas.add(ideia.titulo);
    novos.push(doRoteiro(r, {
      data, origem: serie ? "serie" : "ideia",
      tema: `${serie ? "Série fixa" : papel.papel} · ${r.nome}${ideia ? ` · ideia: ${ideia.titulo}` : ""}${p.destaques?.length ? ` · destaque: ${p.destaques[i % p.destaques.length]}` : ""}`,
    }));
    complemento(data, i);
  }
  return novos;
}

// ───── Agenda e resultados ─────

/** Arquivo .ics com os posts: a loja abre e os posts entram na agenda do celular. */
export function agendaIcs(posts: Post[], loja: string) {
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (x) => `\\${x}`);
  /** Horário de Recife (UTC−3) → UTC no formato do .ics. */
  const quando = (p: Post, mais = 0) => {
    const [h, mi] = (p.hora || "08:30").split(":").map(Number);
    const d = new Date(Date.UTC(+p.data.slice(0, 4), +p.data.slice(5, 7) - 1, +p.data.slice(8, 10), h + 3, (mi || 0) + mais));
    return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  };
  const eventos = posts.map((p) => [
    "BEGIN:VEVENT", `UID:${p.id}@hub.lojamagnetica`, `DTSTAMP:${quando(p)}`, `DTSTART:${quando(p)}`, `DTEND:${quando(p, 30)}`,
    `SUMMARY:${esc(`📲 ${p.formato}: ${p.gancho || p.tema}`)}`,
    `DESCRIPTION:${esc(`${p.tema}\n\n${p.roteiro}\n\nCTA: ${p.cta}${p.legenda ? `\n\nLEGENDA:\n${p.legenda}` : ""}`)}`,
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${esc("Hora de postar")}`, "END:VALARM", "END:VEVENT",
  ].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//Hub Loja Magnetica//${esc(loja)}//PT`, "CALSCALE:GREGORIAN", ...eventos, "END:VCALENDAR"].join("\r\n");
}

export function baixar(nome: string, texto: string, tipo = "text/calendar") {
  const url = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A métrica-norte: envios de DM ÷ alcance, em %. */
export function taxaEnvio(xs: Post[]) {
  const com = xs.filter((p) => (p.alcance ?? 0) > 0 && p.envios != null);
  if (!com.length) return null;
  return Math.round((com.reduce((s, p) => s + (p.envios ?? 0), 0) / com.reduce((s, p) => s + (p.alcance ?? 0), 0)) * 1000) / 10;
}

const media = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
/** "1.000+" → 1000 */
export const metaViews = (t: string | undefined) => Number((t ?? "").replace(/\D/g, "")) || null;

export function resultados(posts: Post[]) {
  const pub = posts.filter((p) => p.status === "Publicado" && (p.views != null || p.alcance != null));
  const v = (xs: Post[]) => media(xs.map((p) => p.views ?? 0));
  const grupo = <K extends string>(chave: (p: Post) => K) =>
    Object.entries(pub.reduce<Record<string, Post[]>>((acc, p) => ((acc[chave(p)] ??= []).push(p), acc), {}))
      .map(([k, xs]) => ({ k, n: xs.length, views: v(xs) ?? 0, comentarios: xs.reduce((s, p) => s + (p.comentarios ?? 0), 0), mensagens: xs.reduce((s, p) => s + (p.mensagens ?? 0), 0) }))
      .sort((a, b) => b.views - a.views);
  return {
    publicados: pub.length,
    media: v(pub),
    rosto: v(pub.filter((p) => p.com_rosto === true)),
    produto: v(pub.filter((p) => p.com_rosto === false)),
    porFormato: grupo((p) => p.formato),
    porObjetivo: grupo((p) => p.objetivo),
    top: [...pub].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 3),
    envio: taxaEnvio(pub),
    carroChefe: Object.entries(pub.reduce<Record<string, Post[]>>((acc, p) => (p.modelo ? ((acc[p.modelo] ??= []).push(p), acc) : acc), {}))
      .map(([modelo, xs]) => ({ modelo, n: xs.length, taxa: taxaEnvio(xs) }))
      .filter((x) => x.taxa != null).sort((a, b) => (b.taxa ?? 0) - (a.taxa ?? 0)).slice(0, 3),
    mensagens: pub.reduce((s, p) => s + (p.mensagens ?? 0), 0),
    vendas: pub.reduce((s, p) => s + (p.vendas ?? 0), 0),
  };
}

/** Bio: conta os caracteres sem a primeira linha (que é o nome do perfil). */
export const caracteresBio = (bio: string) => [...bio.split("\n").slice(1).join("\n")].length;

/** Tudo o que as telas de Conteúdo precisam. Sem análise liberada, a loja vê o módulo trancado (a equipe vê sempre). */
export async function carregarConteudo(portalId: string, comoLoja = false) {
  const [m, c] = await Promise.all([buscarMetodoConteudo(), buscarConteudo(portalId)]);
  // A equipe lê o rascunho pelo banco; vendo "como a loja", o rascunho fica escondido como para a loja.
  const visivel = c.analise && (!comoLoja || c.analise.status === "liberada");
  return { m, ...c, a: visivel ? completar(m, c.analise!.dados) : null };
}

// ───── Agente de análise ─────

export type Print = { media_type: string; data: string };

/** Reduz o print para no máximo 1600 px (JPEG) antes de mandar para o agente. */
export function lerPrint(arquivo: File): Promise<Print> {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok({ media_type: "image/jpeg", data: c.toDataURL("image/jpeg", 0.85).split(",")[1] });
    };
    img.onerror = () => falha(new Error(`Não consegui ler ${arquivo.name}.`));
    img.src = URL.createObjectURL(arquivo);
  });
}

/** Chama o agente: ele coleta o Instagram, analisa com o Claude e salva a análise como rascunho. */
export async function rodarAgente(portalId: string, instagram: string, prints: Print[], observacoes: string) {
  const { error } = await sb().functions.invoke("analise-perfil", { body: { portal_id: portalId, instagram, prints, observacoes } });
  if (error) throw new Error(await erroDaFuncao(error));
}

export async function lerAgente(portalId: string) {
  const { data } = await sb().from("loja_analise_perfil").select("agente, dados").eq("portal_id", portalId).maybeSingle();
  return data as { agente: Agente; dados: Partial<Analise> } | null;
}
