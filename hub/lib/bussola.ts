"use client";

// Bússola do gestor: a lojista diz quando está disponível e prefere cada tarefa,
// o Hub monta a rotina (todo dia, toda semana, todo mês) e, em cima dos números, avisa o que precisa de atenção hoje.
// As regras dos alertas ficam aqui em cima, num lugar só, para a Camilla revisar.
import { supabaseBrowser } from "@/lib/supabase/client";
import { FUSO, diasAte, hoje, mesAtual, moeda } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { buscarCaixa, fimDoMes, mesDeHoje, numeroDe, somarMes, type Caixa } from "@/lib/caixa";

/** Bússola fechada para todas as lojas (cadeado) enquanto a Camilla termina de ajustar. A equipe continua vendo. */
export const BUSSOLA_FECHADA = true;
export const bussolaFechada = (href: string) => BUSSOLA_FECHADA && href.startsWith("/bussola");

// ───── Regras (para revisar) ─────

/** Queda de vendas da vendedora (últimos 7 dias contra os 7 anteriores) que acende o alerta. */
export const QUEDA_ALERTA = 0.15;
/** Peça parada há tantos dias entra como atenção. */
export const DIAS_PARADO = 60;
/** Boleto que vence em até tantos dias aparece no Hoje. */
export const DIAS_BOLETO = 3;
/** Dias sem dar retorno (feedback) a uma pessoa do time. */
export const DIAS_SEM_RETORNO = 30;
/** Até quantos dias para trás uma tarefa que ficou sem fazer continua sendo cobrada. */
export const DIAS_ATRASO = 2;
/** Uma tarefa do mês continua aparecendo por tantos dias depois do dia combinado. */
export const DIAS_MENSAL = 6;
/** Datas comerciais que entram na pauta de conteúdo: as dos próximos tantos dias. */
export const DIAS_DATA_COMERCIAL = 21;

// ───── Funções do gestor e rotina ─────

export type Freq = "diaria" | "semanal" | "mensal";
export type Funcao =
  | "caixa" | "numeros" | "feedback" | "time" | "boletos" | "parados" | "compras" | "conteudo" | "gravar" | "clientes"
  | "fechamento" | "metanova" | "comprasmes" | "reuniaomes";
type Padrao = { id: Funcao; freq: Freq; nome: string; ajuda: string; dia: number; hora: string; minutos: number; link?: string; soComTime?: boolean };
/** dia: semanal 0 (dom) a 6 (sáb); diária usa -1 (todo dia de loja); mensal é o dia do mês (0 = último dia). */
export const FUNCOES: Padrao[] = [
  { id: "caixa", freq: "diaria", nome: "Conferir o caixa de ontem", ajuda: "Todo dia, antes de abrir.", dia: -1, hora: "08:30", minutos: 10, link: "/gestao/caixa" },
  { id: "numeros", freq: "semanal", nome: "Olhar os números da semana", ajuda: "Meta, PA, ticket e cada vendedora.", dia: 1, hora: "09:00", minutos: 30, link: "/gestao/resultado" },
  { id: "time", freq: "semanal", nome: "Reunião semanal do time", ajuda: "Meta, foco da semana e o que o time vai fazer.", dia: 1, hora: "09:30", minutos: 30, link: "/pessoas/reuniao-semanal", soComTime: true },
  { id: "feedback", freq: "semanal", nome: "Dar retorno ao time", ajuda: "Conversa individual, com roteiro.", dia: 2, hora: "10:00", minutos: 45, link: "/pessoas/retorno", soComTime: true },
  { id: "clientes", freq: "semanal", nome: "Cuidar das clientes (resgate e pós-venda)", ajuda: "Quem comprou, quem sumiu, aniversariantes.", dia: 2, hora: "15:00", minutos: 30, link: "/clientes" },
  { id: "boletos", freq: "semanal", nome: "Conferir boletos e organizar pagamentos", ajuda: "Veja o que vence nos próximos dias.", dia: 3, hora: "14:00", minutos: 30, link: "/bussola/boletos" },
  { id: "parados", freq: "semanal", nome: "Produtos parados: estratégia", ajuda: "Escolha o que entra em ação e vira conteúdo.", dia: 3, hora: "15:00", minutos: 30, link: "/bussola/estoque" },
  { id: "compras", freq: "semanal", nome: "Decidir compras e reposição", ajuda: "O que repor, o que girar, o que não comprar.", dia: 4, hora: "10:00", minutos: 45, link: "/estoque" },
  { id: "conteudo", freq: "semanal", nome: "Planejar o conteúdo da semana", ajuda: "Estoque, giro, período, desejo e tendência.", dia: 5, hora: "10:00", minutos: 45, link: "/conteudo/semana" },
  { id: "gravar", freq: "semanal", nome: "Gravar os vídeos", ajuda: "Tudo de uma vez, no dia e hora combinados.", dia: 5, hora: "14:00", minutos: 90, link: "/conteudo/roteiro" },
  { id: "fechamento", freq: "mensal", nome: "Fechar o mês e ver o resultado", ajuda: "Último dia do mês: números fechados, o que deu certo e o que não.", dia: 0, hora: "09:00", minutos: 60, link: "/gestao/resultado" },
  { id: "comprasmes", freq: "mensal", nome: "Plano de compras do mês", ajuda: "Com o estoque e o giro na mão, antes de comprar.", dia: 5, hora: "10:00", minutos: 60, link: "/gestao/compras" },
  { id: "metanova", freq: "mensal", nome: "Planejar a meta e as ações do próximo mês", ajuda: "O PLANEJE AQUI do mês seguinte.", dia: 20, hora: "10:00", minutos: 90, link: "/planeje" },
  { id: "reuniaomes", freq: "mensal", nome: "Reunião do mês com o time", ajuda: "Resultado do mês, reconhecimento e a meta nova.", dia: 28, hora: "09:30", minutos: 60, link: "/pessoas/reuniao-mensal", soComTime: true },
];
export const porFuncao = (id: string) => FUNCOES.find((f) => f.id === id);

export const DIAS_NOME = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** O que a lojista combinou: dias em que está na loja e, para cada função, o dia e a hora que prefere. */
export type Dispo = {
  dias: number[]; inicio: string; fim: string;
  prefs: Partial<Record<Funcao, { dia: number; hora: string; minutos?: number; fora?: boolean }>>;
};
/** dia: semanal e diária = dia da semana (0 a 6); mensal = dia do mês (0 = último). */
export type Bloco = { id: string; funcao: Funcao | "outro"; freq: Freq; titulo: string; dia: number; hora: string; minutos: number };
/** O que a lojista registra num dia: as 3 prioridades, o que puxou para hoje, os alertas que ocultou e o fechamento. */
export type RegistroDia = { prioridades: string[]; feitas: boolean[]; extras: { id: string; titulo: string }[]; ocultos: string[]; fechamento: string };
export type Bussola = { dispo: Dispo; blocos: Bloco[]; feitos: Record<string, string[]>; dia: Record<string, RegistroDia> };

export const dispoVazia = (): Dispo => ({ dias: [1, 2, 3, 4, 5, 6], inicio: "09:00", fim: "18:00", prefs: {} });
export const registroVazio = (): RegistroDia => ({ prioridades: ["", "", ""], feitas: [false, false, false], extras: [], ocultos: [], fechamento: "" });
export const registroDe = (b: Bussola, d: string): RegistroDia => ({ ...registroVazio(), ...(b.dia[d] ?? {}) });
export const novoId = () => crypto.randomUUID().slice(0, 8);

const min = (hm: string) => { const [h, m] = hm.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const hm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
/** A hora de agora na loja ("14:05"). */
export const agoraHM = () => new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
export const diaDaSemana = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

/**
 * Monta a rotina: cada função no dia e na hora que a lojista preferiu, dentro do horário dela, sem duas coisas ao mesmo tempo.
 * Sem preferência vale o padrão do método. O que não cabe no dia vai para o próximo dia em que ela está na loja.
 * comTime = false tira as tarefas que só fazem sentido com equipe.
 */
export function montarRotina(d: Dispo, comTime = true): Bloco[] {
  const dias = (d.dias.length ? [...d.dias] : [1, 2, 3, 4, 5]).sort((a, b) => a - b);
  const ini = min(d.inicio), fim = Math.max(min(d.fim), ini + 60);
  const ocupado: Record<number, [number, number][]> = {};
  const cabe = (dia: number, de: number, ate: number) => ate <= fim && !(ocupado[dia] ?? []).some(([a, b]) => de < b && ate > a);
  /** O primeiro horário livre do dia, a partir da hora desejada. */
  const livre = (dia: number, desejado: number, dur: number) => {
    let t = Math.min(Math.max(desejado, ini), fim - dur);
    for (const [a, b] of [...(ocupado[dia] ?? [])].sort((x, y) => x[0] - y[0])) if (t < b && t + dur > a) t = b;
    return cabe(dia, t, t + dur) ? t : null;
  };
  const blocos: Bloco[] = [];
  const colocar = (f: Padrao, dia: number, desejado: number, dur: number) => {
    const ordem = [dia, ...dias.filter((x) => x !== dia && x > dia), ...dias.filter((x) => x !== dia && x < dia)].filter((x) => dias.includes(x));
    for (const alvo of ordem) {
      const t = livre(alvo, desejado, dur);
      if (t == null) continue;
      (ocupado[alvo] ??= []).push([t, t + dur]);
      blocos.push({ id: `${f.id}-${alvo}`, funcao: f.id, freq: f.freq, titulo: f.nome, dia: alvo, hora: hm(t), minutos: dur });
      return;
    }
  };
  for (const f of FUNCOES) {
    if (f.freq === "mensal" || (f.soComTime && !comTime)) continue;
    const p = d.prefs[f.id];
    if (p?.fora) continue;
    const dur = p?.minutos || f.minutos;
    const desejado = min(p?.hora || f.hora);
    const alvo = p?.dia ?? f.dia;
    if (alvo === -1) for (const dia of dias.filter((x) => x !== 0)) colocar(f, dia, desejado, dur);
    else colocar(f, dias.includes(alvo) ? alvo : dias.find((x) => x > alvo) ?? dias[dias.length - 1], desejado, dur);
  }
  for (const f of FUNCOES) {
    if (f.freq !== "mensal" || (f.soComTime && !comTime)) continue;
    const p = d.prefs[f.id];
    if (p?.fora) continue;
    blocos.push({ id: `${f.id}-mes`, funcao: f.id, freq: "mensal", titulo: f.nome, dia: p?.dia ?? f.dia, hora: p?.hora || f.hora, minutos: p?.minutos || f.minutos });
  }
  return blocos.sort((a, b) => (a.freq === "mensal" ? 1 : 0) - (b.freq === "mensal" ? 1 : 0) || a.dia - b.dia || a.hora.localeCompare(b.hora));
}

/** Dia do mês em que a tarefa mensal vence (0 = último dia). */
export const diaDoMes = (b: Bloco, mes: string) => (b.dia === 0 ? Number(fimDoMes(mes).slice(8)) : Math.min(b.dia, Number(fimDoMes(mes).slice(8))));

// ───── Banco ─────

const sb = () => supabaseBrowser();

export async function buscarBussola(portalId: string): Promise<Bussola> {
  const { data } = await sb().from("loja_bussola").select("dispo, blocos, feitos, dia").eq("portal_id", portalId).maybeSingle();
  return {
    dispo: { ...dispoVazia(), ...((data?.dispo as Partial<Dispo>) ?? {}) },
    blocos: ((data?.blocos as Partial<Bloco>[]) ?? []).map((b) => ({ freq: "semanal" as Freq, ...b })) as Bloco[],
    feitos: (data?.feitos as Record<string, string[]>) ?? {},
    dia: (data?.dia as Record<string, RegistroDia>) ?? {},
  };
}

export async function salvarBussola(portalId: string, b: Bussola) {
  // Guarda só os últimos 60 dias de registro, para a linha não crescer sem fim.
  const corte = somarDias(hoje(), -60);
  const dia = Object.fromEntries(Object.entries(b.dia).filter(([k]) => k >= corte));
  const feitos = Object.fromEntries(Object.entries(b.feitos).filter(([k]) => k >= corte || /^\d{4}-\d{2}$/.test(k)));
  const { error } = await sb().from("loja_bussola")
    .upsert({ portal_id: portalId, dispo: b.dispo, blocos: b.blocos, feitos, dia, updated_at: new Date().toISOString() }, { onConflict: "portal_id" });
  if (error) throw new Error(error.message);
}

export type ItemEstoque = { id: string; produto: string; qtd: number; dias_parado: number; giro: string | null; postado_em: string | null; objetivo: boolean; obs: string | null };
export async function buscarItens(portalId: string) {
  const { data } = await sb().from("loja_estoque_itens").select("id, produto, qtd, dias_parado, giro, postado_em, objetivo, obs").eq("portal_id", portalId).order("dias_parado", { ascending: false });
  return (data ?? []) as ItemEstoque[];
}
export async function salvarItem(portalId: string, i: Partial<ItemEstoque> & { produto: string }) {
  const linha = { portal_id: portalId, produto: i.produto.trim(), qtd: i.qtd ?? 1, dias_parado: i.dias_parado ?? 0, giro: i.giro || null, postado_em: i.postado_em || null, objetivo: !!i.objetivo, obs: i.obs?.trim() || null };
  const { error } = i.id ? await sb().from("loja_estoque_itens").update(linha).eq("id", i.id) : await sb().from("loja_estoque_itens").insert(linha);
  if (error) throw new Error(error.message);
}
export async function removerItem(id: string) {
  const { error } = await sb().from("loja_estoque_itens").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type ItemLido = { produto: string; qtd: number; dias_parado: number; giro: string | null };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const dataLida = (v: string) => {
  const t = v.trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(t);
  if (br) return `${br[3].length === 2 ? "20" + br[3] : br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
};
/**
 * Lê a planilha do sistema (copiada ou .csv). Aceita separador tab, ponto e vírgula ou vírgula e reconhece as colunas pelo nome:
 * produto/descrição, quantidade/estoque, dias parado, última venda e giro. Só entra o que tem produto e estoque maior que zero.
 */
export function lerPlanilha(texto: string): { itens: ItemLido[]; erro: string } {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length < 2) return { itens: [], erro: "Cole a planilha com a linha de títulos e pelo menos uma linha de produto." };
  const sep = ["\t", ";", ","].map((s) => ({ s, n: linhas[0].split(s).length })).sort((a, b) => b.n - a.n)[0].s;
  const celulas = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const cab = celulas(linhas[0]).map(norm);
  const col = (re: RegExp) => cab.findIndex((c) => re.test(c));
  const iProd = col(/produto|descri|referencia|nome|item/), iQtd = col(/qtd|quant|estoque|saldo|pecas/);
  const iDias = col(/dias|idade|parad|sem venda/), iUlt = col(/ultima.*(venda|saida)|ult\.? venda/), iGiro = col(/giro|curva/);
  if (iProd < 0 || iQtd < 0) return { itens: [], erro: "Não achei as colunas de produto e de quantidade. Confira se a primeira linha tem os títulos, como “Produto” e “Estoque”." };
  const itens: ItemLido[] = [];
  for (const l of linhas.slice(1)) {
    const c = celulas(l);
    const produto = c[iProd]?.trim();
    const qtd = numeroDe(c[iQtd]);
    if (!produto || qtd == null || qtd <= 0) continue;
    let dias = iDias >= 0 ? numeroDe(c[iDias]) : null;
    if (dias == null && iUlt >= 0) { const d = dataLida(c[iUlt] ?? ""); if (d) dias = Math.max(0, -diasAte(d)); }
    const giro = iGiro >= 0 ? c[iGiro]?.trim() || null : null;
    itens.push({ produto, qtd: Math.round(qtd), dias_parado: Math.round(dias ?? 0), giro });
  }
  return { itens, erro: itens.length ? "" : "Nenhuma linha com produto e estoque maior que zero." };
}

/** Atualiza o que já está na lista (pelo nome, mantendo “já postado” e “objetivo”) e cria o que é novo. */
export async function importarItens(portalId: string, lidos: ItemLido[]) {
  const atuais = await buscarItens(portalId);
  const porNome = new Map(atuais.map((i) => [norm(i.produto), i]));
  const novos: Record<string, unknown>[] = [];
  let atualizados = 0;
  for (const l of lidos) {
    const ja = porNome.get(norm(l.produto));
    if (ja) {
      const { error } = await sb().from("loja_estoque_itens").update({ qtd: l.qtd, dias_parado: l.dias_parado, giro: l.giro ?? ja.giro }).eq("id", ja.id);
      if (error) throw new Error(error.message);
      atualizados++;
    } else novos.push({ portal_id: portalId, produto: l.produto, qtd: l.qtd, dias_parado: l.dias_parado, giro: l.giro });
  }
  for (let i = 0; i < novos.length; i += 200) {
    const { error } = await sb().from("loja_estoque_itens").insert(novos.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }
  return { novos: novos.length, atualizados };
}

export type Boleto = { id: string; descricao: string; valor: number; vence: string; pago: boolean };
export async function buscarBoletos(portalId: string) {
  const { data } = await sb().from("loja_boletos").select("id, descricao, valor, vence, pago").eq("portal_id", portalId).order("vence");
  return (data ?? []).map((b) => ({ ...b, valor: Number(b.valor) })) as Boleto[];
}
export async function salvarBoleto(portalId: string, b: Partial<Boleto> & { descricao: string; vence: string }) {
  const linha = { portal_id: portalId, descricao: b.descricao.trim(), valor: b.valor ?? 0, vence: b.vence, pago: !!b.pago };
  const { error } = b.id ? await sb().from("loja_boletos").update(linha).eq("id", b.id) : await sb().from("loja_boletos").insert(linha);
  if (error) throw new Error(error.message);
}
export async function removerBoleto(id: string) {
  const { error } = await sb().from("loja_boletos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type DataComercial = { mes: number; dia: number | null; titulo: string };
const segundaDaSemana = (d: string) => somarDias(d, -((diaDaSemana(d) + 6) % 7));

/** Dados do Hoje: rotina, caixa dos últimos dois meses (para os 14 dias), time, estoque, boletos, retornos, posts, datas e pautas. */
export async function buscarHoje(portalId: string) {
  const mes = mesDeHoje();
  const m = mesAtual();
  const [b, c1, c2, { data: equipe }, itens, boletos, { data: fb }, { data: posts }, { data: datas }, { data: pautas }] = await Promise.all([
    buscarBussola(portalId),
    buscarCaixa(portalId, mes),
    buscarCaixa(portalId, somarMes(mes, -1)),
    sb().from("loja_equipe").select("id, nome, funcao").eq("portal_id", portalId).eq("ativo", true),
    buscarItens(portalId),
    buscarBoletos(portalId),
    sb().from("loja_feedbacks").select("pessoa_id, created_at").eq("portal_id", portalId),
    sb().from("loja_posts").select("tema, status, data").eq("portal_id", portalId).gte("data", somarDias(hoje(), -60)),
    sb().from("datas_comerciais").select("mes, dia, titulo").in("mes", [m, (m + 1) % 12]),
    sb().from("pautas").select("titulo, angulo").eq("liberada", true).eq("semana", segundaDaSemana(hoje())).order("ordem").limit(3),
  ]);
  return {
    b, caixa: [...c1, ...c2], equipe: (equipe ?? []) as { id: string; nome: string; funcao: string | null }[], itens, boletos,
    retornos: (fb ?? []) as { pessoa_id: string; created_at: string }[], posts: (posts ?? []) as { tema: string; status: string; data: string }[],
    datas: (datas ?? []) as DataComercial[], pautas: (pautas ?? []) as { titulo: string; angulo: string }[],
  };
}
export type DadosHoje = Awaited<ReturnType<typeof buscarHoje>>;

// ───── O que fazer hoje ─────

export type Tarefa = { chave: string; titulo: string; hora: string; minutos: number; link?: string; tipo: "rotina" | "mes" | "atraso" | "extra"; quando?: string };

/** Tudo o que está na rotina para a data (rotina do dia, tarefas do mês que vencem agora, o que ficou para trás e o que ela puxou). */
export function tarefasDoDia(b: Bussola, data = hoje()): Tarefa[] {
  const lista: Tarefa[] = [];
  const doBloco = (x: Bloco, tipo: Tarefa["tipo"], quando?: string): Tarefa => ({ chave: x.id, titulo: x.titulo, hora: x.hora, minutos: x.minutos, link: porFuncao(x.funcao)?.link, tipo, quando });
  const semana = (d: string) => b.blocos.filter((x) => x.freq !== "mensal" && x.dia === diaDaSemana(d));
  for (const x of semana(data)) lista.push(doBloco(x, "rotina"));
  // O que ficou sem fazer nos últimos dias continua sendo cobrado, até ser feito ou passar do limite.
  for (let n = 1; n <= DIAS_ATRASO; n++) {
    const d = somarDias(data, -n);
    for (const x of semana(d)) {
      const feito = Object.entries(b.feitos).some(([k, v]) => k >= d && k <= data && v.includes(x.id));
      if (!feito) lista.push(doBloco(x, "atraso", n === 1 ? "ontem" : `há ${n} dias`));
    }
  }
  const mes = data.slice(0, 7);
  for (const x of b.blocos.filter((y) => y.freq === "mensal")) {
    const venc = `${mes}-${String(diaDoMes(x, mes)).padStart(2, "0")}`;
    if (data >= venc && data <= somarDias(venc, DIAS_MENSAL) && !(b.feitos[mes] ?? []).includes(x.id)) lista.push(doBloco(x, "mes", data === venc ? "do mês" : "do mês, atrasado"));
  }
  for (const e of registroDe(b, data).extras) lista.push({ chave: e.id, titulo: e.titulo, hora: "", minutos: 0, tipo: "extra" });
  return lista;
}
/** Marcou como feito hoje? As do mês contam no mês inteiro. */
export const estaFeita = (b: Bussola, t: Tarefa, data = hoje()) =>
  t.tipo === "mes" ? (b.feitos[data.slice(0, 7)] ?? []).includes(t.chave) : Object.entries(b.feitos).some(([k, v]) => k >= somarDias(data, -DIAS_ATRASO) && k <= data && v.includes(t.chave) && (t.tipo !== "rotina" || k === data));
export function marcarFeita(b: Bussola, t: Tarefa, feito: boolean, data = hoje()): Bussola {
  const chaveDia = t.tipo === "mes" ? data.slice(0, 7) : data;
  const feitos = { ...b.feitos };
  const atual = (feitos[chaveDia] ?? []).filter((x) => x !== t.chave);
  feitos[chaveDia] = feito ? [...atual, t.chave] : atual;
  if (!feito) for (const k of Object.keys(feitos)) feitos[k] = feitos[k].filter((x) => x !== t.chave || k === chaveDia);
  return { ...b, feitos };
}

/** Onde estou agora no dia: a tarefa em andamento e a próxima. */
export function agoraEDepois(tarefas: Tarefa[], feitas: (t: Tarefa) => boolean, agora = agoraHM()) {
  const n = min(agora);
  const abertas = tarefas.filter((t) => t.tipo === "rotina" && t.hora && !feitas(t)).sort((a, c) => a.hora.localeCompare(c.hora));
  return { agora: abertas.find((t) => min(t.hora) <= n && n < min(t.hora) + t.minutos) ?? null, proxima: abertas.find((t) => min(t.hora) > n) ?? null };
}

// ───── Conteúdo a partir do estoque ─────

export type Sugestao = { chave: string; titulo: string; texto: string; origem: "estoque" | "data" | "pauta"; href: string };
/** Datas comerciais dos próximos dias, com quantos dias faltam. */
export function proximasDatas(datas: DataComercial[], de = hoje()) {
  const ano = Number(de.slice(0, 4));
  const m = Number(de.slice(5, 7)) - 1;
  return datas
    .filter((d) => d.dia)
    .map((d) => ({ titulo: d.titulo, faltam: diasAte(`${ano + (d.mes < m ? 1 : 0)}-${String(d.mes + 1).padStart(2, "0")}-${String(d.dia).padStart(2, "0")}`) }))
    .filter((d) => d.faltam >= 0 && d.faltam <= DIAS_DATA_COMERCIAL)
    .sort((a, b) => a.faltam - b.faltam);
}
/** O que mostrar no conteúdo: o que está parado e ainda não apareceu, ligado à próxima data comercial e às pautas quentes da semana. */
export function sugestoesDeConteudo(d: DadosHoje): Sugestao[] {
  const temas = d.posts.map((p) => p.tema.toLowerCase());
  const data = proximasDatas(d.datas)[0];
  const peso = (i: ItemEstoque) => (i.objetivo ? 1e6 : 0) + i.dias_parado * Math.max(i.qtd, 1) * (i.giro === "Lento" ? 1.5 : 1);
  const lista: Sugestao[] = d.itens
    .filter((i) => !i.postado_em && !temas.some((t) => t && t.includes(i.produto.toLowerCase())) && (i.objetivo || i.dias_parado >= 30))
    .sort((a, b) => peso(b) - peso(a)).slice(0, 3)
    .map((i) => ({
      chave: `e-${i.id}`, origem: "estoque", titulo: `Mostrar: ${i.produto}`, href: "/conteudo/roteiro",
      texto: `${i.qtd} peça(s) paradas há ${i.dias_parado} dias${data ? `. ${data.titulo} é ${data.faltam === 0 ? "hoje" : `em ${data.faltam} dias`}: monte um look para essa data` : ": monte um look e mostre como usar"}, e chame a cliente certa no direct.`,
    }));
  for (const p of d.pautas.slice(0, 2)) lista.push({ chave: `p-${p.titulo}`, origem: "pauta", titulo: `Em alta: ${p.titulo}`, texto: p.angulo, href: "/conteudo/pautas" });
  if (data && !lista.some((s) => s.origem === "estoque")) lista.push({ chave: `d-${data.titulo}`, origem: "data", titulo: `${data.titulo} se aproxima`, texto: `Faltam ${data.faltam} dias. Planeje o conteúdo e as ações dessa data.`, href: "/conteudo/semana" });
  return lista;
}

// ───── Alertas ─────

export type Alerta = { chave: string; nivel: "alerta" | "atencao"; titulo: string; texto: string; href?: string; botao?: string };

const soma = (caixa: Caixa[], de: string, ate: string, id: string) => {
  let valor = 0;
  for (const c of caixa) if (c.dia >= de && c.dia <= ate) for (const v of c.vendedoras ?? []) if (v.pessoa_id === id) valor += v.faturamento;
  return valor;
};

/** Os avisos de gestão do dia, a partir dos números. */
export function alertas(d: DadosHoje): Alerta[] {
  const lista: Alerta[] = [];
  const h = hoje();
  // Caixa de ontem sem lançar (domingo a loja costuma fechar).
  const ontem = somarDias(h, -1);
  if (diaDaSemana(ontem) !== 0 && d.caixa.length && !d.caixa.some((c) => c.dia === ontem)) {
    lista.push({ chave: `caixa-${ontem}`, nivel: "atencao", titulo: "O caixa de ontem ainda não foi lançado", texto: "Sem o fechamento, os números e os alertas ficam atrasados. Lance por vendedora.", href: "/gestao/caixa", botao: "Fechar o caixa" });
  }
  // Vendedora com queda: últimos 7 dias contra os 7 anteriores.
  for (const p of d.equipe) {
    const agora = soma(d.caixa, somarDias(h, -6), h, p.id);
    const antes = soma(d.caixa, somarDias(h, -13), somarDias(h, -7), p.id);
    if (antes > 0 && agora < antes * (1 - QUEDA_ALERTA)) {
      const pct = Math.round((1 - agora / antes) * 100);
      lista.push({ chave: `queda-${p.id}`, nivel: "alerta", titulo: `${p.nome.split(" ")[0]} caiu ${pct}% nesta semana`, texto: `Vendeu ${moeda(agora)} nos últimos 7 dias; nos 7 anteriores foram ${moeda(antes)}. Chame para uma conversa individual e entenda o que mudou.`, href: "/pessoas/retorno", botao: "Dar retorno" });
    }
  }
  // Retorno atrasado.
  for (const p of d.equipe) {
    const ultimo = d.retornos.filter((r) => r.pessoa_id === p.id).map((r) => r.created_at.slice(0, 10)).sort().pop();
    if (ultimo && -diasAte(ultimo) > DIAS_SEM_RETORNO) lista.push({ chave: `retorno-${p.id}`, nivel: "atencao", titulo: `${p.nome.split(" ")[0]} está há ${-diasAte(ultimo)} dias sem retorno`, texto: "Conversa individual regular mantém o time engajado. Marque na sua rotina.", href: "/pessoas/retorno", botao: "Dar retorno" });
  }
  // Boletos.
  const abertos = d.boletos.filter((b) => !b.pago);
  const atrasados = abertos.filter((b) => diasAte(b.vence) < 0);
  const proximos = abertos.filter((b) => diasAte(b.vence) >= 0 && diasAte(b.vence) <= DIAS_BOLETO);
  if (atrasados.length) lista.push({ chave: "boleto-atrasado", nivel: "alerta", titulo: `${atrasados.length} boleto(s) vencido(s)`, texto: `${atrasados.map((b) => `${b.descricao} (${moeda(b.valor)})`).join(", ")}.`, href: "/bussola/boletos", botao: "Ver boletos" });
  if (proximos.length) lista.push({ chave: "boleto-proximo", nivel: "atencao", titulo: `${proximos.length} boleto(s) vencendo em até ${DIAS_BOLETO} dias`, texto: `${proximos.map((b) => `${b.descricao} (${moeda(b.valor)})`).join(", ")}.`, href: "/bussola/boletos", botao: "Ver boletos" });
  // Parados: já foi postado? Se não, vira objetivo da semana.
  const temas = d.posts.map((p) => p.tema.toLowerCase());
  for (const i of d.itens.filter((x) => x.dias_parado >= DIAS_PARADO).slice(0, 5)) {
    const postou = !!i.postado_em || temas.some((t) => t && t.includes(i.produto.toLowerCase()));
    lista.push({
      chave: `parado-${i.id}`, nivel: postou ? "atencao" : "alerta",
      titulo: `${i.produto}: ${i.qtd} peça(s) paradas há ${i.dias_parado} dias`,
      texto: postou ? "Já apareceu no conteúdo. Se não girou, pense em oferta, combinação com outra peça ou liquidação." : "Ainda não foi postado. Vire objetivo da semana do time: provar, fotografar, mostrar no conteúdo e oferecer às clientes certas.",
      href: "/bussola/estoque", botao: "Ver estoque parado",
    });
  }
  return lista.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "alerta" ? -1 : 1));
}

/** Ideias para as 3 prioridades do dia: o que está vermelho, o que ficou para trás e o objetivo da semana. */
export function sugestoesDePrioridade(avisos: Alerta[], pendentes: Tarefa[], d: DadosHoje) {
  const fora = [...avisos.filter((a) => a.nivel === "alerta").map((a) => a.titulo), ...pendentes.map((t) => t.titulo), ...d.itens.filter((i) => i.objetivo).map((i) => `Objetivo da semana: ${i.produto}`)];
  return [...new Set(fora)].slice(0, 6);
}
