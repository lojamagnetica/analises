"use client";

// No Início da loja: os combinados que ela fez com a Camilla (com check e prazo) e quem acompanha de perto, a CS.
import { Carregando, useDados } from "@/lib/hub";
import { dataCurta, hoje } from "@/lib/formato";
import { buscarCombinados, buscarCs, marcarCombinado } from "@/lib/combinados";

export function SeusCombinados({ portalId }: { portalId: string }) {
  const { dados, recarregar } = useDados(async () => {
    const [c, cs] = await Promise.all([buscarCombinados(portalId), buscarCs()]);
    return { combinados: c.filter((x) => x.quem === "loja"), cs };
  }, [portalId]);
  if (!dados) return <Carregando />;
  const { combinados, cs } = dados;
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
            </span>
          </label>
        ))}
      </div>
      <div className="card mb linha" style={{ gap: 12, alignItems: "center" }}>
        <span aria-hidden style={{ fontSize: 28 }}>🤝</span>
        <span><b>{cs.nome} é a sua CS e acompanha você de perto.</b><br /><span className="mudo">Ela olha o seu Hub e fala com você para ajudar a cumprir cada combinado.</span></span>
        {cs.whatsapp && <a className="btn s peq" href={`https://wa.me/55${cs.whatsapp.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noopener">Falar com a {cs.nome}</a>}
      </div>
    </>
  );
}
