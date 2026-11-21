"use client";

// Ficha da loja: tudo de uma loja num lugar só, para a CS e a Camilla (resumo, histórico, jornada, reuniões e acesso).
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { metaDoPlano, type DadosPlano } from "@/lib/plano-mes";
import { painelCs, type LojaCs } from "@/lib/cs";

export type FichaLoja = {
  portal: { id: string; loja: string; responsavel: string | null; whatsapp: string | null; tipo: string | null; entrega: string | null; cs_acompanha: boolean; ativo: boolean; lojas: string[] | null };
  ficha: { foco_curto: string | null; resultado_n1: string | null; indicador: string | null; termometro: string | null; etapa: number | null; situacao: string | null; data_diagnostico: string | null } | null;
  acessos: { nome: string | null; email: string | null; ultimo_acesso: string | null; so_caixa: boolean }[];
  mes: { vendido: number; vendas: number; pecas: number; dias: number; meta: number | null };
  proxima: { titulo: string; data: string } | null;
  ultima: { titulo: string; data: string } | null;
  combinados: { id: string; texto: string; prazo: string | null; quem: string; status: string }[];
  /** Combinados que o agente ou a importação deixaram em rascunho: a Camilla revisa antes de a loja ver. */
  rascunhos: FichaLoja["combinados"];
  lembretes: { id: string; texto: string; quando: string | null }[];
  leitura: { semana: string; publicada: boolean } | null;
  alertas: LojaCs["alertas"];
};

export async function buscarFicha(id: string): Promise<FichaLoja | null> {
  const sb = supabaseBrowser();
  const mes = hoje().slice(0, 7);
  const [{ data: portal }, { data: ficha }, { data: acessos }, { data: caixa }, { data: plano }, { data: reunioes }, { data: combinados }, { data: lembretes }, { data: leitura }] = await Promise.all([
    sb.from("portais").select("id, loja, responsavel, whatsapp, tipo, entrega, cs_acompanha, ativo, lojas").eq("id", id).maybeSingle(),
    sb.from("fichas").select("foco_curto, resultado_n1, indicador, termometro, etapa, situacao, data_diagnostico").eq("portal_id", id).maybeSingle(),
    sb.from("perfis").select("nome, email, ultimo_acesso, so_caixa").eq("portal_id", id),
    sb.from("loja_caixa").select("faturamento, vendas, pecas").eq("portal_id", id).gte("dia", `${mes}-01`),
    sb.from("loja_plano_mes").select("dados").eq("portal_id", id).eq("mes", mes).maybeSingle(),
    sb.from("reunioes").select("titulo, data, status").eq("portal_id", id).order("data"),
    sb.from("loja_combinados").select("id, texto, prazo, quem, status").eq("portal_id", id).in("status", ["aberto", "rascunho"]).order("prazo", { ascending: true }),
    sb.from("equipe_lembretes").select("id, texto, quando").eq("portal_id", id).eq("feito", false).order("quando"),
    sb.from("loja_leituras").select("semana, publicada").eq("portal_id", id).order("semana", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!portal) return null;
  const cx = (caixa ?? []) as { faturamento: number; vendas: number; pecas: number }[];
  const agora = new Date().toISOString();
  const rs = (reunioes ?? []) as { titulo: string; data: string; status: string }[];
  // Os alertas do dia vêm do mesmo painel do Faça agora (só para as lojas acompanhadas).
  const alertas = portal.cs_acompanha ? ((await painelCs().catch(() => null))?.lojas.find((l) => l.id === id)?.alertas ?? []) : [];
  return {
    portal: portal as FichaLoja["portal"],
    ficha: (ficha ?? null) as FichaLoja["ficha"],
    acessos: (acessos ?? []) as FichaLoja["acessos"],
    mes: {
      vendido: cx.reduce((s, c) => s + Number(c.faturamento || 0), 0), vendas: cx.reduce((s, c) => s + (c.vendas || 0), 0), pecas: cx.reduce((s, c) => s + (c.pecas || 0), 0), dias: cx.length,
      meta: plano?.dados ? metaDoPlano(plano.dados as Partial<DadosPlano>) : null,
    },
    proxima: rs.find((r) => r.data >= agora) ?? null,
    ultima: [...rs].reverse().find((r) => r.data < agora) ?? null,
    combinados: ((combinados ?? []) as FichaLoja["combinados"]).filter((c) => c.status === "aberto"),
    rascunhos: ((combinados ?? []) as FichaLoja["combinados"]).filter((c) => c.status === "rascunho"),
    lembretes: (lembretes ?? []) as FichaLoja["lembretes"],
    leitura: (leitura ?? null) as FichaLoja["leitura"],
    alertas,
  };
}
