"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";

/** Área que já aparece no menu e ainda está em construção: diz o que vai ter e o que a loja já pode adiantar. */
export function EmBreve({ titulo, oque, adiantar }: { titulo: string; oque: string; adiantar?: { texto: string; href: string; botao: string } }) {
  return (
    <>
      <Titulo titulo={titulo} sub="Em breve no Hub" />
      <div className="card card-borda" style={{ ["--c" as string]: "var(--red)", maxWidth: 680 }}>
        <span className="selo andamento">Em construção</span>
        <p style={{ marginTop: 12 }}>{oque}</p>
        {adiantar && (
          <>
            <p className="mudo">{adiantar.texto}</p>
            <Link className="btn p peq" href={adiantar.href}>{adiantar.botao}</Link>
          </>
        )}
      </div>
    </>
  );
}
