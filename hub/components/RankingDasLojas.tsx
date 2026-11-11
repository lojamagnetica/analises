"use client";

import type { RankingDaLoja } from "@/lib/vez";

/** No link da equipe: em que posição a loja está entre as lojas da mentoria e quanto falta da meta para concorrer ao prêmio. */
export function RankingDasLojas({ r }: { r: RankingDaLoja }) {
  const falta = r.meta_pct === null ? null : Math.max(0, r.minimo_pct - r.meta_pct);
  return (
    <div className="card mb">
      <b style={{ fontSize: 18 }}>Entre as lojas da mentoria 🏅</b>
      <p style={{ margin: "6px 0 4px", fontSize: 15 }}>
        {r.pontos === 0 ? "Sua loja ainda não somou pontos neste mês."
          : <>Sua loja está em <b>{r.posicao}º lugar</b> com <b>{r.pontos.toLocaleString("pt-BR")} pontos</b>{r.lider > r.pontos ? <>. A primeira tem {r.lider.toLocaleString("pt-BR")}</> : r.posicao === 1 ? ". Está na frente! 🥇" : ""}.</>}
      </p>
      <p style={{ margin: 0, fontSize: 14 }} className="mudo">
        O 1º lugar do mês ganha <b>R$ 200 extra da mentora</b>, desde que a loja bata {r.minimo_pct}% da meta de vendas.{" "}
        {r.meta_pct === null ? "A meta do mês ainda não foi definida."
          : r.elegivel ? <b style={{ color: "#2E9D57" }}>A sua loja já está dentro da meta ({r.meta_pct}%). ✓</b>
          : <>A sua loja está em <b>{r.meta_pct}%</b> da meta: faltam {falta} pontos percentuais para concorrer.</>}
      </p>
    </div>
  );
}
