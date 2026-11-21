"use client";

// Um bloco que abre e fecha pela seta. Lembra a escolha de cada bloco neste aparelho.
import { useEffect, useState, type ReactNode } from "react";

const chave = (id: string) => `lm-recolher-${id}`;

export function Recolhivel({ id, titulo, extra, cor, aberto: padrao = true, children, solto }: {
  id: string; titulo: ReactNode; extra?: ReactNode; cor?: string; aberto?: boolean; children: ReactNode;
  /** Sem cartão em volta (para seções com vários cartões dentro). */
  solto?: boolean;
}) {
  const [aberto, setAberto] = useState(padrao);
  useEffect(() => { try { const v = localStorage.getItem(chave(id)); if (v !== null) setAberto(v === "1"); } catch { /* sem armazenamento */ } }, [id]);
  const trocar = () => { const v = !aberto; setAberto(v); try { localStorage.setItem(chave(id), v ? "1" : "0"); } catch { /* sem armazenamento */ } };
  const cabeca = (
    <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={trocar} aria-expanded={aberto}
        style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left", flex: 1, minWidth: 0 }}>
        <span aria-hidden style={{ display: "inline-block", transition: "transform .15s", transform: aberto ? "rotate(90deg)" : "none", fontSize: 13, flex: "none" }}>▶</span>
        <b>{titulo}</b>
      </button>
      {extra}
    </div>
  );
  if (solto) return <div className="mb"><div className="secao" style={{ marginBottom: aberto ? undefined : 0 }}>{cabeca}</div>{aberto && children}</div>;
  return (
    <div className={`card mb${cor ? " card-borda" : ""}`} style={cor ? { ["--c" as string]: cor } : undefined}>
      {cabeca}
      {aberto && <div style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}
