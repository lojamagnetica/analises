"use client";

// Regras do caixa da loja: como cada forma de pagamento ou lançamento do sistema dela conta no faturamento e no recebido.
// A loja responde e confirma; os agentes (arquivos do caixa e análise da semana) seguem o que ela marcou.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Resposta = "sim" | "nao" | "diferenca" | "";
export type ItemRegra = {
  chave: string; titulo: string;
  /** Sugestão da mentoria (a loja confirma ou corrige). */
  sugestao?: string;
  faturamento: Resposta; recebido: Resposta;
  /** Como aparece no sistema da loja (nome ou sigla). */
  nome: string; obs: string;
  /** A loja não usa isso. */
  naoUso?: boolean;
};
export type Regras = { itens: ItemRegra[]; confirmado_em: string | null; confirmado_por: string | null };

const item = (chave: string, titulo: string, sugestao = ""): ItemRegra => ({ chave, titulo, sugestao, faturamento: "", recebido: "", nome: "", obs: "" });

/** As situações que mais aparecem nos relatórios das lojas. A loja confirma cada uma e acrescenta as dela. */
export const PADRAO: ItemRegra[] = [
  item("consorcio_parcela", "Consórcio: parcela que a participante paga no mês", "Sugestão da Camilla: entra no faturamento como produto Consórcio (não conta como peça vendida)."),
  item("consorcio_resgate", "Consórcio: a contemplada retira as peças com o crédito", "Sugestão da Camilla: não conta no faturamento, porque o valor já entrou nas parcelas."),
  item("vale_presente_compra", "Vale-presente: a cliente compra o vale"),
  item("vale_presente_resgate", "Vale-presente: a pessoa usa o vale para levar as peças"),
  item("vale_credito", "Crédito que a cliente já tinha na loja (vale-crédito)"),
  item("troco_credito", "Troco que a cliente deixa como crédito"),
  item("voucher", "Voucher, vale-troca ou saldo de troca"),
  item("crediario_venda", "Venda no crediário (fiado, título, promissória)"),
  item("crediario_recebe", "Recebimento de parcela do crediário de uma venda antiga"),
  item("troca_sem", "Troca sem diferença"),
  item("troca_com", "Troca com diferença (a cliente paga ou recebe a diferença)"),
  item("desconto_devolucao", "Desconto e devolução"),
];

const sb = () => supabaseBrowser();

export async function buscarRegras(portalId: string): Promise<Regras> {
  const { data } = await sb().from("loja_regras_caixa").select("itens, confirmado_em, confirmado_por").eq("portal_id", portalId).maybeSingle();
  const salvos = ((data?.itens ?? []) as ItemRegra[]);
  // As situações padrão que a loja ainda não respondeu entram vazias; as que ela acrescentou continuam.
  const itens = [...PADRAO.map((p) => ({ ...p, ...(salvos.find((s) => s.chave === p.chave) ?? {}), titulo: p.titulo, sugestao: p.sugestao })),
    ...salvos.filter((s) => !PADRAO.some((p) => p.chave === s.chave))];
  return { itens, confirmado_em: data?.confirmado_em ?? null, confirmado_por: data?.confirmado_por ?? null };
}

/** Salva as respostas; confirmar marca que a loja revisou tudo (aí os agentes passam a seguir). */
export async function salvarRegras(portalId: string, itens: ItemRegra[], confirmar: boolean, quem: string) {
  const { error } = await sb().from("loja_regras_caixa").upsert({
    portal_id: portalId, itens, updated_at: new Date().toISOString(),
    ...(confirmar ? { confirmado_em: new Date().toISOString(), confirmado_por: quem || null } : {}),
  });
  if (error) throw new Error(error.message);
}

/** Item respondido: marcou "não uso" ou respondeu as duas perguntas. */
export const respondido = (i: ItemRegra) => !!i.naoUso || (!!i.faturamento && !!i.recebido);
