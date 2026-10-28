"use client";

import { CampoReais } from "@/components/CampoReais";
import { moeda } from "@/lib/formato";
import { NOMES_FAIXA, faixaBatida, type DadosPlano, type MetaCanal } from "@/lib/plano-mes";

const pct = (n: number) => `${String(n).replace(".", ",")}%`;
const cresce = (c: MetaCanal, v: number) => (c.base && v ? ` (+${Math.round(((v - c.base) / c.base) * 1000) / 10}%)`.replace(".", ",") : "");

/** Editar as metas por canal: o ano passado e as 3 faixas, cada uma com a comissão do time e da gerente. */
export function MetasCanaisEditar({ canais, bonus, mudar }: {
  canais: MetaCanal[]; bonus: DadosPlano["bonus_geral"]; mudar: (x: Partial<DadosPlano>) => void;
}) {
  const troca = (i: number, c: MetaCanal) => mudar({ canais: canais.map((x, j) => (j === i ? c : x)) });
  const b = bonus ?? { quem: "", valores: [0, 0, 0] };
  return (
    <div className="mt">
      <b>Metas por canal</b>
      <p className="ajuda" style={{ marginTop: 2 }}>Cada canal com o que vendeu no mesmo mês do ano passado e 3 metas. Em cada meta: a comissão do time e a da gerente (em %). A Meta 1 da Loja é a meta do mês no Início e no fechamento de caixa.</p>
      {canais.map((c, i) => (
        <div key={c.canal} className="card mb" style={{ background: "var(--soft)", padding: 14 }}>
          <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{c.canal}</h3>
            <div style={{ minWidth: 220 }}><CampoReais rotulo="Vendeu no ano passado" vazio valor={c.base ?? 0} mudar={(v) => troca(i, { ...c, base: v || null })} /></div>
          </div>
          <div className="grade g3" style={{ gap: "0 12px" }}>
            {c.faixas.map((f, k) => {
              const tf = (x: Partial<typeof f>) => troca(i, { ...c, faixas: c.faixas.map((y, n) => (n === k ? { ...y, ...x } : y)) });
              return (
                <div key={k}>
                  <CampoReais rotulo={`${NOMES_FAIXA[k]}${cresce(c, f.valor)}`} vazio valor={f.valor} mudar={(v) => tf({ valor: v })} />
                  <div className="grade g2" style={{ gap: "0 8px" }}>
                    <CampoReais sem vazio rotulo="Comissão time %" valor={f.comissao} mudar={(v) => tf({ comissao: v })} />
                    <CampoReais sem vazio rotulo="Gerente %" valor={f.gerente} mudar={(v) => tf({ gerente: v })} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="card" style={{ background: "var(--soft)", padding: 14 }}>
        <b>Bônus quando todos os canais batem a meta</b>
        <p className="ajuda" style={{ margin: "2px 0 6px" }}>Para quem cuida de todos os canais (ex.: supervisor). Ganha o valor da faixa que TODOS os canais bateram.</p>
        <div className="grade g4" style={{ gap: "0 8px" }}>
          <div><label className="rotulo">Quem</label><input type="text" value={b.quem} placeholder="Ex.: supervisor" onChange={(e) => mudar({ bonus_geral: { ...b, quem: e.target.value } })} /></div>
          {NOMES_FAIXA.map((n, k) => (
            <CampoReais key={n} vazio rotulo={`Todos na ${n}`} valor={b.valores[k] ?? 0} mudar={(v) => mudar({ bonus_geral: { ...b, valores: b.valores.map((x, j) => (j === k ? v : x)) } })} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** As metas por canal só para ler (resumo do plano e painéis). vendido = quanto cada canal já vendeu, se souber. */
export function MetasCanaisResumo({ canais, bonus, vendido }: { canais: MetaCanal[]; bonus?: DadosPlano["bonus_geral"]; vendido?: Record<string, number> }) {
  const comMeta = canais.filter((c) => c.faixas.some((f) => f.valor));
  if (!comMeta.length) return null;
  const total = (k: number) => comMeta.reduce((s, c) => s + (c.faixas[k]?.valor ?? 0), 0);
  const baseTotal = comMeta.reduce((s, c) => s + (c.base ?? 0), 0);
  return (
    <div>
      <div className="tabela-wrap"><table className="tabela">
        <thead><tr><th>Canal</th><th>Ano passado</th>{NOMES_FAIXA.map((n) => <th key={n}>{n}</th>)}{vendido && <th>Vendido</th>}</tr></thead>
        <tbody>
          {comMeta.map((c) => {
            const v = vendido?.[c.canal];
            const bateu = v != null ? faixaBatida(c, v) : 0;
            return (
              <tr key={c.canal}>
                <td><b>{c.canal}</b></td>
                <td>{c.base ? moeda(c.base) : "—"}</td>
                {c.faixas.map((f, k) => (
                  <td key={k} style={{ background: bateu > k ? "color-mix(in srgb, var(--green, #2f7d4f) 12%, transparent)" : undefined }}>
                    <b>{f.valor ? moeda(f.valor) : "—"}</b><small className="mudo" style={{ display: "block" }}>{cresce(c, f.valor).replace(/[()]/g, "").trim()}</small>
                    {(f.comissao > 0 || f.gerente > 0) && <small className="mudo" style={{ display: "block" }}>{f.comissao ? `time ${pct(f.comissao)}` : ""}{f.comissao && f.gerente ? " · " : ""}{f.gerente ? `gerente ${pct(f.gerente)}` : ""}</small>}
                  </td>
                ))}
                {vendido && <td>{v != null ? <>{moeda(v)}<small className="mudo" style={{ display: "block" }}>{bateu ? `bateu a ${NOMES_FAIXA[bateu - 1]}` : "abaixo da Meta 1"}</small></> : "—"}</td>}
              </tr>
            );
          })}
          {comMeta.length > 1 && (
            <tr><td><b>Total</b></td><td>{baseTotal ? moeda(baseTotal) : "—"}</td>{NOMES_FAIXA.map((n, k) => <td key={n}><b>{moeda(total(k))}</b></td>)}{vendido && <td />}</tr>
          )}
        </tbody>
      </table></div>
      {bonus && bonus.valores.some(Boolean) && (
        <p style={{ margin: "8px 0 0" }}>🏆 <b>{bonus.quem || "Bônus geral"}:</b> todos os canais na Meta 1 = {moeda(bonus.valores[0] ?? 0)} · na Meta 2 = {moeda(bonus.valores[1] ?? 0)} · na Meta 3 = {moeda(bonus.valores[2] ?? 0)}</p>
      )}
    </div>
  );
}
