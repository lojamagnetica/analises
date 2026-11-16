// Feriados nacionais: a loja costuma fechar, então o dia não conta como caixa faltando (vale para todas as lojas).
// Se a loja abriu e lançou, o lançamento vale normalmente. A mesma regra está no banco em feriado_nacional().

const FIXOS: Record<string, string> = {
  "01-01": "Confraternização Universal", "04-21": "Tiradentes", "05-01": "Dia do Trabalho", "09-07": "Independência",
  "10-12": "Nossa Senhora Aparecida", "11-02": "Finados", "11-15": "Proclamação da República", "11-20": "Consciência Negra", "12-25": "Natal",
};

/** Domingo de Páscoa (algoritmo de Meeus), em "AAAA-MM-DD". */
function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** O nome do feriado nacional daquele dia ("2026-11-02" → "Finados"), ou null. */
export function feriadoNacional(d: string): string | null {
  if (FIXOS[d.slice(5, 10)]) return FIXOS[d.slice(5, 10)];
  const p = pascoa(Number(d.slice(0, 4)));
  p.setUTCDate(p.getUTCDate() - 2);
  return p.toISOString().slice(0, 10) === d ? "Sexta-feira Santa" : null;
}

/** Dia em que a loja abre: não é domingo nem feriado nacional. */
export const diaDeLoja = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() !== 0 && !feriadoNacional(d);
