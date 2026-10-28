"use client";

// Varejo (loja física) das lojas com mais de um canal: treinamentos, fidelização e contatos padronizados.
import { hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

const sb = () => supabaseBrowser();
async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

// ───── Textos em seções (fidelização, contatos padronizados) ─────
export type Secao = { titulo: string; texto: string };
export async function buscarTextos(portalId: string, chave: string) {
  const { data } = await sb().from("portal_textos").select("secoes").eq("portal_id", portalId).eq("chave", chave).maybeSingle();
  return ((data?.secoes ?? []) as Secao[]);
}
export const salvarTextos = (portalId: string, chave: string, secoes: Secao[]) =>
  ok(sb().from("portal_textos").upsert({ portal_id: portalId, chave, secoes, updated_at: new Date().toISOString() }, { onConflict: "portal_id,chave" }));

export const FIDELIZACAO_PADRAO: Secao[] = [
  { titulo: "Como funciona", texto: "Toda cliente cadastrada entra no programa. A cada compra ela sobe de nível e ganha benefícios.\nO cadastro é feito no caixa: nome, WhatsApp e data de aniversário." },
  { titulo: "Nível 1 · Cliente", texto: "Quem é: fez a primeira compra.\nBenefícios: mensagem de boas-vindas, novidades no WhatsApp e presente no mês do aniversário." },
  { titulo: "Nível 2 · Cliente fiel", texto: "Quem é: comprou 3 vezes ou mais no ano (ou passou de R$ ___).\nBenefícios: acesso às novidades antes de todo mundo, reserva de peças por 24h e um mimo a cada coleção." },
  { titulo: "Nível 3 · Cliente VIP", texto: "Quem é: as clientes que mais compram no ano (top 10%).\nBenefícios: atendimento com hora marcada, convite para eventos e lançamentos, condição especial na coleção nova." },
  { titulo: "Aniversário", texto: "Mensagem no dia e um presente para usar no mês (ex.: % de desconto ou brinde). Lembrete 5 dias antes de acabar o mês." },
  { titulo: "Como acompanhar", texto: "Toda semana: quem subiu de nível e quem está sumida há mais de 60 dias (vai para o Resgate).\nTodo mês: quantas clientes ativas em cada nível e quanto elas compraram." },
];
export const CONTATOS_PADRAO: Secao[] = [
  { titulo: "Pós-venda (2 dias depois)", texto: "Oi, [nome]! Aqui é [vendedor], da [loja]. Passando para saber se você gostou das peças e se serviram bem. Qualquer coisa, estou aqui!" },
  { titulo: "Novidade chegou", texto: "[nome], chegaram peças novas que têm tudo a ver com o que você gosta. Quer que eu te mande as fotos ou separe para você provar?" },
  { titulo: "Aniversário", texto: "Feliz aniversário, [nome]! 🎉 Separamos um presente para você usar neste mês na [loja]. Quer saber qual é?" },
  { titulo: "Cliente sumida (resgate)", texto: "Oi, [nome]! Faz um tempinho que você não passa por aqui e eu lembrei de você com as novidades. Posso te mostrar?" },
  { titulo: "Convite para ação ou evento", texto: "[nome], vamos fazer [ação] no dia [data] e você é uma das clientes que eu quero convidar. Posso confirmar a sua presença?" },
  { titulo: "Reserva de peça", texto: "[nome], separei [peça] no seu tamanho. Fica reservada até [dia]. Quer passar para provar?" },
  { titulo: "Depois de uma troca", texto: "[nome], a sua troca está resolvida. Obrigada pela paciência! Qualquer coisa, pode me chamar." },
];

// ───── Cronograma de treinamentos ─────
export type Treinamento = { id: string; portal_id: string; dia: string; tipo: string; tema: string; conduz: string; participantes: string; material: string; feito: boolean; obs: string };
export const TIPOS_TREINO: Record<string, { nome: string; classe: string }> = { produto: { nome: "Produto", classe: "andamento" }, vendas: { nome: "Vendas", classe: "feito" } };
export async function buscarTreinamentos(portalId: string) {
  const { data } = await sb().from("loja_treinamentos").select("*").eq("portal_id", portalId).order("dia");
  return (data ?? []) as Treinamento[];
}
export const salvarTreinamento = (portalId: string, id: string | null, d: Partial<Treinamento>) =>
  ok(id ? sb().from("loja_treinamentos").update(d).eq("id", id) : sb().from("loja_treinamentos").insert({ ...d, portal_id: portalId }));
export const excluirTreinamento = (id: string) => ok(sb().from("loja_treinamentos").delete().eq("id", id));

/** Sugestão de 4 semanas a partir de uma data: produto e vendas alternados, um por semana. */
export function sugerirTreinos(inicio: string, marcas: string[]) {
  const temas: [string, string][] = [
    ["produto", marcas[0] ? `Produto: ${marcas[0]} (o que é, para quem, como vender)` : "Produto: a coleção nova (peças-chave, tecidos, como combinar)"],
    ["vendas", "Vendas: abordagem em até 1 minuto e as perguntas que descobrem o que a cliente quer"],
    ["produto", marcas[1] ? `Produto: ${marcas[1]} (o que é, para quem, como vender)` : "Produto: as linhas que mais vendem e o que oferecer junto"],
    ["vendas", "Vendas: objeções (preço, \"vou pensar\") e fechamento com venda adicional"],
  ];
  const base = Date.parse(inicio || hoje());
  return temas.map(([tipo, tema], i) => ({ tipo, tema, dia: new Date(base + i * 7 * 86_400_000).toISOString().slice(0, 10) }));
}
