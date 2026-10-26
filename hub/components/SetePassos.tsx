"use client";

import Link from "next/link";
import { Icone } from "@/components/Icone";

const CORES = ["var(--red)", "var(--purple)", "var(--green)", "var(--blue)", "var(--orange)", "var(--purple)", "var(--red)"];
export type Passo = { numero: number; titulo: string; descricao: string | null };

/** Os 7 passos da mentoria, com o passo atual destacado. Usado em Os 7 passos e no Início. */
export function SetePassos({ passos, atual }: { passos: Passo[]; atual: number }) {
  return (
    <div className="grade g3">
      {passos.map((p) => {
        const feito = p.numero < atual;
        const agora = p.numero === atual;
        const cor = feito ? "var(--green)" : CORES[p.numero - 1];
        return (
          <div key={p.numero} className="card card-borda etapa" style={{ ["--c" as string]: cor }}>
            <span className={`selo ${feito ? "feito" : agora ? "andamento" : "espera"}`}>{feito ? "feito" : agora ? "agora" : "a seguir"}</span>
            <span className="quadrado" style={{ ["--c" as string]: cor }}>
              {feito ? <Icone nome="check" /> : <b style={{ fontSize: 18 }}>{p.numero}</b>}
            </span>
            <h3>{p.titulo}</h3>
            <p>{p.descricao}</p>
            <Link className="btn-contorno" href={`/jornada/passo?n=${p.numero}`}>Abrir</Link>
          </div>
        );
      })}
    </div>
  );
}
