"use client";

import { moeda } from "@/lib/formato";
import { fmtPa, indicadores, type Caixa } from "@/lib/caixa";
import { buscarCaixa, mesDeHoje, nomeMes } from "@/lib/caixa";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { ranking } from "@/lib/envios";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** Ranking de quem vendeu mais, em barras. Só quem vende entra (a lista vem do caixa, por vendedora). */
export function RankingVendedoras({ lista, titulo, minimo = 1, compacto = false }: { lista: Pick<Caixa, "vendedoras">[]; titulo: string; minimo?: number; compacto?: boolean }) {
  const r = ranking(lista);
  if (r.length < minimo) return null;
  const max = r[0]?.faturamento || 1;
  const total = r.reduce((t, v) => t + v.faturamento, 0) || 1;
  const medalha = ["🥇", "🥈", "🥉"];
  const cores = ["linear-gradient(90deg,#f0b429,#f7d774)", "linear-gradient(90deg,var(--red),#e58b8b)", "linear-gradient(90deg,var(--purple),#b9a3d6)"];
  return (
    <div className={compacto ? "card" : "card mt"} style={compacto ? { padding: 12, height: "100%", boxSizing: "border-box" } : undefined}>
      <div className="linha entre" style={{ gap: 8 }}>
        <b style={{ fontSize: compacto ? 13.5 : undefined }}>🏆 {titulo}</b>
        <small className="mudo" style={NUM}>{moeda(total)}</small>
      </div>
      {r.map((v, i) => {
        const k = indicadores({ faturamento: v.faturamento, vendas: v.vendas, pecas: v.pecas, dias: 1 });
        const pct = Math.max(6, Math.round((v.faturamento / max) * 100));
        return (
          <div key={`${v.nome}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: compacto ? 8 : 12 }}>
            <span style={{ width: compacto ? 26 : 32, height: compacto ? 26 : 32, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: "var(--soft)", fontSize: compacto ? 14 : 17 }} aria-hidden>{medalha[i] ?? <small style={{ fontWeight: 700 }}>{i + 1}º</small>}</span>
            <div style={{ flex: 1, minWidth: 0 }} role="img" aria-label={`${i + 1}º ${v.nome}: ${moeda(v.faturamento)}`}>
              <div className="linha entre" style={{ gap: 6, fontSize: compacto ? 12.5 : 14 }}>
                <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.nome}</b>
                <b style={NUM}>{moeda(v.faturamento)}</b>
              </div>
              <div style={{ height: compacto ? 7 : 10, borderRadius: 99, background: "var(--soft)", marginTop: 3, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: cores[Math.min(i, 2)] }} />
              </div>
              <small className="mudo" style={{ ...NUM, fontSize: compacto ? 10.5 : undefined }}>{v.vendas} {v.vendas === 1 ? "venda" : "vendas"}{k.pa != null ? ` · PA ${fmtPa(k.pa)}` : ""}{k.tkm != null ? ` · ticket ${moeda(k.tkm)}` : ""}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** No Início da loja: o ranking do mês, com o que já foi lançado no caixa. Só aparece com 2 vendedoras ou mais. */
export function RankingDoMes({ compacto = false }: { compacto?: boolean }) {
  const { portal } = usePortal();
  const mes = mesDeHoje();
  const { dados } = useDados(() => (portal.sem_equipe ? Promise.resolve([]) : buscarCaixa(portal.id, mes)), [portal.id, mes, portal.sem_equipe]);
  if (!dados) return <Carregando />;
  return <RankingVendedoras lista={dados} titulo={`Ranking de vendas · ${nomeMes(mes)}`} minimo={2} compacto={compacto} />;
}
