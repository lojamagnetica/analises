"use client";

// Gincanas: o lojista diz o que quer trabalhar e o Hub sugere as gincanas da biblioteca Loja Magnética.
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ChaveLeitura } from "@/lib/pessoas";

export type Gincana = {
  id: string; ordem: number; nome: string; categoria: string | null; comece: boolean; objetivo: string; indicadores: string[];
  duracao: string | null; como_funciona: string[]; regras: string[]; premiacao: string | null; materiais: string[]; dica: string | null; publicada: boolean;
};
export type LojaGincana = {
  id: string; portal_id: string; gincana_id: string; indicador: string | null; inicio: string; fim: string | null;
  premio: string | null; vencedor: string | null; resultado: string | null; created_at: string;
};

export const INDICADORES = [
  "Faturamento", "Ticket médio", "Peças por atendimento", "Conversão", "Cadastro de clientes", "Pós-venda e recompra",
  "Venda de peças paradas", "Conteúdo e Instagram", "Organização e rotina", "Pontualidade", "Atendimento", "Trabalho em equipe",
];

/** Da leitura da reunião semanal para o indicador das gincanas. */
export const INDICADOR_DA_CHAVE: Record<ChaveLeitura, string> = {
  ticket: "Ticket médio",
  pa: "Peças por atendimento",
  conversao: "Conversão",
  carteira: "Faturamento",
};

const sb = () => supabaseBrowser();

export async function buscarGincanas(portalId: string | null) {
  const [g, l, m] = await Promise.all([
    sb().from("gincanas").select("*").order("ordem"),
    portalId ? sb().from("loja_gincanas").select("*").eq("portal_id", portalId).order("inicio", { ascending: false }) : Promise.resolve({ data: [] }),
    sb().from("metodo").select("dados").eq("chave", "gincanas").maybeSingle(),
  ]);
  const metodo = (m.data?.dados ?? { regras_de_ouro: [], sub: "" }) as { regras_de_ouro: string[]; sub: string };
  return { gincanas: (g.data ?? []) as Gincana[], minhas: (l.data ?? []) as LojaGincana[], metodo };
}

async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

export const rodarGincana = (portalId: string, gincanaId: string, d: { indicador: string | null; inicio: string; fim: string; premio: string }) =>
  ok(sb().from("loja_gincanas").insert({ portal_id: portalId, gincana_id: gincanaId, indicador: d.indicador, inicio: d.inicio, fim: d.fim || null, premio: d.premio.trim() || null }));
export const fecharGincana = (id: string, vencedor: string, resultado: string) =>
  ok(sb().from("loja_gincanas").update({ vencedor: vencedor.trim() || null, resultado: resultado.trim() || null }).eq("id", id));

const linhas = (t: FormDataEntryValue | null) => String(t ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
export async function gincanaSalvar(id: string | null, f: FormData) {
  const t = (k: string) => String(f.get(k) ?? "").trim();
  const dados = {
    ordem: Number(t("ordem")) || 0, nome: t("nome"), categoria: t("categoria") || null, comece: f.get("comece") === "on", objetivo: t("objetivo"),
    indicadores: f.getAll("indicadores").map(String), duracao: t("duracao") || null, como_funciona: linhas(f.get("como_funciona")),
    regras: linhas(f.get("regras")), premiacao: t("premiacao") || null, materiais: linhas(f.get("materiais")), dica: t("dica") || null,
    publicada: f.get("publicada") === "on",
  };
  if (!dados.nome) throw new Error("Escreva o nome da gincana.");
  return ok(id ? sb().from("gincanas").update(dados).eq("id", id) : sb().from("gincanas").insert(dados));
}
