"use client";

import type { DesafioDoDia } from "@/lib/desafios";
import type { ClienteChamar, PontosDaPessoa } from "@/lib/vez";

/** O lembrete do topo: o que ainda dá para fazer hoje para acumular pontos. */
export function FaltaFazer({ missoes, desafios, chamar, semana }: { missoes: number; desafios: DesafioDoDia[]; chamar: ClienteChamar[]; semana: PontosDaPessoa["semana"] | null }) {
  const itens: { icone: string; texto: React.ReactNode }[] = [];
  if (missoes > 0) itens.push({ icone: "✅", texto: <>Dê o check na missão do dia e acumule <b>+{missoes * 10} pontos</b>{missoes > 1 ? ` (${missoes} missões)` : ""}.</> });
  for (const d of desafios) {
    if (d.limite === null || d.feitos < d.limite) itens.push({ icone: "🔥", texto: <>Desafio <b>{d.titulo}</b>: <b>+{d.pontos} pontos</b> por {d.unidade}.</> });
  }
  const aChamar = chamar.filter((c) => !c.feito).length;
  if (aChamar > 0) itens.push({ icone: "💬", texto: <>Chame suas clientes e marque <b>Chamei</b>: {aChamar} esperando por você.</> });
  if (semana && semana.atend > 0 && !semana.bonus) {
    const precisa = Math.max(0, Math.ceil(semana.atend * 0.8) - semana.feitos);
    if (precisa > 0) itens.push({ icone: "📋", texto: <>Marque o resultado de mais <b>{precisa} {precisa === 1 ? "atendimento" : "atendimentos"}</b> e garanta <b>+5 ⭐</b> da semana.</> });
  }
  if (itens.length === 0) {
    return <div className="card mb" style={{ border: "2px solid #2E9D57", background: "rgba(46,157,87,.1)" }}><b>Tudo em dia hoje! 🎉</b><div className="mudo" style={{ fontSize: 14 }}>Você completou o que dá para ganhar agora. Volte quando chegar um novo desafio.</div></div>;
  }
  return (
    <div className="card mb" style={{ border: "2px solid var(--orange)" }}>
      <b style={{ color: "var(--orange)" }}>⚡ Complete hoje para acumular pontos</b>
      {itens.map((i, k) => (
        <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 8, fontSize: 15.5 }}>
          <span className="vez-pisca-icone" style={{ flex: "0 0 auto" }}>{i.icone}</span><span>{i.texto}</span>
        </div>
      ))}
    </div>
  );
}
