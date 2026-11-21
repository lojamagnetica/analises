"use client";

// Mural da loja: as folhas que vão na parede (missão/visão/valores, versículo, metas da semana e calendário).
// O texto de cada loja fica no banco (nada de loja no código). P.A. e TKM da semana são digitáveis.
import { supabaseBrowser } from "@/lib/supabase/client";
import type { EscalaMes } from "@/lib/escala";

export type CorEvento = { cor: string; nome: string };
export type DadosMural = {
  missao: string; visao: string;
  /** Um valor por linha, do jeito que vai no mural. */
  valores: string[];
  versiculo: string; versiculo_ref: string;
  /** Meta de peças por atendimento e de ticket médio (R$) que valem para a loja. */
  pa: number; tkm: number;
  /** Metas da semana: com mais de uma loja, mostra as vendedoras de todas as lojas na mesma folha. */
  metas_todas?: boolean;
  /** Meta da semana de cada vendedora (R$), escrita pela equipe a partir do caixa: segunda-feira da semana (AAAA-MM-DD) → id da pessoa → meta. Só a semana 1 sai calculada pelo plano; as outras saem em branco até a equipe preencher. */
  metas_semana?: Record<string, Record<string, number>>;
  /** Mensagem motivacional de cada semana (segunda-feira AAAA-MM-DD → texto). Sem texto escrito, o Hub mostra uma sugestão pronta para a loja trocar. */
  mensagens?: Record<string, string>;
  /** Cores da faixa 1, 2 e 3 do mural, do texto e do símbolo (da marca da loja). */
  cores: { f1: string; f2: string; f3: string; texto: string; destaque: string; claro: string; fundo: string; suave: string; tinta: string };
  /** Símbolos da marca (imagens pequenas, data URL). Só os símbolos, sem o nome da loja. */
  simbolo: string; simbolo2: string;
  /** O cartaz "Nossos valores": cada valor com a frase e o que se faz no dia a dia. */
  cartaz: { titulo: string; rodape: string; simbolos: string[]; itens: { pre: string; nome: string; frase: string; pontos: string[] }[] };
  /** Eventos por dia do mês (AAAA-MM-DD → lista de {t, c}); c é o índice da cor. */
  eventos: Record<string, { t: string; c: number }[]>;
  legenda: CorEvento[];
  /** Dia do conhecimento, por mês (AAAA-MM): os temas que a gestão definiu e, por semana, o tema sorteado e quem apresenta. */
  conhecimento: Record<string, Conhecimento>;
  /** Escala do mês (AAAA-MM): se a loja abre no domingo e, por pessoa, entrada, saída, almoço e o código de cada dia (lib/escala.ts). */
  escala?: Record<string, EscalaMes>;
};
export type Conhecimento = { temas: string[]; semanas: Record<string, { tema: string; pessoa: string }> };

export const CORES_EVENTO = ["#2E9D57", "#F2C230", "#D9332B", "#1F5FBF", "#8A3FA8"];
export const LEGENDA_PADRAO: CorEvento[] = ["Ação da loja", "Data comercial", "Evento externo", "Reunião do time", "Outros"].map((nome, i) => ({ cor: CORES_EVENTO[i], nome }));

export const muralVazio = (): DadosMural => ({
  missao: "", visao: "", valores: [], versiculo: "", versiculo_ref: "",
  pa: 2.5, tkm: 800,
  cores: { f1: "#B9A592", f2: "#4F2110", f3: "#F5F0EA", texto: "#1B1B1B", destaque: "#7A5640", claro: "#F3ECE4", fundo: "#FBF7F2", suave: "#EBDCCB", tinta: "#3A2419" },
  simbolo: "", simbolo2: "", cartaz: { titulo: "Nossos valores", rodape: "", simbolos: [], itens: [] }, eventos: {}, legenda: LEGENDA_PADRAO, conhecimento: {},
});
export const completarMural = (d?: Partial<DadosMural>): DadosMural => {
  const v = muralVazio();
  return { ...v, ...d, cartaz: { ...v.cartaz, ...(d?.cartaz ?? {}) }, cores: { ...v.cores, ...(d?.cores ?? {}) }, legenda: d?.legenda?.length ? d.legenda : v.legenda, eventos: d?.eventos ?? {}, valores: d?.valores ?? [], conhecimento: d?.conhecimento ?? {}, escala: d?.escala ?? {} };
};

export async function buscarMural(portalId: string, loja: string) {
  const { data } = await supabaseBrowser().from("loja_mural").select("dados").eq("portal_id", portalId).eq("loja", loja).maybeSingle();
  return completarMural(data?.dados as Partial<DadosMural> | undefined);
}
export async function salvarMural(portalId: string, loja: string, dados: DadosMural) {
  const { error } = await supabaseBrowser().from("loja_mural").upsert({ portal_id: portalId, loja, dados, updated_at: new Date().toISOString() }, { onConflict: "portal_id,loja" });
  if (error) throw new Error(error.message);
}

/** As semanas (linhas) de um mês, de segunda a domingo; null onde o dia não é do mês. */
export function gradeDoMes(mes: string): (string | null)[][] {
  const [a, m] = mes.split("-").map(Number);
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;
  const celulas: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: dias }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`)];
  while (celulas.length % 7) celulas.push(null);
  return Array.from({ length: celulas.length / 7 }, (_, i) => celulas.slice(i * 7, i * 7 + 7));
}

/** As semanas do Dia do conhecimento: as segundas-feiras do mês (a semana vai de segunda a domingo). */
export const semanasDoMes = (mes: string) => gradeDoMes(mes).map((s) => s[0]).filter((x): x is string => !!x);

/** Sorteio do mês: embaralha os temas e as pessoas e distribui uma dupla por semana (as pessoas se revezam se forem menos que as semanas). */
export function sortear(semanas: string[], temas: string[], pessoas: string[]) {
  const mistura = <T,>(l: T[]) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const t = mistura(temas.filter((x) => x.trim())), p = mistura(pessoas);
  return Object.fromEntries(semanas.map((s, i) => [s, { tema: t[i] ?? "", pessoa: p.length ? p[i % p.length] : "" }]));
}

/** Bolinha da semana: verde = bateu P.A. e TKM; amarela = bateu um; vermelha = nenhum; null = sem venda na semana. */
export function bolinha(pa: number | null, tkm: number | null, metaPa: number, metaTkm: number): "verde" | "amarela" | "vermelha" | null {
  if (pa == null || tkm == null) return null;
  const n = (pa >= metaPa ? 1 : 0) + (tkm >= metaTkm ? 1 : 0);
  return n === 2 ? "verde" : n === 1 ? "amarela" : "vermelha";
}

/** Sugestões de mensagem motivacional da semana (base para a loja trocar). Uma por semana, em rodízio. Texto sem dados de loja. */
const MENSAGENS = [
  "Semana nova, meta nova. Cada atendimento começa com um sorriso e termina com uma cliente que quer voltar. Hoje a gente vende a segunda peça e fecha o caixa no Hub.",
  "A meta da semana é do time inteiro. Cada uma faz a sua parte: atender bem, oferecer o look completo e chamar a carteira. Quando uma vende, a loja inteira ganha.",
  "Quem cuida da cliente hoje vende amanhã. Esta semana, antes de abrir, separe 5 clientes da sua carteira e chame cada uma pelo nome.",
  "Vender bem é ouvir antes de mostrar. Nesta semana, pergunte a ocasião da cliente e monte o look para ela, não só a peça que ela entrou procurando.",
  "Uma semana forte se faz um dia de cada vez. Comece o dia olhando a meta, termine o dia com o caixa lançado e leve o aprendizado para amanhã.",
];
export function sugerirMensagem(semana: string, pa?: number, tkm?: number) {
  const n = Math.floor(new Date(`${semana}T12:00:00Z`).getTime() / 604800000);
  const base = MENSAGENS[((n % MENSAGENS.length) + MENSAGENS.length) % MENSAGENS.length];
  return pa && tkm ? `${base}\nNossa meta: P.A. de ${pa.toLocaleString("pt-BR")} e ticket médio de R$ ${tkm.toLocaleString("pt-BR")}.` : base;
}
