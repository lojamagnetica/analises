"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarPessoas } from "@/lib/pessoas";
import {
  BLOCOS_SUGERIDOS, DIAS, FAIXAS, GRUPOS, TIPICAS, buscarTempo, novoId, retrato, salvarTempo, semanaAtual, sugestaoDe,
  type Bloco, type DadosTempo, type Grupo, type Tarefa,
} from "@/lib/tempo";

const PASSOS = ["Tirar da cabeça", "Separar", "O retrato", "A semana da dona", "Passar as tarefas"];

/** As 3 prioridades da semana: o que fazer quando não se sabe nem por onde começar. */
function Prioridades({ d, mudar }: { d: DadosTempo; mudar: (x: DadosTempo) => void }) {
  const semana = semanaAtual();
  const p = d.prioridades?.semana === semana ? d.prioridades : { semana, itens: ["", "", ""], feitas: [false, false, false] };
  const r = retrato(d);
  const sugestoes = [...r.abandonadas, ...d.tarefas.filter((t) => t.grupo === "so_eu").map((t) => t.nome)].filter((s) => !p.itens.includes(s)).slice(0, 4);
  const troca = (i: number, x: { item?: string; feita?: boolean }) => {
    const itens = [...p.itens]; const feitas = [...(p.feitas ?? [false, false, false])];
    if (x.item !== undefined) itens[i] = x.item;
    if (x.feita !== undefined) feitas[i] = x.feita;
    mudar({ ...d, prioridades: { semana, itens, feitas } });
  };
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
      <h2 style={{ marginTop: 0 }}>🎯 As 3 prioridades desta semana</h2>
      <p className="mudo" style={{ marginTop: 0 }}>Quando parece que não dá tempo de nada, comece por aqui. Só 3, e de dona.</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="linha mb" style={{ gap: 8, alignItems: "center" }}>
          <input type="checkbox" aria-label={`Prioridade ${i + 1} feita`} checked={!!p.feitas?.[i]} onChange={(e) => troca(i, { feita: e.target.checked })} />
          <input type="text" placeholder={`Prioridade ${i + 1}`} value={p.itens[i] ?? ""} onChange={(e) => troca(i, { item: e.target.value })}
            style={{ flex: 1, margin: 0, textDecoration: p.feitas?.[i] ? "line-through" : undefined }} />
        </div>
      ))}
      {sugestoes.length > 0 && p.itens.some((x) => !x.trim()) && (
        <div className="chips">
          <small className="mudo" style={{ alignSelf: "center" }}>Sugestões:</small>
          {sugestoes.map((s) => <button key={s} type="button" className="chip" onClick={() => troca(p.itens.findIndex((x) => !x.trim()), { item: s })}>+ {s}</button>)}
        </div>
      )}
    </div>
  );
}

export default function MeuTempo() {
  const { portal } = usePortal();
  const { dados } = useDados(async () => ({ t: await buscarTempo(portal.id), equipe: (await buscarPessoas(portal.id)).pessoas.filter((p) => p.ativo).map((p) => p.nome) }), [portal.id]);
  const [d, setD] = useState<DadosTempo | null>(null);
  const [passo, setPasso] = useState(0);
  const [outra, setOutra] = useState("");
  const [estado, setEstado] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { if (dados) { setD(dados.t); if (dados.t.tarefas.length) setPasso(dados.t.tarefas.some((t) => !t.grupo) ? 1 : 2); } }, [dados]);
  if (!dados || !d) return <Carregando />;

  // Salva sozinho a cada mudança.
  const mudar = (x: DadosTempo) => {
    setD(x); setEstado("salvando…");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => salvarTempo(portal.id, x).then(() => setEstado("salvo ✓")).catch((e) => setEstado((e as Error).message)), 700);
  };
  const tem = (nome: string) => d.tarefas.find((t) => t.nome === nome);
  const marcar = (nome: string, area: string) => {
    const t = tem(nome);
    mudar({ ...d, tarefas: t ? d.tarefas.filter((x) => x !== t) : [...d.tarefas, { id: novoId(), nome, area, horas: 2, grupo: null }] });
  };
  const mudarTarefa = (id: string, x: Partial<Tarefa>) => mudar({ ...d, tarefas: d.tarefas.map((t) => (t.id === id ? { ...t, ...x } : t)) });
  const mudarBloco = (id: string, x: Partial<Bloco>) => mudar({ ...d, blocos: d.blocos.map((b) => (b.id === id ? { ...b, ...x } : b)) });
  const r = retrato(d);
  const semGrupo = d.tarefas.filter((t) => !t.grupo).length;
  const paraBloco = d.tarefas.filter((t) => t.grupo === "so_eu" || t.grupo === "agendar").map((t) => t.nome);
  const outras = d.tarefas.filter((t) => !TIPICAS.some((a) => a.tarefas.some((x) => x.nome === t.nome)));

  return (
    <>
      <Titulo titulo="Onde está o meu tempo" sub="Para a dona que não tem tempo para nada: o que é seu, o que passar para a equipe e a sua semana com horário para o que importa." />
      <Prioridades d={d} mudar={mudar} />

      <div className="chips mb" role="tablist">
        {PASSOS.map((p, i) => (
          <button key={p} type="button" role="tab" aria-selected={passo === i} className={`chip${passo === i ? " escolhido" : ""}`} onClick={() => setPasso(i)}>{i + 1}. {p}</button>
        ))}
        <small className="mudo" style={{ alignSelf: "center", marginLeft: "auto" }}>{estado}</small>
      </div>

      {passo === 0 && (
        <div className="card mb">
          <h2 style={{ marginTop: 0 }}>1. Tire tudo da cabeça</h2>
          <p className="mudo" style={{ marginTop: 0 }}>Marque tudo o que você faz numa semana normal, sem filtro, e quanto tempo leva. Faltou alguma coisa? Escreva no fim.</p>
          {TIPICAS.map((a) => (
            <div key={a.area} className="mb">
              <div className="secao" style={{ marginTop: 8 }}>{a.area}</div>
              {a.tarefas.map((t) => {
                const x = tem(t.nome);
                return (
                  <div key={t.nome} className="linha" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0" }}>
                    <label className="marcar" style={{ margin: 0, flex: 1, minWidth: 220 }}><input type="checkbox" checked={!!x} onChange={() => marcar(t.nome, a.area)} /><span>{t.nome}</span></label>
                    {x && (
                      <select value={x.horas} aria-label="Horas por semana" onChange={(e) => mudarTarefa(x.id, { horas: Number(e.target.value) })} style={{ width: "auto", margin: 0 }}>
                        {FAIXAS.map((f) => <option key={f.h} value={f.h}>{f.rotulo} por semana</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="secao" style={{ marginTop: 8 }}>Outras tarefas</div>
          {outras.map((t) => (
            <div key={t.id} className="linha" style={{ gap: 8, alignItems: "center", padding: "4px 0", flexWrap: "wrap" }}>
              <input type="text" value={t.nome} aria-label="Tarefa" onChange={(e) => mudarTarefa(t.id, { nome: e.target.value })} style={{ flex: 1, minWidth: 200, margin: 0 }} />
              <select value={t.horas} aria-label="Horas por semana" onChange={(e) => mudarTarefa(t.id, { horas: Number(e.target.value) })} style={{ width: "auto", margin: 0 }}>
                {FAIXAS.map((f) => <option key={f.h} value={f.h}>{f.rotulo} por semana</option>)}
              </select>
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Tirar "${t.nome}" da lista?`)) mudar({ ...d, tarefas: d.tarefas.filter((x) => x.id !== t.id) }); }}>Excluir</button>
            </div>
          ))}
          <div className="linha mt" style={{ gap: 8 }}>
            <input type="text" placeholder="Ex.: Levar o carro da loja para a revisão" value={outra} onChange={(e) => setOutra(e.target.value)} style={{ flex: 1, margin: 0 }} />
            <button type="button" className="btn s" disabled={!outra.trim()} onClick={() => { mudar({ ...d, tarefas: [...d.tarefas, { id: novoId(), nome: outra.trim(), area: "Outras", horas: 2, grupo: null }] }); setOutra(""); }}>Incluir</button>
          </div>
          <button type="button" className="btn p mt" disabled={!d.tarefas.length} onClick={() => setPasso(1)}>Próximo: separar →</button>
        </div>
      )}

      {passo === 1 && (
        <div className="card mb">
          <h2 style={{ marginTop: 0 }}>2. Separe cada tarefa</h2>
          <div className="grade g2 mb" style={{ gap: 8 }}>
            {GRUPOS.map((g) => <div key={g.id} style={{ background: "var(--soft)", borderRadius: 10, padding: "8px 10px", fontSize: 13.5 }}><b>{g.icone} {g.nome}</b><br /><span className="mudo">{g.ajuda}</span></div>)}
          </div>
          {!d.tarefas.length && <p className="mudo">Marque as suas tarefas no passo 1 primeiro.</p>}
          {d.tarefas.map((t) => {
            const sug = sugestaoDe(t.nome);
            return (
              <div key={t.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
                <b>{t.nome}</b>
                <div className="chips" style={{ marginTop: 6 }}>
                  {GRUPOS.map((g) => (
                    <button key={g.id} type="button" className={`chip${t.grupo === g.id ? " escolhido" : ""}`} onClick={() => mudarTarefa(t.id, { grupo: g.id as Grupo })}>
                      {g.icone} {g.nome}{sug === g.id && t.grupo !== g.id ? " · sugestão" : ""}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <button type="button" className="btn p mt" disabled={semGrupo > 0} onClick={() => setPasso(2)}>{semGrupo ? `Faltam ${semGrupo}` : "Próximo: o retrato →"}</button>
        </div>
      )}

      {passo === 2 && (
        <div className="card mb">
          <h2 style={{ marginTop: 0 }}>3. O retrato do seu tempo</h2>
          <div className="grade g3 mb">
            <div className="kpi"><small>Horas por semana nessas tarefas</small><b style={{ fontSize: 26 }}>{Math.round(r.total)}h</b></div>
            <div className="kpi"><small>No que só você pode fazer</small><b style={{ fontSize: 26 }}>{Math.round(r.daDona)}h</b></div>
            <div className="kpi"><small>Pode ser de outra pessoa ou parar</small><b style={{ fontSize: 26, color: "var(--red)" }}>{r.pct}%</b></div>
          </div>
          {r.pct >= 40 && <div className="aviso mb">{r.pct}% do seu tempo está em tarefas que podem ser de outra pessoa (ou que nem precisavam existir). É esse tempo que vai para a gestão da loja.</div>}
          {r.abandonadas.length > 0 && (
            <>
              <h3>Tarefas de dona que não estão na sua semana</h3>
              <p className="mudo" style={{ marginTop: 0 }}>São elas que fazem a loja crescer. Se ninguém faz, ninguém faz.</p>
              <ul style={{ marginTop: 0 }}>{r.abandonadas.map((a) => <li key={a}>{a}</li>)}</ul>
            </>
          )}
          {GRUPOS.map((g) => {
            const ts = d.tarefas.filter((t) => t.grupo === g.id);
            return ts.length > 0 && <p key={g.id} style={{ margin: "6px 0" }}><b>{g.icone} {g.nome}:</b> {ts.map((t) => t.nome).join(" · ")}</p>;
          })}
          <button type="button" className="btn p mt" onClick={() => setPasso(3)}>Próximo: a semana da dona →</button>
        </div>
      )}

      {passo === 3 && (
        <div className="card mb">
          <h2 style={{ marginTop: 0 }}>4. A semana da dona</h2>
          <p className="mudo" style={{ marginTop: 0 }}>Os horários fixos do que é seu. O resto do tempo fica para o dia a dia da loja, mas esses blocos ficam protegidos.</p>
          {!d.blocos.length && (
            <button type="button" className="btn s mb" onClick={() => mudar({ ...d, blocos: BLOCOS_SUGERIDOS.map((b) => ({ ...b, id: novoId() })) })}>Começar pela sugestão da Camilla</button>
          )}
          <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {DIAS.map((nome, i) => (
              <div key={nome} style={{ background: "var(--soft)", borderRadius: 12, padding: 8, minHeight: 80 }}>
                <b style={{ fontSize: 13, display: "block" }}>{nome}</b>
                {d.blocos.filter((b) => b.dia === i).sort((a, b) => a.hora.localeCompare(b.hora)).map((b) => (
                  <div key={b.id} style={{ background: "var(--card)", borderRadius: 8, padding: 6, marginTop: 6, fontSize: 13 }}>
                    <input type="time" value={b.hora} aria-label="Hora" onChange={(e) => mudarBloco(b.id, { hora: e.target.value })} style={{ margin: 0, padding: "2px 4px", fontSize: 12 }} />
                    <textarea rows={2} value={b.oque} aria-label="O que" onChange={(e) => mudarBloco(b.id, { oque: e.target.value })} style={{ margin: "4px 0 0", fontSize: 12.5 }} />
                    <button type="button" className="link-loja" style={{ color: "var(--red)", fontSize: 12 }} onClick={() => { if (confirm("Excluir este bloco?")) mudar({ ...d, blocos: d.blocos.filter((x) => x.id !== b.id) }); }}>excluir</button>
                  </div>
                ))}
                <button type="button" className="link-loja" style={{ fontSize: 12, marginTop: 6, display: "block" }} onClick={() => mudar({ ...d, blocos: [...d.blocos, { id: novoId(), dia: i, hora: "09:00", oque: paraBloco[0] ?? "" }] })}>+ bloco</button>
              </div>
            ))}
          </div>
          {paraBloco.length > 0 && <p className="ajuda">Para colocar nos blocos: {paraBloco.join(" · ")}</p>}
          <button type="button" className="btn p mt" onClick={() => setPasso(4)}>Próximo: passar as tarefas →</button>
        </div>
      )}

      {passo === 4 && (
        <div className="card mb">
          <h2 style={{ marginTop: 0 }}>5. Passe as tarefas</h2>
          <p className="mudo" style={{ marginTop: 0 }}>Para cada tarefa que vai sair das suas mãos: para quem, quando começa e como você vai ensinar. Confira quem cuida do quê no <Link href="/pessoas/organograma">Organograma</Link>.</p>
          <datalist id="equipe-tempo">{dados.equipe.map((n) => <option key={n} value={n} />)}</datalist>
          {!d.tarefas.some((t) => t.grupo === "passar") && <p className="mudo">Nenhuma tarefa marcada como &quot;Passo para alguém&quot; no passo 2.</p>}
          {d.tarefas.filter((t) => t.grupo === "passar").map((t) => (
            <div key={t.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
              <div className="linha entre" style={{ gap: 8 }}><b style={{ textDecoration: t.passou ? "line-through" : undefined }}>{t.nome}</b>
                <label className="marcar" style={{ margin: 0 }}><input type="checkbox" checked={!!t.passou} onChange={(e) => mudarTarefa(t.id, { passou: e.target.checked })} /><span>Já passou</span></label>
              </div>
              <div className="grade g2" style={{ gap: "0 10px" }}>
                <label className="ajuda" style={{ display: "block" }}>Para quem<input type="text" list="equipe-tempo" value={t.quem ?? ""} onChange={(e) => mudarTarefa(t.id, { quem: e.target.value })} /></label>
                <label className="ajuda" style={{ display: "block" }}>Começa em<input type="date" value={t.inicio ?? ""} onChange={(e) => mudarTarefa(t.id, { inicio: e.target.value })} /></label>
              </div>
              <label className="ajuda" style={{ display: "block" }}>Como você vai ensinar
                <textarea rows={2} placeholder="Ex.: faço junto 2 vezes, depois ela faz e eu confiro por uma semana" value={t.como ?? ""} onChange={(e) => mudarTarefa(t.id, { como: e.target.value })} />
              </label>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
