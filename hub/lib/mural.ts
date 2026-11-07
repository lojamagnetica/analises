"use client";

// Mural da loja: as folhas que vão na parede (missão/visão/valores, versículo, metas da semana e calendário).
// O texto de cada loja fica no banco (nada de loja no código). P.A. e TKM da semana são digitáveis.
import { supabaseBrowser } from "@/lib/supabase/client";

export type CorEvento = { cor: string; nome: string };
export type DadosMural = {
  missao: string; visao: string;
  /** Um valor por linha, do jeito que vai no mural. */
  valores: string[];
  versiculo: string; versiculo_ref: string;
  /** Meta de peças por atendimento e de ticket médio (R$) que valem para a loja. */
  pa: number; tkm: number;
  /** Cores da faixa 1, 2 e 3 do mural, do texto e do símbolo (da marca da loja). */
  cores: { f1: string; f2: string; f3: string; texto: string; destaque: string; claro: string; fundo: string; suave: string; tinta: string };
  /** Símbolos da marca (imagens pequenas, data URL). Só os símbolos, sem o nome da loja. */
  simbolo: string; simbolo2: string;
  /** O cartaz "Nossos valores": cada valor com a frase e o que se faz no dia a dia. */
  cartaz: { titulo: string; rodape: string; simbolos: string[]; itens: { pre: string; nome: string; frase: string; pontos: string[] }[] };
  /** Eventos por dia do mês (AAAA-MM-DD → lista de {t, c}); c é o índice da cor. */
  eventos: Record<string, { t: string; c: number }[]>;
  legenda: CorEvento[];
};

export const CORES_EVENTO = ["#2E9D57", "#F2C230", "#D9332B", "#1F5FBF", "#8A3FA8"];
export const LEGENDA_PADRAO: CorEvento[] = ["Ação da loja", "Data comercial", "Evento externo", "Reunião do time", "Outros"].map((nome, i) => ({ cor: CORES_EVENTO[i], nome }));

export const muralVazio = (): DadosMural => ({
  missao: "", visao: "", valores: [], versiculo: "", versiculo_ref: "",
  pa: 2.5, tkm: 800,
  cores: { f1: "#B9A592", f2: "#4F2110", f3: "#F5F0EA", texto: "#1B1B1B", destaque: "#7A5640", claro: "#F3ECE4", fundo: "#FBF7F2", suave: "#EBDCCB", tinta: "#3A2419" },
  simbolo: "", simbolo2: "", cartaz: { titulo: "Nossos valores", rodape: "", simbolos: [], itens: [] }, eventos: {}, legenda: LEGENDA_PADRAO,
});
export const completarMural = (d?: Partial<DadosMural>): DadosMural => {
  const v = muralVazio();
  return { ...v, ...d, cartaz: { ...v.cartaz, ...(d?.cartaz ?? {}) }, cores: { ...v.cores, ...(d?.cores ?? {}) }, legenda: d?.legenda?.length ? d.legenda : v.legenda, eventos: d?.eventos ?? {}, valores: d?.valores ?? [] };
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

/** Bolinha da semana: verde = bateu P.A. e TKM; amarela = bateu um; vermelha = nenhum; null = sem venda na semana. */
export function bolinha(pa: number | null, tkm: number | null, metaPa: number, metaTkm: number): "verde" | "amarela" | "vermelha" | null {
  if (pa == null || tkm == null) return null;
  const n = (pa >= metaPa ? 1 : 0) + (tkm >= metaTkm ? 1 : 0);
  return n === 2 ? "verde" : n === 1 ? "amarela" : "vermelha";
}
