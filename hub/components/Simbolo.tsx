// Símbolo da magnética: dois ímãs frente a frente, sempre numa cor só (herda a cor do texto).
export function Simbolo({ tamanho }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true">
      <path d="M47 26 H38 A24 24 0 0 0 38 74 H47" fill="none" stroke="currentColor" strokeWidth="14" />
      <path d="M53 26 H62 A24 24 0 0 1 62 74 H53" fill="none" stroke="currentColor" strokeWidth="14" />
    </svg>
  );
}
