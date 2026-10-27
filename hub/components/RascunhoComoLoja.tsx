"use client";

import { useHub } from "@/lib/hub";

/** Equipe no "Ver como a loja": avisa que o rascunho está escondido e oferece sair do modo loja. */
export function RascunhoComoLoja() {
  const hub = useHub();
  if (!hub.equipe || !hub.comoLoja) return null;
  return (
    <div className="aviso mb">
      Você está vendo o Hub como a loja vê. Este conteúdo ainda é rascunho e só aparece para a equipe.{" "}
      <button type="button" className="btn p peq" style={{ marginLeft: 8 }} onClick={() => hub.sairComoLoja()}>Sair do modo loja</button>
    </div>
  );
}
