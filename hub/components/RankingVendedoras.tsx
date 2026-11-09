"use client";

import { moeda } from "@/lib/formato";
import { fmtPa, indicadores, type Caixa } from "@/lib/caixa";
import { buscarCaixa, mesDeHoje, nomeMes } from "@/lib/caixa";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { ranking } from "@/lib/envios";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** Ranking de quem vendeu mais, em barras. Só quem vende entra (a lista vem do caixa, por vendedora). */
export function RankingVendedoras({ lista, titulo, minimo = 1 }: { lista: Pick<Caixa, "vendedoras">[]; titulo: string; minimo?: number }) {
  const r = ranking(lista);
  if (r.length < minimo) return null;
  const max = r[0]?.faturamento || 1;
  return (
    <div className="card mt">
      <b>🏆 {titulo}</b>
      {r.map((v, i) => {
        const k = indicadores({ faturamento: v.faturamento, vendas: v.vendas, pecas: v.pecas, dias: 1 });
        return (
          <div key={`${v.nome}-${i}`} style={{ margin: "10px 0 0" }}>
            <div className="linha entre" style={{ gap: 8 }}>
              <span>{i + 1}º <b>{v.nome}</b></span>
              <b style={NUM}>{moeda(v.faturamento)}</b>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "var(--soft)", marginTop: 3 }} role="img" aria-label={`${v.nome}: ${moeda(v.faturamento)}`}>
              <div style={{ width: `${Math.max(4, Math.round((v.faturamento / max) * 100))}%`, height: "100%", borderRadius: 5, background: i === 0 ? "var(--green)" : "var(--red)" }} />
            </div>
            <small className="mudo" style={NUM}>{v.vendas} {v.vendas === 1 ? "venda" : "vendas"}{k.pa != null ? ` · PA ${fmtPa(k.pa)}` : ""}{k.tkm != null ? ` · ticket ${moeda(k.tkm)}` : ""}</small>
          </div>
        );
      })}
    </div>
  );
}

/** No Início da loja: o ranking do mês, com o que já foi lançado no caixa. Só aparece com 2 vendedoras ou mais. */
export function RankingDoMes() {
  const { portal } = usePortal();
  const mes = mesDeHoje();
  const { dados } = useDados(() => (portal.sem_equipe ? Promise.resolve([]) : buscarCaixa(portal.id, mes)), [portal.id, mes, portal.sem_equipe]);
  if (!dados) return <Carregando />;
  return <RankingVendedoras lista={dados} titulo={`Ranking de vendas · ${nomeMes(mes)}`} minimo={2} />;
}
