"use client";

// Os botões de qualquer pendência do Hub: Resolver (direto para onde se resolve), Feito e "Mais" (adiar, WhatsApp,
// passar para a Claudia, abrir a loja). Iguais no planner da Camilla, no Meu dia da Claudia e nos lembretes.
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useEquipe } from "@/lib/hub";
import { linkZap } from "@/lib/cs";
import { adiar, amanha, destinoDe, marcarFeito, mensagemCobranca, passarParaClaudia, proximaSemana, type Pendencia } from "@/lib/pendencia";

export function AcoesPendencia({ p, mudou, escuro, semFeito, cobrar }: {
  p: Pendencia;
  /** Chamado depois de qualquer mudança no banco (para recarregar a lista). `feito` = saiu da fila. */
  mudou: (feito?: boolean) => void;
  escuro?: boolean;
  /** Onde já existe outro botão de concluir. */
  semFeito?: boolean;
  /** Pendência de outra pessoa (aba Cobrar): o WhatsApp vem com a mensagem de cobrança. */
  cobrar?: boolean;
}) {
  const { abrirPortal, aprova, comoCs, userId } = useEquipe();
  const [ocupado, setOcupado] = useState(false);
  const [data, setData] = useState("");
  const destino = destinoDe(p);
  const podePassar = aprova && !comoCs;

  const fazer = async (acao: () => Promise<void>, feito = false) => {
    setOcupado(true);
    try { await acao(); mudou(feito); } catch (e) { alert((e as Error).message); }
    setOcupado(false);
  };

  const neon = "#FF5B1F";
  const botao = (principal = false): CSSProperties => escuro
    ? { minHeight: 34, padding: "0 12px", borderRadius: 999, fontFamily: "inherit", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, ...(principal ? { background: neon, color: "#0B0B0B", border: `1px solid ${neon}` } : { background: "transparent", color: "#F5F1EA", border: "1px solid #3a3a3a" }) }
    : {};
  const cls = (principal = false) => (escuro ? undefined : `btn ${principal ? "p" : "s"} peq`);
  const itemMenu: CSSProperties = escuro
    ? { display: "block", width: "100%", textAlign: "left", background: "transparent", border: 0, color: "#F5F1EA", fontFamily: "inherit", fontSize: 13, padding: "10px 12px", cursor: "pointer", textDecoration: "none", minHeight: 40 }
    : { display: "block", width: "100%", textAlign: "left", background: "transparent", border: 0, color: "inherit", font: "inherit", padding: "10px 12px", cursor: "pointer", textDecoration: "none", minHeight: 40 };

  const resolver = destino && (
    destino.portal
      ? <button type="button" className={cls(true)} style={botao(true)} onClick={() => abrirPortal(destino.portal!.id, destino.portal!.rota)}>{destino.rotulo} →</button>
      : destino.externo
        ? <a className={cls(true)} style={botao(true)} href={destino.href} target="_blank" rel="noopener">{destino.rotulo} ↗</a>
        : <Link className={cls(true)} style={botao(true)} href={destino.href as string}>{destino.rotulo} →</Link>
  );

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
      {resolver}
      {cobrar && p.whatsapp && <a className={cls(true)} style={botao(true)} href={linkZap(p.whatsapp, mensagemCobranca(p.texto))} target="_blank" rel="noopener">Cobrar no WhatsApp ↗</a>}
      {!semFeito && <button type="button" disabled={ocupado} className={cls()} style={botao()} onClick={() => fazer(() => marcarFeito(p), true)}>✓ Feito</button>}
      <details style={{ position: "relative" }}>
        <summary className={cls()} style={{ ...botao(), listStyle: "none", ...(escuro ? {} : { display: "inline-flex" }) }} aria-label="Mais opções">Mais ⋯</summary>
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 6px)", left: 0, minWidth: 230, borderRadius: 8, padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,.35)", ...(escuro ? { background: "#161616", border: "1px solid #3a3a3a" } : { background: "var(--card)", border: "1px solid var(--line)" }) }}>
          <button type="button" disabled={ocupado} style={itemMenu} onClick={() => fazer(() => adiar(p, amanha()), true)}>Adiar para amanhã</button>
          <button type="button" disabled={ocupado} style={itemMenu} onClick={() => fazer(() => adiar(p, proximaSemana()), true)}>Adiar uma semana</button>
          <label style={{ ...itemMenu, display: "flex", gap: 8, alignItems: "center", cursor: "default" }}>
            <span>Outro dia</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ flex: 1, minWidth: 0, font: "inherit", fontSize: 12, background: "transparent", color: "inherit", border: "1px solid #3a3a3a", borderRadius: 4, padding: 4 }} />
            <button type="button" disabled={!data || ocupado} onClick={() => fazer(() => adiar(p, data), true)} style={{ font: "inherit", fontSize: 11, fontWeight: 700, background: "transparent", color: escuro ? neon : "var(--red)", border: 0, cursor: "pointer" }}>OK</button>
          </label>
          {!cobrar && p.whatsapp && <a style={itemMenu} href={linkZap(p.whatsapp, "")} target="_blank" rel="noopener">Abrir o WhatsApp da loja ↗</a>}
          {podePassar && <button type="button" disabled={ocupado} style={itemMenu} onClick={() => { if (confirm("Passar esta pendência para a Claudia?")) fazer(() => passarParaClaudia(p, userId), true); }}>Passar para a Claudia</button>}
          {p.portalId && <Link style={itemMenu} href={`/equipe/loja?id=${p.portalId}&aba=conversas`}>Abrir a ficha da loja</Link>}
          {semFeito && <button type="button" disabled={ocupado} style={itemMenu} onClick={() => fazer(() => marcarFeito(p), true)}>Marcar como feito</button>}
        </div>
      </details>
    </div>
  );
}
