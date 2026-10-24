"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataHora, hoje, moeda } from "@/lib/formato";
import {
  NIVEIS, buscarDiagnosticos, caixaPorMes, classeNivel, completo, corNivel, criarDiagnostico, liberarDiagnostico, mesCurto,
  rotuloNivel, salvarDiagnostico, variacao, vazio,
  type Diagnostico, type LinhaDiagnostico, type Mes, type Nivel,
} from "@/lib/diagnostico";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const pct = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`);
const reais = (v: number | null) => (v == null ? "—" : moeda(v));
const num = (v: string) => { const n = Number(v.replace(/\./g, "").replace(",", ".")); return v.trim() === "" || Number.isNaN(n) ? null : n; };
const nomeDaVisao = (l: string, varias: boolean) => l || (varias ? "As lojas juntas" : "Visão geral");

type Muda = (f: (d: Diagnostico) => void) => void;

/** Texto que vira caixa de edição no modo de edição da equipe. */
function Texto({ v, ed, set, linhas = 3, ph, forte }: { v: string; ed: boolean; set: (s: string) => void; linhas?: number; ph?: string; forte?: boolean }) {
  if (ed) return <textarea value={v} rows={linhas} placeholder={ph} onChange={(e) => set(e.target.value)} />;
  if (!v) return null;
  return <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", fontWeight: forte ? 600 : undefined }}>{v}</p>;
}
function Campo({ v, ed, set, ph, largura }: { v: string; ed: boolean; set: (s: string) => void; ph?: string; largura?: number }) {
  return ed ? <input type="text" value={v} placeholder={ph} onChange={(e) => set(e.target.value)} style={largura ? { maxWidth: largura } : undefined} /> : <>{v}</>;
}
function Numero({ v, ed, set, fmt }: { v: number | null; ed: boolean; set: (n: number | null) => void; fmt: (n: number | null) => string }) {
  return ed ? <input type="text" inputMode="decimal" value={v ?? ""} onChange={(e) => set(num(e.target.value))} style={{ minWidth: 80 }} /> : <>{fmt(v)}</>;
}
function EscolheNivel({ v, set }: { v?: Nivel; set: (n: Nivel) => void }) {
  return (
    <select value={v ?? "atencao"} onChange={(e) => set(e.target.value as Nivel)} style={{ maxWidth: 140 }}>
      {NIVEIS.map((n) => <option key={n.v} value={n.v}>{n.rotulo}</option>)}
    </select>
  );
}
function Tirar({ ed, f }: { ed: boolean; f: () => void }) {
  return ed ? <button type="button" className="btn s peq" onClick={f} aria-label="Remover">Remover</button> : null;
}
function Mais({ ed, f, rotulo }: { ed: boolean; f: () => void; rotulo: string }) {
  return ed ? <button type="button" className="btn s peq mt" onClick={f}>+ {rotulo}</button> : null;
}

function Performance({ d, ed, muda, caixa }: { d: Diagnostico; ed: boolean; muda: Muda; caixa: Map<string, number> }) {
  // O número importado do relatório vale para o mês fechado; o fechamento de caixa do Hub preenche os meses sem número
  // (o mês atual aparece como parcial).
  const conhecidos = new Set(d.performance.meses.map((m) => m.mes));
  const doCaixa = [...caixa.keys()].filter((k) => !conhecidos.has(k)).map((k) => ({ mes: k, valor: null, anterior: null, meta: null }));
  const meses: (Mes & { doCaixa: boolean })[] = [...d.performance.meses, ...doCaixa]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((m) => (m.valor == null && caixa.has(m.mes) ? { ...m, valor: caixa.get(m.mes) ?? null, doCaixa: true } : { ...m, doCaixa: false }));
  const atual = hoje().slice(0, 7);
  const ultimos = meses.filter((m) => m.valor != null).slice(-3);
  return (
    <>
      {ultimos.length > 0 && (
        <div className="grade g3">
          {ultimos.map((m) => {
            const parcial = m.mes === atual;
            const vsAno = parcial ? null : variacao(m.valor, m.anterior);
            const vsMeta = m.meta ? ((m.valor ?? 0) / m.meta) * 100 : null;
            return (
              <div key={m.mes} className="card card-borda kpi" style={{ ["--c" as string]: parcial ? "var(--blue)" : vsMeta != null && vsMeta < 100 ? "var(--orange)" : "var(--green)" }}>
                <small>{mesCurto(m.mes)}{m.doCaixa ? (m.mes === atual ? " · até hoje, pelo fechamento" : " · pelo fechamento") : ""}</small>
                <b style={NUM}>{reais(m.valor)}</b>
                {!parcial && <small>{vsAno != null ? `${pct(vsAno)} sobre o ano anterior` : "sem ano anterior"}</small>}
                {vsMeta != null && <small>{vsMeta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% da meta de {moeda(m.meta ?? 0)}{parcial ? " até agora" : ""}</small>}
              </div>
            );
          })}
        </div>
      )}
      <Texto v={d.performance.leitura} ed={ed} set={(s) => muda((x) => { x.performance.leitura = s; })} ph="Leitura da performance e foco do objetivo" />
      {(meses.length > 0 || ed) && (
        <details className="mt" open={ed}>
          <summary style={{ cursor: "pointer" }}><b>Todos os meses</b></summary>
          <div style={{ overflowX: "auto" }}>
            <table className="tabela mt">
              <thead><tr><th>Mês</th><th>Faturamento</th><th>Ano anterior</th><th>Variação</th><th>Meta</th>{ed && <th />}</tr></thead>
              <tbody>
                {meses.map((m) => ({ m, i: d.performance.meses.findIndex((x) => x.mes === m.mes) })).filter(({ m, i }) => !ed || i >= 0 || m.mes === "").map(({ m, i }) => (
                  <tr key={`${m.mes}-${i}`}>
                    <td>{ed ? <Campo v={m.mes} ed set={(s) => muda((x) => { x.performance.meses[i].mes = s; })} ph="2026-09" largura={100} /> : mesCurto(m.mes)}</td>
                    <td style={NUM}>{ed ? <Numero v={d.performance.meses[i].valor} ed set={(n) => muda((x) => { x.performance.meses[i].valor = n; })} fmt={reais} /> : <>{reais(m.valor)}{m.doCaixa && <small className="mudo"> (fechamento)</small>}</>}</td>
                    <td style={NUM}><Numero v={m.anterior} ed={ed} set={(n) => muda((x) => { x.performance.meses[i].anterior = n; })} fmt={reais} /></td>
                    <td style={NUM}>{pct(variacao(m.valor, m.anterior))}</td>
                    <td style={NUM}><Numero v={m.meta} ed={ed} set={(n) => muda((x) => { x.performance.meses[i].meta = n; })} fmt={reais} /></td>
                    {ed && <td><Tirar ed f={() => muda((x) => { x.performance.meses.splice(i, 1); })} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Mais ed={ed} rotulo="mês" f={() => muda((x) => { x.performance.meses.push({ mes: "", valor: null, anterior: null, meta: null }); })} />
        </details>
      )}
    </>
  );
}

function Corpo({ d, ed, muda, caixa, equipeHub }: { d: Diagnostico; ed: boolean; muda: Muda; caixa: Map<string, number>; equipeHub: boolean }) {
  const ordem: Record<Nivel, number> = { critico: 0, atencao: 1, ok: 2 };
  const alertas = ed ? d.alertas.map((a, i) => ({ a, i })) : d.alertas.map((a, i) => ({ a, i })).sort((x, y) => ordem[x.a.nivel] - ordem[y.a.nivel]);
  return (
    <>
      <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
        <h3 style={{ margin: 0 }}>Cenário e foco</h3>
        <Texto v={d.cenario.resumo} ed={ed} set={(s) => muda((x) => { x.cenario.resumo = s; })} linhas={4} ph="O cenário da loja em poucas linhas" forte />
        {(d.cenario.objetivo || ed) && (
          <div className="mt"><small className="mudo">Objetivo</small><Texto v={d.cenario.objetivo} ed={ed} set={(s) => muda((x) => { x.cenario.objetivo = s; })} linhas={2} /></div>
        )}
        {(d.cenario.foco.length > 0 || ed) && (
          <div className="mt">
            <small className="mudo">Foco agora</small>
            <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}>
              {d.cenario.foco.map((f, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {ed ? <div className="linha"><input type="text" value={f} onChange={(e) => muda((x) => { x.cenario.foco[i] = e.target.value; })} style={{ flex: 1 }} /><Tirar ed f={() => muda((x) => { x.cenario.foco.splice(i, 1); })} /></div> : f}
                </li>
              ))}
            </ol>
            <Mais ed={ed} rotulo="foco" f={() => muda((x) => { x.cenario.foco.push(""); })} />
          </div>
        )}
      </div>

      <div className="secao">Performance dos últimos 3 meses</div>
      <Performance d={d} ed={ed} muda={muda} caixa={caixa} />

      <div className="secao">Estoque e cobertura</div>
      <div className="grade g4">
        {d.estoque.indicadores.map((k, i) => (
          <div key={i} className="card card-borda kpi" style={{ ["--c" as string]: corNivel(k.nivel) }}>
            {ed ? (
              <div style={{ display: "grid", gap: 6 }}>
                <input type="text" value={k.rotulo} placeholder="Indicador" onChange={(e) => muda((x) => { x.estoque.indicadores[i].rotulo = e.target.value; })} />
                <input type="text" value={k.valor} placeholder="Valor" onChange={(e) => muda((x) => { x.estoque.indicadores[i].valor = e.target.value; })} />
                <input type="text" value={k.ideal} placeholder="Ideal" onChange={(e) => muda((x) => { x.estoque.indicadores[i].ideal = e.target.value; })} />
                <input type="text" value={k.nota} placeholder="Nota" onChange={(e) => muda((x) => { x.estoque.indicadores[i].nota = e.target.value; })} />
                <EscolheNivel v={k.nivel} set={(n) => muda((x) => { x.estoque.indicadores[i].nivel = n; })} />
                <Tirar ed f={() => muda((x) => { x.estoque.indicadores.splice(i, 1); })} />
              </div>
            ) : (
              <>
                <small>{k.rotulo}</small>
                <b style={NUM}>{k.valor}</b>
                {k.ideal && <small>Ideal: {k.ideal}</small>}
                {k.nota && <small className="mudo">{k.nota}</small>}
              </>
            )}
          </div>
        ))}
      </div>
      <Mais ed={ed} rotulo="indicador" f={() => muda((x) => { x.estoque.indicadores.push({ rotulo: "", valor: "", ideal: "", nivel: "atencao", nota: "" }); })} />
      <Texto v={d.estoque.leitura} ed={ed} set={(s) => muda((x) => { x.estoque.leitura = s; })} ph="Leitura do estoque" />

      {(d.alertas.length > 0 || ed) && (
        <>
          <div className="secao">O que os dados mostram e o que fazer</div>
          {alertas.map(({ a, i }) => (
            <div key={i} className="card card-borda mb" style={{ ["--c" as string]: corNivel(a.nivel) }}>
              <div className="grade-alerta">
                <div>
                  <div className="linha" style={{ gap: 6 }}>
                    {ed ? <EscolheNivel v={a.nivel} set={(n) => muda((x) => { x.alertas[i].nivel = n; })} /> : <span className={`selo ${classeNivel(a.nivel)}`}>{rotuloNivel(a.nivel)}</span>}
                  </div>
                  {ed ? <input className="mt" type="text" value={a.alerta} placeholder="Alerta" onChange={(e) => muda((x) => { x.alertas[i].alerta = e.target.value; })} /> : <h3 style={{ margin: "8px 0 0" }}>{a.alerta}</h3>}
                  <Texto v={a.dado} ed={ed} set={(s) => muda((x) => { x.alertas[i].dado = s; })} linhas={2} ph="O dado que mostra isso" />
                </div>
                <div className="acao-alerta">
                  <small className="mudo">O que fazer</small>
                  <Texto v={a.acao} ed={ed} set={(s) => muda((x) => { x.alertas[i].acao = s; })} linhas={3} ph="Ação" />
                  {(a.prazo || a.quem || ed) && (
                    <small className="mudo" style={{ display: "block", marginTop: 6 }}>
                      {ed ? (
                        <span className="linha" style={{ gap: 6 }}>
                          <input type="text" value={a.prazo} placeholder="Prazo" onChange={(e) => muda((x) => { x.alertas[i].prazo = e.target.value; })} style={{ maxWidth: 160 }} />
                          <input type="text" value={a.quem} placeholder="Quem" onChange={(e) => muda((x) => { x.alertas[i].quem = e.target.value; })} style={{ maxWidth: 160 }} />
                        </span>
                      ) : [a.prazo && `Prazo: ${a.prazo}`, a.quem && `Quem: ${a.quem}`].filter(Boolean).join(" · ")}
                    </small>
                  )}
                </div>
              </div>
              {ed && <div className="mt"><Tirar ed f={() => muda((x) => { x.alertas.splice(i, 1); })} /></div>}
            </div>
          ))}
          <Mais ed={ed} rotulo="alerta" f={() => muda((x) => { x.alertas.push({ nivel: "atencao", alerta: "", dado: "", acao: "", prazo: "", quem: "" }); })} />
        </>
      )}

      {(d.abc.linhas.length > 0 || ed) && (
        <>
          <div className="secao">{ed ? "Curva ABC" : d.abc.titulo || "Curva ABC"}</div>
          {ed && <input type="text" value={d.abc.titulo} placeholder="Título" onChange={(e) => muda((x) => { x.abc.titulo = e.target.value; })} className="mb" />}
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="tabela">
              <thead><tr><th>{d.abc.coluna || "Linha"}</th><th>Curva</th><th>Peças</th><th>% das peças</th><th>Faturado</th><th>Preço médio</th><th>Faixa que mais vende</th><th>Estoque (peças)</th>{ed && <th />}</tr></thead>
              <tbody>
                {d.abc.linhas.map((l, i) => (
                  <tr key={i}>
                    <td><Campo v={l.nome} ed={ed} set={(s) => muda((x) => { x.abc.linhas[i].nome = s; })} /></td>
                    <td>{ed
                      ? <select value={l.curva} onChange={(e) => muda((x) => { x.abc.linhas[i].curva = e.target.value as "A" | "B" | "C" | ""; })}><option value="">—</option><option>A</option><option>B</option><option>C</option></select>
                      : l.curva && <span className={`selo ${l.curva === "A" ? "feito" : l.curva === "B" ? "andamento" : "espera"}`}>{l.curva}</span>}</td>
                    <td style={NUM}><Numero v={l.pecas} ed={ed} set={(n) => muda((x) => { x.abc.linhas[i].pecas = n; })} fmt={(n) => (n == null ? "—" : String(n))} /></td>
                    <td style={NUM}><Numero v={l.pct} ed={ed} set={(n) => muda((x) => { x.abc.linhas[i].pct = n; })} fmt={(n) => (n == null ? "—" : `${n}%`)} /></td>
                    <td style={NUM}><Numero v={l.faturado} ed={ed} set={(n) => muda((x) => { x.abc.linhas[i].faturado = n; })} fmt={reais} /></td>
                    <td style={NUM}><Numero v={l.pm} ed={ed} set={(n) => muda((x) => { x.abc.linhas[i].pm = n; })} fmt={reais} /></td>
                    <td><Campo v={l.faixa} ed={ed} set={(s) => muda((x) => { x.abc.linhas[i].faixa = s; })} /></td>
                    <td style={NUM}><Numero v={l.estoque} ed={ed} set={(n) => muda((x) => { x.abc.linhas[i].estoque = n; })} fmt={(n) => (n == null ? "—" : String(n))} /></td>
                    {ed && <td><Tirar ed f={() => muda((x) => { x.abc.linhas.splice(i, 1); })} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <Mais ed={ed} rotulo="linha" f={() => muda((x) => { x.abc.linhas.push({ nome: "", pecas: null, pct: null, curva: "", faturado: null, pm: null, faixa: "", estoque: null }); })} />
          </div>
          <Texto v={d.abc.nota} ed={ed} set={(s) => muda((x) => { x.abc.nota = s; })} linhas={2} ph="Como ler a curva desta loja" />
        </>
      )}

      {(d.marcas.length > 0 || ed) && (
        <>
          <div className="secao">Fornecedores e marcas</div>
          <div className="grade g3">
            {d.marcas.map((m, i) => (
              <div key={i} className="card card-borda" style={{ ["--c" as string]: corNivel(m.nivel) }}>
                <div className="linha entre">
                  {ed ? <input type="text" value={m.nome} placeholder="Marca" onChange={(e) => muda((x) => { x.marcas[i].nome = e.target.value; })} style={{ flex: 1 }} /> : <h3 style={{ margin: 0 }}>{m.nome}</h3>}
                  {ed ? <EscolheNivel v={m.nivel} set={(n) => muda((x) => { x.marcas[i].nivel = n; })} /> : <span className={`selo ${classeNivel(m.nivel)}`}>{rotuloNivel(m.nivel)}</span>}
                </div>
                <small className="mudo" style={{ display: "block", marginTop: 6 }}>
                  {ed ? (
                    <span style={{ display: "grid", gap: 6 }}>
                      <input type="text" value={m.participacao} placeholder="Participação nas vendas" onChange={(e) => muda((x) => { x.marcas[i].participacao = e.target.value; })} />
                      <input type="text" value={m.parado} placeholder="Parado" onChange={(e) => muda((x) => { x.marcas[i].parado = e.target.value; })} />
                    </span>
                  ) : [m.participacao, m.parado && `Parado: ${m.parado}`].filter(Boolean).join(" · ")}
                </small>
                <Texto v={m.leitura} ed={ed} set={(s) => muda((x) => { x.marcas[i].leitura = s; })} linhas={2} ph="Leitura" />
                {(m.acao || ed) && <div className="mt"><small className="mudo">O que fazer</small><Texto v={m.acao} ed={ed} set={(s) => muda((x) => { x.marcas[i].acao = s; })} linhas={2} /></div>}
                {ed && <div className="mt"><Tirar ed f={() => muda((x) => { x.marcas.splice(i, 1); })} /></div>}
              </div>
            ))}
          </div>
          <Mais ed={ed} rotulo="marca" f={() => muda((x) => { x.marcas.push({ nome: "", participacao: "", parado: "", nivel: "atencao", leitura: "", acao: "" }); })} />
        </>
      )}

      {(d.linhas.length > 0 || ed) && (
        <>
          <div className="secao">Linhas que precisam de atenção e como gerar desejo</div>
          <div className="grade g3">
            {d.linhas.map((l, i) => (
              <div key={i} className="card card-borda" style={{ ["--c" as string]: corNivel(l.nivel) }}>
                <div className="linha entre">
                  {ed ? <input type="text" value={l.nome} placeholder="Linha" onChange={(e) => muda((x) => { x.linhas[i].nome = e.target.value; })} style={{ flex: 1 }} /> : <h3 style={{ margin: 0 }}>{l.nome}</h3>}
                  {ed ? <EscolheNivel v={l.nivel} set={(n) => muda((x) => { x.linhas[i].nivel = n; })} /> : <span className={`selo ${classeNivel(l.nivel)}`}>{rotuloNivel(l.nivel)}</span>}
                </div>
                {(l.parado || ed) && <small className="mudo" style={{ display: "block", marginTop: 6 }}>{ed ? <input type="text" value={l.parado} placeholder="Parado" onChange={(e) => muda((x) => { x.linhas[i].parado = e.target.value; })} /> : `Parado: ${l.parado}`}</small>}
                <Texto v={l.leitura} ed={ed} set={(s) => muda((x) => { x.linhas[i].leitura = s; })} linhas={2} ph="Leitura" />
                {(l.desejo || ed) && <div className="mt desejo"><small>Como gerar desejo</small><Texto v={l.desejo} ed={ed} set={(s) => muda((x) => { x.linhas[i].desejo = s; })} linhas={3} /></div>}
                {ed && <div className="mt"><Tirar ed f={() => muda((x) => { x.linhas.splice(i, 1); })} /></div>}
              </div>
            ))}
          </div>
          <Mais ed={ed} rotulo="linha" f={() => muda((x) => { x.linhas.push({ nome: "", parado: "", nivel: "atencao", leitura: "", desejo: "" }); })} />
        </>
      )}

      {(d.equipe.leitura || d.equipe.pessoas.length > 0 || ed) && (
        <>
          <div className="secao">Equipe</div>
          <div className="card">
            <Texto v={d.equipe.leitura} ed={ed} set={(s) => muda((x) => { x.equipe.leitura = s; })} ph="Leitura da equipe" />
            {d.equipe.pessoas.map((p, i) => (
              <div key={i} className="pessoa-diag">
                {ed ? (
                  <div className="linha" style={{ gap: 6 }}>
                    <input type="text" value={p.nome} placeholder="Nome" onChange={(e) => muda((x) => { x.equipe.pessoas[i].nome = e.target.value; })} style={{ maxWidth: 180 }} />
                    <input type="text" value={p.funcao} placeholder="Função" onChange={(e) => muda((x) => { x.equipe.pessoas[i].funcao = e.target.value; })} style={{ maxWidth: 220 }} />
                    <Tirar ed f={() => muda((x) => { x.equipe.pessoas.splice(i, 1); })} />
                  </div>
                ) : <b>{p.nome}{p.funcao && <span className="mudo" style={{ fontWeight: 400 }}> · {p.funcao}</span>}</b>}
                <Texto v={p.nota} ed={ed} set={(s) => muda((x) => { x.equipe.pessoas[i].nota = s; })} linhas={2} ph="O que observar e desenvolver" />
              </div>
            ))}
            <Mais ed={ed} rotulo="pessoa" f={() => muda((x) => { x.equipe.pessoas.push({ nome: "", funcao: "", nota: "" }); })} />
            {!equipeHub && <div className="mt"><Link className="btn s peq" href="/pessoas">Minha equipe e perfis</Link></div>}
          </div>
        </>
      )}

      {(d.data_base || d.fontes || ed) && (
        <div className="ajuda mt" style={{ marginTop: 28 }}>
          {ed ? (
            <div style={{ display: "grid", gap: 6 }}>
              <input type="text" value={d.data_base} placeholder="Data base dos números (ex.: estoque de 01/10/2026)" onChange={(e) => muda((x) => { x.data_base = e.target.value; })} />
              <textarea value={d.fontes} rows={2} placeholder="De onde vieram os números" onChange={(e) => muda((x) => { x.fontes = e.target.value; })} />
            </div>
          ) : <>{d.data_base && <>Base: {d.data_base}. </>}{d.fontes}</>}
        </div>
      )}
    </>
  );
}

function DiagnosticoDaLoja() {
  const params = useSearchParams();
  const { portal, equipe } = usePortal();
  const varias = (portal.lojas ?? []).length > 1;
  const [escolhida, setEscolhida] = useState<string | null>(params.get("loja"));
  const [ed, setEd] = useState(false);
  const [d, setD] = useState<Diagnostico | null>(null);
  const [salvo, setSalvo] = useState(true);
  const [msg, setMsg] = useState("");
  const { dados, recarregar } = useDados(() => buscarDiagnosticos(portal.id), [portal.id]);

  const linhas: LinhaDiagnostico[] = dados ?? [];
  const atual = linhas.find((l) => l.loja === escolhida) ?? linhas[0] ?? null;
  const chave = atual ? `${atual.loja}|${atual.updated_at}` : "";
  const desde = (atual?.dados.performance?.meses ?? []).map((m) => m.mes).filter(Boolean).sort()[0] ?? "2026-01";
  const { dados: caixa } = useDados(() => (atual ? caixaPorMes(portal.id, atual.loja, desde) : Promise.resolve(new Map<string, number>())), [portal.id, atual?.loja, desde]);

  useEffect(() => { setD(atual ? completo(atual.dados) : null); setSalvo(true); setEd(false); }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dados) return <Carregando />;

  const muda: Muda = (f) => setD((prev) => { const c = structuredClone(prev ?? vazio()); f(c); return c; });
  const mudaSalvo: Muda = (f) => { muda(f); setSalvo(false); };
  const fazer = async (f: () => Promise<void>, ok: string) => {
    setMsg("");
    try { await f(); setMsg(ok); recarregar(); } catch (e) { setMsg(e instanceof Error ? e.message : "Não deu certo."); }
  };

  const cabecalho = (
    <>
      <Titulo titulo="Diagnóstico da loja" sub="O retrato da loja hoje: cenário, performance, estoque, curva ABC, marcas, linhas e equipe. Cada alerta vem com a ação." />
      {linhas.length > 1 && (
        <div className="chips mb" role="group" aria-label="Escolher a loja">
          {linhas.map((l) => (
            <button key={l.loja} type="button" className={`chip ${atual?.loja === l.loja ? "escolhido" : ""}`} onClick={() => setEscolhida(l.loja)}>
              {nomeDaVisao(l.loja, varias)}{equipe && l.status === "rascunho" ? " · rascunho" : ""}
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (!atual || !d) {
    return (
      <>
        {cabecalho}
        {equipe ? (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Este portal ainda não tem diagnóstico</h3>
            <p className="mudo">Crie o diagnóstico e preencha a partir dos relatórios da loja. Ele fica em rascunho até você liberar.</p>
            <div className="linha">
              {(varias ? ["", ...portal.lojas] : [""]).map((l, i) => (
                <button key={l || "geral"} type="button" className="btn p peq" onClick={() => fazer(() => criarDiagnostico(portal.id, l, i), "Diagnóstico criado.")}>
                  Criar {varias ? nomeDaVisao(l, true) : "o diagnóstico"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
            <h3 style={{ marginTop: 0 }}>Seu diagnóstico está sendo montado</h3>
            <p className="mudo" style={{ marginTop: 0 }}>A equipe está cruzando os seus relatórios e os Dados da loja. Assim que ficar pronto, ele aparece aqui. Enquanto isso, acompanhe o resultado do mês.</p>
            <div className="linha"><Link className="btn s peq" href="/gestao/resultado">Resultado do mês</Link><Link className="btn s peq" href="/personalizacao">Dados da loja</Link></div>
          </div>
        )}
        {msg && <div className="aviso mt">{msg}</div>}
      </>
    );
  }

  return (
    <>
      {cabecalho}
      {equipe && (
        <div className={`barra-equipe mb ${atual.status === "liberada" ? "ok" : ""}`}>
          <span>
            <b>{atual.status === "liberada" ? "Liberado para a loja" : "Rascunho: só a equipe vê"}</b>
            <small className="mudo"> · atualizado {dataHora(atual.updated_at)}</small>
          </span>
          <span className="linha" style={{ gap: 8 }}>
            {ed ? (
              <>
                <button type="button" className="btn p peq" disabled={salvo} onClick={() => fazer(async () => { await salvarDiagnostico(portal.id, atual.loja, d); setSalvo(true); setEd(false); }, "Diagnóstico salvo.")}>Salvar</button>
                <button type="button" className="btn s peq" onClick={() => { setD(completo(atual.dados)); setSalvo(true); setEd(false); }}>Cancelar</button>
              </>
            ) : (
              <>
                <button type="button" className="btn s peq" onClick={() => setEd(true)}>Editar</button>
                {atual.status === "liberada"
                  ? <button type="button" className="btn s peq" onClick={() => fazer(() => liberarDiagnostico(portal.id, atual.loja, false), "Voltou para rascunho.")}>Voltar para rascunho</button>
                  : <button type="button" className="btn p peq" onClick={() => fazer(() => liberarDiagnostico(portal.id, atual.loja, true), "Liberado para a loja.")}>Liberar para a loja</button>}
              </>
            )}
          </span>
        </div>
      )}
      {msg && <div className={`aviso mb ${/salvo|Liberado|rascunho|criado/.test(msg) ? "ok" : ""}`}>{msg}</div>}
      <Corpo d={d} ed={ed} muda={mudaSalvo} caixa={caixa ?? new Map()} equipeHub={equipe} />
      {!ed && (
        <div className="linha mt" style={{ marginTop: 24 }}>
          <Link className="btn s peq" href="/gestao/resultado">Resultado do mês</Link>
          <Link className="btn s peq" href="/gestao/caixa">Fechamento de caixa</Link>
          <Link className="btn s peq" href="/assistente">Falar com a equipe sobre o diagnóstico</Link>
        </div>
      )}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><DiagnosticoDaLoja /></Suspense>;
}
