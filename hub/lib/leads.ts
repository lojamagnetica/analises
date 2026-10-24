"use client";

// Leads do Comercial: quadro por etapa, funil e a passagem para a Nova venda quando fecha.
import { supabaseBrowser } from "@/lib/supabase/client";
import { chaveDia, hojeChave } from "@/lib/agenda";
import { intervalo, type Periodo } from "@/lib/gestao-clientes";

export const ETAPAS_LEAD = ["Novo", "Conversando", "Proposta", "Fechou"] as const;
export type EtapaLead = (typeof ETAPAS_LEAD)[number] | "Perdido";
export type Lead = {
  id: string; nome: string; loja: string | null; whatsapp: string | null; instagram: string | null; origem: string | null;
  etapa: EtapaLead; valor_estimado: number | null; responsavel: string | null; proximo_contato: string | null; obs: string | null;
  motivo_perda: string | null; portal_id: string | null; created_at: string; etapa_em: string;
};

const sb = () => supabaseBrowser();
const COLUNAS = "id, nome, loja, whatsapp, instagram, origem, etapa, valor_estimado, responsavel, proximo_contato, obs, motivo_perda, portal_id, created_at, etapa_em";
const txt = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max) || null;
const num = (v: string | null) => { if (!v) return null; const n = Number(v.replace(/\./g, "").replace(",", ".")); return Number.isNaN(n) ? null : n; };

export async function buscarLeads() {
  const [{ data: leads }, { data: equipe }] = await Promise.all([
    sb().from("leads").select(COLUNAS).order("created_at", { ascending: false }).limit(1000),
    sb().from("perfis").select("id, nome").eq("papel", "equipe").order("nome"),
  ]);
  return { leads: (leads ?? []) as Lead[], equipe: (equipe ?? []) as { id: string; nome: string | null }[] };
}

export async function buscarLead(id: string) {
  const { data } = await sb().from("leads").select(COLUNAS).eq("id", id).maybeSingle();
  return (data ?? null) as Lead | null;
}

/** Cria (id nulo) ou atualiza um lead com os campos do formulário. */
export async function salvarLead(id: string | null, f: FormData, porNome: string) {
  const nome = txt(f, "nome", 200);
  if (!nome) throw new Error("Preencha o nome.");
  const dados = {
    nome, loja: txt(f, "loja", 200), whatsapp: txt(f, "whatsapp", 60), instagram: txt(f, "instagram", 200), origem: txt(f, "origem", 200),
    valor_estimado: num(txt(f, "valor_estimado", 30)), responsavel: txt(f, "responsavel", 100), proximo_contato: txt(f, "proximo_contato", 10),
    obs: txt(f, "obs", 4000), updated_at: new Date().toISOString(),
  };
  const { error } = id ? await sb().from("leads").update(dados).eq("id", id) : await sb().from("leads").insert({ ...dados, criado_por: porNome });
  if (error) throw new Error(error.message);
}

export async function moverLead(id: string, etapa: EtapaLead, motivo?: string) {
  const agora = new Date().toISOString();
  const { error } = await sb().from("leads").update({ etapa, etapa_em: agora, updated_at: agora, motivo_perda: etapa === "Perdido" ? (motivo?.trim().slice(0, 300) || null) : null }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Depois de registrar a venda: o lead fica como Fechou e guarda o portal criado. */
export async function fecharLead(id: string, portalId: string) {
  const agora = new Date().toISOString();
  await sb().from("leads").update({ etapa: "Fechou", portal_id: portalId, etapa_em: agora, updated_at: agora }).eq("id", id);
}

/** Funil dos leads criados no período. "Chegaram até" soma a etapa e as seguintes; perdidos ficam à parte. */
export function funil(leads: Lead[], periodo: Periodo) {
  const { de, ate } = intervalo(periodo);
  const l = leads.filter((x) => { const d = chaveDia(x.created_at); return (!de || d >= de) && d <= ate; });
  const n = (e: EtapaLead) => l.filter((x) => x.etapa === e).length;
  const soma = (es: EtapaLead[], campo: "valor_estimado" = "valor_estimado") => l.filter((x) => es.includes(x.etapa)).reduce((s, x) => s + (Number(x[campo]) || 0), 0);
  const chegaram = {
    Novo: n("Novo") + n("Conversando") + n("Proposta") + n("Fechou"),
    Conversando: n("Conversando") + n("Proposta") + n("Fechou"),
    Proposta: n("Proposta") + n("Fechou"),
    Fechou: n("Fechou"),
  };
  const conversao = (de: keyof typeof chegaram, para: keyof typeof chegaram) => (chegaram[de] ? Math.round((chegaram[para] / chegaram[de]) * 100) : null);
  return {
    total: l.length, perdidos: n("Perdido"), chegaram,
    conversao: { Conversando: conversao("Novo", "Conversando"), Proposta: conversao("Conversando", "Proposta"), Fechou: conversao("Proposta", "Fechou"), geral: conversao("Novo", "Fechou") },
    valorAberto: soma(["Novo", "Conversando", "Proposta"]), valorFechado: soma(["Fechou"]),
  };
}

export const atrasado = (l: Lead) => !!l.proximo_contato && l.etapa !== "Fechou" && l.etapa !== "Perdido" && l.proximo_contato < hojeChave();

export const linkWhatsapp = (tel: string | null) => {
  const d = (tel ?? "").replace(/\D/g, "");
  return d.length >= 10 ? `https://wa.me/${d.length <= 11 ? `55${d}` : d}` : null;
};
