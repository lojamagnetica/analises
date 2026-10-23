"use client";

import { Titulo } from "@/components/Titulo";

/** O módulo de Conteúdo antes da Análise do Perfil liberada. */
export function Trancado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <>
      <Titulo titulo={titulo} />
      <div className="card card-borda" style={{ ["--c" as string]: "var(--orange)", maxWidth: 640 }}>
        <div style={{ fontSize: 34 }}>🔒</div>
        <h2>Primeiro, a Análise do seu Perfil</h2>
        <p>{texto}</p>
        <p className="ajuda">Assim que ela for liberada, você recebe aqui: as correções do perfil, a sua semana de posts montada, os roteiros e o acompanhamento dos resultados.</p>
      </div>
    </>
  );
}
