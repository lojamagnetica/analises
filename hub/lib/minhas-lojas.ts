"use client";

// Minhas lojas: a lista única das clientes (junta o Painel dos portais, a Jornada das clientes e a Gestão de Clientes).
import { supabaseBrowser } from "@/lib/supabase/client";
import { buscarJornada, situacao, type ClienteJornada } from "@/lib/jornada";
import { painelCs } from "@/lib/cs";
import { foiConversa } from "@/lib/contato-resultado";
import { semanaDe } from "@/lib/leitura";

export type LinhaLoja = {
  id: string; loja: string; responsavel: string | null; tipo: string; etapa: number; termometro: string | null; dia: number | null;
  acompanhada: boolean; entrega: string | null; temAcesso: boolean; ultimoAcesso: string | null; ultimaConversa: string | null;
  caixaSemana: number; proxima: string | null; alertas: number; graves: number; atrasoJornada: boolean; proximoPasso: string | null;
};

export async function buscarMinhasLojas(): Promise<{ lojas: LinhaLoja[]; ex: { id: string; loja: string }[] }> {
  const sb = supabaseBrowser();
  const [jornada, { data: portais }, { data: perfis }, { data: contatos }, { data: caixa }, { data: reunioes }, { data: ex }, painel] = await Promise.all([
    buscarJornada(),
    sb.from("portais").select("id, cs_acompanha, entrega").eq("ativo", true),
    sb.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
    sb.from("cs_contatos").select("portal_id, feito_em, resultado").gte("feito_em", new Date(Date.now() - 90 * 86_400_000).toISOString()).order("feito_em", { ascending: false }),
    sb.from("loja_caixa").select("portal_id, dia").gte("dia", semanaDe()),
    sb.from("reunioes").select("portal_id, data").gte("data", new Date().toISOString()).order("data"),
    sb.from("portais").select("id, loja").eq("ativo", false).order("loja"),
    painelCs().catch(() => null),
  ]);
  const lojas = (jornada as ClienteJornada[]).filter((c) => c.tipo !== "Curso").map((c) => {
    const p = (portais ?? []).find((x) => x.id === c.id);
    const acessos = (perfis ?? []).filter((x) => x.portal_id === c.id);
    const s = situacao(c);
    const al = painel?.lojas.find((l) => l.id === c.id)?.alertas ?? [];
    return {
      id: c.id, loja: c.loja, responsavel: c.responsavel, tipo: c.tipo, etapa: c.etapa, termometro: c.termometro, dia: c.dia,
      acompanhada: !!p?.cs_acompanha, entrega: (p?.entrega as string | null) ?? null, temAcesso: acessos.length > 0,
      ultimoAcesso: acessos.map((x) => x.ultimo_acesso as string | null).filter(Boolean).sort().reverse()[0] ?? null,
      ultimaConversa: (contatos ?? []).find((x) => x.portal_id === c.id && foiConversa(x))?.feito_em ?? null,
      caixaSemana: new Set((caixa ?? []).filter((x) => x.portal_id === c.id).map((x) => x.dia)).size,
      proxima: (reunioes ?? []).find((r) => r.portal_id === c.id)?.data ?? null,
      alertas: al.length, graves: al.filter((a) => a.grave).length, atrasoJornada: s.alerta, proximoPasso: s.proximo?.texto ?? null,
    } as LinhaLoja;
  });
  return { lojas, ex: (ex ?? []) as { id: string; loja: string }[] };
}
