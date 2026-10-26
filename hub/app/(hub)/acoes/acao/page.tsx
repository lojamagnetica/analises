"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CampoNumero, lerNumero } from "@/components/Numero";
import { Copiar } from "@/components/Copiar";
import { Texto } from "@/components/Texto";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import { preencher, trechos, variaveisDaLoja } from "@/lib/scripts";
import {
  ROTULO_TIPO, TIPOS_MATERIAL, ativarAcao, buscarAcao, concluirAcao, dataDaEtapa, diasDeVenda, etapaAtual, lancarVenda,
  marcarTarefa, metaSugerida, placar, situacao, type Acao, type LojaAcao, vendaExcluir } from "@/lib/acoes-mes";
import { Excluir } from "@/components/Excluir";

function Ativar({ acao, loja, aoSalvar }: { acao: Acao; loja: LojaAcao | null; aoSalvar: (d: Parameters<typeof ativarAcao>[2]) => Promise<void> }) {
  const [plano, setPlano] = useState<Record<string, string>>(loja?.plano ?? {});
  const [base, setBase] = useState(loja?.base_diaria ? String(loja.base_diaria) : "");
  const [meta, setMeta] = useState(loja?.meta ? String(loja.meta) : "");
  const [pa, setPa] = useState(loja?.meta_pa ? String(loja.meta_pa) : "");
  const [cad, setCad] = useState(loja?.meta_cadastros ? String(loja.meta_cadastros) : "");
  const [erro, setErro] = useState("");
  const sugerida = lerNumero(base) ? metaSugerida(acao, lerNumero(base)) : 0;
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
      <h2>{loja ? "O seu plano" : "Monte o seu plano e ative a ação"}</h2>
      {acao.decisoes.map((d, i) => (
        <div key={d.pergunta}>
          <label className="rotulo">{i + 1}. {d.pergunta}</label>
          <select value={plano[String(i)] ?? ""} onChange={(e) => setPlano({ ...plano, [String(i)]: e.target.value })}>
            <option value="">Escolha</option>
            {d.opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}
      <label className="rotulo">{acao.decisoes.length + 1}. A minha meta</label>
      <div className="grade g4" style={{ gap: 12 }}>
        <div><small className="mudo">Venda de um dia normal</small><CampoNumero rotulo="Venda de um dia normal" dica="R$" valor={base} aoMudar={setBase} /></div>
        <div><small className="mudo">Meta de faturamento ({diasDeVenda(acao)} dias)</small><CampoNumero rotulo="Meta de faturamento" dica={sugerida ? `sugerida: ${sugerida.toLocaleString("pt-BR")}` : "R$"} valor={meta} aoMudar={setMeta} /></div>
        <div><small className="mudo">Peças por atendimento</small><CampoNumero rotulo="Meta de peças por atendimento" dica="ex.: 2,2" valor={pa} aoMudar={setPa} /></div>
        <div><small className="mudo">Cadastros novos</small><CampoNumero rotulo="Meta de cadastros novos" dica="ex.: 40" valor={cad} aoMudar={setCad} /></div>
      </div>
      {sugerida > 0 && <p className="ajuda">Meta sugerida: um dia normal × {diasDeVenda(acao)} dias de venda + {acao.aumento}%. Ajuste para a realidade da sua loja.</p>}
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt">
        <button className="btn p" type="button" onClick={async () => {
          setErro("");
          try {
            await aoSalvar({ base: lerNumero(base), meta: lerNumero(meta) || sugerida, meta_pa: lerNumero(pa) || null, meta_cadastros: lerNumero(cad) ? Math.round(lerNumero(cad)) : null, plano });
          } catch (e) { setErro((e as Error).message); }
        }}>{loja ? "Salvar o plano" : "Ativar a ação"}</button>
      </div>
    </div>
  );
}

function Acao() {
  const id = useSearchParams().get("id") ?? "";
  const { portal, pers } = usePortal();
  const [venda, setVenda] = useState({ data: hoje(), valor: "", pa: "", cadastros: "" });
  const [fim, setFim] = useState({ repetir: "", cortar: "" });
  const [erro, setErro] = useState("");
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const { dados, recarregar } = useDados(() => buscarAcao(id, portal.id), [id, portal.id]);
  if (!dados) return <Carregando />;
  const { acao, etapas, materiais, loja, vendas } = dados;
  if (!acao) return <div className="card">Ação não encontrada.</div>;
  const vars = variaveisDaLoja(pers.get(2)?.respostas, portal.loja);
  const s = situacao(acao);
  const atual = etapaAtual(acao, etapas);
  const totalTarefas = etapas.reduce((n, e) => n + e.tarefas.length, 0);
  const p = placar(loja, vendas);
  const fazer = async (f: () => Promise<unknown>) => { setErro(""); try { await f(); recarregar(); } catch (e) { setErro((e as Error).message); } };

  return (
    <>
      <Titulo voltar={{ href: "/acoes", rotulo: "Ações do Mês" }} titulo={acao.titulo} sub={<>Preparação a partir de {dia(acao.inicio)} · venda de {dia(acao.venda_inicio ?? acao.data_acao)} a {dia(acao.fim)} <span className={`selo ${s.classe}`} style={{ marginLeft: 6 }}>{s.texto}</span></>} />
      {erro && <div className="aviso mb">{erro}</div>}

      <div className="grade g2 mb">
        <div className="card">
          <h2>Por que funciona</h2>
          <p style={{ marginTop: 0 }}>{acao.resumo}</p>
          {acao.contexto && <details><summary style={{ cursor: "pointer" }}><b>Dados do mercado</b></summary><div className="mt" style={{ fontSize: 14 }}><Texto md={acao.contexto} /></div></details>}
        </div>
        <div className="card">
          {acao.publico && <><h2>Para quem</h2><Texto md={acao.publico} /></>}
          {acao.oferta && <details className="mt" open={!acao.publico}><summary style={{ cursor: "pointer" }}><b>A oferta e as regras de ouro</b></summary><div className="mt" style={{ fontSize: 14 }}><Texto md={acao.oferta} /></div></details>}
        </div>
      </div>

      <Ativar acao={acao} loja={loja} aoSalvar={(d) => fazer(() => ativarAcao(portal.id, acao.id, d))} />

      <div className="secao">Cronograma · {loja ? `${new Set([...loja.feitas.filter((k) => marcadas[k] !== false), ...Object.keys(marcadas).filter((k) => marcadas[k])]).size}/${totalTarefas} tarefas feitas` : `${totalTarefas} tarefas`}</div>
      <div className="grade g2 mb">
        {etapas.map((e) => {
          const data = dataDaEtapa(acao, e);
          const passou = data != null && data < hoje();
          const eAtual = atual?.id === e.id;
          return (
            <div key={e.id} className="card" style={eAtual ? { boxShadow: "0 0 0 2px var(--red)" } : passou ? { opacity: 0.75 } : undefined}>
              <div className="linha entre">
                <small className="mudo">{e.quando.toUpperCase()}</small>
                {eAtual && <span className="selo andamento">agora</span>}
              </div>
              <h3 style={{ margin: "4px 0 8px" }}>{e.titulo}</h3>
              {e.tarefas.map((t, i) => {
                const chave = `${e.id}:${i}`;
                return (
                  <label key={chave} className="marcar">
                    <input type="checkbox" disabled={!loja} checked={marcadas[chave] ?? !!loja?.feitas.includes(chave)} onChange={(ev) => {
                      if (!loja) return;
                      const v = ev.target.checked;
                      setMarcadas((m) => ({ ...m, [chave]: v }));
                      fazer(() => marcarTarefa({ ...loja, feitas: [...new Set([...loja.feitas, ...Object.keys(marcadas).filter((k) => marcadas[k])])].filter((k) => marcadas[k] !== false) }, chave, v));
                    }} />
                    <span>{t}</span>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
      {!loja && <p className="ajuda">Ative a ação para marcar as tarefas e lançar o placar.</p>}

      {TIPOS_MATERIAL.filter((t) => materiais.some((m) => m.tipo === t)).map((t) => (
        <div key={t}>
          <div className="secao">{ROTULO_TIPO[t]}</div>
          <div className="grade g2 mb">
            {materiais.filter((m) => m.tipo === t).map((m) => (
              <div key={m.id} className="card script">
                <h3>{m.titulo}</h3>
                <pre>{trechos(m.texto, vars).map((x, i) => x.variavel ? <span key={i} className={`var ${x.preenchida ? "ok" : ""}`}>{x.texto}</span> : <span key={i}>{x.texto}</span>)}</pre>
                <div className="linha"><Copiar texto={preencher(m.texto, vars)} /></div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {materiais.length > 0 && <p className="ajuda">Em verde, o que veio da sua Personalização. Em vermelho, o que você completa na hora.</p>}

      {loja && (
        <>
          <div className="secao">Placar da ação</div>
          <div className="grade g3 mb">
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--red)" }}>
              <b>{moeda(p.total)}</b><small>{loja.meta ? `de ${moeda(Number(loja.meta))} · ${p.pct}% da meta` : "faturamento"}</small>
              {loja.meta ? <div className="barra mt"><i style={{ width: `${Math.min(100, p.pct ?? 0)}%` }} /></div> : null}
            </div>
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--orange)" }}>
              <b>{p.pa != null ? p.pa.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}</b><small>peças por atendimento{loja.meta_pa ? ` · meta ${Number(loja.meta_pa).toLocaleString("pt-BR")}` : ""}</small>
            </div>
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--purple)" }}>
              <b>{p.cadastros}</b><small>cadastros novos{loja.meta_cadastros ? ` · meta ${loja.meta_cadastros}` : ""}</small>
            </div>
          </div>
          <div className="grade g2 mb">
            <form className="card" action={() => fazer(() => lancarVenda(loja, venda.data, lerNumero(venda.valor), venda.pa ? lerNumero(venda.pa) : null, venda.cadastros ? Math.round(lerNumero(venda.cadastros)) : null).then(() => setVenda({ ...venda, valor: "", pa: "", cadastros: "" })))}>
              <h2>Lançar o dia</h2>
              <p className="mudo" style={{ marginTop: 0 }}>No fim de cada dia, com o time: quanto vendeu, as peças por atendimento e os cadastros novos.</p>
              <div className="grade g2" style={{ gap: 12 }}>
                <div><label className="rotulo">Dia</label><input type="date" value={venda.data} onChange={(e) => setVenda({ ...venda, data: e.target.value })} /></div>
                <div><label className="rotulo">Faturamento do dia</label><CampoNumero rotulo="Faturamento do dia" dica="R$" valor={venda.valor} aoMudar={(v) => setVenda({ ...venda, valor: v })} /></div>
                <div><label className="rotulo">Peças por atendimento</label><CampoNumero rotulo="Peças por atendimento do dia" dica="ex.: 2,1" valor={venda.pa} aoMudar={(v) => setVenda({ ...venda, pa: v })} /></div>
                <div><label className="rotulo">Cadastros novos</label><CampoNumero rotulo="Cadastros novos do dia" dica="ex.: 6" valor={venda.cadastros} aoMudar={(v) => setVenda({ ...venda, cadastros: v })} /></div>
              </div>
              <div className="linha mt"><button className="btn p" type="submit" disabled={!lerNumero(venda.valor)}>Lançar</button></div>
            </form>
            <div className="card tabela-wrap">
              <h2>Dia a dia</h2>
              {vendas.length === 0 ? <p className="mudo">Nenhum dia lançado ainda.</p> : (
                <table className="tabela">
                  <thead><tr><th>Dia</th><th>Faturamento</th><th>PA</th><th>Cadastros</th><th></th></tr></thead>
                  <tbody>{vendas.map((v) => <tr key={v.data}><td>{dia(v.data)}</td><td>{moeda(Number(v.valor))}</td><td>{v.pa ?? "—"}</td><td>{v.cadastros ?? "—"}</td><td>{loja && <Excluir pergunta={`Excluir o lançamento de ${dia(v.data)}?`} fazer={() => vendaExcluir(loja, v.data)} aoFim={recarregar} />}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Depois da ação: o que repetir e o que cortar</h2>
            {loja.concluida ? (
              <>
                <p><b>Repetir:</b> {loja.repetir ?? "—"}</p>
                <p><b>Cortar:</b> {loja.cortar ?? "—"}</p>
                <div className="aviso ok">Ação concluída. Com o calendário dos próximos 3 meses, ela é a prova do fundamento 03.4 · Ações estratégicas. <Link href="/cursos/fundamento?c=03.4">Ir para o 03.4 →</Link></div>
              </>
            ) : (
              <form action={() => fazer(() => concluirAcao(loja, fim.repetir, fim.cortar))}>
                <label className="rotulo">O que repetir</label><textarea rows={2} value={fim.repetir} onChange={(e) => setFim({ ...fim, repetir: e.target.value })} />
                <label className="rotulo">O que cortar</label><textarea rows={2} value={fim.cortar} onChange={(e) => setFim({ ...fim, cortar: e.target.value })} />
                <div className="linha mt"><button className="btn p" type="submit">Concluir a ação</button></div>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Acao /></Suspense>;
}
