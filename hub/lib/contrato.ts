"use client";

// Contrato e renovação no portal: a loja vê plano, início, fim e situação (nunca valor ou condição).
import { supabaseBrowser } from "@/lib/supabase/client";
import { diasAte, hoje } from "@/lib/formato";

export type MeuContrato = { id: string; plano: string; tipo: string; meses: number | null; inicio: string | null; fim: string | null; status: string; renovacao_pedida: boolean };

/** Quantos dias antes do fim aparece o aviso de renovação. */
export const AVISO_RENOVACAO = 45;

export async function buscarMeuContrato(portalId: string) {
  const { data, error } = await supabaseBrowser().rpc("meu_contrato", { p_portal: portalId });
  if (error) throw new Error(error.message);
  const todos = (data ?? []) as MeuContrato[];
  const atual = todos.find((c) => c.status === "Ativo") ?? null;
  return { atual, anteriores: todos.filter((c) => c !== atual), pedida: todos.some((c) => c.renovacao_pedida) };
}

/** "pedido" quando criou o lead; "ja_pedido" quando já havia um aberto. */
export async function pedirRenovacao(portalId: string) {
  const { data, error } = await supabaseBrowser().rpc("pedir_renovacao", { p_portal: portalId });
  if (error) throw new Error(error.message);
  return data as "pedido" | "ja_pedido";
}

const mesesEntre = (de: string, ate: string) => {
  const [a1, m1, d1] = de.split("-").map(Number), [a2, m2, d2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1) + (d2 >= d1 ? 0 : -1);
};

/** Onde a loja está no contrato: mês X de Y, dias que faltam e quanto do tempo já passou. */
export function tempoDoContrato(c: Pick<MeuContrato, "inicio" | "fim" | "meses">) {
  if (!c.inicio || !c.fim) return null;
  const hj = hoje();
  const total = Math.max(1, c.meses ?? mesesEntre(c.inicio, c.fim));
  const mes = Math.min(total, Math.max(1, mesesEntre(c.inicio, hj) + 1));
  const faltam = Math.max(0, diasAte(c.fim));
  const dias = Math.max(1, (Date.parse(c.fim) - Date.parse(c.inicio)) / 86_400_000);
  const pct = Math.min(100, Math.max(0, Math.round(((Date.parse(hj) - Date.parse(c.inicio)) / 86_400_000 / dias) * 100)));
  return { mes, total, faltam, pct, comecou: hj >= c.inicio, acabou: hj > c.fim };
}

/** Mostra o aviso de renovação: contrato ativo a 45 dias ou menos do fim. */
export const pertoDoFim = (c: MeuContrato | null) => !!c?.fim && diasAte(c.fim) <= AVISO_RENOVACAO && diasAte(c.fim) >= 0;
