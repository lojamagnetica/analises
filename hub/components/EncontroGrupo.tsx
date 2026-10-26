"use client";

import { useDados } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import { buscarEncontro, linkAgenda, proximoEncontro } from "@/lib/encontro";

/** O encontro em grupo da mentoria: quando é o próximo, entrar na sala e colocar na agenda. */
export function EncontroGrupo() {
  const { dados: e } = useDados(buscarEncontro, []);
  if (!e) return null;
  const p = proximoEncontro(e);
  if (!p) return null;
  const quinzena = e.intervalo === 14 ? "a cada 15 dias" : `a cada ${e.intervalo} dias`;
  return (
    <div className="card card-borda mt linha entre" style={{ ["--c" as string]: p.hoje ? "var(--red)" : "var(--purple)", gap: 10 }}>
      <span>
        👥 <b>{e.titulo}</b>
        <span className="mudo"> · {quinzena}</span>
        <div style={{ textTransform: "capitalize" }}>
          {p.agora ? <b style={{ color: "var(--red)" }}>Acontecendo agora</b> : p.hoje ? <b style={{ color: "var(--red)" }}>Hoje · {dataHora(p.iso)}</b> : <>Próximo: <b>{dataHora(p.iso)}</b></>}
        </div>
      </span>
      <span className="linha" style={{ gap: 6 }}>
        <a className="btn s peq" href={linkAgenda(e)} target="_blank" rel="noopener">📅 Colocar na agenda</a>
        <a className="btn p peq" href={e.link} target="_blank" rel="noopener">Entrar na sala</a>
      </span>
    </div>
  );
}
