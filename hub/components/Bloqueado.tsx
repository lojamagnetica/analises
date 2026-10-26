"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { dataCurta } from "@/lib/formato";
import { NOME_REQUISITO, PRAZO_DIAGNOSTICO, dadosCompletos, prazoDiagnostico, type Entrada, type Requisito } from "@/lib/entrada";

const PASSOS: { chave: keyof Pick<Entrada, "video" | "loja" | "equipe">; titulo: string; href: string }[] = [
  { chave: "video", titulo: "Assistir ao vídeo de boas-vindas", href: "/comece" },
  { chave: "loja", titulo: "Preencher os Dados da loja", href: "/personalizacao" },
  { chave: "equipe", titulo: "Cadastrar a sua equipe e fazer o teste de perfil", href: "/personalizacao/etapa?n=5" },
];

/** O que a loja vê numa área que ainda não abriu: o caminho até ela e o atalho para o próximo passo. */
export function Bloqueado({ req, entrada, faltamEtapas }: { req: Requisito; entrada: Entrada; faltamEtapas: number }) {
  const passos = req === "video" ? PASSOS.slice(0, 1) : PASSOS;
  const proximo = passos.find((p) => !entrada[p.chave]);
  const enviado = dadosCompletos(entrada);
  return (
    <>
      <Titulo titulo="Esta área ainda está fechada" />
      <div className="card card-borda" style={{ ["--c" as string]: "var(--red)", maxWidth: 640 }}>
        <div style={{ fontSize: 34 }}>🔒</div>
        <h2 style={{ marginTop: 6 }}>Ela abre quando você {NOME_REQUISITO[req]}.</h2>
        <p className="mudo">
          {req === "video"
            ? "Comece pelo vídeo de boas-vindas: ele explica como a mentoria funciona."
            : "Tudo aqui é feito a partir do Diagnóstico da sua loja. Ele é montado com os dados que você manda."}
        </p>
        {passos.map((p) => (
          <div key={p.chave} className="marcar" style={{ cursor: "default", gap: 12 }}>
            <span className={`selo ${entrada[p.chave] ? "feito" : "espera"}`}>{entrada[p.chave] ? "✓" : "…"}</span>
            <span>{p.titulo}{p.chave === "loja" && !entrada.loja && faltamEtapas > 0 ? ` · falta${faltamEtapas > 1 ? "m" : ""} ${faltamEtapas}` : ""}</span>
          </div>
        ))}
        {req === "diagnostico" && (
          <div className="marcar" style={{ cursor: "default", gap: 12 }}>
            <span className={`selo ${entrada.diagnostico ? "feito" : "espera"}`}>{entrada.diagnostico ? "✓" : "…"}</span>
            <span>
              Diagnóstico pronto
              {!entrada.diagnostico && (enviado && entrada.dadosEm
                ? ` · até ${dataCurta(prazoDiagnostico(entrada.dadosEm))}`
                : ` · em até ${PRAZO_DIAGNOSTICO} dias úteis depois que você mandar tudo`)}
            </span>
          </div>
        )}
        {proximo
          ? <Link className="btn p mt" href={proximo.href}>Fazer agora: {proximo.titulo.toLowerCase()} →</Link>
          : !entrada.diagnostico && <div className="aviso ok mt">Recebemos tudo! A equipe está montando o seu Diagnóstico.</div>}
      </div>
    </>
  );
}
