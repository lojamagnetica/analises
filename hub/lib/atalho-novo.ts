// Atalhos do Início que ficam verdes quando tem novidade ainda não aberta (a regra, sem banco; dá para testar).
// Rode com: node --experimental-strip-types lib/atalho-novo.test.ts

/** Tem novidade quando a atualização é mais nova que a última vez que a pessoa abriu o atalho (ou nunca abriu). */
export function temNovidade(atualizadoEm: string | null | undefined, visto: string | null | undefined) {
  if (!atualizadoEm) return false;
  if (!visto) return true;
  return new Date(atualizadoEm).getTime() > new Date(visto).getTime();
}

/** O endereço do atalho sem a parte depois do "?" (o Planeje leva o mês). */
export const chaveDoAtalho = (href: string) => href.split("?")[0];

const chaveVisto = (portalId: string, href: string) => `lm_atalho_visto:${portalId}:${chaveDoAtalho(href)}`;

/** Quando a pessoa abriu o atalho pela última vez, neste aparelho. */
export function lerVisto(portalId: string, href: string) {
  try { return localStorage.getItem(chaveVisto(portalId, href)); } catch { return null; }
}
export function marcarVisto(portalId: string, href: string) {
  const agora = new Date().toISOString();
  try { localStorage.setItem(chaveVisto(portalId, href), agora); } catch { /* sem armazenamento */ }
  return agora;
}
