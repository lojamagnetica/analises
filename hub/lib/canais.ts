"use client";

// Vendas e tempo por canal: a loja mede, por um período (ex.: 2 semanas), quanto cada canal vende e quanto tempo
// ele toma. A equipe lança pelo link do celular (sem entrar no Hub); no Hub, a loja e a mentoria veem a venda por hora.
import { supabaseBrowser } from "@/lib/supabase/client";

export const CANAIS_SUGERIDOS = ["Loja física", "Stories", "Grupo VIP", "WhatsApp", "Live", "Evento", "Site ou marketplace"];
export const TEMPOS = [15, 30, 60, 120, 180];
export const rotuloTempo = (min: number) => (min < 60 ? `${min} min` : `${min / 60}h`.replace(".5h", "h30"));

export type Medicao = { id: string; portal_id: string; token: string; inicio: string; fim: string; canais: string[]; ativa: boolean; obs: string; created_at: string };
export type Registro = { id: string; medicao_id: string; dia: string; canal: string; tipo: "venda" | "tempo"; valor: number; pecas: number; minutos: number; quem: string; created_at: string };
export type Linha = { canal: string; valor: number; pecas: number; minutos: number; porHora: number | null; pct: number };

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

export const linkCanais = (token: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/analises/portal/canais/?t=${token}`;

export async function buscarMedicoes(portalId: string) {
  const { data } = await sb().from("loja_canais_medicao").select("*").eq("portal_id", portalId).order("inicio", { ascending: false });
  return (data ?? []) as Medicao[];
}
export async function buscarRegistros(medicaoId: string) {
  const { data } = await sb().from("loja_canais_registro").select("*").eq("medicao_id", medicaoId).order("created_at", { ascending: false }).limit(5000);
  return ((data ?? []) as Registro[]).map((r) => ({ ...r, valor: Number(r.valor) }));
}
export async function criarMedicao(portalId: string, inicio: string, fim: string, canais: string[]) {
  // Uma medição aberta por vez: a anterior fecha.
  await ok(sb().from("loja_canais_medicao").update({ ativa: false }).eq("portal_id", portalId).eq("ativa", true));
  await ok(sb().from("loja_canais_medicao").insert({ portal_id: portalId, inicio, fim, canais }));
}
export const salvarMedicao = (id: string, x: Partial<Pick<Medicao, "inicio" | "fim" | "canais" | "ativa" | "obs">>) => ok(sb().from("loja_canais_medicao").update(x).eq("id", id));
export const excluirMedicao = (id: string) => ok(sb().from("loja_canais_medicao").delete().eq("id", id));
export const salvarRegistro = (id: string, x: Partial<Pick<Registro, "valor" | "pecas" | "minutos" | "canal">>) => ok(sb().from("loja_canais_registro").update(x).eq("id", id));
export const excluirRegistro = (id: string) => ok(sb().from("loja_canais_registro").delete().eq("id", id));

/** O resultado por canal: quanto vendeu, quanto tempo tomou e quanto vende por hora. */
export function resultado(canais: string[], regs: Registro[]) {
  const total = regs.reduce((s, r) => s + (r.tipo === "venda" ? r.valor : 0), 0);
  const nomes = [...canais, ...regs.map((r) => r.canal).filter((c) => !canais.includes(c))];
  const linhas: Linha[] = [...new Set(nomes)].map((canal) => {
    const rs = regs.filter((r) => r.canal === canal);
    const valor = rs.reduce((s, r) => s + (r.tipo === "venda" ? r.valor : 0), 0);
    const pecas = rs.reduce((s, r) => s + (r.tipo === "venda" ? r.pecas : 0), 0);
    const minutos = rs.reduce((s, r) => s + (r.tipo === "tempo" ? r.minutos : 0), 0);
    return { canal, valor, pecas, minutos, porHora: minutos ? valor / (minutos / 60) : null, pct: total ? (valor / total) * 100 : 0 };
  });
  const dias = new Set(regs.map((r) => r.dia)).size;
  return { linhas, total, dias };
}

// O link do celular (sem login): abrir, lançar e apagar o lançamento de hoje.
export type Aberta = { loja: string; inicio: string; fim: string; canais: string[]; ativa: boolean; hoje: string;
  lancamentos: { id: string; canal: string; tipo: "venda" | "tempo"; valor: number; pecas: number; minutos: number; quem: string; em: string }[] };
export async function abrirLink(token: string) {
  const { data } = await sb().rpc("canais_abrir", { p_token: token });
  return (data as Aberta | null) ?? null;
}
export async function lancar(token: string, canal: string, tipo: "venda" | "tempo", valor: number, pecas: number, minutos: number, quem: string) {
  const { error } = await sb().rpc("canais_lancar", { p_token: token, p_canal: canal, p_tipo: tipo, p_valor: valor, p_pecas: pecas, p_minutos: minutos, p_quem: quem });
  if (error) throw new Error(error.message);
}
export async function apagarLancamento(token: string, id: string) {
  await sb().rpc("canais_apagar", { p_token: token, p_id: id });
}
