"use client";

import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { buscarDestaqueBrasil, buscarRankingMentoria, destaqueBrasilPago, premioMentoraPago, salvarMetaMinimaMentoria } from "@/lib/vez";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Só para a equipe da mentora: ranking das lojas no mês, quem concorre (bateu a meta) e os R$ 200 a pagar. */
export function RankingMentoria() {
  const mesISO = `${hoje().slice(0, 7)}-01`;
  const { dados, recarregar } = useDados(() => buscarRankingMentoria(mesISO), [mesISO]);
  const { dados: br, recarregar: recarregarBr } = useDados(() => buscarDestaqueBrasil(mesISO), [mesISO]);
  const [pct, setPct] = useState<string | null>(null);
  if (!dados) return <Carregando />;
  const { ranking, premios, config } = dados;
  const topo = ranking.filter((r) => r.elegivel)[0];
  return (
    <>
      <div className="secao">Ranking das lojas da mentoria</div>
      <div className="card mb">
        <p className="ajuda" style={{ marginTop: 0 }}>
          A loja com mais pontos no mês (soma dos pontos de cada pessoa) ganha <b>{brl(config.premio)} extra da mentora</b>, se bateu {config.meta_minima_pct}% da meta.
          Empate entre 2: as duas ganham. Mais de 2: as 2 que chegaram primeiro àquela pontuação.
        </p>
        {ranking.length === 0 && <p className="mudo">Nenhuma loja pontuou neste mês ainda.</p>}
        {ranking.map((r, i) => (
          <div key={r.portal_id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <span><b>{i + 1}º {r.loja}</b> <span className="mudo">· {r.pontos.toLocaleString("pt-BR")} pontos</span></span>
            <span className="linha" style={{ gap: 6, alignItems: "center" }}>
              <span className="mudo" style={{ fontSize: 13 }}>{r.meta ? `${Math.round((r.realizado / r.meta) * 100)}% da meta` : "sem meta"}</span>
              <span className={`selo ${r.elegivel ? "feito" : "espera"}`}>{r.elegivel ? (topo?.portal_id === r.portal_id ? "Concorrendo na frente" : "Concorre") : "Ainda não bateu a meta"}</span>
            </span>
          </div>
        ))}
        <div className="linha mt" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="ajuda">Meta mínima para concorrer (%)<input type="number" min={0} max={200} value={pct ?? String(config.meta_minima_pct)} onChange={(e) => setPct(e.target.value)} style={{ width: 90 }} /></label>
          {pct !== null && <button type="button" className="btn p peq" onClick={async () => { await salvarMetaMinimaMentoria(Math.max(0, Math.min(200, Number(pct) || 0))); setPct(null); recarregar(); }}>Salvar</button>}
        </div>
      </div>
      <div className="secao">Destaque Absoluto Brasil · Programa Loja Magnética</div>
      <div className="card mb">
        <p className="ajuda" style={{ marginTop: 0 }}>A pessoa que somar mais estrelas no mês, entre todas as lojas do programa, ganha <b>{brl(200)} extra da mentora</b>. Empate: as 2 que chegaram primeiro.</p>
        {!br ? <Carregando /> : br.ranking.length === 0 ? <p className="mudo">Ninguém somou estrelas neste mês ainda.</p>
          : br.ranking.map((r, i) => (
            <div key={r.pessoa_id} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <span><b>{i + 1}º {r.nome}</b> <span className="mudo">· {r.loja ?? "loja"}</span></span><b>{r.estrelas} ⭐</b>
            </div>
          ))}
        {br && br.premios.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <small className="mudo">Prêmios a pagar</small>
            {br.premios.map((p) => (
              <div key={`${p.mes}-${p.pessoa_id}`} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                <span><b>{p.loja_equipe?.nome.split(" ")[0] ?? "Pessoa"}</b> <span className="mudo">· {p.loja_equipe?.loja ?? ""} · {p.mes.slice(5)}/{p.mes.slice(0, 4)} · {p.estrelas} ⭐ · {brl(p.valor)}</span></span>
                <button type="button" className={`btn ${p.pago ? "s" : "p"} peq`} onClick={async () => { await destaqueBrasilPago(p.mes, p.pessoa_id, !p.pago); recarregarBr(); }}>{p.pago ? "Pago ✓ (desfazer)" : "Marcar como pago"}</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {premios.length > 0 && (
        <div className="card mb">
          <b>Prêmios da mentora</b>
          {premios.map((p) => (
            <div key={`${p.mes}-${p.portal_id}`} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <span><b>{p.portais?.loja ?? "Loja"}</b> <span className="mudo">· {p.mes.slice(5)}/{p.mes.slice(0, 4)} · {p.pontos.toLocaleString("pt-BR")} pontos · {brl(p.valor)}</span></span>
              <button type="button" className={`btn ${p.pago ? "s" : "p"} peq`} onClick={async () => { await premioMentoraPago(p.mes, p.portal_id, !p.pago); recarregar(); }}>{p.pago ? "Pago ✓ (desfazer)" : "Marcar como pago"}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
