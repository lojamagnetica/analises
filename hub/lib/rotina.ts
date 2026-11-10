"use client";

// Rotina da gestão: relatórios por período (arquivos privados em relatorios/<portal>/gestao/...) e boletos do mês.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { abrirRelatorio, excluirRelatorio } from "@/lib/relatorios";

export type SlotRelatorio = { chave: string; titulo: string; oque: string };

/** O que a loja manda toda semana (vence na sexta, às 18h). */
export const RELATORIOS_SEMANA: SlotRelatorio[] = [
  { chave: "mais_vendidos_semana", titulo: "Mais vendidos da semana", oque: "Com categoria, marca e o estoque atual de cada produto." },
  { chave: "estoque_linha", titulo: "Estoque atualizado", oque: "O estoque de hoje, por categoria, para ver o que chegou de mercadoria e o que saiu (baixa)." },
  { chave: "crediario_semana", titulo: "Crediário atualizado", oque: "O contas a receber de hoje: quem deve, quanto e o que está vencido. Comparando uma semana com a outra, vemos quanto subiu e quanto foi dado baixa. Se não vende no crediário, pode pular." },
];

/** O que a loja manda no começo do mês, sobre o mês que fechou (vence no dia 5). */
export const RELATORIOS_MES: SlotRelatorio[] = [
  { chave: "lista_vendas", titulo: "Lista de vendas do mês", oque: "Todas as vendas do mês, com vendedora, cliente e desconto." },
  { chave: "mais_vendidos", titulo: "Mais vendidos do mês", oque: "Com categoria, fornecedor, marca e o estoque atual." },
  { chave: "vendas_cliente", titulo: "Vendas por cliente, por vendedora", oque: "Com o telefone de cada cliente." },
  { chave: "estoque_marca", titulo: "Estoque por marca, com a idade das peças", oque: "Quanto tem de cada marca e há quantos dias está parado." },
  { chave: "contas_receber", titulo: "Contas a receber (promissória)", oque: "O que está em aberto e o que está em atraso." },
];

export type Envio = { slot: string; nome: string; caminho: string; tamanho: number; em: string };

const BALDE = "relatorios";
const LIMITE = 25 * 1024 * 1024;
const sb = () => supabaseBrowser();

/** Nome da loja em letras simples, para a pasta do arquivo. */
const pastaDaLoja = (loja: string) => (loja.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "geral");

const pasta = (portalId: string, loja: string, periodo: string) => `${portalId}/gestao/${pastaDaLoja(loja)}/${periodo}`;

/** Os arquivos já enviados daquela loja e período. */
export async function listarEnvios(portalId: string, loja: string, periodo: string): Promise<Envio[]> {
  const base = pasta(portalId, loja, periodo);
  const { data } = await sb().storage.from(BALDE).list(base, { sortBy: { column: "created_at", order: "desc" } });
  return (Array.isArray(data) ? data : []).filter((f) => f.name && f.id).map((f) => {
    const [slot, ...resto] = f.name.split("__");
    return {
      slot, caminho: `${base}/${f.name}`, tamanho: Number(f.metadata?.size ?? 0), em: f.created_at ?? "",
      nome: resto.join("__").replace(/^\d{13}-/, "") || f.name,
    };
  });
}

export async function subirEnvio(portalId: string, loja: string, periodo: string, slot: string, arquivo: File) {
  if (arquivo.size > LIMITE) throw new Error("O arquivo passa de 25 MB. Exporte só o período pedido ou mande em partes.");
  const limpo = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);
  const { error } = await sb().storage.from(BALDE).upload(`${pasta(portalId, loja, periodo)}/${slot}__${Date.now()}-${limpo}`, arquivo, { upsert: false });
  if (error) throw new Error("Não deu para subir o arquivo. Confira a internet e tente de novo.");
}

/** Dias (AAAA-MM-DD) em que a loja subiu ao menos um arquivo do caixa, em qualquer das lojas do portal.
 *  Quem sobe os arquivos do sistema não precisa digitar os números: o dia conta como enviado. */
export async function diasComArquivoDoCaixa(portalId: string, dias: string[]): Promise<Set<string>> {
  if (!dias.length) return new Set();
  const { data: pastas } = await sb().storage.from(BALDE).list(`${portalId}/gestao`);
  const lojas = (pastas ?? []).filter((p) => p.name).map((p) => p.name);
  const achados = await Promise.all(lojas.flatMap((l) => dias.map(async (d) => {
    const { data } = await sb().storage.from(BALDE).list(`${portalId}/gestao/${l}/${d}`);
    return (data ?? []).some((f) => f.id && f.name.startsWith("caixa_")) ? d : null;
  })));
  return new Set(achados.filter((d): d is string => !!d));
}

export { abrirRelatorio as abrirEnvio, excluirRelatorio as excluirEnvio };

// ───── Datas da rotina ─────

const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
/** A segunda-feira da semana de uma data (a semana vai de segunda a domingo). */
export const segundaDa = (d: string) => somarDias(d, -(dow(d) === 0 ? 6 : dow(d) - 1));
export const semanaAtual = () => segundaDa(hoje());

/** Próximo dia de conversa individual: dias 10, 20 e o último dia do mês. */
export function proximoUmAUm(d = hoje()) {
  const [a, m] = [Number(d.slice(0, 4)), Number(d.slice(5, 7))];
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const iso = (dd: number) => `${d.slice(0, 7)}-${String(dd).padStart(2, "0")}`;
  const cand = [iso(10), iso(20), iso(ultimo)].find((x) => x >= d);
  if (cand) return cand;
  const prox = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 7);
  return `${prox}-10`;
}

// ───── Boletos do mês ─────

export type BoletoMes = { id: string; loja: string; mes: string; a_vencer: number; pago: number };

export async function buscarBoletosMes(portalId: string, mes: string): Promise<BoletoMes[]> {
  const { data } = await sb().from("loja_boletos_mes").select("id, loja, mes, a_vencer, pago").eq("portal_id", portalId).eq("mes", mes);
  return (data ?? []).map((l) => ({ ...l, a_vencer: Number(l.a_vencer), pago: Number(l.pago) })) as BoletoMes[];
}

export async function salvarBoletosMes(portalId: string, loja: string, mes: string, aVencer: number, pago: number) {
  const { error } = await sb().from("loja_boletos_mes").upsert(
    { portal_id: portalId, loja, mes, a_vencer: aVencer, pago, atualizado_em: new Date().toISOString() },
    { onConflict: "portal_id,loja,mes" },
  );
  if (error) throw new Error("Não deu para salvar os boletos do mês. Tente de novo.");
}
