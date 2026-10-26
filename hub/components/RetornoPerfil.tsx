"use client";

import type { Letra } from "@/lib/pessoas";
import { RETORNO_PERFIL } from "@/lib/perfil-pessoa";

/** O retorno do teste para a própria pessoa: perfil, diferenciais, desafios e como usar a seu favor. */
export function RetornoPerfil({ nome, letra, segunda }: { nome: string; letra: Letra; segunda: Letra | null }) {
  const r = RETORNO_PERFIL[letra];
  const bloco = (titulo: string, itens: string[], cor: string) => (
    <div className="card card-borda mb" style={{ ["--c" as string]: cor }}>
      <h3 style={{ marginTop: 0 }}>{titulo}</h3>
      <ul style={{ margin: 0, paddingLeft: 18 }}>{itens.map((x) => <li key={x} style={{ marginBottom: 4 }}>{x}</li>)}</ul>
    </div>
  );
  return (
    <>
      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
        <small className="mudo">O que o seu teste mostrou</small>
        <h2 style={{ margin: "4px 0 6px" }}>{nome}, você é {r.nome}{segunda ? <span className="mudo" style={{ fontSize: 16, fontWeight: 500 }}> com traços de {RETORNO_PERFIL[segunda].nome}</span> : ""}</h2>
        <p style={{ margin: 0 }}>{r.frase}</p>
      </div>
      {bloco("✨ Seus diferenciais", r.diferenciais, "var(--green)")}
      {bloco("🎯 Seus desafios", r.desafios, "var(--orange)")}
      {bloco("💪 Como usar isso a seu favor", r.aFavor, "var(--purple)")}
      <p className="mudo" style={{ textAlign: "center" }}>Não existe perfil melhor ou pior: cada pessoa vende do seu jeito. Obrigada por fazer parte da mentoria! 💛</p>
    </>
  );
}
