// Regras puras da sincronização (sem acesso a rede), separadas para teste.

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type PortalNomes = { id: string; nomes: string[] };

/** Devolve o portal cujo nome aparece no título (o nome mais longo vence) e o nome encontrado. */
export function acharPortal(titulo: string, portais: PortalNomes[]) {
  const t = normalizar(titulo);
  let melhor: { id: string; nome: string } | null = null;
  for (const p of portais) {
    for (const nome of p.nomes) {
      const n = normalizar(nome);
      if (n.length < 2) continue;
      if (new RegExp(`(^|[^a-z0-9])${escapar(n)}($|[^a-z0-9])`).test(t) && (!melhor || n.length > melhor.nome.length)) {
        melhor = { id: p.id, nome: n };
      }
    }
  }
  return melhor;
}

/** Tira o nome da loja do título e limpa separadores: "Reunião - Shiê" → "Reunião". */
export function temaDoTitulo(titulo: string, nomeNormalizado: string) {
  const original = titulo.normalize("NFC");
  const semAcento = normalizar(original);
  const i = semAcento.indexOf(nomeNormalizado);
  let tema = original;
  if (i >= 0) {
    // As posições batem porque normalizar() não muda o tamanho das letras comuns; se mudar, usa o título inteiro.
    if (normalizar(original.slice(i, i + nomeNormalizado.length)) === nomeNormalizado) {
      tema = original.slice(0, i) + original.slice(i + nomeNormalizado.length);
    }
  }
  tema = tema.replace(/\s*[-–—|:×x]\s*$/i, "").replace(/^\s*[-–—|:×]\s*/, "").replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();
  return tema || "Reunião individual";
}
