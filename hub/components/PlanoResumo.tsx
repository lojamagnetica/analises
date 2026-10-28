"use client";

import { MESES } from "@/lib/conteudo";
import { dia, moeda } from "@/lib/formato";
import { MetasCanaisResumo } from "@/components/MetasCanais";
import { RESULTADOS, completar, metaDoPlano, semanasDoMes, type LinhaPlano } from "@/lib/plano-mes";

/** O plano do mês só para ler: o que a Camilla vê para aprovar. */
export function PlanoResumo({ linha }: { linha: LinhaPlano }) {
  const d = completar(linha.dados, []);
  const meta = metaDoPlano(d);
  const nMes = Number(linha.mes.slice(5, 7)) - 1;
  const semanas = semanasDoMes(linha.mes);
  const res = (r: string) => RESULTADOS.find((x) => x.chave === r)?.nome ?? "sem avaliação";
  const datas = d.datas.filter((x) => x.trabalhar);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <b>1 · Meta:</b> {meta ? <>{moeda(meta)} <span className="mudo">{d.canais?.length ? "(Meta 1 da loja)" : `(${moeda(d.base ?? 0)} em ${MESES[nMes].toLowerCase()} do ano passado + ${d.crescimento}%)`}</span></> : <span className="mudo">sem meta</span>}
        {d.canais?.length ? <div className="mt"><MetasCanaisResumo canais={d.canais} bonus={d.bonus_geral} /></div> : null}
        {d.premiacao?.trim() && <div style={{ whiteSpace: "pre-wrap" }}><b>🏆 Premiação:</b> {d.premiacao.trim()}</div>}
      </div>
      <div>
        <b>2 · Ano passado:</b>
        {d.acoes_passadas.length ? (
          <ul style={{ margin: "4px 0" }}>{d.acoes_passadas.map((a, i) => <li key={i}>{a.titulo || "(sem nome)"} · <i>{res(a.resultado)}</i>{a.obs ? ` · ${a.obs}` : ""}</li>)}</ul>
        ) : <span className="mudo"> não preencheu</span>}
        <b>Ações deste mês:</b>
        {d.acoes.length ? (
          <ul style={{ margin: "4px 0" }}>{d.acoes.map((a, i) => <li key={i}>{a.titulo || "(sem nome)"}{a.inicio ? ` · começa ${dia(a.inicio)}` : ""}</li>)}</ul>
        ) : <span className="mudo"> nenhuma</span>}
      </div>
      <div>
        <b>3 · Datas especiais:</b>{" "}
        {datas.length ? datas.map((x) => `${x.titulo}${x.acao ? ` (${x.acao})` : ""}`).join(" · ") : <span className="mudo">nenhuma marcada</span>}
      </div>
      <div><b>4 · Produtos em destaque:</b> {d.produtos.filter(Boolean).join(" · ") || <span className="mudo">nenhum</span>}</div>
      <div className="grade g2" style={{ gap: 10 }}>
        {semanas.map((s, i) => (
          <div key={s.n} style={{ background: "var(--soft)", borderRadius: 12, padding: 10 }}>
            <b>Semana {s.n} · {s.de} a {s.ate}</b>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}><small className="mudo">Foco</small><br />{d.semanas[i].foco || "—"}</div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}><small className="mudo">Conteúdo</small><br />{d.semanas[i].conteudo || "—"}</div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}><small className="mudo">Exposição</small><br />{d.semanas[i].exposicao || "—"}</div>
          </div>
        ))}
      </div>
      {d.obs && <div><b>Recado da loja:</b> {d.obs}</div>}
    </div>
  );
}
