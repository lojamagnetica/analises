"use client";

import { Titulo } from "@/components/Titulo";
import { FaleComACamilla } from "@/components/FaleComACamilla";
import { BASE } from "@/lib/config";

export default function PaginaFaleComACamilla() {
  return (
    <>
      <Titulo titulo="Fale com a Camilla" aba="Fale com a Camilla" />
      <FaleComACamilla />
      {/* O mesmo chat como aplicativo no celular, fora do portal. Link comum (sem o roteador) para abrir a tela própria do app. */}
      <details className="card mt" style={{ maxWidth: 820 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>📱 Use como aplicativo no celular</summary>
        <p className="mudo" style={{ margin: "8px 0" }}>
          O Fale com a Camilla também abre sozinho, direto na conversa, com o próprio ícone na tela do celular. O aviso chega quando a resposta sai.
        </p>
        <ol className="mudo" style={{ margin: "0 0 10px", paddingLeft: 20 }}>
          <li>No celular, toque em &quot;Abrir o aplicativo&quot; aqui embaixo.</li>
          <li><b>iPhone (Safari):</b> toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.</li>
          <li><b>Android (Chrome):</b> toque nos três pontinhos e depois em &quot;Adicionar à tela inicial&quot;.</li>
          <li>Abra pelo ícone novo e ligue os avisos.</li>
        </ol>
        <a className="btn p peq" href={`${BASE}/fale/`}>Abrir o aplicativo</a>
      </details>
    </>
  );
}
