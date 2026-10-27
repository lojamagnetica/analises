// Portal de Consultoria: os meses, as frentes, as entregas mês a mês e as ações da quinzena.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";

export type MesConsultoria = { mes: string; nome: string; foco: string };
export type Frente = { n: number; nome: string; oque: string };
export type DadosConsultoria = {
  duracao: number;
  inicio: string;
  fim: string;
  cidade?: string;
  instagram?: string[];
  meses: MesConsultoria[];
  encerramento?: string;
  visita?: string;
  frentes: Frente[];
  como: { titulo: string; texto: string }[];
  evolucao?: Evolucao;
};

/** "Do diagnóstico até aqui": cada ponto com o antes, o que já mudou e o próximo passo. */
export const STATUS_EVOLUCAO = ["Feito", "Em andamento", "A construir", "Próximo ano"] as const;
export type ItemEvolucao = {
  id: string; tema: string; titulo: string; antes: string; hoje: string; proximo: string; quando: string;
  status: (typeof STATUS_EVOLUCAO)[number];
};
export type Evolucao = { resumo: string; liberado: boolean; itens: ItemEvolucao[] };
export type Entrega = { id: string; ordem: number; mes: string; frente: number; entrega: string; status: string; material_url: string | null; loja: string | null };
export type Acao = { id: string; acao: string; quem: string | null; prazo: string | null; tipo: string; status: string; obs: string | null; loja: string | null };

export const STATUS_ENTREGA = ["A fazer", "Em andamento", "Entregue"];
export const STATUS_ACAO = ["A fazer", "Fazendo", "Feito"];

export async function buscarConsultoria(portalId: string) {
  const sb = supabaseBrowser();
  const [{ data: c }, { data: entregas }, { data: acoes }, { data: materiais }] = await Promise.all([
    sb.from("consultoria").select("dados").eq("portal_id", portalId).maybeSingle(),
    sb.from("consultoria_entregas").select("id, ordem, mes, frente, entrega, status, material_url, loja").eq("portal_id", portalId).order("ordem"),
    sb.from("consultoria_acoes").select("id, acao, quem, prazo, tipo, status, obs, loja").eq("portal_id", portalId).order("prazo", { nullsFirst: false }),
    sb.from("consultoria_materiais").select("id, entrega_id, liberado").eq("portal_id", portalId),
  ]);
  return {
    dados: (c?.dados as DadosConsultoria | undefined) ?? null,
    entregas: (entregas ?? []) as Entrega[],
    acoes: (acoes ?? []) as Acao[],
    // Material do Hub ligado a cada entrega (a loja só recebe os liberados).
    materiais: (materiais ?? []) as { id: string; entrega_id: string | null; liberado: boolean }[],
  };
}

/** Em que mês da consultoria estamos (1 = mês do início). Passa da duração no mês de encerramento. */
export function mesDaConsultoria(inicio: string) {
  const [a, m] = inicio.split("-").map(Number);
  const [ha, hm] = hoje().split("-").map(Number);
  return (ha - a) * 12 + (hm - m) + 1;
}

export async function entregaStatus(id: string, status: string) {
  if (!STATUS_ENTREGA.includes(status)) return;
  await supabaseBrowser().from("consultoria_entregas").update({ status }).eq("id", id);
}

/** Em portais com mais de uma loja: de qual loja é o item (null = das duas). */
export async function mudarLoja(tabela: "consultoria_entregas" | "consultoria_acoes", id: string, loja: string | null) {
  await supabaseBrowser().from(tabela).update({ loja }).eq("id", id);
}

/** O item aparece no filtro escolhido? ("" = todas as lojas; item sem loja = das duas). */
export const daLoja = (item: { loja: string | null }, filtro: string) => !filtro || !item.loja || item.loja === filtro;

const sbx = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

/** Estrutura inicial de uma consultoria nova (a equipe completa depois). */
export function estruturaPadrao(inicio: string, duracao = 6): DadosConsultoria {
  const NOMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [a, m] = inicio.split("-").map(Number);
  const meses = Array.from({ length: duracao }, (_, i) => {
    const nome = NOMES[(m - 1 + i) % 12];
    return { mes: nome.slice(0, 3), nome, foco: "" };
  });
  const fim = new Date(Date.UTC(a, m - 1 + duracao, Number(inicio.slice(8, 10)) || 1)).toISOString().slice(0, 10);
  return {
    duracao, inicio, fim, meses, frentes: [], encerramento: "", visita: "",
    como: [
      { titulo: "A consultoria", texto: `${duracao} meses, as frentes andando juntas, cada entrega com mês certo.` },
      { titulo: "Como falar comigo", texto: "" },
      { titulo: "Quem cuida de quê", texto: "" },
    ],
  };
}

export const salvarEstrutura = (portalId: string, dados: DadosConsultoria) =>
  ok(sbx().from("consultoria").upsert({ portal_id: portalId, dados, updated_at: new Date().toISOString() }));

export const acaoCriar = (portalId: string, a: Omit<Acao, "id" | "status" | "obs"> & { obs?: string | null }) =>
  ok(sbx().from("consultoria_acoes").insert({ portal_id: portalId, ...a }));
export const acaoEditar = (id: string, a: Partial<Omit<Acao, "id">>) => ok(sbx().from("consultoria_acoes").update(a).eq("id", id));
export const acaoRemover = (id: string) => ok(sbx().from("consultoria_acoes").delete().eq("id", id));

export const entregaCriar = (portalId: string, e: Omit<Entrega, "id" | "status" | "material_url"> & { material_url?: string | null }) =>
  ok(sbx().from("consultoria_entregas").insert({ portal_id: portalId, ...e }));
export const entregaEditar = (id: string, e: Partial<Omit<Entrega, "id">>) => ok(sbx().from("consultoria_entregas").update(e).eq("id", id));

export async function entregaRemover(id: string) {
  await supabaseBrowser().from("consultoria_entregas").delete().eq("id", id);
}

export async function acaoStatus(id: string, status: string) {
  if (!STATUS_ACAO.includes(status)) return;
  await supabaseBrowser().from("consultoria_acoes").update({ status }).eq("id", id);
}

export const classeStatus = (s: string) =>
  s === "Entregue" || s === "Feito" ? "feito" : s === "Em andamento" || s === "Fazendo" ? "andamento" : "espera";
