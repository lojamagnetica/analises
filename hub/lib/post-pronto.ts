// Diz se os arquivos de um post estão completos: Reels com o vídeo e carrossel com todos os slides do roteiro.
type PostArquivos = { formato?: string | null; roteiro?: string | null; imagens?: { nome?: string; path?: string }[] | null };

/** Quantos slides o roteiro pede ("SLIDE 1 · …", "SLIDES 2 a 4 · …"); 0 quando não tem plano. */
export function slidesDoRoteiro(roteiro?: string | null): number {
  let n = 0;
  for (const l of (roteiro ?? "").split("\n")) {
    const m = l.match(/^\s*SLIDES?\s+(\d+)(?:\s*(?:a|-|até)\s*(\d+))?\s*·/i);
    if (m) n = Math.max(n, Number(m[2] ?? m[1]));
  }
  return n;
}

/** O que ainda falta nos arquivos do post (texto curto), ou null quando está pronto para postar. Sem arquivo nenhum também devolve null. */
export function faltaNoPost(p: PostArquivos): string | null {
  const arquivos = p.imagens ?? [];
  if (!arquivos.length) return null;
  const temVideo = arquivos.some((a) => /\.(mp4|mov|m4v|webm)$/i.test(a.nome || a.path || ""));
  if (p.formato === "Reels" && !temVideo) return "a capa está pronta, falta o vídeo";
  const slides = slidesDoRoteiro(p.roteiro);
  if (slides > arquivos.length) return `${arquivos.length} de ${slides} slides prontos`;
  return null;
}
