/** Mostra um texto deixando os endereços (https://…) clicáveis. */
export function TextoComLinks({ texto }: { texto: string }) {
  const partes = texto.split(/(https?:\/\/[^\s]+)/g);
  return <>{partes.map((p, i) => /^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>{p.replace(/^https?:\/\/(www\.)?/, "").slice(0, 38)}…</a> : <span key={i}>{p}</span>)}</>;
}
