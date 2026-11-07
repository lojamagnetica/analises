"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { FUSO, moeda } from "@/lib/formato";
import {
  CANAIS_SUGERIDOS, buscarMedicoes, buscarRegistros, criarMedicao, excluirMedicao, excluirRegistro, linkCanais, resultado,
  rotuloTempo, salvarMedicao, salvarRegistro, type Medicao, type Registro,
} from "@/lib/canais";

const hojeIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: FUSO });
const somaDias = (d: string, n: number) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const dm = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
const horas = (min: number) => (min ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}` : "—");

/** Escolher os canais e o período (para começar ou editar). */
function Configurar({ inicial, aoSalvar, aoCancelar, rotulo }: { inicial?: Medicao; rotulo?: string; aoSalvar: (inicio: string, fim: string, canais: string[]) => Promise<void>; aoCancelar?: () => void }) {
  const [canais, setCanais] = useState<string[]>(inicial?.canais ?? ["Loja física", "Stories", "Grupo VIP", "Live"]);
  const [inicio, setInicio] = useState(inicial?.inicio ?? hojeIso());
  const [fim, setFim] = useState(inicial?.fim ?? somaDias(hojeIso(), 13));
  const [novo, setNovo] = useState("");
  const todos = [...new Set([...CANAIS_SUGERIDOS, ...canais])];
  const troca = (c: string) => setCanais((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));
  return (
    <>
      <b>Quais canais a loja usa?</b>
      <div className="chips mt" role="group" aria-label="Canais">
        {todos.map((c) => <button key={c} type="button" className={`chip ${canais.includes(c) ? "escolhido" : ""}`} onClick={() => troca(c)}>{c}</button>)}
      </div>
      <div className="linha mt" style={{ gap: 6 }}>
        <input type="text" value={novo} placeholder="Outro canal (ex.: Catálogo)" onChange={(e) => setNovo(e.target.value)} style={{ maxWidth: 240 }} />
        <button type="button" className="btn s peq" disabled={!novo.trim()} onClick={() => { setCanais((x) => [...new Set([...x, novo.trim()])]); setNovo(""); }}>Incluir</button>
      </div>
      <div className="linha mt" style={{ gap: 10, flexWrap: "wrap" }}>
        <label className="ajuda">De<input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
        <label className="ajuda">Até<input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></label>
      </div>
      <div className="linha mt" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" disabled={!canais.length || !inicio || !fim || fim < inicio} onClick={() => aoSalvar(inicio, fim, canais)}>{rotulo ?? (inicial ? "Salvar" : "Começar a medição")}</button>
        {aoCancelar && <button type="button" className="btn s peq" onClick={aoCancelar}>Cancelar</button>}
      </div>
    </>
  );
}

function Resultado({ m, regs, recarregar, setMsg }: { m: Medicao; regs: Registro[]; recarregar: () => void; setMsg: (s: string) => void }) {
  const r = resultado(m.canais, regs);
  const comHora = r.linhas.filter((l) => l.porHora != null && l.valor > 0).sort((a, b) => (b.porHora ?? 0) - (a.porHora ?? 0));
  const maisTempo = [...r.linhas].sort((a, b) => b.minutos - a.minutos)[0];
  const diasPeriodo = Math.round((Date.parse(m.fim) - Date.parse(m.inicio)) / 86_400_000) + 1;
  const corrigir = async (x: Registro) => {
    const atual = x.tipo === "venda" ? String(x.valor).replace(".", ",") : String(x.minutos);
    const v = prompt(x.tipo === "venda" ? "Valor certo da venda (R$):" : "Minutos certos:", atual);
    if (v == null) return;
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    if (!(n >= 0)) return;
    try { await salvarRegistro(x.id, x.tipo === "venda" ? { valor: n } : { minutos: Math.round(n) }); recarregar(); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <>
      <div className="secao">O que cada canal rende</div>
      <div className="card mb" style={{ overflowX: "auto" }}>
        <p className="mudo" style={{ marginTop: 0 }}>{r.dias} de {diasPeriodo} dias com lançamento · total {moeda(r.total)}</p>
        <table className="tabela">
          <thead><tr><th>Canal</th><th>Vendeu</th><th>% da venda</th><th>Peças</th><th>Tempo</th><th>Vende por hora</th></tr></thead>
          <tbody>
            {r.linhas.map((l) => (
              <tr key={l.canal}>
                <td><b>{l.canal}</b></td><td>{moeda(l.valor)}</td><td>{l.pct.toFixed(0)}%</td><td>{l.pecas}</td><td>{horas(l.minutos)}</td>
                <td><b>{l.porHora != null ? moeda(l.porHora) : "—"}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        {comHora.length > 0 && (
          <p style={{ marginBottom: 0 }}>
            O canal que mais vende por hora de trabalho é <b>{comHora[0].canal}</b> ({moeda(comHora[0].porHora ?? 0)} por hora).
            {maisTempo && maisTempo.minutos > 0 && maisTempo.canal !== comHora[0].canal && <> O que mais toma tempo é <b>{maisTempo.canal}</b> ({horas(maisTempo.minutos)}{maisTempo.porHora != null ? `, ${moeda(maisTempo.porHora)} por hora` : ""}).</>}
          </p>
        )}
        <p className="ajuda" style={{ marginBottom: 0 }}>Vende por hora = o que o canal vendeu ÷ as horas que a equipe gastou nele. Canal sem tempo lançado fica sem essa conta.</p>
      </div>

      <details className="card mb">
        <summary style={{ cursor: "pointer" }}><b>Lançamentos ({regs.length})</b></summary>
        {regs.slice(0, 200).map((x) => (
          <div key={x.id} className="linha entre" style={{ padding: "6px 0", borderTop: "1px solid var(--line)" }}>
            <span>{dm(x.dia)} · <b>{x.canal}</b> · {x.tipo === "venda" ? `${moeda(x.valor)} · ${x.pecas} pç` : `tempo ${rotuloTempo(x.minutos)}`}{x.quem && <small className="mudo"> · {x.quem}</small>}</span>
            <span className="linha" style={{ gap: 8 }}>
              <button type="button" className="link-loja" onClick={() => corrigir(x)}>Corrigir</button>
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm("Excluir este lançamento?")) { await excluirRegistro(x.id); recarregar(); } }}>Excluir</button>
            </span>
          </div>
        ))}
      </details>
    </>
  );
}

export default function VendasPorCanal() {
  const { portal } = usePortal();
  const [ed, setEd] = useState(false);
  const [msg, setMsg] = useState("");
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const { dados, recarregar } = useDados(async () => {
    const ms = await buscarMedicoes(portal.id);
    return { ms };
  }, [portal.id]);
  const m = dados?.ms.find((x) => x.id === escolhida) ?? dados?.ms.find((x) => x.ativa) ?? dados?.ms[0] ?? null;
  const { dados: regs, recarregar: recarregarRegs } = useDados(() => (m ? buscarRegistros(m.id) : Promise.resolve([] as Registro[])), [m?.id]);
  if (!dados) return <Carregando />;

  const fazer = async (f: () => Promise<void>, aviso: string) => { setMsg(""); try { await f(); setMsg(aviso); setEd(false); recarregar(); recarregarRegs(); } catch (e) { setMsg((e as Error).message); } };
  const link = m ? linkCanais(m.token) : "";
  const textoWhats = m ? `Oi! Durante estes dias vamos anotar quanto cada canal vende e quanto tempo ele toma. Lance pelo link, na hora ou no fim do dia: ${link}` : "";

  return (
    <>
      <Titulo titulo="Vendas por canal" sub="Por um período (ex.: 2 semanas), a equipe lança pelo celular quanto cada canal vendeu e quanto tempo tomou. Aqui você vê onde o tempo da loja rende mais." />
      {msg && <div className={`aviso mb ${msg.includes("✓") ? "ok" : ""}`}>{msg}</div>}

      {dados.ms.length > 1 && (
        <div className="chips mb" role="group" aria-label="Medições">
          {dados.ms.map((x) => <button key={x.id} type="button" className={`chip ${m?.id === x.id ? "escolhido" : ""}`} onClick={() => setEscolhida(x.id)}>{dm(x.inicio)} a {dm(x.fim)}{x.ativa ? " · aberta" : ""}</button>)}
        </div>
      )}

      {!m ? (
        <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
          <h2 style={{ marginTop: 0 }}>Medir as vendas e o tempo de cada canal</h2>
          <p className="mudo" style={{ marginTop: 0 }}>Você escolhe os canais e o período. O Hub gera um link para a equipe lançar pelo celular, sem entrar no Hub: a venda (valor e peças) e o tempo gasto em cada canal. No fim, você vê quanto cada canal vende por hora de trabalho.</p>
          <Configurar aoSalvar={(i, f, c) => fazer(() => criarMedicao(portal.id, i, f, c), "Medição criada ✓ Mande o link para a equipe.")} />
        </div>
      ) : (
        <>
          <div className={`card card-borda mb`} style={{ ["--c" as string]: m.ativa ? "var(--green)" : "var(--line)" }}>
            {ed ? (
              <Configurar inicial={m} aoCancelar={() => setEd(false)} aoSalvar={(i, f, c) => fazer(() => salvarMedicao(m.id, { inicio: i, fim: f, canais: c }), "Medição salva ✓")} />
            ) : (
              <>
                <div className="linha entre" style={{ flexWrap: "wrap", gap: 8 }}>
                  <span><b>{m.ativa ? "Medição aberta" : "Medição encerrada"}</b> · {dm(m.inicio)} a {dm(m.fim)} · {m.canais.join(", ")}</span>
                  <span className="linha" style={{ gap: 8 }}>
                    <button type="button" className="btn s peq" onClick={() => setEd(true)}>Editar</button>
                    {m.ativa
                      ? <button type="button" className="btn s peq" onClick={() => { if (confirm("Encerrar a medição? O link para de aceitar lançamentos.")) fazer(() => salvarMedicao(m.id, { ativa: false }), "Medição encerrada ✓"); }}>Encerrar</button>
                      : <button type="button" className="btn s peq" onClick={() => fazer(() => salvarMedicao(m.id, { ativa: true }), "Medição reaberta ✓")}>Reabrir</button>}
                    <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm("Excluir esta medição e todos os lançamentos dela?")) fazer(async () => { await excluirMedicao(m.id); setEscolhida(null); }, "Medição excluída."); }}>Excluir</button>
                  </span>
                </div>
                {m.ativa && (
                  <div className="mt">
                    <b>Link para a equipe lançar pelo celular</b>
                    <p className="ajuda" style={{ margin: "2px 0 6px" }}>Quem fecha o caixa ou atende o canal lança. Não precisa entrar no Hub. A dona não precisa lançar.</p>
                    <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
                      <Copiar texto={link} rotulo="Copiar o link" />
                      <a className="btn s peq" href={`https://wa.me/?text=${encodeURIComponent(textoWhats)}`} target="_blank" rel="noreferrer">Mandar no WhatsApp</a>
                      <a className="btn s peq" href={link} target="_blank" rel="noreferrer">Abrir o link</a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {regs ? <Resultado m={m} regs={regs} recarregar={recarregarRegs} setMsg={setMsg} /> : <Carregando />}
          {!m.ativa && (
            <div className="card">
              <b>Nova medição</b>
              <p className="ajuda" style={{ marginTop: 2 }}>Para comparar antes e depois de uma mudança (ex.: trocar parte do grupo por catálogo).</p>
              <Configurar inicial={{ ...m, inicio: hojeIso(), fim: somaDias(hojeIso(), 13) }} rotulo="Começar a nova medição" aoSalvar={(i, f, c) => fazer(() => criarMedicao(portal.id, i, f, c), "Medição criada ✓ Mande o novo link para a equipe.")} />
            </div>
          )}
        </>
      )}
    </>
  );
}
