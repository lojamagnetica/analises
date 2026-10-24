"use client";

import { useEffect, useState } from "react";
import { EmBreve } from "@/components/EmBreve";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import { classeNivel, corNivel, rotuloNivel } from "@/lib/diagnostico";
import { buscarGestao, completa, liberarGestao, salvarGestao, type AnaliseGestao, type Area } from "@/lib/gestao";

type Props = { area: Area; titulo: string; sub: string; oque: string };

/** Uma área da Gestão estratégica: mostra a análise da loja quando existe; senão, o que a área vai ter e como adiantar. */
export function AnaliseDaGestao({ area, titulo, sub, oque }: Props) {
  const { portal, equipe } = usePortal();
  const varias = (portal.lojas ?? []).length > 1;
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [ed, setEd] = useState(false);
  const [d, setD] = useState<AnaliseGestao | null>(null);
  const [msg, setMsg] = useState("");
  const { dados, recarregar } = useDados(() => buscarGestao(portal.id, area), [portal.id, area]);
  const linhas = dados ?? [];
  const atual = linhas.find((l) => l.loja === escolhida) ?? linhas[0] ?? null;
  const chave = atual ? `${atual.loja}|${atual.updated_at}` : "";
  useEffect(() => { setD(atual ? completa(atual.dados) : null); setEd(false); }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dados) return <Carregando />;
  if (!atual || !d) {
    return <EmBreve titulo={titulo} oque={oque} adiantar={{ texto: "Para essa análise sair certa, ela usa os relatórios do seu sistema. Já pode subir agora.", href: "/personalizacao/etapa?n=8", botao: "Subir relatórios →" }} />;
  }

  const muda = (f: (x: AnaliseGestao) => void) => setD((p) => { const c = structuredClone(p ?? completa(undefined)); f(c); return c; });
  const fazer = async (f: () => Promise<void>, ok: string) => {
    setMsg("");
    try { await f(); setMsg(ok); recarregar(); } catch (e) { setMsg(e instanceof Error ? e.message : "Não deu certo."); }
  };

  return (
    <>
      <Titulo titulo={titulo} sub={sub} />
      {linhas.length > 1 && (
        <div className="chips mb" role="group" aria-label="Escolher a loja">
          {linhas.map((l) => (
            <button key={l.loja} type="button" className={`chip ${atual.loja === l.loja ? "escolhido" : ""}`} onClick={() => setEscolhida(l.loja)}>
              {l.loja || (varias ? "As lojas juntas" : "Visão geral")}{equipe && l.status === "rascunho" ? " · rascunho" : ""}
            </button>
          ))}
        </div>
      )}
      {equipe && (
        <div className={`barra-equipe mb ${atual.status === "liberada" ? "ok" : ""}`}>
          <span><b>{atual.status === "liberada" ? "Liberado para a loja" : "Rascunho: só a equipe vê"}</b><small className="mudo"> · atualizado {dataHora(atual.updated_at)}</small></span>
          <span className="linha" style={{ gap: 8 }}>
            {ed ? (
              <>
                <button type="button" className="btn p peq" onClick={() => fazer(async () => { await salvarGestao(portal.id, area, atual.loja, d); setEd(false); }, "Salvo.")}>Salvar</button>
                <button type="button" className="btn s peq" onClick={() => { setD(completa(atual.dados)); setEd(false); }}>Cancelar</button>
              </>
            ) : (
              <>
                <button type="button" className="btn s peq" onClick={() => setEd(true)}>Editar textos</button>
                {atual.status === "liberada"
                  ? <button type="button" className="btn s peq" onClick={() => fazer(() => liberarGestao(portal.id, area, atual.loja, false), "Voltou para rascunho.")}>Voltar para rascunho</button>
                  : <button type="button" className="btn p peq" onClick={() => fazer(() => liberarGestao(portal.id, area, atual.loja, true), "Liberado para a loja.")}>Liberar para a loja</button>}
              </>
            )}
          </span>
        </div>
      )}
      {msg && <div className="aviso ok mb">{msg}</div>}

      {(d.resumo || ed) && (
        <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
          {ed ? <textarea rows={4} value={d.resumo} onChange={(e) => muda((x) => { x.resumo = e.target.value; })} /> : <p style={{ margin: 0, fontWeight: 600, whiteSpace: "pre-wrap" }}>{d.resumo}</p>}
        </div>
      )}

      {d.indicadores.length > 0 && (
        <div className="grade g4 mb">
          {d.indicadores.map((k, i) => (
            <div key={i} className="card card-borda kpi" style={{ ["--c" as string]: corNivel(k.nivel) }}>
              <small>{k.rotulo}</small>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{k.valor}</b>
              {k.ideal && <small>Ideal: {k.ideal}</small>}
              {k.nota && <small className="mudo">{k.nota}</small>}
            </div>
          ))}
        </div>
      )}

      {d.blocos.map((b, i) => (
        <div key={i}>
          <div className="secao">{b.titulo}{b.nivel && <span className={`selo ${classeNivel(b.nivel)}`} style={{ marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>{rotuloNivel(b.nivel)}</span>}</div>
          {ed ? <textarea rows={3} value={b.texto} onChange={(e) => muda((x) => { x.blocos[i].texto = e.target.value; })} className="mb" />
            : b.texto && <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{b.texto}</p>}
          {b.tabela && (
            <div className="card tabela-wrap mb">
              <table className="tabela">
                <thead><tr>{b.tabela.colunas.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>
                <tbody>
                  {b.tabela.linhas.map((l, j) => {
                    const total = /^total/i.test(l[0] ?? "");
                    return (
                      <tr key={j} style={total ? { fontWeight: 700 } : undefined}>
                        {l.map((c, k) => <td key={k} style={k > 0 ? { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontWeight: b.tabela?.destaque === k ? 700 : undefined } : undefined}>{c}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {(d.acoes.length > 0 || ed) && (
        <>
          <div className="secao">O que fazer</div>
          <div className="card">
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {d.acoes.map((a, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  {ed ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <textarea rows={2} value={a.texto} onChange={(e) => muda((x) => { x.acoes[i].texto = e.target.value; })} />
                      <div className="linha" style={{ gap: 6 }}>
                        <input type="text" value={a.prazo} placeholder="Prazo" onChange={(e) => muda((x) => { x.acoes[i].prazo = e.target.value; })} style={{ maxWidth: 180 }} />
                        <input type="text" value={a.quem} placeholder="Quem" onChange={(e) => muda((x) => { x.acoes[i].quem = e.target.value; })} style={{ maxWidth: 180 }} />
                        <button type="button" className="btn s peq" onClick={() => muda((x) => { x.acoes.splice(i, 1); })}>Remover</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {a.texto}
                      {(a.prazo || a.quem) && <small className="mudo" style={{ display: "block" }}>{[a.prazo && `Prazo: ${a.prazo}`, a.quem && `Quem: ${a.quem}`].filter(Boolean).join(" · ")}</small>}
                    </>
                  )}
                </li>
              ))}
            </ol>
            {ed && <button type="button" className="btn s peq" onClick={() => muda((x) => { x.acoes.push({ texto: "", prazo: "", quem: "" }); })}>+ ação</button>}
          </div>
        </>
      )}

      {(d.data_base || d.fontes) && <p className="ajuda" style={{ marginTop: 24 }}>{d.data_base && <>Base: {d.data_base}. </>}{d.fontes}</p>}
    </>
  );
}
