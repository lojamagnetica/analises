"use client";

// Gestão de Clientes: números do período, quem precisa de atenção e a linha do tempo da ficha.
// Tudo calculado com o que o Hub já guarda (contratos, reuniões, acessos, jornada); sem tabela nova.
import { supabaseBrowser } from "@/lib/supabase/client";
import { buscarCarteira, contratoAtual, type Loja } from "@/lib/carteira";
import { chaveDia, hojeChave, inicioDoDia, somarDias } from "@/lib/agenda";
import { ETAPAS } from "@/lib/jornada";
import { diasAte, diasDesde } from "@/lib/formato";

export type Periodo = "7" | "30" | "mes" | "90" | "tudo";
export const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: "7", rotulo: "7 dias" }, { id: "30", rotulo: "30 dias" }, { id: "mes", rotulo: "Este mês" }, { id: "90", rotulo: "90 dias" }, { id: "tudo", rotulo: "Tudo" },
];

/** Primeiro e último dia do período ("2026-10-24"); o primeiro é null em "Tudo". */
export function intervalo(p: Periodo) {
  const hoje = hojeChave();
  const de = p === "tudo" ? null : p === "mes" ? `${hoje.slice(0, 8)}01` : somarDias(hoje, -(Number(p) - 1));
  return { de, ate: hoje };
}

export type ReuniaoResumo = { portal_id: string; data: string; selecionar: string };
export type AcessoResumo = { portal_id: string; ultimo_acesso: string | null };
export type DadosGestao = Awaited<ReturnType<typeof buscarGestao>>;

export async function buscarGestao() {
  const sb = supabaseBrowser();
  const desde = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const [carteira, { data: reunioes }, { data: acessos }] = await Promise.all([
    buscarCarteira(),
    sb.from("reunioes").select("portal_id, data, selecionar").gte("data", desde).order("data").limit(1000),
    sb.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
  ]);
  return { ...carteira, reunioes: (reunioes ?? []) as ReuniaoResumo[], acessos: (acessos ?? []) as AcessoResumo[] };
}

/** Loja ativa: com portal ligado e sem estar finalizada. */
export const estaAtiva = (l: Loja) => l.ativo && (l.fichas?.situacao ?? "Em andamento") !== "Finalizada";

/** Próxima reunião e último acesso de cada loja. */
export function resumoPorLoja(d: Pick<DadosGestao, "reunioes" | "acessos">) {
  const agora = Date.now();
  const mapa = new Map<string, { proxima: string | null; acesso: string | null }>();
  const item = (id: string) => mapa.get(id) ?? (mapa.set(id, { proxima: null, acesso: null }), mapa.get(id)!);
  for (const r of d.reunioes) {
    if (r.selecionar === "Adiado" || new Date(r.data).getTime() <= agora) continue;
    const x = item(r.portal_id);
    if (!x.proxima || r.data < x.proxima) x.proxima = r.data;
  }
  for (const a of d.acessos) {
    if (!a.ultimo_acesso) continue;
    const x = item(a.portal_id);
    if (!x.acesso || a.ultimo_acesso > x.acesso) x.acesso = a.ultimo_acesso;
  }
  return mapa;
}

/** Precisa de atenção: termômetro vermelho ou amarelo, ou sem entrar no portal há 14 dias ou mais. */
export function precisaAtencao(l: Loja, acesso: string | null | undefined) {
  const t = l.fichas?.termometro;
  return t === "Vermelho" || t === "Amarelo" || (!!acesso && diasDesde(acesso) >= 14);
}

export function numeros(d: DadosGestao, periodo: Periodo) {
  const { de, ate } = intervalo(periodo);
  const dentro = (dia: string | null | undefined) => !!dia && (!de || dia.slice(0, 10) >= de) && dia.slice(0, 10) <= ate;
  const novos = d.lojas.flatMap((l) => l.contratos).filter((c) => dentro(c.inicio));
  const clientesNovas = new Set(novos.map((c) => c.portal_id)).size;
  const valor = novos.reduce((s, c) => s + (c.valor ?? 0), 0);
  const agora = Date.now();
  const validas = d.reunioes.filter((r) => r.selecionar !== "Adiado");
  const resumo = resumoPorLoja(d);
  const ativas = d.lojas.filter(estaAtiva).map((l) => ({ l, c: contratoAtual(l) }));
  return {
    clientesNovas,
    valor,
    ticket: clientesNovas ? valor / clientesNovas : null,
    reunioes: validas.filter((r) => new Date(r.data).getTime() <= agora && dentro(chaveDia(r.data))).length,
    proximas7: validas.filter((r) => { const t = new Date(r.data).getTime(); return t > agora && t <= agora + 7 * 86_400_000; }).length,
    ativas: ativas.length,
    vencendo: ativas.filter(({ c }) => c?.status === "Ativo" && !!c.fim && diasAte(c.fim) <= 60).length,
    vermelhos: ativas.filter(({ l }) => l.fichas?.termometro === "Vermelho").length,
    atencao: ativas.filter(({ l }) => precisaAtencao(l, resumo.get(l.id)?.acesso)).length,
  };
}

// ----- Linha do tempo da ficha -----
export type TipoTempo = "venda" | "contrato" | "etapa" | "reuniao" | "mensagem";
export type EventoTempo = { id: string; tipo: TipoTempo; quando: string; quem: string | null; texto: string; soDia?: boolean };

export const ROTULO_TEMPO: Record<TipoTempo, { rotulo: string; selo: string }> = {
  venda: { rotulo: "Venda", selo: "feito" },
  contrato: { rotulo: "Contrato", selo: "andamento" },
  etapa: { rotulo: "Etapa", selo: "espera" },
  reuniao: { rotulo: "Reunião", selo: "alerta" },
  mensagem: { rotulo: "Mensagem", selo: "erro" },
};

const textoDoCheck = new Map(ETAPAS.flatMap((e) => e.checks.map((k) => [k.chave, k.texto] as const)));
const diaInteiro = (dia: string) => inicioDoDia(dia.slice(0, 10));

/** Tudo o que aconteceu com uma cliente, do mais recente para o mais antigo (o que está marcado para depois fica no topo). */
export async function buscarLinhaDoTempo(portalId: string): Promise<EventoTempo[]> {
  const sb = supabaseBrowser();
  const [contratos, vendas, checks, reunioes, mensagens, respostas, gerados] = await Promise.all([
    sb.from("contratos").select("id, inicio, fim, status").eq("portal_id", portalId),
    sb.from("passagens").select("vendido_por, criado_por, created_at, recebida_em, recebida_por").eq("portal_id", portalId),
    sb.from("jornada_checks").select("chave, por_nome, updated_at").eq("portal_id", portalId).eq("feito", true),
    sb.from("reunioes").select("id, titulo, data, selecionar").eq("portal_id", portalId).order("data", { ascending: false }).limit(40),
    sb.from("solicitacoes").select("id, tipo, status, autor_nome, created_at").eq("portal_id", portalId).order("created_at", { ascending: false }).limit(30),
    sb.from("solicitacao_respostas").select("id, autor_nome, created_at").eq("portal_id", portalId).eq("equipe", true).order("created_at", { ascending: false }).limit(30),
    sb.from("contratos_gerados").select("id, status, gerado_por, created_at").eq("portal_id", portalId),
  ]);
  const lista: EventoTempo[] = [];
  for (const c of contratos.data ?? []) {
    if (c.inicio) lista.push({ id: `ci-${c.id}`, tipo: "contrato", quando: diaInteiro(c.inicio), quem: null, texto: "Contrato começou", soDia: true });
    if (c.fim) lista.push({ id: `cf-${c.id}`, tipo: "contrato", quando: diaInteiro(c.fim), quem: null, texto: c.status === "Ativo" ? "Contrato termina" : `Contrato terminou (${String(c.status).toLowerCase()})`, soDia: true });
  }
  for (const v of vendas.data ?? []) {
    lista.push({ id: `v-${v.created_at}`, tipo: "venda", quando: v.created_at, quem: v.criado_por ?? v.vendido_por, texto: "Venda registrada pelo Comercial" });
    if (v.recebida_em) lista.push({ id: `vr-${v.recebida_em}`, tipo: "venda", quando: v.recebida_em, quem: v.recebida_por, texto: "Passagem recebida pela CS" });
  }
  for (const c of checks.data ?? []) lista.push({ id: `c-${c.chave}`, tipo: "etapa", quando: c.updated_at, quem: c.por_nome, texto: textoDoCheck.get(c.chave) ?? c.chave });
  for (const r of reunioes.data ?? []) lista.push({ id: `r-${r.id}`, tipo: "reuniao", quando: r.data, quem: null, texto: `${r.titulo || "Reunião"} · ${r.selecionar}` });
  for (const m of mensagens.data ?? []) lista.push({ id: `m-${m.id}`, tipo: "mensagem", quando: m.created_at, quem: m.autor_nome, texto: `Mensagem da loja (${String(m.tipo).toLowerCase()}) · ${String(m.status).toLowerCase()}` });
  for (const r of respostas.data ?? []) lista.push({ id: `mr-${r.id}`, tipo: "mensagem", quando: r.created_at, quem: r.autor_nome, texto: "Resposta da equipe no Fale com a Camilla" });
  for (const g of gerados.data ?? []) lista.push({ id: `g-${g.id}`, tipo: "contrato", quando: g.created_at, quem: g.gerado_por, texto: `Contrato gerado (${String(g.status).toLowerCase()})` });
  return lista.sort((a, b) => b.quando.localeCompare(a.quando));
}
