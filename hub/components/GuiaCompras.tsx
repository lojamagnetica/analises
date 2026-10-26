"use client";

import { useEffect, useState } from "react";
import { Excluir } from "@/components/Excluir";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { MESES_ABREV, dataHora, moeda } from "@/lib/formato";
import { nomeMes, numeroDe } from "@/lib/caixa";
import { MESES_PLANO, calcularOtb, mesesComVenda, resumoOtb, type PlanoOtb } from "@/lib/otb-conta";
import { COBERTURA_PADRAO, apagarOtb, buscarOtb, novoPedido, salvarOtb } from "@/lib/otb";

const mesCurto = (m: string) => `${MESES_ABREV[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const um = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Campo de dinheiro: aceita "200.000", "200000" ou "200 mil" sem brigar com quem digita. */
function Valor({ valor, mudar, rotulo }: { valor: number; mudar: (n: number) => void; rotulo: string }) {
  const [t, setT] = useState(valor ? valor.toLocaleString("pt-BR") : "");
  useEffect(() => { setT(valor ? valor.toLocaleString("pt-BR") : ""); }, [valor]);
  return (
    <input type="text" inputMode="numeric" aria-label={rotulo} value={t} placeholder="0" style={{ minWidth: 100 }}
      onChange={(e) => setT(e.target.value)}
      onBlur={() => { const n = numeroDe(t.replace(/\s*mil$/i, "000")) ?? 0; mudar(Math.max(0, Math.round(n))); }} />
  );
}

/** O Guia de compras (OTB): quanto a loja pode comprar em cada um dos próximos 6 meses, a preço de custo. */
export function GuiaCompras() {
  const { portal, pers, nome } = usePortal();
  const lojas = (portal.lojas ?? []).length > 1 ? portal.lojas : [""];
  const [loja, setLoja] = useState(lojas[0]);
  const { dados, recarregar } = useDados(() => buscarOtb(portal.id, loja, pers), [portal.id, loja]);
  const [p, setP] = useState<PlanoOtb | null>(null);
  const [sujo, setSujo] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  useEffect(() => { if (dados) { setP(dados.plano); setSujo(false); } }, [dados]);
  if (!dados || !p) return <Carregando />;

  const mudar = (n: Partial<PlanoOtb>) => { setP({ ...p, ...n }); setSujo(true); setAviso(null); };
  const linhas = calcularOtb(p);
  const r = resumoOtb(p, linhas);
  const meses = mesesComVenda(p);
  const n = Math.max(1, Math.round(p.cobertura));
  const salvar = async () => {
    try { await salvarOtb(portal.id, loja, p, nome); setSujo(false); setAviso({ ok: true, texto: "Plano de compra salvo." }); recarregar(); }
    catch (e) { setAviso({ ok: false, texto: (e as Error).message }); }
  };

  return (
    <div>
      {lojas.length > 1 && (
        <div className="chips mb" role="group" aria-label="Escolher a loja do plano">
          {lojas.map((l) => <button key={l} type="button" className={`chip ${l === loja ? "escolhido" : ""}`} onClick={() => setLoja(l)}>{l}</button>)}
        </div>
      )}

      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          {r.excesso > 0
            ? `Hoje o estoque cobre ${r.coberturaHoje != null ? um(r.coberturaHoje) : "—"} meses de venda, contra o alvo de ${n}. ${r.primeiraCompra ? `A primeira compra liberada é em ${nomeMes(r.primeiraCompra.mes).toLowerCase()} (${moeda(r.primeiraCompra.compra)} a custo).` : "Não há compra liberada nos próximos 6 meses: o foco é girar o que já tem."}`
            : `O estoque está dentro do alvo de ${n} meses. Nos próximos 6 meses a compra liberada soma ${moeda(r.compraTotal)} a custo.`}
        </p>
        <p className="ajuda" style={{ marginBottom: 0 }}>Compra liberada = estoque final alvo + venda do mês a custo − estoque do começo do mês − o que já foi comprado e chega no mês. O alvo é a venda a custo dos {n} meses seguintes. Tudo a preço de custo (venda ÷ markup).</p>
      </div>

      <div className="grade g3 mb">
        <div className={`card card-borda kpi`} style={{ ["--c" as string]: r.excesso > 0 ? "var(--red)" : "var(--green)" }}><small>Estoque hoje a custo</small><b>{moeda(r.estoque)}</b><small>Ideal: {moeda(r.alvo)}</small></div>
        <div className="card card-borda kpi" style={{ ["--c" as string]: r.coberturaHoje != null && r.coberturaHoje > n + 0.5 ? "var(--red)" : "var(--green)" }}><small>Cobertura</small><b>{r.coberturaHoje != null ? `${um(r.coberturaHoje)} meses` : "—"}</b><small>Ideal: {n} meses</small></div>
        <div className="card card-borda kpi" style={{ ["--c" as string]: r.excesso > 0 ? "var(--orange)" : "var(--green)" }}><small>Excesso a girar</small><b>{moeda(r.excesso)}</b><small className="mudo">{r.excesso > 0 ? "vira plano de giro" : "sem excesso"}</small></div>
        <div className="card kpi"><small>Já comprado a chegar</small><b>{moeda(r.jaComprado)}</b></div>
        <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--green)" }}><small>Compra liberada em 6 meses</small><b>{moeda(r.compraTotal)}</b></div>
        <div className="card kpi"><small>Primeira compra liberada</small><b style={{ fontSize: 22 }}>{r.primeiraCompra ? mesCurto(r.primeiraCompra.mes) : "—"}</b><small className="mudo">{r.primeiraCompra ? moeda(r.primeiraCompra.compra) : "nenhuma no período"}</small></div>
      </div>

      <div className="card mb">
        <h3 style={{ marginTop: 0 }}>Ponto de partida</h3>
        <div className="grade g4" style={{ gap: 12 }}>
          <div><label className="rotulo" htmlFor="otb-inicio">Primeiro mês</label><input id="otb-inicio" type="month" value={p.inicio} onChange={(e) => e.target.value && mudar({ inicio: e.target.value })} /></div>
          <div><label className="rotulo">Estoque no começo do mês (a custo)</label><Valor rotulo="Estoque no começo do mês a custo" valor={p.estoque_inicial} mudar={(v) => mudar({ estoque_inicial: v })} /></div>
          <div><label className="rotulo" htmlFor="otb-markup">Markup (venda ÷ custo)</label><input id="otb-markup" type="number" step="0.01" min="1" value={p.markup} onChange={(e) => mudar({ markup: Number(e.target.value) || 1 })} /></div>
          <div><label className="rotulo" htmlFor="otb-cob">Meses de cobertura</label><input id="otb-cob" type="number" min="1" max="6" value={p.cobertura} onChange={(e) => mudar({ cobertura: Math.min(6, Math.max(1, Number(e.target.value) || COBERTURA_PADRAO)) })} /></div>
        </div>
        <p className="ajuda">O estoque a custo é o valor do estoque a preço de venda dividido pelo markup. Os números começam com o que está nos Dados da loja e no Fechamento de caixa; ajuste com o relatório do seu sistema.</p>
      </div>

      <div className="secao">O teto de compra mês a mês (a custo)</div>
      <div className="card tabela-wrap mb">
        <table className="tabela">
          <thead><tr><th>Mês</th><th>Venda planejada</th><th>Venda a custo</th><th>Estoque no começo</th><th>Já comprado a chegar</th><th>Estoque final alvo</th><th>Compra liberada</th><th>Cobertura</th></tr></thead>
          <tbody>
            {meses.map((m, i) => {
              const l = linhas[i];
              const venda = <Valor rotulo={`Venda planejada de ${mesCurto(m)}`} valor={p.vendas[m] ?? 0} mudar={(v) => mudar({ vendas: { ...p.vendas, [m]: v } })} />;
              if (!l) return (
                <tr key={m} className="mudo"><td>{mesCurto(m)}</td><td>{venda}</td><td colSpan={6}><small>Só entra no estoque alvo dos meses anteriores.</small></td></tr>
              );
              return (
                <tr key={m}>
                  <td><b>{mesCurto(m)}</b></td>
                  <td>{venda}</td>
                  <td>{moeda(l.vendaCusto)}</td>
                  <td>{moeda(l.inicial)}</td>
                  <td>{l.chegando ? moeda(l.chegando) : "—"}</td>
                  <td>{moeda(l.alvo)}</td>
                  <td><b style={{ color: l.compra > 0 ? "var(--green)" : "var(--muted)" }}>{l.compra > 0 ? moeda(l.compra) : "—"}</b></td>
                  <td><span className={`selo ${l.cobertura != null && l.cobertura > n + 0.5 ? "alerta" : "feito"}`}>{l.cobertura != null ? `${um(l.cobertura)} meses` : "—"}</span></td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 700 }}><td>Total {MESES_PLANO} meses</td><td>{moeda(linhas.reduce((s, l) => s + l.venda, 0))}</td><td colSpan={2} /><td>{moeda(linhas.reduce((s, l) => s + l.chegando, 0))}</td><td /><td>{moeda(r.compraTotal)}</td><td /></tr>
          </tbody>
        </table>
      </div>

      <div className="secao">Já comprado a chegar</div>
      <div className="card mb">
        <p className="ajuda" style={{ marginTop: 0 }}>Cada pedido entra na conta no mês em que a mercadoria CHEGA na loja, não no mês em que foi feito. Valor a custo.</p>
        {p.pedidos.map((x, i) => (
          <div key={x.id} className="linha" style={{ gap: 8, marginBottom: 8 }}>
            <input type="text" aria-label="Pedido" value={x.descricao} placeholder="Ex.: coleção de verão da marca X" style={{ flex: "1 1 220px", width: "auto" }} onChange={(e) => mudar({ pedidos: p.pedidos.map((y, j) => (j === i ? { ...y, descricao: e.target.value } : y)) })} />
            <input type="month" aria-label="Mês de chegada" value={x.mes} style={{ width: 160 }} onChange={(e) => mudar({ pedidos: p.pedidos.map((y, j) => (j === i ? { ...y, mes: e.target.value } : y)) })} />
            <div style={{ width: 150 }}><Valor rotulo="Valor do pedido a custo" valor={x.valor} mudar={(v) => mudar({ pedidos: p.pedidos.map((y, j) => (j === i ? { ...y, valor: v } : y)) })} /></div>
            <Excluir pergunta={`Excluir o pedido "${x.descricao || "sem nome"}"?`} fazer={async () => undefined} aoFim={() => mudar({ pedidos: p.pedidos.filter((y) => y.id !== x.id) })} />
          </div>
        ))}
        <button type="button" className="btn s peq" onClick={() => mudar({ pedidos: [...p.pedidos, novoPedido(p.inicio)] })}>+ Pedido já feito</button>
      </div>

      <div className="secao">Como usar</div>
      <div className="card mb">
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>Não compre acima da compra liberada do mês. Mês com zero: só reponha peça âncora que já provou venda, e desconte no mês seguinte.</li>
          <li>Lance todo pedido novo no mês em que ele chega na loja.</li>
          <li>Todo começo de mês, na reunião de meta, atualize o estoque e a venda real e revise os meses seguintes. Vendeu abaixo do plano, o teto baixa; acima, abre antes.</li>
          <li>Estoque acima do alvo vira plano de giro: Carteira Ativa, combos, outlet e as datas fortes.</li>
        </ol>
      </div>

      {aviso && <div className={`aviso mb ${aviso.ok ? "ok" : ""}`}>{aviso.texto}</div>}
      <div className="linha entre">
        <div className="linha" style={{ gap: 8 }}>
          <button type="button" className="btn p" onClick={salvar}>Salvar o plano de compra</button>
          {sujo && <span className="selo alerta">alterações não salvas</span>}
          {dados.atualizado && !sujo && <small className="mudo">Salvo {dataHora(dados.atualizado)}{dados.por ? ` por ${dados.por}` : ""}</small>}
        </div>
        {dados.id && <Excluir rotulo="Recomeçar com os números do Hub" pergunta="Apagar o plano salvo e recomeçar com os números do Hub?" fazer={() => apagarOtb(dados.id!)} aoFim={recarregar} />}
      </div>
    </div>
  );
}
