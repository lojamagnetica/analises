"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import {
  PA_IDEAL, arredondarGanho, buscarCaixa, daLoja, diagnosticar, fmtPa, fraseFoco, indicadores, mesDeHoje, mesValido, nomeMes, numeroDe,
  pmDoEstoque, somar, somarMes, type Foco, type PmEstoque,
} from "@/lib/caixa";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const ETAPA_ESTOQUE = "/personalizacao/etapa?n=8";
const gincanas = (indicador: string) => `/pessoas/gincanas?ind=${encodeURIComponent(indicador)}`;

type Acao = { texto: string; link?: { href: string; rotulo: string } };
const FOCOS: Record<Foco["tipo"], { titulo: string; resumo: string; acoes: Acao[] }> = {
  pa: {
    titulo: "Vender mais peças em cada venda",
    resumo: "O PA está abaixo de 2,5: quem compra leva uma peça e vai embora. O foco é a venda adicional, o leva junto.",
    acoes: [
      { texto: "Em todo atendimento, ofereça a peça que leva junto: a que completa o look que já foi escolhido." },
      { texto: "Treine o time com os scripts de venda adicional e use todos os dias.", link: { href: "/scripts", rotulo: "Abrir os scripts" } },
      { texto: "Rode uma gincana de PA por uma semana, com o prêmio anunciado antes.", link: { href: gincanas("Peças por atendimento"), rotulo: "Ver gincanas de PA" } },
      { texto: "Olhe o PA do fechamento de cada dia e comente com o time na manhã seguinte." },
    ],
  },
  pm: {
    titulo: "Vender no preço médio do estoque",
    resumo: "O preço médio vendido está abaixo do preço médio do estoque: a loja vende as peças mais baratas ou dá desconto demais, e as peças caras ficam paradas.",
    acoes: [
      { texto: "Comece o atendimento pela peça de desejo: mostre primeiro a peça de maior valor e só depois as de entrada." },
      { texto: "Revise a política de desconto: quem pode dar, quanto e em que situação. Desconto não é argumento de venda." },
      { texto: "Separe as peças caras paradas e monte uma ação para elas: vitrine, provador, conteúdo e uma meta para o time." },
      { texto: "Rode uma gincana de ticket médio.", link: { href: gincanas("Ticket médio"), rotulo: "Ver gincanas de ticket médio" } },
    ],
  },
};

/** Abaixo, no ou acima do ideal (comparando como a loja lê o número). */
function Selo({ valor, ideal, casas = 0 }: { valor: number | null; ideal: number | null; casas?: number }) {
  if (valor == null || ideal == null) return <span className="selo espera">sem referência</span>;
  const r = (n: number) => Math.round(n * 10 ** casas) / 10 ** casas;
  if (r(valor) < r(ideal)) return <span className="selo alerta">abaixo do ideal</span>;
  return <span className="selo feito">{r(valor) > r(ideal) ? "acima do ideal" : "no ideal"}</span>;
}

function Barra({ valor, ideal }: { valor: number; ideal: number | null }) {
  if (!ideal) return null;
  const pct = Math.min(100, (valor / ideal) * 100);
  return <div className="barra mt" aria-hidden><i style={{ width: `${pct}%`, background: pct >= 99.5 ? "var(--green)" : undefined }} /></div>;
}

function Estimado({ pm }: { pm: PmEstoque }) {
  return pm.estimado ? <span className="selo espera" style={{ marginLeft: 6, fontSize: 11 }}>estimado</span> : null;
}

function SemPmEstoque() {
  return (
    <div className="card card-borda mt" style={{ ["--c" as string]: "var(--orange)" }}>
      <h3>Falta o preço médio do estoque</h3>
      <p style={{ marginTop: 0 }}>
        O ticket médio ideal é o preço médio do seu estoque × 2,5. Sem esse número, o Hub não consegue dizer se a loja está vendendo só as peças mais baratas.
      </p>
      <Link className="btn p peq" href={ETAPA_ESTOQUE}>Preencher Estoque e fornecedores</Link>
      <div className="ajuda">Não sabe o preço médio? Informe quanto tem em estoque e quantas peças: o Hub faz a conta.</div>
    </div>
  );
}

function Resultado() {
  const params = useSearchParams();
  const { portal, pers } = usePortal();
  const lojas = portal.lojas ?? [];
  const varias = lojas.length > 1;
  const todas = lojas.length === 2 ? "As duas lojas" : "Todas as lojas";
  const [mes, setMes] = useState(() => { const m = params.get("mes"); return mesValido(m) && m <= mesDeHoje() ? m : mesDeHoje(); });
  const [loja, setLoja] = useState(() => { const l = params.get("loja"); return l && lojas.includes(l) ? l : ""; });
  const { dados } = useDados(() => buscarCaixa(portal.id, mes), [portal.id, mes]);
  if (!dados) return <Carregando />;

  const pmEst = pmDoEstoque(pers.get(8)?.respostas);
  const lista = dados.filter((c) => daLoja(c, loja));
  const ind = indicadores(somar(lista));
  const diag = diagnosticar(ind, pmEst?.valor ?? null);
  const mesFechado = mes < mesDeHoje();
  const noMes = mesFechado ? "no mês" : "neste mês, só com as vendas lançadas";
  const onde = loja ? ` na ${loja}` : "";

  // Referência da Personalização (Metas e números) para quando ainda não há fechamento.
  const metas = pers.get(6)?.respostas;
  const ticketCadastro = numeroDe(metas?.ticket);
  const paCadastro = numeroDe(metas?.pa);

  const cabecalho = (
    <>
      <Titulo titulo="Resultado do mês" sub="PA, ticket médio e preço médio do mês, a partir do fechamento de caixa." />
      {varias && (
        <div className="linha mb" style={{ gap: 8 }} role="group" aria-label="Ver por loja">
          {["", ...lojas].map((l) => (
            <button key={l || "todas"} type="button" className="chip" aria-pressed={loja === l} onClick={() => setLoja(l)}
              style={loja === l ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)" } : undefined}>
              {l || todas}
            </button>
          ))}
        </div>
      )}
      <div className="linha entre mb">
        <div className="linha" style={{ gap: 6 }}>
          <button type="button" className="btn s peq" aria-label="Mês anterior" onClick={() => setMes(somarMes(mes, -1))}>‹</button>
          <b style={{ minWidth: 150, textAlign: "center" }}>{nomeMes(mes)}</b>
          <button type="button" className="btn s peq" aria-label="Próximo mês" disabled={!mesFechado} onClick={() => setMes(somarMes(mes, 1))}>›</button>
        </div>
        <Link className="btn s peq" href={`/gestao/caixa?mes=${mes}`}>Fechamento de caixa</Link>
      </div>
    </>
  );

  if (!diag) {
    return (
      <>
        {cabecalho}
        <div className="card">
          <h3>Sem fechamento de caixa em {nomeMes(mes).toLowerCase()}{onde}</h3>
          <p className="mudo" style={{ marginTop: 0 }}>
            O resultado sai do fechamento de cada dia: faturamento, número de vendas e peças vendidas. Lance os dias e os números aparecem aqui.
          </p>
          <Link className="btn p" href={`/gestao/caixa?mes=${mes}`}>Lançar o fechamento de caixa</Link>
        </div>
        {(ticketCadastro || paCadastro) && (
          <div className="card mt">
            <h3>Do seu cadastro</h3>
            <p className="mudo" style={{ marginTop: 0 }}>O que você informou em Metas e números, na Personalização. Vale como referência até os primeiros fechamentos.</p>
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", ...NUM }}>
              {ticketCadastro ? (
                <div className="kpi">
                  <small>Ticket médio <span className="selo espera" style={{ fontSize: 11 }}>do cadastro</span></small>
                  <b>{moeda(ticketCadastro)}</b>
                  {pmEst && <small>Ideal: {moeda(pmEst.valor * PA_IDEAL)}</small>}
                </div>
              ) : null}
              {paCadastro ? (
                <div className="kpi">
                  <small>PA <span className="selo espera" style={{ fontSize: 11 }}>do cadastro</span></small>
                  <b>{fmtPa(paCadastro)}</b>
                  <small>Ideal: {fmtPa(PA_IDEAL)}</small>
                </div>
              ) : null}
              {pmEst && (
                <div className="kpi">
                  <small>Preço médio do estoque<Estimado pm={pmEst} /></small>
                  <b>{moeda(pmEst.valor)}</b>
                </div>
              )}
            </div>
          </div>
        )}
        {!pmEst && <SemPmEstoque />}
      </>
    );
  }

  const { pa, tkm, pm } = ind as { pa: number; tkm: number; pm: number };
  const [principal] = diag.focos;

  return (
    <>
      {cabecalho}

      <div className="heroi mb">
        <div style={{ flex: 1, minWidth: 240 }}>
          <small style={{ opacity: 0.8, letterSpacing: ".08em", textTransform: "uppercase" }}>
            {loja || (varias ? todas : nomeMes(mes))} · {ind.dias} {ind.dias === 1 ? "dia lançado" : "dias lançados"}{mesFechado ? "" : " · mês em andamento"}
          </small>
          {principal ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: "4px 0 8px" }}>Foco do mês: {FOCOS[principal.tipo].titulo.toLowerCase()}</div>
              <p style={NUM}>{fraseFoco(principal, mesFechado)}</p>
              {diag.focos.length > 1 && diag.tkmIdeal != null && diag.ganhoTotal ? (
                <p className="mt" style={NUM}>
                  Com os dois no ideal (PA 2,5 e o preço médio do estoque), o TKM vai para {moeda(diag.tkmIdeal)}: +{moeda(arredondarGanho(diag.ganhoTotal))} {noMes}.
                </p>
              ) : null}
            </>
          ) : diag.pmOk ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: "4px 0 8px" }}>PA e preço médio no ideal</div>
              <p style={NUM}>Ticket médio de {moeda(tkm)}, com ideal de {moeda(diag.tkmIdeal ?? 0)}. Mantenha a rotina e suba a meta do próximo mês.</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: "4px 0 8px" }}>PA no ideal</div>
              <p>Falta o preço médio do estoque para saber se o ticket médio está no ideal.</p>
            </>
          )}
        </div>
      </div>

      <div className="secao">Os três números</div>
      <div className="grade g3" style={NUM}>
        <div className="card kpi">
          <div className="linha entre"><small>PA · peças por venda</small><Selo valor={pa} ideal={PA_IDEAL} casas={1} /></div>
          <b className="mt">{fmtPa(pa)}</b>
          <Barra valor={pa} ideal={PA_IDEAL} />
          <small>Ideal: {fmtPa(PA_IDEAL)}</small>
        </div>
        <div className="card kpi">
          <div className="linha entre"><small>TKM · ticket médio</small><Selo valor={tkm} ideal={diag.tkmIdeal} /></div>
          <b className="mt">{moeda(tkm)}</b>
          <Barra valor={tkm} ideal={diag.tkmIdeal} />
          <small>{diag.tkmIdeal != null ? `Ideal: ${moeda(diag.tkmIdeal)} (preço médio do estoque × 2,5)` : "Ideal: falta o preço médio do estoque"}</small>
        </div>
        <div className="card kpi">
          <div className="linha entre"><small>PM · preço médio vendido</small><Selo valor={pm} ideal={pmEst?.valor ?? null} /></div>
          <b className="mt">{moeda(pm)}</b>
          <Barra valor={pm} ideal={pmEst?.valor ?? null} />
          <small>
            {pmEst ? <>Do estoque: {moeda(pmEst.valor)}{pmEst.calculado ? " (valor ÷ peças)" : ""}<Estimado pm={pmEst} /></> : "Do estoque: não preenchido"}
          </small>
        </div>
      </div>
      {varias && pmEst && (
        <p className="ajuda">O preço médio do estoque é o mesmo para {lojas.join(" e ")}: por enquanto a Personalização é uma só para o portal.</p>
      )}
      {!pmEst && <SemPmEstoque />}

      {diag.focos.length > 0 && (
        <>
          <div className="secao">Ações de foco</div>
          <div className="grade g2">
            {diag.focos.map((f, n) => (
              <div key={f.tipo} className="card card-borda" style={{ ["--c" as string]: n === 0 ? "var(--red)" : "var(--orange)" }}>
                <div className="linha entre">
                  <small className="mudo" style={{ fontWeight: 700, letterSpacing: ".08em" }}>{n + 1}º FOCO</small>
                  <span className="selo andamento" style={NUM}>+{moeda(arredondarGanho(f.ganho))} {mesFechado ? "no mês" : "até agora"}</span>
                </div>
                <h3 style={{ margin: "6px 0" }}>{FOCOS[f.tipo].titulo}</h3>
                <p className="mudo" style={{ marginTop: 0 }}>{FOCOS[f.tipo].resumo}</p>
                <p style={NUM}>{fraseFoco(f, mesFechado)}</p>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  {FOCOS[f.tipo].acoes.map((a) => (
                    <li key={a.texto} style={{ marginBottom: 6 }}>
                      {a.texto}{a.link && <> <Link href={a.link.href}>{a.link.rotulo} →</Link></>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="secao">Resultado do mês{onde}</div>
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", ...NUM }}>
        <div className="card kpi"><small>Faturamento</small><b>{moeda(ind.faturamento)}</b></div>
        <div className="card kpi"><small>Vendas</small><b>{ind.vendas}</b></div>
        <div className="card kpi"><small>Peças vendidas</small><b>{ind.pecas}</b></div>
        <div className="card kpi"><small>Dias lançados</small><b>{ind.dias}</b></div>
      </div>

      {varias && !loja && (
        <div className="card mt tabela-wrap">
          <table className="tabela" style={NUM}>
            <thead><tr><th>Loja</th><th>Faturamento</th><th>Vendas</th><th>PA</th><th>TKM</th><th>PM</th></tr></thead>
            <tbody>
              {[...lojas, ""].map((l) => {
                const i = indicadores(somar(l ? dados.filter((c) => c.loja === l) : dados));
                return (
                  <tr key={l || "total"}>
                    <td>{l ? <button type="button" className="chip" onClick={() => setLoja(l)}>{l}</button> : <b>Total</b>}</td>
                    <td>{moeda(i.faturamento)}</td>
                    <td>{i.vendas}</td>
                    <td>{i.pa != null ? fmtPa(i.pa) : "—"}</td>
                    <td>{i.tkm != null ? moeda(i.tkm) : "—"}</td>
                    <td>{i.pm != null ? moeda(i.pm) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card mt">
        <details>
          <summary style={{ cursor: "pointer" }}><b>Como o resultado é calculado</b></summary>
          <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
            <li><b>PA</b> = peças vendidas ÷ número de vendas. Ideal: 2,5.</li>
            <li><b>TKM</b> (ticket médio) = faturamento ÷ número de vendas. É o PA × o preço médio.</li>
            <li><b>PM</b> (preço médio) = faturamento ÷ peças vendidas.</li>
            <li><b>TKM ideal</b> = preço médio do estoque × 2,5. O preço médio do estoque vem da Personalização, em Estoque e fornecedores.</li>
            <li>O ganho em reais usa o seu número de vendas do mês: o mesmo movimento, vendendo melhor.</li>
          </ul>
        </details>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Resultado /></Suspense>;
}
