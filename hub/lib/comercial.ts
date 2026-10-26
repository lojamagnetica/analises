"use client";

// Comercial: a venda vira o portal da cliente no Hub + a passagem de bastão para a CS (sem mandar o acesso:
// o link de entrada é gerado pela CS no onboarding). E a fila de oportunidades (renovação e upgrade).
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";

const sb = () => supabaseBrowser();
const txt = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (v: string) => { const n = Number(v.replace(/\./g, "").replace(",", ".")); return v && !Number.isNaN(n) ? n : null; };

export function somarMeses(data: string, meses: number) {
  const d = new Date(`${data}T12:00:00`);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

export async function registrarVenda(f: FormData, porNome: string) {
  const loja = txt(f, "loja", 200);
  if (!loja) throw new Error("Preencha o nome da loja.");
  const planoId = txt(f, "plano", 40);
  if (!planoId) throw new Error("Escolha o plano.");
  const pagamento = txt(f, "pagamento_em", 10) || hoje();
  const { data: plano } = await sb().from("planos").select("id, tipo, meses").eq("id", planoId).single();
  const meses = Number(plano?.meses ?? 6);

  const { data: portal, error } = await sb().from("portais").insert({
    loja,
    responsavel: txt(f, "responsavel", 200) || null,
    email: txt(f, "email", 200).toLowerCase() || null,
    whatsapp: txt(f, "whatsapp", 60) || null,
    aniversario: txt(f, "aniversario", 10) || null,
    tipo: plano?.tipo === "Consultoria" ? "Consultoria" : "Mentoria",
    inicio: pagamento,
  }).select("id").single();
  if (error || !portal) throw new Error(error?.message ?? "Não deu para criar o portal.");

  // O Plano de Ação começa do modelo da Biblioteca (mentoria), como no Novo portal.
  if (plano?.tipo !== "Consultoria") {
    const { data: modelo } = await sb().from("plano_modelo").select("mes, ordem, texto").order("mes").order("ordem");
    if (modelo?.length) await sb().from("plano_itens").insert(modelo.map((m) => ({ ...m, portal_id: portal.id })));
  }
  const valor = num(txt(f, "valor", 30));
  await sb().from("fichas").update({ plano_id: planoId, etapa: null, instagram: txt(f, "instagram", 200) || null, situacao: "Não iniciada" }).eq("portal_id", portal.id);
  await sb().from("contratos").insert({ portal_id: portal.id, plano_id: planoId, inicio: pagamento, fim: somarMeses(pagamento, meses), valor, condicao: txt(f, "forma_pagamento", 300) || null });
  const { error: e2 } = await sb().from("passagens").insert({
    portal_id: portal.id, vendido_por: txt(f, "vendido_por", 100) || porNome, plano_id: planoId, valor, pagamento_em: pagamento,
    forma_pagamento: txt(f, "forma_pagamento", 300) || null, resultado_90: txt(f, "resultado_90") || null,
    alinhado: f.get("alinhado") === "on", origem: txt(f, "origem", 200) || null, observacoes: txt(f, "observacoes", 4000) || null,
    criado_por: porNome,
    contratante_nome: txt(f, "contratante_nome", 300) || null, contratante_doc: txt(f, "contratante_doc", 40) || null,
    contratante_endereco: txt(f, "contratante_endereco", 500) || null, representante: txt(f, "representante", 200) || null,
    representante_cargo: txt(f, "representante_cargo", 100) || null, representante_cpf: txt(f, "representante_cpf", 20) || null,
    lojas_mentoradas: txt(f, "lojas_mentoradas", 300) || null, email_contrato: txt(f, "email_contrato", 200).toLowerCase() || null,
    bonus: f.get("bonus") === "on", garantia: f.get("garantia") === "on",
  });
  if (e2) throw new Error(e2.message);
  return portal.id as string;
}

export type Venda = { portal_id: string; loja: string; plano_id: string | null; valor: number | null; pagamento_em: string | null; vendido_por: string | null; recebida_em: string | null; recebida_por: string | null; created_at: string };
export type Oportunidade = { portal_id: string; loja: string; plano: string | null; motivo: string; data: string };

export async function buscarComercial() {
  const [{ data: pas }, { data: portais }, { data: planos }] = await Promise.all([
    sb().from("passagens").select("portal_id, plano_id, valor, pagamento_em, vendido_por, recebida_em, recebida_por, created_at, portais(loja)").order("created_at", { ascending: false }).limit(200),
    sb().from("portais").select("id, loja, ativo, contratos(plano_id, inicio, fim, status)").eq("ativo", true),
    sb().from("planos").select("id, nome, tipo, meses, valor, vendendo").order("ordem"),
  ]);
  const vendas: Venda[] = (pas ?? []).map((p) => ({ ...(p as unknown as Venda), loja: ((Array.isArray(p.portais) ? p.portais[0] : p.portais) as { loja?: string } | null)?.loja ?? "" }));
  // Oportunidades: contrato que termina nos próximos 30 dias (renovação), Start no fim (upgrade para Gold), Gold no fim (upgrade para Premium).
  const limite = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const oportunidades: Oportunidade[] = [];
  for (const p of portais ?? []) {
    const cts = ((p.contratos ?? []) as { plano_id: string | null; inicio: string | null; fim: string | null; status: string }[]).filter((c) => c.status === "Ativo" && c.fim);
    for (const c of cts) {
      if (c.fim! <= limite) {
        const motivo = c.plano_id === "start" ? "Start terminando: upgrade para o Gold" : c.plano_id === "gold" ? "Gold terminando: upgrade para o Premium" : "Contrato terminando: renovação";
        oportunidades.push({ portal_id: p.id, loja: p.loja, plano: c.plano_id, motivo, data: c.fim! });
      }
    }
  }
  oportunidades.sort((a, b) => a.data.localeCompare(b.data));
  return { vendas, oportunidades, planos: (planos ?? []) as { id: string; nome: string; tipo: string; meses: number | null; valor: number | null; vendendo: boolean }[] };
}
