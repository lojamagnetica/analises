"use client";

import { useOptimistic, useTransition } from "react";
import { marcarPlano } from "../acoes";

type Item = { id: string; texto: string; feito: boolean };

export function Checklist({ itens }: { itens: Item[] }) {
  const [, iniciar] = useTransition();
  const [lista, marcar] = useOptimistic(itens, (atual, { id, feito }: { id: string; feito: boolean }) =>
    atual.map((i) => (i.id === id ? { ...i, feito } : i)),
  );
  return (
    <div>
      {lista.map((i) => (
        <label key={i.id} className={`marcar ${i.feito ? "feito" : ""}`}>
          <input
            type="checkbox"
            checked={i.feito}
            onChange={(e) => {
              const feito = e.target.checked;
              iniciar(async () => {
                marcar({ id: i.id, feito });
                await marcarPlano(i.id, feito);
              });
            }}
          />
          <span>{i.texto}</span>
        </label>
      ))}
    </div>
  );
}
