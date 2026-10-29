"use client";

// Missão da semana de CRM: uma força de venda unificada. Uma missão igual para o time todo (o mesmo foco,
// o mesmo modelo de mensagem e a mesma meta por pessoa). A lista de clientes sai do sistema da loja.
// Cada pessoa conta pelo link dela o que mandou, quem respondeu e quem comprou; a gestora acompanha cada uma.
import { hoje } from "@/lib/formato";
import { semanaDe } from "@/lib/leitura";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Missao = { id: string; portal_id: string; semana: string; foco: string; criterio: string; mensagem: string; meta: number; obs: string; created_at: string };
export type MissaoPessoa = { id: string; missao_id: string; portal_id: string; pessoa_id: string | null; pessoa_nome: string; token: string; enviadas: number; respostas: number; vendas: number };

export type Foco = { id: string; nome: string; tipo: "Clientes" | "Venda"; criterio: string; mensagem: string };
/** As missões prontas. {nome} = cliente, {consultora} = quem manda, {loja} = loja, {produto} = coleção ou linha. */
export const FOCOS: Foco[] = [
  { id: "resgate", nome: "Resgate", tipo: "Clientes", criterio: "Na sua carteira (no sistema), puxe as clientes que não compram há mais de 60 dias.",
    mensagem: "Oi, {nome}! Aqui é {consultora}, da {loja}. Faz um tempinho que você não passa por aqui e lembrei de você com as novidades. Separei umas peças que são a sua cara. Posso te mandar as fotos?" },
  { id: "lancamento", nome: "Lançamento", tipo: "Venda", criterio: "Na sua carteira (no sistema), puxe as clientes que compraram nos últimos 6 meses (as que mais compram primeiro).",
    mensagem: "Oi, {nome}! Aqui é {consultora}, da {loja}. Chegou {produto} e você é uma das primeiras clientes que eu quero mostrar. Posso te mandar as fotos ou reservar um horário para você provar?" },
  { id: "linha", nome: "Ação de uma linha", tipo: "Venda", criterio: "Na sua carteira (no sistema), puxe as clientes que já compraram essa linha ou peças parecidas.",
    mensagem: "Oi, {nome}! Aqui é {consultora}, da {loja}. Lembrei de você quando chegaram as novidades de {produto}. Separei algumas no seu estilo. Quer ver?" },
  { id: "vip", nome: "Melhores clientes", tipo: "Clientes", criterio: "Na sua carteira (no sistema), puxe as clientes que mais compraram nos últimos 12 meses.",
    mensagem: "Oi, {nome}! Aqui é {consultora}, da {loja}. Você é uma cliente muito especial para nós, por isso quero te mostrar as novidades antes de todo mundo. Posso reservar um horário só para você esta semana?" },
  { id: "posvenda", nome: "Pós-venda", tipo: "Clientes", criterio: "Na sua carteira (no sistema), puxe as clientes que compraram nos últimos 7 a 15 dias.",
    mensagem: "Oi, {nome}! Aqui é {consultora}, da {loja}. Passando para saber se você gostou das peças e se serviram bem. Separei umas que combinam com o que você levou: quer ver?" },
  { id: "aniversario", nome: "Aniversariantes", tipo: "Clientes", criterio: "Na sua carteira (no sistema), puxe as clientes que fazem aniversário nesta semana ou na próxima.",
    mensagem: "Oi, {nome}! Aqui é {consultora}, da {loja}. Feliz aniversário! 🎉 Separamos um presente para você usar neste mês. Quer saber qual é?" },
];

/** O foco que o Hub sugere pelo momento da loja: abaixo do ritmo, as melhores clientes; senão, um por semana do mês. */
export function focoSugerido(abaixo: number | null, dia = hoje()) {
  if (abaixo != null && abaixo > 0.1) return { foco: "vip", porque: `A loja está ${Math.round(abaixo * 100)}% abaixo do ritmo da meta: quem mais compra é quem responde mais rápido.` };
  const semana = Math.min(3, Math.floor((Number(dia.slice(8)) - 1) / 7));
  return [
    { foco: "vip", porque: "Começo do mês: novidade para quem mais compra puxa as primeiras vendas." },
    { foco: "posvenda", porque: "Garantir a segunda compra de quem comprou nas últimas semanas." },
    { foco: "resgate", porque: "Meio do mês: chamar quem não compra há mais de 60 dias antes de virar cliente perdida." },
    { foco: "resgate", porque: "Fim do mês: resgatar quem sumiu ajuda a fechar a meta." },
  ][semana];
}

export const semanaAtual = () => semanaDe(hoje());

const sb = () => supabaseBrowser();
async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}
export async function buscarMissoes(portalId: string) {
  const [m, p] = await Promise.all([
    sb().from("loja_missoes").select("*").eq("portal_id", portalId).order("semana", { ascending: false }).limit(26),
    sb().from("loja_missao_pessoas").select("*").eq("portal_id", portalId),
  ]);
  return { missoes: (m.data ?? []) as Missao[], pessoas: (p.data ?? []) as MissaoPessoa[] };
}
/** Cria (ou atualiza) a missão da semana e garante uma linha para cada pessoa do time. */
export async function salvarMissao(portalId: string, d: Omit<Missao, "id" | "portal_id" | "created_at">, time: { id: string; nome: string }[]) {
  const { data, error } = await sb().from("loja_missoes").upsert({ ...d, portal_id: portalId }, { onConflict: "portal_id,semana" }).select("*").single();
  if (error) throw new Error(error.message);
  const m = data as Missao;
  if (time.length) await ok(sb().from("loja_missao_pessoas").upsert(time.map((p) => ({ missao_id: m.id, portal_id: portalId, pessoa_id: p.id, pessoa_nome: p.nome })), { onConflict: "missao_id,pessoa_id", ignoreDuplicates: true }));
  return m;
}
export const excluirMissao = (id: string) => ok(sb().from("loja_missoes").delete().eq("id", id));
export const tirarPessoa = (id: string) => ok(sb().from("loja_missao_pessoas").delete().eq("id", id));

/** A mensagem para o grupo do time: a missão e o link de cada pessoa. */
export function mensagemGrupo(m: Missao, pessoas: MissaoPessoa[], link: (token: string) => string) {
  const f = FOCOS.find((x) => x.id === m.foco);
  return [
    `*Missão da semana: ${f?.nome ?? m.foco}*`,
    m.criterio, `Meta: ${m.meta} mensagens por pessoa até sábado, com o modelo do link.`, m.obs, "",
    "O link de cada um (marque o que mandou, quem respondeu e quem comprou):",
    ...pessoas.map((p) => `• ${p.pessoa_nome.split(" ")[0]}: ${link(p.token)}`),
  ].filter((x) => x !== undefined && x !== null).join("\n").replace(/\n{3,}/g, "\n\n");
}
