"use client";

import Link from "next/link";
// No Início da loja: os combinados que ela fez com a Camilla (com check e prazo).
import { Carregando, useDados } from "@/lib/hub";
import { dataCurta, hoje } from "@/lib/formato";
import { buscarCombinados, marcarCombinado } from "@/lib/combinados";

export function SeusCombinados({ portalId }: { portalId: string }) {
  const { dados, recarregar } = useDados(async () => {
    const c = await buscarCombinados(portalId);
    return { combinados: c.filter((x) => x.quem === "loja") };
  }, [portalId]);
  if (!dados) return <Carregando />;
  const { combinados } = dados;
  if (!combinados.length) return null;
  const abertos = combinados.filter((c) => c.status === "aberto").length;
  return (
    <>
      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
        <h3 style={{ marginTop: 0 }}>Seus combinados com a Camilla</h3>
        <p className="mudo" style={{ marginTop: 0 }}>{abertos ? `${abertos} ${abertos === 1 ? "combinado" : "combinados"} para começar. Marque quando fizer.` : "Você cumpriu tudo o que combinamos. 🎉"}</p>
        {combinados.map((c) => (
          <label key={c.id} className="marcar" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
            <input type="checkbox" checked={c.status === "feito"} onChange={async (e) => { await marcarCombinado(c.id, e.target.checked); recarregar(); }} />
            <span style={{ textDecoration: c.status === "feito" ? "line-through" : "none" }}>{c.texto}
              {c.prazo && c.status === "aberto" && <small className="mudo" style={{ display: "block", color: c.prazo < hoje() ? "var(--red)" : undefined }}>até {dataCurta(c.prazo)}</small>}
              {c.link && c.status === "aberto" && (c.link.startsWith("/")
                ? <Link className="btn p peq" style={{ marginTop: 6, display: "inline-block" }} href={c.link}>Abrir →</Link>
                : <a className="btn p peq" style={{ marginTop: 6, display: "inline-block" }} href={c.link} target="_blank" rel="noopener">Abrir ↗</a>)}
            </span>
          </label>
        ))}
      </div>
    </>
  );
}
