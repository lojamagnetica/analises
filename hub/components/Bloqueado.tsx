"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { NOME_REQUISITO, type Entrada, type Requisito } from "@/lib/entrada";

const PASSOS: { chave: keyof Pick<Entrada, "video" | "loja" | "equipe">; titulo: string; href: string }[] = [
  { chave: "video", titulo: "Assistir ao vídeo de boas-vindas", href: "/comece" },
  { chave: "loja", titulo: "Preencher os Dados da loja", href: "/personalizacao" },
  { chave: "equipe", titulo: "Cadastrar a sua equipe", href: "/pessoas" },
];

/** O que a loja vê numa área que ainda não abriu: o que falta e o atalho para fazer. */
export function Bloqueado({ req, entrada, faltamEtapas }: { req: Requisito; entrada: Entrada; faltamEtapas: number }) {
  const precisa = req === "video" ? ["video"] : ["video", req];
  const proximo = PASSOS.find((p) => precisa.includes(p.chave) && !entrada[p.chave]) ?? PASSOS[0];
  return (
    <>
      <Titulo titulo="Esta área ainda está fechada" />
      <div className="card card-borda" style={{ ["--c" as string]: "var(--red)", maxWidth: 640 }}>
        <div style={{ fontSize: 34 }}>🔒</div>
        <h2 style={{ marginTop: 6 }}>Ela abre quando você {NOME_REQUISITO[req]}.</h2>
        <p className="mudo">Você já consegue ver tudo o que existe no Hub. Cada área abre quando a etapa anterior estiver feita, para o Hub conhecer a sua loja de verdade.</p>
        {PASSOS.map((p) => (
          <div key={p.chave} className="marcar" style={{ cursor: "default", gap: 12 }}>
            <span className={`selo ${entrada[p.chave] ? "feito" : "espera"}`}>{entrada[p.chave] ? "✓" : "…"}</span>
            <span>{p.titulo}{p.chave === "loja" && !entrada.loja && faltamEtapas > 0 ? ` · falta${faltamEtapas > 1 ? "m" : ""} ${faltamEtapas}` : ""}</span>
          </div>
        ))}
        <Link className="btn p mt" href={proximo.href}>Fazer agora: {proximo.titulo.toLowerCase()} →</Link>
      </div>
    </>
  );
}
