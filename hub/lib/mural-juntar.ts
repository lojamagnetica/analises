// Junta o que mudou no mural com o que está no banco (vale para todas as lojas). Sem banco aqui (dá para testar).

/** As partes do mural guardadas por mês ou por dia: só o mês (ou o dia) que mudou é gravado. */
const POR_CHAVE = ["escala", "eventos", "metas_semana", "conhecimento"] as const;
const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** O que mudou de `antes` para `depois`, sobre o que está no banco agora (para não apagar o que mudou por fora,
 *  com a página aberta há tempo ou em outro aparelho). Sem banco aqui (dá para testar). */
export function juntarMural(banco: Record<string, unknown>, antes: Record<string, unknown>, depois: Record<string, unknown>, porChave: readonly string[] = POR_CHAVE) {
  const out: Record<string, unknown> = { ...banco };
  for (const k of new Set([...Object.keys(antes), ...Object.keys(depois)])) {
    if (igual(antes[k], depois[k])) continue;
    if (porChave.includes(k)) {
      const a = (antes[k] ?? {}) as Record<string, unknown>, d = (depois[k] ?? {}) as Record<string, unknown>;
      const atual = { ...((banco[k] ?? {}) as Record<string, unknown>) };
      for (const s of new Set([...Object.keys(a), ...Object.keys(d)])) {
        if (igual(a[s], d[s])) continue;
        if (d[s] === undefined || d[s] === null) delete atual[s]; else atual[s] = d[s];
      }
      out[k] = atual;
    } else out[k] = depois[k];
  }
  return out;
}

