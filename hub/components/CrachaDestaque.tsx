"use client";

// Crachá da magnética do mês (o destaque), no estilo do crachá de boas-vindas da magnética: fita com o padrão de ímãs e cartão azul-noite.
const NOITE = "#0B1A3A", FERRUGEM = "#BC4914", AMBAR = "#E08A3C", OFF = "#F5F0EA";

function Ima({ cor }: { cor: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden style={{ display: "block", flex: "0 0 26px" }}>
      <path d="M47 26 H38 A24 24 0 0 0 38 74 H47" fill="none" stroke={cor} strokeWidth="14" />
      <path d="M53 26 H62 A24 24 0 0 1 62 74 H53" fill="none" stroke={cor} strokeWidth="14" />
    </svg>
  );
}

import { fotoDoPremio } from "@/lib/lojinha";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const nomeDoMes = (mm: string) => MESES[Number(mm.slice(0, 2)) - 1] ?? mm;

/** Crachá do destaque do mês. nome null = ainda ninguém somou estrelas. anterior = quem foi o destaque do mês passado. */
export function CrachaDestaque({ mes, nome, estrelas, foto, anterior }: { mes: string; nome: string | null; estrelas: number; foto?: string | null; anterior?: { nome: string; mes: string; foto?: string | null } | null }) {
  const aberto = !nome || estrelas === 0;
  return (
    <div className="card mb" style={{ padding: 0, overflow: "hidden", background: "#E6DCD0", border: "none" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 18 }}>
        {/* a fita com os ímãs */}
        <div style={{ width: 52, background: FERRUGEM, padding: "8px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {Array.from({ length: 4 }).map((_, i) => <Ima key={i} cor={OFF} />)}
        </div>
        <div style={{ width: 22, height: 28, borderRadius: 5, background: "#8E827B", marginTop: -2 }} />
        {/* o cartão */}
        <div style={{ width: "min(300px, 90%)", background: NOITE, color: OFF, borderRadius: 22, padding: "16px 18px 18px", marginTop: 6, boxShadow: "0 14px 34px rgba(11,26,58,.35)", transform: "rotate(-2deg)", textAlign: "left" }}>
          <div style={{ width: 54, height: 9, borderRadius: 5, background: "#E6DCD0", margin: "0 auto 12px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="30" height="30" viewBox="0 0 100 100" aria-hidden><path d="M47 26 H38 A24 24 0 0 0 38 74 H47" fill="none" stroke={OFF} strokeWidth="14" /><path d="M53 26 H62 A24 24 0 0 1 62 74 H53" fill="none" stroke={OFF} strokeWidth="14" /></svg>
            <span style={{ fontSize: 24, letterSpacing: "-.03em" }}>magnética</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 12px" }}>
            <div style={{ width: 168, height: 168, borderRadius: "50%", background: "#2A3757", display: "grid", placeItems: "center", fontSize: 64, fontWeight: 800, color: AMBAR, border: `4px solid ${AMBAR}`, overflow: "hidden" }}>
              {!aberto && foto ? <img src={fotoDoPremio(foto)!} alt={nome ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : aberto ? "?" : nome!.charAt(0).toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 800, color: AMBAR, textAlign: "center" }}>MAGNÉTICA DE {nomeDoMes(mes).toUpperCase()}</div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, textAlign: "center", margin: "4px 0" }}>{aberto ? "Quem vai ser?" : nome}</div>
          <div style={{ textAlign: "center", fontSize: 14, color: "#C9BFB4" }}>{aberto ? "Ainda ninguém somou estrelas neste mês." : `${estrelas} ⭐ até agora`}</div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(245,240,234,.2)", textAlign: "center", fontSize: 13, color: OFF }}>
            Prêmio: <b style={{ color: AMBAR }}>R$ 200 em dinheiro</b> + 100 pontos no mês seguinte
          </div>
        </div>
        {anterior && <div style={{ marginTop: 14, fontSize: 14, color: "#5C534D" }}>🏆 Magnética de {nomeDoMes(`${anterior.mes.slice(5, 7)}`)}: <b>{anterior.nome}</b></div>}
      </div>
    </div>
  );
}
