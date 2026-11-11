"use client";

// O que precisa de uma ação da Camilla ou da CS, num lugar só (usado na Caixa do dia): o que espera aprovação, os pedidos
// que chegaram das lojas (Fale com a Camilla) e as fases da jornada (Diagnóstico, Rota de 90 dias) paradas em uma ação da Camilla.
import { buscarParaAprovar, type ItemAprovar } from "@/lib/aprovar";
import { buscarCaixa, prazoTexto, resumo, aberta } from "@/lib/assistente";
import { buscarJornada, prazoDoItem, situacao } from "@/lib/jornada";
import { hoje } from "@/lib/formato";

export type ItemAcao = ItemAprovar & { atrasada?: boolean };
export type PrecisaDeAcao = { aprovar: ItemAcao[]; pedidos: ItemAcao[]; fases: ItemAcao[]; ativos: Map<string, string> };

export async function buscarPrecisaDeAcao(): Promise<PrecisaDeAcao> {
  const [{ itens, ativos }, caixa, jornada] = await Promise.all([buscarParaAprovar(), buscarCaixa().catch(() => []), buscarJornada().catch(() => [])]);

  // Pedidos das lojas esperando resposta (Dúvida, Pedido, Aviso ou Urgente), do mais atrasado para o mais novo.
  const pedidos: ItemAcao[] = caixa.filter((s) => aberta(s) && ativos.has(s.portal_id)).map((s) => {
    const p = prazoTexto(s);
    return { chave: `s${s.id}`, portal: s.portal_id, tipo: `Pedido da loja · ${s.tipo}`, titulo: `${resumo(s).slice(0, 140)} (${p.texto})`, quando: s.created_at, href: "/equipe/duvidas", atrasada: p.atrasada };
  }).sort((a, b) => Number(!!b.atrasada) - Number(!!a.atrasada));

  // Fases em que a próxima ação é da Camilla (Diagnóstico e Rota de 90 dias).
  const fases: ItemAcao[] = [];
  for (const c of jornada) {
    if (!ativos.has(c.id) || c.etapa < 2) continue;
    const s = situacao(c);
    if (!s.etapa || !/Camilla/.test(s.etapa.quem) || !s.proximo) continue;
    const prazo = prazoDoItem(c, s.proximo);
    fases.push({ chave: `f${c.id}`, portal: c.id, tipo: `Fase · ${s.etapa.nome}`, titulo: s.proximo.texto, quando: prazo, href: `/equipe/central/cliente?id=${c.id}`, atrasada: !!prazo && prazo < hoje() || s.foraDaJanela });
  }
  fases.sort((a, b) => Number(!!b.atrasada) - Number(!!a.atrasada) || (a.quando ?? "9").localeCompare(b.quando ?? "9"));
  return { aprovar: itens, pedidos, fases, ativos };
}
