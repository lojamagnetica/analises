// Datas sempre no horário de Recife (UTC−3, sem horário de verão).
export const FUSO = "America/Recife";

export function dataHora(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso)).replace(".", "");
}

export function dataCurta(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export function haQuanto(iso: string | null | undefined) {
  if (!iso) return "nunca";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

export function diasDesde(iso: string | null | undefined) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/** "2026-10-06T10:00" digitado no formulário → ISO no fuso de Recife. */
export function localParaIso(valor: string) {
  return new Date(`${valor}:00-03:00`).toISOString();
}

/** ISO → valor de <input type="datetime-local"> no fuso de Recife. */
export function isoParaLocal(iso: string) {
  const d = new Date(new Date(iso).getTime() - 3 * 3_600_000);
  return d.toISOString().slice(0, 16);
}

export function mesAtual() {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: FUSO, month: "numeric" }).format(new Date())) - 1;
}

export const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
