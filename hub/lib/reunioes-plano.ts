// A próxima reunião que a loja tem pelo plano contratado (Mapa da Jornada):
// Premium: diagnóstico, ajuste do mês 2 (~dia 50), revisão de 90 dias (~dia 105) e encerramento (~dia 175).
// Gold: diagnóstico e revisão de 90 dias (~dia 105). Start: só o diagnóstico; depois, os encontros em grupo.
// Os dias contam do início do contrato.

const MARCOS: Record<string, { dia: number; titulo: string }[]> = {
  premium: [{ dia: 12, titulo: "Diagnóstico" }, { dia: 50, titulo: "Ajuste do mês 2" }, { dia: 105, titulo: "Revisão de 90 dias" }, { dia: 175, titulo: "Encerramento" }],
  gold: [{ dia: 12, titulo: "Diagnóstico" }, { dia: 105, titulo: "Revisão de 90 dias" }],
  start: [{ dia: 12, titulo: "Diagnóstico" }],
};
export const NOME_PLANO: Record<string, string> = { premium: "Premium", gold: "Gold", start: "Start" };

const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso.slice(0, 10)}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const diaDe = (iso: string) => new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 10);

/**
 * O próximo encontro individual previsto pelo plano que ainda não aconteceu nem está marcado.
 * Um marco conta como feito ou marcado quando há reunião (não adiada) até 25 dias antes ou depois dele;
 * o diagnóstico conta como feito quando há reunião com "diagn" no título (ou a loja começou há mais de 45 dias).
 */
export function proximaPeloPlano(
  plano: string | null | undefined, inicio: string | null | undefined,
  reunioes: { data: string; titulo: string | null; selecionar?: string | null }[], hoje: string,
): { titulo: string; data: string } | null | "nenhuma" {
  const marcos = plano ? MARCOS[plano] : undefined;
  if (!marcos || !inicio) return null;
  const validas = reunioes.filter((r) => r.selecionar !== "Adiado");
  const temDiagnostico = validas.some((r) => /diagn/i.test(r.titulo ?? ""));
  for (const m of marcos) {
    const data = somarDias(inicio, m.dia);
    // Loja que começou há mais de 45 dias: o diagnóstico pode ter sido feito antes das reuniões irem para o Hub.
    if (m.titulo === "Diagnóstico") { if (temDiagnostico || inicio < somarDias(hoje, -45)) continue; return { titulo: m.titulo, data }; }
    const perto = validas.some((r) => Math.abs(Date.parse(`${diaDe(r.data)}T12:00:00Z`) - Date.parse(`${data}T12:00:00Z`)) <= 25 * 86_400_000);
    if (perto || data < somarDias(hoje, -25)) continue;
    return { titulo: m.titulo, data };
  }
  return "nenhuma";
}
