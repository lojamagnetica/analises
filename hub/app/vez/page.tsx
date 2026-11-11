"use client";

import { TextoComLinks } from "@/components/TextoComLinks";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { metasDoTime } from "@/lib/plano-mes";
import { MOTIVOS, corDaMeta, filaDeEspera, horaDe, horaMin, metaDoDia, ordenarFila, resumoDoDia } from "@/lib/vez-calculo";
import { vezAbrir, vezAtender, vezChamarMarcar, vezCorrigir, vezEncerrar, vezEntrar, vezExtras, vezMissaoMarcar, vezPassar, vezSair, type Extras, type Painel } from "@/lib/vez";
import { PontosDaVez } from "@/components/PontosDaVez";
import { ClientesParaChamar } from "@/components/ClientesParaChamar";
import { DesafioDoDia } from "@/components/DesafioDoDia";
import { vezDesafios, type DesafioDoDia as DesafioHoje } from "@/lib/desafios";
import { LojinhaDaVez } from "@/components/LojinhaDaVez";
import { vezLojinha, type LojinhaDaPessoa } from "@/lib/lojinha";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const n1 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const COR = { verde: "#2E9D57", amarela: "#E0A800", vermelha: "#D9332B" };

/** O anel da meta do mês: enche conforme as vendas lançadas no caixa. */
function Anel({ pct, cor, centro, legenda }: { pct: number; cor: string; centro: string; legenda: string }) {
  const r = 52, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return (
    <div style={{ position: "relative", width: 132, height: 132, flex: "0 0 132px" }}>
      <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--line)" strokeWidth="13" />
        <circle cx="66" cy="66" r={r} fill="none" stroke={cor} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 66 66)" style={{ transition: "stroke-dasharray .8s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <b style={{ fontSize: 28, lineHeight: 1 }}>{centro}</b><small className="mudo" style={{ fontSize: 11 }}>{legenda}</small>
      </div>
    </div>
  );
}

/** Uma barra com a marca da meta: mostra onde a pessoa está e onde precisa chegar. */
function Barra({ rotulo, valor, meta, texto, cor }: { rotulo: string; valor: number | null; meta: number | null; texto: string; cor?: string }) {
  const max = Math.max(meta ?? 0, valor ?? 0, 0.0001) * 1.15;
  const bateu = valor !== null && meta !== null && valor >= meta;
  return (
    <div style={{ marginTop: 12 }}>
      <div className="linha entre" style={{ fontSize: 14 }}><b>{rotulo}</b><span>{valor === null ? "—" : texto}{meta !== null && <span className="mudo"> · meta {rotulo === "P.A." ? n1(meta) : brl(meta)}</span>}</span></div>
      <div style={{ position: "relative", height: 12, borderRadius: 6, background: "var(--line)", marginTop: 5 }}>
        <div style={{ width: `${valor === null ? 0 : Math.min(100, (valor / max) * 100)}%`, height: "100%", borderRadius: 6, background: cor ?? (bateu ? COR.verde : COR.amarela), transition: "width .8s" }} />
        {meta !== null && <div title="meta" style={{ position: "absolute", left: `${(meta / max) * 100}%`, top: -4, bottom: -4, width: 3, borderRadius: 2, background: "var(--text)" }} />}
      </div>
    </div>
  );
}

function Vez() {
  const token = useSearchParams().get("t") ?? "";
  const valido = /^[0-9a-f-]{36}$/.test(token);
  const [p, setP] = useState<Painel | null | undefined>(undefined);
  const [ocupado, setOcupado] = useState(false);
  const [fechando, setFechando] = useState<null | "vendeu" | "nao_vendeu">(null);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [outro, setOutro] = useState("");
  const [cliente, setCliente] = useState("");
  const [corrigir, setCorrigir] = useState<string | null>(null);
  const [extras, setExtras] = useState<Extras | null>(null);
  const [indicou, setIndicou] = useState<string | null>(null);
  const [lojinha, setLojinha] = useState<LojinhaDaPessoa | null>(null);
  const [desafios, setDesafios] = useState<DesafioHoje[]>([]);
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(async () => { if (valido) { setP(await vezAbrir(token)); vezExtras(token).then(setExtras).catch(() => {}); vezLojinha(token).then(setLojinha).catch(() => {}); vezDesafios(token).then(setDesafios).catch(() => {}); } else setP(null); }, [token, valido]);
  useEffect(() => {
    document.title = "Lista da vez · magnética.hub";
    carregar();
    const a = setInterval(carregar, 7000), b = setInterval(() => setAgora(Date.now()), 30000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [carregar]);

  const agir = async (f: () => PromiseLike<unknown>) => { setOcupado(true); try { await f(); await carregar(); } finally { setOcupado(false); } };

  const d = useMemo(() => {
    if (!p) return null;
    const eu = p.fila.find((f) => f.pessoa_id === p.pessoa.id) ?? null;
    const espera = filaDeEspera(p.fila);
    const meuAberto = p.atend.find((a) => a.pessoa_id === p.pessoa.id && !a.resultado) ?? null;
    const metas = metasDoTime(p.plano.meta_loja, p.plano.vendedoras, p.plano.ajustes);
    const meta = metas[p.pessoa.id] ?? null;
    const real = p.mes?.faturamento ?? 0;
    const md = meta ? metaDoDia({ meta, realizado: real, hoje: p.hoje }) : null;
    const pa = p.mes && p.mes.vendas ? p.mes.pecas / p.mes.vendas : null;
    const tkm = p.mes && p.mes.vendas ? p.mes.faturamento / p.mes.vendas : null;
    return { eu, espera, minha: eu?.status === "fila" ? espera.findIndex((f) => f.pessoa_id === p.pessoa.id) + 1 : 0, meuAberto, meta, real, md, pa, tkm, resumo: resumoDoDia(p.atend), meus: p.atend.filter((a) => a.pessoa_id === p.pessoa.id) };
  }, [p]);

  if (p === undefined) return <div className="carregando">Carregando…</div>;
  if (!p || !d) return <div className="card">Este link não vale mais. Peça o seu link para a gestora.</div>;

  const hora = horaDe(new Date(agora).toISOString());
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const { eu, espera, minha, meuAberto, md, resumo } = d;
  const cor = md ? COR[corDaMeta(md.ritmo, md.batida) as keyof typeof COR] : COR.amarela;
  const dataTxt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", weekday: "long", day: "2-digit", month: "long" }).format(new Date(agora));
  const motivoFinal = motivos.map((m) => (m === "Outro" ? (outro.trim() ? `Outro: ${outro.trim().replace(/;/g, ",")}` : "Outro") : m)).join("; ");
  const minutos = meuAberto ? Math.max(0, Math.round((agora - new Date(meuAberto.inicio_em).getTime()) / 60000)) : 0;

  const salvar = async () => {
    if (!fechando) return;
    await agir(() => vezEncerrar(token, fechando, fechando === "nao_vendeu" ? motivoFinal : "", cliente.trim(), fechando === "nao_vendeu" ? obs.trim() : "", fechando === "vendeu" ? indicou : null));
    setIndicou(null); setFechando(null); setMotivos([]); setOutro(""); setCliente(""); setObs("");
  };
  const motivoMsg = md
    ? md.batida ? "Meta do mês batida! 🎉 Agora cada venda é a mais."
      : md.ritmo === null || md.ritmo >= 1 ? "Você está no ritmo da meta. Segue assim! 💪"
      : `Faltam ${brl(Math.max(0, md.esperado - d.real))} para voltar ao ritmo. Hoje dá!`
    : "";

  return (
    <>
      <style>{`.vez-btn{display:block;width:100%;border:0;border-radius:14px;padding:16px 12px;font-size:18px;font-weight:800;cursor:pointer;color:#fff;background:var(--red);font-family:inherit}
        .vez-btn:disabled{opacity:.55}.vez-btn.verde{background:${COR.verde}}.vez-btn.cinza{background:var(--line);color:var(--text)}
        .vez-fila{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--bg-soft,rgba(127,127,127,.08));margin-top:6px}
        .vez-num{flex:0 0 30px;height:30px;border-radius:50%;background:var(--text);color:var(--bg,#fff);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}
        .vez-chip{border:1.5px solid var(--line);background:transparent;color:var(--text);border-radius:999px;padding:9px 13px;font-size:15px;font-family:inherit;cursor:pointer}
        .vez-chip.on{background:var(--text);color:var(--bg,#fff);border-color:var(--text)}`}</style>

      <div style={{ marginBottom: 14 }}>
        <small className="mudo">{dataTxt.charAt(0).toUpperCase() + dataTxt.slice(1)}{p.pessoa.loja ? ` · ${p.pessoa.loja}` : ""}</small>
        <h1 style={{ margin: "2px 0 0", fontSize: 26 }}>{saudacao}, {p.pessoa.nome}!</h1>
      </div>

      <DesafioDoDia token={token} lista={desafios} aoMudar={carregar} />

      {/* A lista da vez */}
      <div className="card mb">
        <div className="linha entre"><b style={{ fontSize: 18 }}>Lista da vez</b><small className="mudo">{espera.length} na fila{p.fila.some((f) => f.status === "atendendo") ? ` · ${p.fila.filter((f) => f.status === "atendendo").length} atendendo` : ""}</small></div>

        {!eu && <button type="button" className="vez-btn mt" disabled={ocupado} onClick={() => agir(() => vezEntrar(token))}>Cheguei! Entrar na vez</button>}

        {eu?.status === "fila" && (
          <div className="mt">
            {minha === 1
              ? <div style={{ background: `${COR.verde}22`, border: `2px solid ${COR.verde}`, borderRadius: 14, padding: 12, textAlign: "center", fontWeight: 800, fontSize: 20 }}>É a sua vez! 🙌</div>
              : <div style={{ textAlign: "center", fontSize: 17 }}>Você é a <b>{minha}ª</b> da fila. Falta{minha - 1 === 1 ? "" : "m"} {minha - 1} na sua frente.</div>}
            <button type="button" className={`vez-btn mt ${minha === 1 ? "verde" : "cinza"}`} disabled={ocupado}
              onClick={() => { if (minha === 1 || confirm("Ainda não é a sua vez. Atender mesmo assim?")) agir(() => vezAtender(token)); }}>
              {minha === 1 ? "Vou atender agora" : "Atender fora da vez"}
            </button>
            <div className="linha" style={{ gap: 8, marginTop: 8 }}>
              <button type="button" className="btn s" style={{ flex: 1 }} disabled={ocupado} onClick={() => agir(() => vezPassar(token))}>Passar a vez</button>
              <button type="button" className="btn s" style={{ flex: 1 }} disabled={ocupado} onClick={() => { if (confirm("Sair da lista?")) agir(() => vezSair(token)); }}>Sair da lista</button>
            </div>
          </div>
        )}

        {eu?.status === "atendendo" && (
          <div className="mt">
            <div style={{ textAlign: "center", fontSize: 17 }}>Atendendo há <b>{minutos} min</b>. No fim do atendimento, conta como foi:</div>
            {!fechando ? (
              <div className="linha" style={{ gap: 10, marginTop: 10 }}>
                <button type="button" className="vez-btn verde" style={{ flex: 1 }} onClick={() => setFechando("vendeu")}>Vendeu 🛍️</button>
                <button type="button" className="vez-btn cinza" style={{ flex: 1 }} onClick={() => setFechando("nao_vendeu")}>Não vendeu</button>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                {fechando === "nao_vendeu" && (
                  <>
                    <b>Por que não vendeu?</b> <small className="mudo">Marque um ou mais</small>
                    <div className="linha" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {MOTIVOS.map((m) => <button key={m} type="button" className={`vez-chip ${motivos.includes(m) ? "on" : ""}`} onClick={() => setMotivos(motivos.includes(m) ? motivos.filter((x) => x !== m) : [...motivos, m])}>{m}</button>)}
                    </div>
                    {motivos.includes("Outro") && <input type="text" placeholder="Qual foi o motivo?" value={outro} onChange={(e) => setOutro(e.target.value)} maxLength={120} style={{ width: "100%", marginTop: 8, fontSize: 16 }} />}
                    <textarea placeholder="O que a cliente queria? (se quiser anotar. Ex.: casaco P de lã)" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={300} rows={2} style={{ width: "100%", marginTop: 10, fontSize: 16, fontFamily: "inherit" }} />
                  </>
                )}
                {fechando === "vendeu" && (extras?.colegas.length ?? 0) > 0 && p.hoje >= "2026-11-01" && p.hoje <= "2026-12-31" && (
                  <div style={{ marginTop: 10 }}>
                    <b>Alguém da outra loja indicou essa cliente para você?</b> <small className="mudo">Quem indicou ganha +20 pontos e 20 estrelas</small>
                    <div className="linha" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <button type="button" className={`vez-chip ${indicou === null ? "on" : ""}`} onClick={() => setIndicou(null)}>Ninguém</button>
                      {extras?.colegas.map((c) => <button key={c.id} type="button" className={`vez-chip ${indicou === c.id ? "on" : ""}`} onClick={() => setIndicou(c.id)}>{c.nome}</button>)}
                    </div>
                  </div>
                )}
                <input type="text" placeholder="Nome da cliente (se quiser anotar)" value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={60} style={{ width: "100%", marginTop: 10, fontSize: 16 }} />
                <div className="linha" style={{ gap: 8, marginTop: 10 }}>
                  <button type="button" className="btn s" style={{ flex: 1 }} onClick={() => { setFechando(null); setMotivos([]); setObs(""); }}>Voltar</button>
                  <button type="button" className="vez-btn" style={{ flex: 2 }} disabled={ocupado || (fechando === "nao_vendeu" && motivos.length === 0)} onClick={salvar}>Salvar e voltar para o final da fila</button>
                </div>
              </div>
            )}
          </div>
        )}

        {ordenarFila(p.fila).length > 0 && (
          <div style={{ marginTop: 14 }}>
            {ordenarFila(p.fila).map((f) => {
              const pos = f.status === "fila" ? espera.findIndex((x) => x.pessoa_id === f.pessoa_id) + 1 : 0;
              return (
                <div key={f.pessoa_id} className="vez-fila" style={f.pessoa_id === p.pessoa.id ? { outline: "2px solid var(--red)" } : undefined}>
                  <span className="vez-num">{f.status === "atendendo" ? "•" : pos}</span>
                  <b style={{ flex: 1 }}>{f.nome}{f.pessoa_id === p.pessoa.id ? " (você)" : ""}</b>
                  <small className="mudo">{f.status === "atendendo" ? "atendendo" : `chegou ${horaMin(f.chegou_em)}`}</small>
                </div>
              );
            })}
          </div>
        )}
        {ordenarFila(p.fila).length === 0 && <p className="mudo" style={{ margin: "12px 0 0" }}>Ninguém na lista ainda. Quem chega primeiro entra na vez.</p>}
        <p className="ajuda" style={{ marginBottom: 0 }}>Quem chega primeiro entra na vez e é a primeira a atender. Quem atendeu volta para o final da lista.</p>
      </div>

      {/* O objetivo do dia: o que fazer hoje para chegar na meta */}
      <div className="card mb" style={{ borderLeft: `6px solid ${cor}` }}>
        <small className="mudo">Objetivo de hoje</small>
        {md && !md.batida ? (
          <>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>Vender {brl(md.porDia)}</div>
            <p style={{ margin: "4px 0 0" }}>com <b>P.A. {n1(p.mural.pa)}</b>{p.mural.tkm ? <> e <b>ticket médio {brl(p.mural.tkm)}</b></> : null}.</p>
          </>
        ) : md ? (
          <div style={{ fontSize: 24, fontWeight: 800 }}>Meta do mês batida! 🎉</div>
        ) : (
          <p style={{ margin: "4px 0 0" }}>Sua gestora ainda não definiu a sua meta do mês. Enquanto isso, o objetivo é <b>P.A. {n1(p.mural.pa)}</b>{p.mural.tkm ? <> e <b>ticket médio {brl(p.mural.tkm)}</b></> : null}.</p>
        )}
        {p.missoes.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
            <small className="mudo">Missão do dia</small>
            {p.missoes.map((m) => (
              <label key={m.id} style={{ display: "flex", flexWrap: "nowrap", gap: 10, alignItems: "flex-start", marginTop: 8, fontSize: 17, cursor: "pointer" }}>
                <input type="checkbox" checked={m.feito} style={{ width: 24, height: 24, marginTop: 1, flex: "0 0 24px" }}
                  onChange={(e) => { const feito = e.target.checked; setP({ ...p, missoes: p.missoes.map((x) => (x.id === m.id ? { ...x, feito } : x)) }); vezMissaoMarcar(token, m.id, feito).then(carregar); }} />
                <span style={{ flex: 1, textDecoration: m.feito ? "line-through" : undefined, opacity: m.feito ? 0.6 : 1 }}><TextoComLinks texto={m.texto} /></span>
              </label>
            ))}
            {p.missoes.every((m) => m.feito) && <p style={{ margin: "10px 0 0" }}>Missão cumprida! 👏 +1 estrela ⭐</p>}
          </div>
        )}
      </div>

      {extras && <PontosDaVez p={extras.pontos} />}
      {lojinha && <LojinhaDaVez token={token} l={lojinha} aoMudar={carregar} />}
      {extras && <ClientesParaChamar lista={extras.chamar} marcar={(id, feito) => { setExtras({ ...extras, chamar: extras.chamar.map((c) => (c.id === id ? { ...c, feito } : c)) }); vezChamarMarcar(token, id, feito).then(carregar); }} />}

      {/* Meus números: meta, P.A. e ticket médio, atualizados pelo caixa lançado */}
      <div className="card mb">
        <b style={{ fontSize: 18 }}>Meus números do mês</b>
        {d.meta ? (
          <div className="linha" style={{ gap: 16, alignItems: "center", marginTop: 10 }}>
            <Anel pct={md?.pct ?? 0} cor={cor} centro={`${Math.round((md?.pct ?? 0) * 100)}%`} legenda="da meta" />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{brl(d.real)}</div>
              <div className="mudo">de {brl(d.meta)}</div>
              {md && !md.batida && <div style={{ marginTop: 6 }}>Faltam <b>{brl(md.faltam)}</b> em {md.diasRestantes} {md.diasRestantes === 1 ? "dia" : "dias"} de loja.</div>}
            </div>
          </div>
        ) : <p className="mudo">A sua meta do mês aparece aqui quando a gestora definir.</p>}
        {motivoMsg && <p style={{ margin: "10px 0 0", fontWeight: 700 }}>{motivoMsg}</p>}
        <Barra rotulo="P.A." valor={d.pa} meta={p.mural.pa} texto={d.pa === null ? "" : n1(d.pa)} />
        {p.mural.tkm !== null && <Barra rotulo="Ticket médio" valor={d.tkm} meta={p.mural.tkm} texto={d.tkm === null ? "" : brl(d.tkm)} />}
        <p className="ajuda" style={{ marginBottom: 0 }}>{p.mes?.ate ? `Atualizado com o caixa lançado até ${p.mes.ate.slice(8)}/${p.mes.ate.slice(5, 7)}.` : "Aparece quando o caixa do mês for lançado."}</p>
      </div>

      {/* Os atendimentos de hoje */}
      <div className="card mb">
        <b style={{ fontSize: 18 }}>Hoje na loja</b>
        <div className="linha" style={{ gap: 10, marginTop: 10, textAlign: "center" }}>
          {[["Atendimentos", String(resumo.total)], ["Vendas", String(resumo.vendeu)], ["Conversão", resumo.conversao === null ? "—" : `${Math.round(resumo.conversao * 100)}%`]].map(([r, v]) => (
            <div key={r} style={{ flex: 1 }}><div style={{ fontSize: 26, fontWeight: 800 }}>{v}</div><small className="mudo">{r}</small></div>
          ))}
        </div>
        {d.meus.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <small className="mudo">Os seus atendimentos</small>
            {[...d.meus].reverse().map((a) => (
              <div key={a.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                <div className="linha entre" style={{ gap: 8 }}>
                  <span>{horaMin(a.inicio_em)} · {a.resultado === "vendeu" ? "✅ Vendeu" : a.resultado === "nao_vendeu" ? `❌ Não vendeu${a.motivo ? `: ${a.motivo}` : ""}` : "em atendimento"}{a.cliente ? ` · ${a.cliente}` : ""}{a.obs ? ` · “${a.obs}”` : ""}</span>
                  {a.resultado && <button type="button" className="btn s peq" onClick={() => setCorrigir(corrigir === a.id ? null : a.id)}>Corrigir</button>}
                </div>
                {corrigir === a.id && (
                  <div className="linha" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button type="button" className="vez-chip" onClick={() => agir(() => vezCorrigir(token, a.id, "vendeu", "")).then(() => setCorrigir(null))}>Foi venda</button>
                    {MOTIVOS.map((m) => <button key={m} type="button" className="vez-chip" onClick={() => agir(() => vezCorrigir(token, a.id, "nao_vendeu", m)).then(() => setCorrigir(null))}>Não vendeu: {m}</button>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="ajuda" style={{ textAlign: "center" }}>Dica: no celular, toque em Compartilhar e em “Adicionar à tela inicial” para abrir a lista com um toque.</p>
    </>
  );
}

export default function PaginaVez() {
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px 40px" }}>
      <div className="linha" style={{ gap: 10, marginBottom: 14 }}><Simbolo tamanho={26} /><b>magnética.hub</b></div>
      <Suspense fallback={<div className="carregando">Carregando…</div>}><Vez /></Suspense>
    </main>
  );
}
