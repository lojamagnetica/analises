"use client";

import { Icone } from "@/components/Icone";
import { linkDoBloco, modeloDe, raioDe, type AcaoBio, type BioPublica, type Bloco } from "@/lib/bio";

/** A página do Link da Bio. É a mesma na prévia do editor e na página pública. */
export function BioPagina({ p, aoClicar, previa }: { p: BioPublica; aoClicar?: (bloco: string) => void; previa?: boolean }) {
  const m = modeloDe(p.aparencia?.modelo);
  const raio = raioDe(p.aparencia?.botao);
  const botao = (principal: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: principal ? "15px 18px" : "13px 18px",
    borderRadius: raio, background: principal ? m.principal : m.botao, color: principal ? m.principalTexto : m.botaoTexto,
    fontWeight: 700, fontSize: principal ? 16 : 15, textDecoration: "none", textAlign: "center",
    boxShadow: principal ? "0 6px 18px rgba(0,0,0,.14)" : "0 1px 3px rgba(0,0,0,.08)", border: 0,
  });
  const cartao: React.CSSProperties = { background: m.botao, color: m.botaoTexto, borderRadius: raio === "999px" ? 22 : raio, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.08)" };
  const link = (b: Bloco, filhos: React.ReactNode, estilo: React.CSSProperties, acao: AcaoBio = null) => {
    const href = linkDoBloco(b, acao);
    if (!href) return previa ? <div style={{ ...estilo, opacity: 0.55 }} title="Falta o link">{filhos}</div> : null;
    return <a href={href} target="_blank" rel="noopener noreferrer" style={estilo} onClick={() => aoClicar?.(b.id)}>{filhos}</a>;
  };

  return (
    <div style={{ background: m.fundo, color: m.texto, minHeight: "100%", padding: "34px 18px 40px", fontFamily: "var(--font)" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", display: "grid", gap: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ width: 92, height: 92, borderRadius: "50%", margin: "0 auto 12px", overflow: "hidden", background: m.principal, color: m.principalTexto, display: "grid", placeItems: "center", fontSize: 36, fontWeight: 800, border: `3px solid ${m.botao}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.perfil?.foto ? <img src={p.perfil.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (p.perfil?.nome || "?").trim().charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: m.texto }}>{p.perfil?.nome}</div>
          {p.perfil?.arroba && <div style={{ color: m.suave, fontSize: 14 }}>@{p.perfil.arroba}</div>}
          {p.perfil?.frase && <p style={{ margin: "8px 0 0", fontSize: 15, color: m.texto }}>{p.perfil.frase}</p>}
        </div>

        {(p.blocos ?? []).map((b) => {
          switch (b.tipo) {
            case "whatsapp":
              return <div key={b.id}>{link(b, <><Icone nome="wpp" tamanho={20} /> {b.titulo || "WhatsApp"}</>, botao(true))}</div>;
            case "destaque":
              return <div key={b.id}>{link(b, <>✨ {b.titulo || "Destaque"}</>, botao(true))}</div>;
            case "link":
              return <div key={b.id}>{link(b, b.titulo || "Link", botao(false))}</div>;
            case "acao":
              if (!p.acao) return previa ? <div key={b.id} style={{ ...cartao, opacity: 0.6, fontSize: 13.5 }}>🚀 Ação do mês: aparece sozinha quando você tiver uma ação ativa em Vendas › Ações do Mês.</div> : null;
              return (
                <div key={b.id} style={cartao}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: m.suave }}>🚀 {b.titulo || "Ação do mês"}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, margin: "4px 0" }}>{p.acao.titulo}</div>
                  {(p.acao.oferta || p.acao.resumo) && <p style={{ margin: "0 0 10px", fontSize: 14 }}>{p.acao.oferta || p.acao.resumo}</p>}
                  {link(b, "Quero aproveitar", botao(true), p.acao)}
                </div>
              );
            case "local":
              return (
                <div key={b.id} style={cartao}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>📍 {b.titulo || "Como chegar"}</div>
                  {b.endereco && <div style={{ fontSize: 14 }}>{b.endereco}</div>}
                  {b.horario && <div style={{ fontSize: 14, color: m.suave, marginTop: 4, whiteSpace: "pre-wrap" }}>🕒 {b.horario}</div>}
                  {b.endereco && <div style={{ marginTop: 10 }}>{link(b, "Abrir no mapa", { ...botao(false), background: m.fundo, color: m.texto })}</div>}
                </div>
              );
            case "texto":
              return b.texto ? <p key={b.id} style={{ margin: 0, textAlign: "center", fontSize: 15, whiteSpace: "pre-wrap" }}>{b.texto}</p> : null;
            case "faq":
              return (
                <details key={b.id} style={cartao} onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) aoClicar?.(b.id); }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>{b.pergunta || "Pergunta"}</summary>
                  <p style={{ margin: "8px 0 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{b.resposta}</p>
                </details>
              );
            default:
              return null;
          }
        })}
        <div style={{ textAlign: "center", fontSize: 11.5, color: m.suave, marginTop: 14 }}>feito com magnética.hub</div>
      </div>
    </div>
  );
}
