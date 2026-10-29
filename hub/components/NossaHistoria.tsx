"use client";

import { PERGUNTAS, emOrdem, type Historia } from "@/lib/historia";

/** "Nossa história" montada com as respostas: os capítulos, a linha do tempo de fotos e os valores. */
export function NossaHistoria({ h, urls }: { h: Historia; urls: Record<string, string> }) {
  // Com o storytelling aprovado, a loja vê a versão construída; senão, as respostas como vieram.
  if (h.narrativa && h.narrativa_aprovada) return <Narrada h={h} urls={urls} />;
  const r = h.respostas ?? {};
  const capitulo = (id: (typeof PERGUNTAS)[number]["id"]) => {
    const p = PERGUNTAS.find((x) => x.id === id)!;
    const t = r[id]?.trim();
    if (!t) return null;
    return (
      <div key={id} className="mb">
        <h3 style={{ margin: "0 0 6px", color: "var(--red)" }}>{p.titulo}</h3>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{t}</p>
      </div>
    );
  };
  const fotos = emOrdem(h.fotos ?? []).filter((f) => urls[f.caminho]);
  const valores = (r.valores ?? []).filter((v) => v.nome.trim());

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="card mb" style={{ background: "var(--grad)", color: "var(--side-text)", padding: "32px 28px" }}>
        <small style={{ letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.75, fontWeight: 700 }}>Nossa história</small>
        <h1 style={{ margin: "6px 0 0", color: "inherit", fontFamily: "var(--font-marca)" }}>{h.loja || "A nossa loja"}</h1>
      </div>

      <div className="card mb" style={{ padding: "24px 28px" }}>
        {capitulo("comeco")}{capitulo("nome")}{capitulo("motivo")}{capitulo("dificil")}{capitulo("conquista")}
      </div>

      {fotos.length > 0 && (
        <div className="mb">
          <div className="secao">Linha do tempo</div>
          <div style={{ display: "grid", gap: 14, borderLeft: "2px solid var(--red)", marginLeft: 8, paddingLeft: 18 }}>
            {fotos.map((f) => (
              <figure key={f.caminho} className="card" style={{ margin: 0, padding: 12, position: "relative" }}>
                <span style={{ position: "absolute", left: -27, top: 18, width: 14, height: 14, borderRadius: 7, background: "var(--red)", border: "3px solid var(--bg)" }} />
                {f.ano && <b style={{ display: "block", color: "var(--red)", fontSize: 18, marginBottom: 6 }}>{f.ano}</b>}
                <img src={urls[f.caminho]} alt={f.legenda || "Foto da história da loja"} style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 12, display: "block" }} />
                {f.legenda && <figcaption style={{ marginTop: 8, fontSize: 14.5 }}>{f.legenda}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      )}

      {(r.cliente?.trim() || r.sentir?.trim() || r.jeito?.trim()) && (
        <div className="card mb" style={{ padding: "24px 28px" }}>{capitulo("cliente")}{capitulo("sentir")}{capitulo("jeito")}</div>
      )}

      {valores.length > 0 && (
        <div className="mb">
          <div className="secao">Os nossos valores</div>
          <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {valores.map((v) => (
              <div key={v.nome} className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
                <h3 style={{ margin: "0 0 4px" }}>{v.nome}</h3>
                {v.como.trim() && <p style={{ margin: 0, fontSize: 14.5 }}>{v.como}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {r.futuro?.trim() && <div className="card mb" style={{ padding: "24px 28px" }}>{capitulo("futuro")}</div>}
    </div>
  );
}

/** A versão em storytelling: título, capítulos, a linha do tempo de fotos e o que a loja espera de quem chega. */
function Narrada({ h, urls }: { h: Historia; urls: Record<string, string> }) {
  const n = h.narrativa!;
  const fotos = emOrdem(h.fotos ?? []).filter((f) => urls[f.caminho]);
  const [primeiros, resto] = [n.capitulos.slice(0, 3), n.capitulos.slice(3)];
  const Capitulo = ({ c }: { c: { titulo: string; texto: string } }) => (
    <div className="mb">
      <h3 style={{ margin: "0 0 6px", color: "var(--red)" }}>{c.titulo}</h3>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{c.texto}</p>
    </div>
  );
  return (
    <div style={{ maxWidth: 820 }}>
      <div className="card mb" style={{ background: "var(--grad)", color: "var(--side-text)", padding: "32px 28px" }}>
        <small style={{ letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.75, fontWeight: 700 }}>Nossa história</small>
        <h1 style={{ margin: "6px 0 4px", color: "inherit", fontFamily: "var(--font-marca)" }}>{n.titulo || h.loja}</h1>
        {n.assinatura && <p style={{ margin: 0, opacity: 0.9, fontSize: 17 }}>{n.assinatura}</p>}
      </div>
      <div className="card mb" style={{ padding: "24px 28px" }}>{primeiros.map((c) => <Capitulo key={c.titulo} c={c} />)}</div>
      {fotos.length > 0 && (
        <div className="mb">
          <div className="secao">Linha do tempo</div>
          <div style={{ display: "grid", gap: 14, borderLeft: "2px solid var(--red)", marginLeft: 8, paddingLeft: 18 }}>
            {fotos.map((f) => (
              <figure key={f.caminho} className="card" style={{ margin: 0, padding: 12, position: "relative" }}>
                <span style={{ position: "absolute", left: -27, top: 18, width: 14, height: 14, borderRadius: 7, background: "var(--red)", border: "3px solid var(--bg)" }} />
                {f.ano && <b style={{ display: "block", color: "var(--red)", fontSize: 18, marginBottom: 6 }}>{f.ano}</b>}
                <img src={urls[f.caminho]} alt={f.legenda || "Foto da história da loja"} style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 12, display: "block" }} />
                {f.legenda && <figcaption style={{ marginTop: 8, fontSize: 14.5 }}>{f.legenda}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      )}
      {resto.length > 0 && <div className="card mb" style={{ padding: "24px 28px" }}>{resto.map((c) => <Capitulo key={c.titulo} c={c} />)}</div>}
      {n.esperamos && (
        <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)", padding: "20px 24px" }}>
          <small className="mudo" style={{ textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>O que esperamos de quem chega</small>
          <p style={{ margin: "6px 0 0", fontSize: 16.5, lineHeight: 1.6 }}>{n.esperamos}</p>
        </div>
      )}
    </div>
  );
}
