"use client";

// Planner do Meu dia da Camilla: junta numa tela só a fila de entregas (combinados dela + lembretes dela),
// o que cobrar (da loja ou da Claudia), a agenda de hoje, os posts do dia e o semáforo de cada cliente.
// Tudo sai do banco: marcar como feito aqui marca o combinado ou o lembrete de verdade.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { buscarAgenda, fimDoDia, inicioDoDia, somarDias, type Evento } from "@/lib/agenda";

const sb = () => supabaseBrowser();

export type Prioridade = "p1" | "p2" | "p3" | "cobrar";
export type ItemFila = {
  id: string;
  origem: "combinado" | "lembrete";
  prioridade: Prioridade;
  portalId: string | null;
  loja: string;
  texto: string;
  prazo: string | null;
  /** Dias de atraso (0 = vence hoje, negativo = ainda falta). */
  atraso: number;
  /** Para a aba Cobrar: de quem é a entrega. */
  quem?: "loja" | "claudia";
  nota?: string;
  cobradoHoje?: boolean;
  link?: string | null;
  whatsapp?: string | null;
};
export type Nivel = "critico" | "atencao" | "emdia" | "semcontato";
export type ClientePlanner = {
  id: string; loja: string; tipo: string; nivel: Nivel;
  ultimoContato: string | null; proximoContato: string | null;
  ultimaReuniao: string | null; proximaReuniao: string | null;
  meusAtrasos: number; lojaAtrasos: number; abertos: number; passo: string;
};
export type EventoDia = Evento & { reuniaoUrl: string | null };
export type PostDia = { id: string; horario: string | null; formato: string | null; titulo: string | null; status: string | null };
export type RegistroDia = { foco: string | null; vitoria: string | null; amanha: string | null; fechado_em: string | null };
export type Planner = {
  dia: string; fila: ItemFila[]; clientes: ClientePlanner[]; eventos: EventoDia[]; posts: PostDia[]; registro: RegistroDia | null;
};

type Comb = { id: string; portal_id: string; texto: string; quem: string; prazo: string | null; status: string; link: string | null };
type Lemb = { id: string; portal_id: string | null; texto: string; quando: string | null; link: string | null };
type Contato = { portal_id: string; tipo: string; ref: string | null; feito_em: string; proximo_em: string | null };
type Reuniao = { portal_id: string; data: string };
type PortalRow = { id: string; loja: string; tipo: string | null; ativo: boolean | null; whatsapp: string | null; meet_url: string | null };

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate.slice(0, 10)) - Date.parse(de.slice(0, 10))) / 86_400_000);

export async function buscarPlanner(perfilId: string): Promise<Planner> {
  const dia = hoje();
  const ate3 = somarDias(dia, 3);
  const [portais, combs, lembs, contatos, reunioes, posts, reg, agenda] = await Promise.all([
    sb().from("portais").select("id, loja, tipo, ativo, whatsapp, meet_url"),
    sb().from("loja_combinados").select("id, portal_id, texto, quem, prazo, status, link").eq("status", "aberto"),
    sb().from("equipe_lembretes").select("id, portal_id, texto, quando, link").eq("feito", false).eq("responsavel", perfilId),
    sb().from("cs_contatos").select("portal_id, tipo, ref, feito_em, proximo_em").order("feito_em", { ascending: false }).limit(2000),
    sb().from("reunioes").select("portal_id, data").gte("data", somarDias(dia, -120)).order("data"),
    sb().from("conteudo_casa").select("id, horario, formato, titulo, status").eq("data", dia).order("horario"),
    sb().from("meu_dia_planner").select("foco, vitoria, amanha, fechado_em").eq("perfil_id", perfilId).eq("dia", dia).maybeSingle(),
    buscarAgenda(inicioDoDia(dia), fimDoDia(dia)).catch(() => ({ eventos: [] as Evento[] })),
  ]);

  const lista = ((portais.data ?? []) as PortalRow[]).filter((p) => p.ativo !== false && p.tipo);
  const nomeDe = new Map(lista.map((p) => [p.id, p.loja]));
  const zapDe = new Map(((portais.data ?? []) as PortalRow[]).map((p) => [p.id, p.whatsapp]));
  const meetDe = new Map(((portais.data ?? []) as PortalRow[]).map((p) => [p.id, p.meet_url]));
  const ativos = new Set(lista.map((p) => p.id));
  const todosCombs = ((combs.data ?? []) as Comb[]).filter((c) => ativos.has(c.portal_id));
  const cts = (contatos.data ?? []) as Contato[];
  const reus = (reunioes.data ?? []) as Reuniao[];

  // Reunião hoje: as entregas atrasadas dessa loja sobem para P1 (é preciso chegar com elas prontas).
  const reuniaoHoje = new Set(reus.filter((r) => inicioHoje(r.data, dia)).map((r) => r.portal_id));
  const cobradoHoje = new Set(cts.filter((c) => c.tipo === "cobranca" && c.feito_em.slice(0, 10) === dia && c.ref).map((c) => c.ref as string));

  const fila: ItemFila[] = [];
  for (const c of todosCombs) {
    const atraso = c.prazo ? diasEntre(c.prazo, dia) : -999;
    const loja = nomeDe.get(c.portal_id) ?? "";
    if (c.quem === "camilla") {
      if (!c.prazo || c.prazo > ate3) continue;
      const prioridade: Prioridade = atraso === 0 || (atraso > 0 && reuniaoHoje.has(c.portal_id)) ? "p1" : atraso > 0 ? "p2" : "p3";
      fila.push({ id: c.id, origem: "combinado", prioridade, portalId: c.portal_id, loja, texto: c.texto, prazo: c.prazo, atraso, link: c.link, whatsapp: zapDe.get(c.portal_id) ?? null, nota: atraso > 0 && reuniaoHoje.has(c.portal_id) ? "Reunião hoje" : undefined });
    } else if ((c.quem === "loja" || c.quem === "claudia") && c.prazo && c.prazo <= dia) {
      fila.push({ id: c.id, origem: "combinado", prioridade: "cobrar", portalId: c.portal_id, loja, texto: c.texto, prazo: c.prazo, atraso, link: c.link, whatsapp: zapDe.get(c.portal_id) ?? null, quem: c.quem, cobradoHoje: cobradoHoje.has(c.id) });
    }
  }
  for (const l of (lembs.data ?? []) as Lemb[]) {
    if (l.quando && l.quando > ate3) continue;
    const atraso = l.quando ? diasEntre(l.quando, dia) : 0;
    const prioridade: Prioridade = !l.quando || atraso === 0 ? "p1" : atraso > 0 ? "p2" : "p3";
    fila.push({ id: l.id, origem: "lembrete", prioridade, portalId: l.portal_id, loja: l.portal_id ? nomeDe.get(l.portal_id) ?? "Lembrete" : "Lembrete", texto: l.texto, prazo: l.quando, atraso, link: l.link, whatsapp: l.portal_id ? zapDe.get(l.portal_id) ?? null : null });
  }
  // Dentro de cada prioridade: o mais atrasado primeiro.
  fila.sort((a, b) => b.atraso - a.atraso);

  const clientes: ClientePlanner[] = lista.map((p) => {
    const meus = todosCombs.filter((c) => c.portal_id === p.id && c.quem === "camilla");
    const meusAtr = meus.filter((c) => c.prazo && c.prazo < dia);
    const meusHoje = meus.filter((c) => c.prazo === dia);
    const lojaAtr = todosCombs.filter((c) => c.portal_id === p.id && c.quem !== "camilla" && c.prazo && c.prazo < dia).length;
    const abertos = todosCombs.filter((c) => c.portal_id === p.id).length;
    const meuCts = cts.filter((c) => c.portal_id === p.id);
    const ultimoContato = meuCts[0]?.feito_em ?? null;
    const proximoContato = meuCts.map((c) => c.proximo_em).filter(Boolean).sort().reverse()[0] ?? null;
    const minhas = reus.filter((r) => r.portal_id === p.id);
    const agora = new Date().toISOString();
    const ultimaReuniao = minhas.filter((r) => r.data < agora).map((r) => r.data).pop() ?? null;
    const proximaReuniao = minhas.find((r) => r.data >= agora)?.data ?? null;
    const maisAntigo = meusAtr.reduce((m, c) => Math.max(m, diasEntre(c.prazo as string, dia)), 0);
    const semReuniao = !ultimaReuniao || diasEntre(ultimaReuniao, dia) > 45;
    const semContato = !ultimoContato || diasEntre(ultimoContato, dia) > 45;

    let nivel: Nivel = "emdia";
    if (meusAtr.length >= 2 || maisAntigo >= 7 || (reuniaoHoje.has(p.id) && meusAtr.length) || meusAtr.length + lojaAtr >= 10) nivel = "critico";
    else if (meusAtr.length || meusHoje.length || (proximoContato && proximoContato <= dia) || lojaAtr >= 3) nivel = "atencao";
    else if (semReuniao && semContato && !proximaReuniao) nivel = "semcontato";

    let passo = "Tudo em dia";
    if (reuniaoHoje.has(p.id)) passo = meusAtr.length ? `Reunião hoje: levar pronto "${meusAtr[0].texto}"` : "Reunião hoje";
    else if (meusAtr.length) passo = meusAtr.sort((a, b) => (a.prazo as string).localeCompare(b.prazo as string))[0].texto;
    else if (meusHoje.length) passo = `Vence hoje: ${meusHoje[0].texto}`;
    else if (proximoContato && proximoContato <= dia) passo = proximoContato < dia ? "Contato marcado já passou" : "Contato marcado para hoje";
    else if (lojaAtr) passo = `Cobrar ${lojaAtr} ${lojaAtr === 1 ? "combinado vencido" : "combinados vencidos"} da loja`;
    else if (nivel === "semcontato") passo = "Mandar uma mensagem de retomada";
    else if (proximaReuniao) passo = "Próxima reunião marcada";

    return { id: p.id, loja: p.loja, tipo: p.tipo ?? "", nivel, ultimoContato, proximoContato, ultimaReuniao, proximaReuniao, meusAtrasos: meusAtr.length, lojaAtrasos: lojaAtr, abertos, passo };
  });
  const ordem: Record<Nivel, number> = { critico: 0, atencao: 1, semcontato: 2, emdia: 3 };
  clientes.sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || (b.meusAtrasos + b.lojaAtrasos) - (a.meusAtrasos + a.lojaAtrasos) || a.loja.localeCompare(b.loja));

  return {
    dia, fila, clientes,
    eventos: agenda.eventos.map((e) => ({ ...e, reuniaoUrl: e.meet_url ?? (e.portal_id ? meetDe.get(e.portal_id) ?? null : null) })),
    posts: (posts.data ?? []) as PostDia[],
    registro: (reg.data ?? null) as RegistroDia | null,
  };
}

function inicioHoje(iso: string, dia: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date(iso)) === dia;
}

export async function concluirItem(item: ItemFila, feito: boolean) {
  if (item.origem === "combinado") {
    const { error } = await sb().rpc("combinado_marcar", { p_id: item.id, p_feito: feito });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb().from("equipe_lembretes").update({ feito }).eq("id", item.id);
    if (error) throw new Error(error.message);
  }
}

/** Cobrou a loja (ou a Claudia): fica no histórico da loja e o item sai da aba Cobrar até amanhã. */
export async function registrarCobranca(item: ItemFila, por: string) {
  if (!item.portalId) return;
  const { error } = await sb().from("cs_contatos").insert({
    portal_id: item.portalId, tipo: "cobranca", ref: item.id, feito_em: new Date().toISOString(), feito_por: por,
    resumo: `Cobrado: ${item.texto}`, resultado: "aguardando",
  });
  if (error) throw new Error(error.message);
}

export async function salvarRegistro(dia: string, campos: Partial<RegistroDia>) {
  const { data: u } = await sb().auth.getUser();
  if (!u.user) throw new Error("Entre de novo no Hub.");
  const { error } = await sb().from("meu_dia_planner").upsert({ perfil_id: u.user.id, dia, ...campos, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Fecha o dia: cada linha de "o que fica para amanhã" vira um lembrete seu para amanhã. */
export async function fecharDia(dia: string, amanha: string, vitoria: string, por: string) {
  const { data: u } = await sb().auth.getUser();
  if (!u.user) throw new Error("Entre de novo no Hub.");
  const linhas = amanha.split("\n").map((l) => l.trim()).filter(Boolean);
  if (linhas.length) {
    const { error } = await sb().from("equipe_lembretes").insert(linhas.map((texto) => ({ texto, quando: somarDias(dia, 1), responsavel: u.user!.id, criado_por: por })));
    if (error) throw new Error(error.message);
  }
  await salvarRegistro(dia, { amanha, vitoria, fechado_em: new Date().toISOString() });
  return linhas.length;
}
