"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icone } from "@/components/Icone";

export function Titulo({ titulo, sub, voltar, aba }: { titulo: React.ReactNode; sub?: React.ReactNode; voltar?: { href: string; rotulo: string }; aba?: string }) {
  useEffect(() => {
    const t = aba ?? (typeof titulo === "string" ? titulo : "");
    document.title = t ? `${t} · Hub Loja Magnética` : "Hub Loja Magnética";
  }, [aba, titulo]);
  return (
    <div className="titulo-pagina">
      {voltar && (
        <Link className="voltar" href={voltar.href}>
          <Icone nome="back" tamanho={16} /> {voltar.rotulo}
        </Link>
      )}
      <h1 style={{ marginTop: voltar ? 8 : 0 }}>{titulo}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}
