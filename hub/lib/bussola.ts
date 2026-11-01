"use client";

// Bússola do gestor (Onde está o meu tempo): a lojista diz quando está disponível e prefere cada tarefa,
// o Hub monta a rotina da semana e, em cima dos números, avisa o que precisa de atenção hoje.
// As regras dos alertas ficam aqui em cima, num lugar só, para a Camilla revisar.
import { supabaseBrowser } from "@/lib/supabase/client";
import { diasAte, hoje, moeda } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { buscarCaixa, mesDeHoje, somarMes, type Caixa } from "@/lib/caixa";

// ───── Regras (para revisar) ─────

/** Queda de vendas da vendedora (últimos 7 dias contra os 7 anteriores) que acende o alerta. */
export const QUEDA_ALERTA = 0.15;
/** Peça parada há tantos dias entra como atenção. */
export const DIAS_PARADO = 60;
/** Boleto que vence em até tantos dias aparece no Hoje. */
export const DIAS_BOLETO = 3;
/** Dias sem dar retorno (feedback) a uma pessoa do time. */
export const DIAS_SEM_RETORNO = 30;

// ───── Funções do gestor e rotina ─────

export type Funcao = "caixa" | "numeros" | "feedback" | "boletos" | "parados" | "conteudo" | "gravar" | "time" | "compras" | "clientes";
export const FUNCOES: { id: Funcao; nome: string; ajuda: string; dia: number; hora: string; minutos: number; link?: string }[] = [
  { id: "caixa", nome: "Conferir o caixa de ontem", ajuda: "Todo dia, antes de abrir.", dia: -1, hora: "08:30", minutos: 10, link: "/gestao/caixa" },
  { id: "numeros", nome: "Olhar os números da semana", ajuda: "Meta, PA, ticket e cada vendedora.", dia: 1, hora: "09:00", minutos: 30, link: "/gestao/resultado" },
  { id: "feedback", nome: "Dar retorno ao time", ajuda: "Conversa individual, com roteiro.", dia: 2, hora: "10:00", minutos: 45, link: "/pessoas/retorno" },
  { id: "time", nome: "Reunião semanal do time", ajuda: "Meta, foco da semana e o que o time vai fazer.", dia: 1, hora: "09:30", minutos: 30, link: "/pessoas/reuniao-semanal" },
  { id: "boletos", nome: "Conferir boletos e organizar pagamentos", ajuda: "Veja o que vence nos próximos dias.", dia: 3, hora: "14:00", minutos: 30, link: "/bussola/boletos" },
  { id: "parados", nome: "Produtos parados: estratégia", ajuda: "Escolha o que entra em ação e vira conteúdo.", dia: 3, hora: "15:00", minutos: 30, link: "/bussola/estoque" },
  { id: "compras", nome: "Decidir compras e reposição", ajuda: "O que repor, o que girar, o que não comprar.", dia: 4, hora: "10:00", minutos: 45, link: "/estoque" },
  { id: "conteudo", nome: "Planejar o conteúdo da semana", ajuda: "Estoque, giro, período, desejo e tendência.", dia: 5, hora: "10:00", minutos: 45, link: "/conteudo/semana" },
  { id: "gravar", nome: "Gravar os vídeos", ajuda: "Tudo de uma vez, no dia e hora combinados.", dia: 5, hora: "14:00", minutos: 90, link: "/conteudo/roteiro" },
  { id: "clientes", nome: "Cuidar das clientes (resgate e pós-venda)", ajuda: "Quem comprou, quem sumiu, aniversariantes.", dia: 2, hora: "15:00", minutos: 30, link: "/clientes" },
];

export const DIAS_NOME = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** O que a lojista combinou: dias em que está na loja e, para cada função, o dia e a hora que prefere (dia -1 = todo dia útil). */
export type Dispo = {
  dias: number[]; inicio: string; fim: string;
  prefs: Partial<Record<Funcao, { dia: number; hora: string; minutos?: number; fora?: boolean }>>;
};
export type Bloco = { id: string; funcao: Funcao | "outro"; titulo: string; dia: number; hora: string; minutos: number };
export type Bussola = { dispo: Dispo; blocos: Bloco[]; feitos: Record<string, string[]> };

export const dispoVazia = (): Dispo => ({ dias: [1, 2, 3, 4, 5, 6], inicio: "09:00", fim: "18:00", prefs: {} });
export const novoId = () => crypto.randomUUID().slice(0, 8);

/** Monta a semana ideal: cada função no dia e hora que ela preferiu; sem preferência, no padrão do método dentro dos dias disponíveis. */
export function montarRotina(d: Dispo): Bloco[] {
  const dias = d.dias.length ? [...d.dias].sort() : [1, 2, 3, 4, 5];
  const diaDisponivel = (alvo: number) => dias.includes(alvo) ? alvo : dias.find((x) => x > alvo) ?? dias[dias.length - 1];
  const blocos: Bloco[] = [];
  for (const f of FUNCOES) {
    const p = d.prefs[f.id];
    if (p?.fora) continue;
    const hora = p?.hora || f.hora;
    const minutos = p?.minutos || f.minutos;
    const alvo = p?.dia ?? f.dia;
    const alvos = alvo === -1 ? dias.filter((x) => x !== 0) : [diaDisponivel(alvo)];
    for (const dia of alvos) blocos.push({ id: `${f.id}-${dia}`, funcao: f.id, titulo: f.nome, dia, hora, minutos });
  }
  return blocos.sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora));
}

// ───── Banco ─────

const sb = () => supabaseBrowser();

export async function buscarBussola(portalId: string): Promise<Bussola> {
  const { data } = await sb().from("loja_bussola").select("dispo, blocos, feitos").eq("portal_id", portalId).maybeSingle();
  return {
    dispo: { ...dispoVazia(), ...((data?.dispo as Partial<Dispo>) ?? {}) },
    blocos: (data?.blocos as Bloco[]) ?? [],
    feitos: (data?.feitos as Record<string, string[]>) ?? {},
  };
}

export async function salvarBussola(portalId: string, b: Bussola) {
  const { error } = await sb().from("loja_bussola")
    .upsert({ portal_id: portalId, dispo: b.dispo, blocos: b.blocos, feitos: b.feitos, updated_at: new Date().toISOString() }, { onConflict: "portal_id" });
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

/** Dados do Hoje: rotina, caixa dos últimos dois meses (para os 14 dias), time, estoque, boletos, retornos e posts. */
export async function buscarHoje(portalId: string) {
  const mes = mesDeHoje();
  const [b, c1, c2, { data: equipe }, itens, boletos, { data: fb }, { data: posts }] = await Promise.all([
    buscarBussola(portalId),
    buscarCaixa(portalId, mes),
    buscarCaixa(portalId, somarMes(mes, -1)),
    sb().from("loja_equipe").select("id, nome, funcao").eq("portal_id", portalId).eq("ativo", true),
    buscarItens(portalId),
    buscarBoletos(portalId),
    sb().from("loja_feedbacks").select("pessoa_id, created_at").eq("portal_id", portalId),
    sb().from("loja_posts").select("tema, status, data").eq("portal_id", portalId).gte("data", somarDias(hoje(), -60)),
  ]);
  return {
    b, caixa: [...c1, ...c2], equipe: (equipe ?? []) as { id: string; nome: string; funcao: string | null }[], itens, boletos,
    retornos: (fb ?? []) as { pessoa_id: string; created_at: string }[], posts: (posts ?? []) as { tema: string; status: string; data: string }[],
  };
}
export type DadosHoje = Awaited<ReturnType<typeof buscarHoje>>;

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
