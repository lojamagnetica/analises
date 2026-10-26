"use client";

/** Botão discreto de excluir, sempre com confirmação. Tudo o que a loja cadastra precisa ter um. */
export function Excluir({ pergunta, fazer, aoFim, rotulo = "Excluir" }: { pergunta: string; fazer: () => Promise<unknown>; aoFim: () => void; rotulo?: string }) {
  return (
    <button type="button" className="link-loja" style={{ color: "var(--red)", fontSize: 13.5 }} onClick={async (e) => {
      e.preventDefault();
      if (!confirm(pergunta)) return;
      try { await fazer(); aoFim(); } catch (x) { alert((x as Error).message); }
    }}>{rotulo}</button>
  );
}
