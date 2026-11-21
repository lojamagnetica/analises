"use client";

// Régua "Pronta para a Claudia": o que precisa estar completo antes de a loja passar para o acompanhamento da CS.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";

export type ItemPronta = { chave: string; rotulo: string; ok: boolean };
export type Pronta = { itens: ItemPronta[]; feitos: number; total: number; falta: string[] };

export async function buscarProntas(ids?: string[]): Promise<Map<string, Pronta>> {
  const sb = supabaseBrowser();
  // Sem filtro por loja: são tabelas pequenas, e a régua roda para todas de uma vez.
  const so = (l: { portal_id: string }[] | null) => (ids ? (l ?? []).filter((x) => ids.includes(x.portal_id)) : (l ?? []));
  const [{ data: portais }, { data: perfis }, { data: equipe }, { data: caixa }, { data: diag }, { data: comb }, { data: reun }] = await Promise.all([
    ids ? sb.from("portais").select("id, entrega, sem_equipe").in("id", ids) : sb.from("portais").select("id, entrega, sem_equipe").eq("ativo", true),
    sb.from("perfis").select("portal_id").not("portal_id", "is", null),
    sb.from("loja_equipe").select("portal_id"),
    sb.from("loja_caixa").select("portal_id").gte("dia", somarDias(hoje(), -7)),
    sb.from("loja_diagnostico").select("portal_id").eq("status", "liberada"),
    sb.from("loja_combinados").select("portal_id, quem, prazo").eq("status", "aberto"),
    sb.from("reunioes").select("portal_id").gte("data", new Date().toISOString()),
  ]);
  const tem = (lista: { portal_id: string }[] | null, id: string) => so(lista).some((x) => x.portal_id === id);
  const cb = (comb ?? []) as { portal_id: string; quem: string; prazo: string | null }[];
  const mapa = new Map<string, Pronta>();
  ((portais ?? []) as { id: string; entrega: string | null; sem_equipe: boolean | null }[]).forEach((p) => {
    const itens: ItemPronta[] = [
      { chave: "portal", rotulo: "Portal entregue", ok: p.entrega === "entregue" },
      { chave: "acesso", rotulo: "A loja tem acesso ao Hub", ok: tem(perfis as { portal_id: string }[], p.id) },
      { chave: "equipe", rotulo: "Equipe cadastrada", ok: !!p.sem_equipe || tem(equipe as { portal_id: string }[], p.id) },
      { chave: "caixa", rotulo: "Caixa lançado nos últimos 7 dias", ok: tem(caixa as { portal_id: string }[], p.id) },
      { chave: "diag", rotulo: "Diagnóstico liberado", ok: tem(diag as { portal_id: string }[], p.id) },
      { chave: "combinados", rotulo: "Combinados da loja com prazo", ok: cb.some((c) => c.portal_id === p.id && c.quem === "loja" && !!c.prazo) },
      { chave: "reuniao", rotulo: "Próxima reunião marcada", ok: tem(reun as { portal_id: string }[], p.id) },
      { chave: "devendo", rotulo: "Nada seu atrasado com a loja", ok: !cb.some((c) => c.portal_id === p.id && c.quem === "camilla" && !!c.prazo && c.prazo < hoje()) },
    ];
    mapa.set(p.id, { itens, feitos: itens.filter((i) => i.ok).length, total: itens.length, falta: itens.filter((i) => !i.ok).map((i) => i.rotulo) });
  });
  return mapa;
}
