"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { CAMPOS, buscarRespostas, importarRespostas, lerArquivo, lerCsv, montarRespostas, ordemFaixa, paraCsv, sugerirMapa, type Campo, type Resposta } from "@/lib/iscas";
import { PERIODOS, intervalo, type Periodo } from "@/lib/gestao-clientes";
import { chaveDia } from "@/lib/agenda";
import { normalizar } from "@/lib/agenda-regras";
import { dataCurta } from "@/lib/formato";

type Item = { rotulo: string; n: number };
const contar = (valores: (string | null | undefined)[]): Item[] => {
  const m = new Map<string, number>();
  for (const v of valores) { const k = (v ?? "").trim(); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m].map(([rotulo, n]) => ({ rotulo, n }));
};

function Barras({ titulo, itens, vazio }: { titulo: string; itens: Item[]; vazio?: string }) {
  const max = Math.max(1, ...itens.map((i) => i.n));
  const total = itens.reduce((s, i) => s + i.n, 0);
  return (
    <div className="card">
      <h2>{titulo}</h2>
      {itens.length === 0 && <p className="mudo">{vazio ?? "Sem dados neste filtro."}</p>}
      {itens.map((i) => (
        <div key={i.rotulo} className="mb">
          <div className="linha entre" style={{ gap: 8 }}><span style={{ overflowWrap: "anywhere" }}>{i.rotulo}</span><b>{i.n} <span className="mudo" style={{ fontWeight: 400 }}>({Math.round((i.n / total) * 100)}%)</span></b></div>
          <div className="barra"><i style={{ width: `${(i.n / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function Importar({ aoImportar }: { aoImportar: () => void }) {
  const [cabecalho, setCabecalho] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<string[][]>([]);
  const [mapa, setMapa] = useState<Campo[]>([]);
  const [isca, setIsca] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function escolher(arq: File | undefined) {
    setMsg(""); setErro("");
    if (!arq) return;
    try {
      const tabela = lerCsv(await lerArquivo(arq));
      if (tabela.length < 2) throw new Error("O arquivo não tem respostas. Exporte de novo no Respondi, em Respostas, Exportar.");
      setCabecalho(tabela[0]); setLinhas(tabela.slice(1)); setMapa(sugerirMapa(tabela[0]));
      setIsca(arq.name.replace(/\.[^.]+$/, ""));
    } catch (e) { setErro((e as Error).message); setCabecalho([]); setLinhas([]); }
  }

  async function enviar() {
    setEnviando(true); setErro(""); setMsg("");
    try {
      if (!isca.trim()) throw new Error("Escreva o nome da isca.");
      if (!mapa.includes("whatsapp")) throw new Error("Escolha qual coluna é o WhatsApp: é ele que evita contar a mesma pessoa duas vezes.");
      const r = await importarRespostas(await montarRespostas(isca.trim(), cabecalho, linhas, mapa));
      setMsg(`Importado: ${r.novas} respostas novas${r.jaExistiam ? ` e ${r.jaExistiam} que já estavam` : ""}.`);
      setCabecalho([]); setLinhas([]);
      aoImportar();
    } catch (e) { setErro((e as Error).message); }
    setEnviando(false);
  }

  return (
    <details className="card mb" open={cabecalho.length > 0 || !!msg || !!erro}>
      <summary className="btn s peq" style={{ display: "inline-flex" }}>Importar respostas de um formulário (CSV)</summary>
      <div className="mt">
        <p className="ajuda" style={{ marginTop: 0 }}>No Respondi, abra o formulário, clique em <b>Respostas</b> e depois em <b>Exportar</b>. Escolha o arquivo aqui. Ele vai direto do seu navegador para o banco do Hub, e só a equipe vê.</p>
        <input id="arquivo-csv" type="file" accept=".csv,.txt,text/csv" onChange={(e) => escolher(e.target.files?.[0])} />
        {erro && <div className="aviso mt">{erro}</div>}
        {msg && <div className="aviso ok mt">{msg}</div>}
        {cabecalho.length > 0 && (
          <>
            <div className="mt"><label className="rotulo">Nome da isca</label><input id="nome-isca" type="text" value={isca} onChange={(e) => setIsca(e.target.value)} /></div>
            <p className="ajuda">Confira para onde vai cada coluna e corrija se precisar. {linhas.length} respostas no arquivo.</p>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Pergunta no arquivo</th><th>Exemplo</th><th>Vai para</th></tr></thead>
                <tbody>
                  {cabecalho.map((titulo, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 360 }}>{titulo}</td>
                      <td className="mudo" style={{ maxWidth: 220, overflowWrap: "anywhere" }}>{(linhas[0]?.[i] ?? "").slice(0, 60)}</td>
                      <td>
                        <select aria-label={`Destino de ${titulo}`} value={mapa[i]} onChange={(e) => setMapa(mapa.map((c, j) => (j === i ? (e.target.value as Campo) : c)))}>
                          {CAMPOS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="linha mt"><button type="button" className="btn p" disabled={enviando} onClick={enviar}>{enviando ? "Importando…" : `Importar ${linhas.length} respostas`}</button></div>
          </>
        )}
      </div>
    </details>
  );
}

export default function RadarDasIscas() {
  useEquipe();
  const { dados, recarregar } = useDados(buscarRespostas, []);
  const [isca, setIsca] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState("");
  if (!dados) return <Carregando />;

  const { de, ate } = intervalo(periodo);
  const q = normalizar(busca);
  const visiveis = dados.filter((r: Resposta) => {
    const d = chaveDia(r.respondido_em ?? r.importado_em);
    return (!isca || r.isca === isca) && (!de || d >= de) && d <= ate &&
      (!q || normalizar(`${r.nome ?? ""} ${r.whatsapp ?? ""} ${r.desafio ?? ""} ${r.instagram ?? ""}`).includes(q));
  });
  const iscas = [...new Set(dados.map((r) => r.isca))].sort();
  const contatos = new Set(visiveis.map((r) => r.whatsapp ?? `nome:${r.nome ?? r.id}`));
  const porZap = new Map<string, Set<string>>();
  for (const r of visiveis) if (r.whatsapp) porZap.set(r.whatsapp, (porZap.get(r.whatsapp) ?? new Set()).add(r.isca));
  const repetiram = [...porZap.values()].filter((s) => s.size >= 2).length;
  const respondeuDiag = visiveis.filter((r) => r.topa_diagnostico !== null);
  const topam = respondeuDiag.filter((r) => r.topa_diagnostico).length;
  const porFaixa = (campo: "faturamento" | "funcionarios") => contar(visiveis.map((r) => r[campo])).sort((a, b) => ordemFaixa(a.rotulo) - ordemFaixa(b.rotulo));
  const temas = contar(visiveis.flatMap((r) => r.temas)).sort((a, b) => b.n - a.n);
  const baixar = () => {
    const url = URL.createObjectURL(new Blob([paraCsv(visiveis)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "respostas-das-iscas.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <Titulo titulo="Radar das iscas" sub="As respostas de todos os formulários de isca num lugar só: quem são os leads, quanto faturam, quais as dores e o que querem. Só a equipe vê." />
      <Importar aoImportar={recarregar} />

      {dados.length === 0 ? (
        <div className="card"><p className="mudo" style={{ margin: 0 }}>Ainda não há respostas aqui. Importe o arquivo de um formulário para começar; os gráficos aparecem sozinhos.</p></div>
      ) : (
        <>
          <div className="card mb">
            <div className="linha" style={{ flexWrap: "wrap", gap: 8 }}>
              <select aria-label="Isca" value={isca} onChange={(e) => setIsca(e.target.value)} style={{ maxWidth: 260 }}>
                <option value="">Todas as iscas</option>
                {iscas.map((i) => <option key={i}>{i}</option>)}
              </select>
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, WhatsApp, Instagram ou dor" style={{ maxWidth: 320 }} />
              <button type="button" className="btn s peq" onClick={baixar}>Exportar CSV ({visiveis.length})</button>
            </div>
            <div className="chips mt">
              {PERIODOS.map((p) => <button key={p.id} type="button" className={`chip${periodo === p.id ? " escolhido" : ""}`} onClick={() => setPeriodo(p.id)}>{p.rotulo}</button>)}
            </div>
          </div>

          <div className="grade g4 mb">
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--red)" }}><b>{visiveis.length}</b><small>respostas</small></div>
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--blue)" }}><b>{contatos.size}</b><small>pessoas diferentes</small></div>
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--green)" }}><b>{respondeuDiag.length ? `${Math.round((topam / respondeuDiag.length) * 100)}%` : "—"}</b><small>topam o diagnóstico</small></div>
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--purple)" }}><b>{repetiram}</b><small>pessoas em mais de uma isca</small></div>
          </div>

          <div className="grade g2 mb">
            <Barras titulo="Faturamento" itens={porFaixa("faturamento")} />
            <Barras titulo="Tamanho da equipe" itens={porFaixa("funcionarios")} />
            <Barras titulo="Dores e desafios (por tema)" itens={temas} />
            <Barras titulo="Respostas por isca" itens={contar(visiveis.map((r) => r.isca)).sort((a, b) => b.n - a.n)} />
          </div>

          <div className="card tabela-wrap">
            <h2>Últimas respostas</h2>
            <table className="tabela">
              <thead><tr><th>Data</th><th>Isca</th><th>Quem</th><th>Faturamento</th><th>Equipe</th><th>Temas</th><th>Desafio</th></tr></thead>
              <tbody>
                {visiveis.length === 0 && <tr><td colSpan={7} className="mudo">Nenhuma resposta com esses filtros.</td></tr>}
                {visiveis.slice(0, 60).map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{dataCurta(r.respondido_em ?? r.importado_em)}</td>
                    <td>{r.isca}</td>
                    <td><b>{r.nome ?? "—"}</b><div className="mudo" style={{ fontSize: 12.5 }}>{r.whatsapp ?? ""}{r.instagram ? ` · @${r.instagram}` : ""}</div></td>
                    <td>{r.faturamento ?? "—"}</td>
                    <td>{r.funcionarios ?? "—"}</td>
                    <td>{r.temas.map((t) => <span key={t} className="selo espera" style={{ marginRight: 4 }}>{t}</span>)}</td>
                    <td style={{ maxWidth: 360 }}>
                      {r.desafio ? (
                        <button type="button" className="mudo" style={{ all: "unset", cursor: "pointer", color: "inherit" }} onClick={() => setAberta(aberta === r.id ? "" : r.id)}>
                          {aberta === r.id ? r.desafio : r.desafio.length > 110 ? `${r.desafio.slice(0, 107)}…` : r.desafio}
                        </button>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
