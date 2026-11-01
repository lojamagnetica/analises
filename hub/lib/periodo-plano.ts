// Datas de cada mês do Plano de Ação de 90 dias.
// Com o plano começando no dia 1 (ex.: 01/11), cada mês é um mês do calendário. Começando em outro dia (ex.: 09/10), são blocos de 30 dias.
import { dia } from "@/lib/formato";

const DIA_MS = 86_400_000;
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
const doTempo = (d: string) => Date.parse(`${d.slice(0, 10)}T12:00:00Z`);
const curto = (d: string) => dia(d).slice(0, 5);

/** Primeiro e último dia do mês `m` (1, 2 ou 3) do plano, como "AAAA-MM-DD". Sem início, devolve null. */
export function intervaloDoMes(m: number, planoInicio: string | null | undefined, inicioLoja?: string | null) {
  const base = planoInicio || inicioLoja;
  if (!base) return null;
  const [a, mes, d] = base.slice(0, 10).split("-").map(Number);
  if (d === 1) {
    const t = Date.UTC(a, mes - 1 + (m - 1), 1, 12);
    const fim = Date.UTC(a, mes - 1 + m, 0, 12);
    return { de: ymd(t), ate: ymd(fim) };
  }
  const de = doTempo(base) + (m - 1) * 30 * DIA_MS;
  return { de: ymd(de), ate: ymd(de + 29 * DIA_MS) };
}

/** A revisão de 90 dias: do dia 90 ao dia 99 depois do início do plano (ex.: plano que começa em 01/11, revisão de 30/01 a 08/02). */
export function periodoRevisao(planoInicio: string | null | undefined, inicioLoja?: string | null) {
  const base = planoInicio || inicioLoja;
  if (!base) return null;
  const de = doTempo(base) + 90 * DIA_MS;
  return `${curto(ymd(de))} a ${curto(ymd(de + 9 * DIA_MS))}`;
}

/** "01/11 a 30/11" para escrever ao lado do nome do mês. O bônus (m = 4) é a revisão de 90 dias. */
export function periodoDoMes(m: number, planoInicio: string | null | undefined, inicioLoja?: string | null) {
  if (m === 4) return periodoRevisao(planoInicio, inicioLoja);
  const i = intervaloDoMes(m, planoInicio, inicioLoja);
  return i ? `${curto(i.de)} a ${curto(i.ate)}` : null;
}
