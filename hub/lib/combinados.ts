"use client";

// Combinados da loja: o que ela se comprometeu a começar a fazer (reunião de entrega ou qualquer reunião individual).
// A equipe registra; a loja vê no Início e marca como feito; a CS acompanha pelo prazo.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";

export type Quem = "loja" | "claudia" | "camilla";
export type Combinado = {
  id: string; portal_id: string; texto: string; quem: Quem; prazo: string | null;
  status: "aberto" | "feito"; origem: string; criado_por: string | null; created_at: string; feito_em: string | null;
};
export type NovoCombinado = { texto: string; quem: Quem; prazo: string | null };

const sb = () => supabaseBrowser();

/** O próximo sábado (ou o de hoje, se hoje for sábado): fecha a semana do caixa. */
export function proximoSabado(de = hoje()) {
  const dow = new Date(`${de}T12:00:00Z`).getUTCDay();
  return somarDias(de, (6 - dow + 7) % 7);
}
/** O próximo dia 20 (prazo do plano do mês seguinte). */
export function proximoDia20(de = hoje()) {
  const [a, m, d] = de.split("-").map(Number);
  const alvo = d <= 20 ? new Date(Date.UTC(a, m - 1, 20)) : new Date(Date.UTC(a, m, 20));
  return alvo.toISOString().slice(0, 10);
}

/** As opções mais comuns, para a Camilla tocar no fim da reunião. O prazo é só uma sugestão: dá para mudar. */
export const SUGESTOES: { texto: string; prazo: () => string }[] = [
  { texto: "Lançar o caixa todos os dias, completo até o sábado", prazo: () => proximoSabado() },
  { texto: "Mandar a mensagem de direção do dia no grupo do time", prazo: () => somarDias(hoje(), 1) },
  { texto: "Dar o check na missão da semana todos os dias", prazo: () => somarDias(hoje(), 7) },
  { texto: "Cadastrar toda cliente nova com telefone e aniversário", prazo: () => somarDias(hoje(), 7) },
  { texto: "Registrar os números da semana no Hub", prazo: () => proximoSabado() },
  { texto: "Planejar o mês seguinte e enviar para a Camilla até o dia 20", prazo: () => proximoDia20() },
];

export async function buscarCombinados(portalId: string): Promise<Combinado[]> {
  const { data } = await sb().from("loja_combinados").select("*").eq("portal_id", portalId).order("status", { ascending: true }).order("prazo", { ascending: true });
  return (data ?? []) as Combinado[];
}

/** Registra os combinados e já passa a loja para o acompanhamento da CS. */
export async function liberarAcompanhamento(portalId: string, itens: NovoCombinado[], criadoPor: string, origem = "entrega") {
  if (itens.length) {
    const { error } = await sb().from("loja_combinados").insert(itens.map((i) => ({ portal_id: portalId, texto: i.texto.trim(), quem: i.quem, prazo: i.prazo || null, origem, criado_por: criadoPor || null })));
    if (error) throw new Error(error.message);
  }
  const { error } = await sb().from("portais").update({ cs_acompanha: true }).eq("id", portalId);
  if (error) throw new Error(error.message);
}

export const marcarCombinado = (id: string, feito: boolean) => sb().rpc("combinado_marcar", { p_id: id, p_feito: feito });
export const excluirCombinado = (id: string) => sb().from("loja_combinados").delete().eq("id", id);

/** Quem acompanha a loja (a CS): nome e, se cadastrado, o WhatsApp. */
export async function buscarCs(): Promise<{ nome: string; whatsapp: string | null }> {
  const { data } = await sb().from("metodo").select("dados").eq("chave", "cs").maybeSingle();
  const d = (data?.dados ?? {}) as { nome?: string; whatsapp?: string };
  return { nome: d.nome || "Claudia", whatsapp: d.whatsapp ?? null };
}
