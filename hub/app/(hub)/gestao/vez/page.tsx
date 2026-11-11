"use client";

// Lista da vez, na visão da gestora: a fila ao vivo, a missão do dia de cada pessoa, o resumo do dia
// (fluxo por horário, conversão, motivos) e os links pessoais da equipe.
import { useEffect, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { aulaPorId, linkAula } from "@/lib/guias";
import { Titulo } from "@/components/Titulo";
import { PontosGestao } from "@/components/PontosGestao";
import { Carregando, useDados, useLojaFoco, usePortal } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { quemVende } from "@/lib/pessoas";
import { DIAS_FLUXO, MOTIVOS, filaDeEspera, fluxoSemanal, horaMin, ordenarFila, resumoDoDia, textoDoResumo } from "@/lib/vez-calculo";
import { atendEditar, atendExcluir, buscarFluxo, buscarVezDoDia, linkDaVez, missaoAdicionar, missaoExcluir, novoLinkDaPessoa, tirarDaFila, type AtendGestao } from "@/lib/vez";

const somaDias = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

/** Uma barrinha horizontal com o valor escrito. */
function Linha({ rotulo, valor, max, cor, extra }: { rotulo: string; valor: number; max: number; cor?: string; extra?: string }) {
  return (
    <div className="linha" style={{ gap: 10, alignItems: "center", margin: "5px 0" }}>
      <span style={{ flex: "0 0 92px", fontSize: 13 }}>{rotulo}</span>
      <div style={{ flex: 1, height: 14, borderRadius: 7, background: "var(--line)" }}><div style={{ width: `${max ? (valor / max) * 100 : 0}%`, height: "100%", borderRadius: 7, background: cor ?? "var(--red)" }} /></div>
      <b style={{ flex: "0 0 auto", fontSize: 13 }}>{valor}{extra}</b>
    </div>
  );
}

/** Tudo da lista da vez de uma loja (a fila, a missão, o resumo e os links). loja = null: portal de uma loja só. */
function PainelDaLoja({ loja, dia, ehHoje }: { loja: string | null; dia: string; ehHoje: boolean }) {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarVezDoDia(portal.id, loja, dia), [portal.id, loja, dia]);
  const { dados: fluxoBruto } = useDados(() => buscarFluxo(portal.id, loja, dia), [portal.id, loja, dia]);
  useEffect(() => { if (!ehHoje) return; const t = setInterval(recarregar, 10000); return () => clearInterval(t); }, [ehHoje, recarregar]);
  const [editar, setEditar] = useState<string | null>(null);
  const [res, setRes] = useState<"vendeu" | "nao_vendeu" | "">("");
  const [mot, setMot] = useState("");
  const [obsEd, setObsEd] = useState("");
  const [paraQuem, setParaQuem] = useState("todas");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;

  const time = quemVende(dados.equipe.filter((p) => !loja || !p.loja || p.loja === loja));
  const nomeDe = (id: string | null) => dados.equipe.find((p) => p.id === id)?.nome.split(" ")[0] ?? "";
  const missoesDaLoja = dados.missoes.filter((x) => time.some((p) => p.id === x.pessoa_id));
  const resumo = resumoDoDia(dados.atend);
  const fila = ordenarFila(dados.fila);
  const espera = filaDeEspera(dados.fila);
  const maxHora = Math.max(1, ...resumo.porHora.map((h) => h.total));
  const maxMotivo = Math.max(1, ...resumo.motivos.map((m) => m.qtd));
    const origem = typeof window !== "undefined" ? window.location.origin : "";

  const falha = (e: { message: string } | null) => { setErro(e ? `Não deu certo: ${e.message}` : ""); recarregar(); };
  const salvarAtend = async (x: AtendGestao) => falha((await atendEditar(x.id, { resultado: res || null, motivo: res === "nao_vendeu" ? mot : "", obs: res === "nao_vendeu" ? obsEd.trim() : "" })).error);
  const adicionar = async () => {
    if (!texto.trim()) return;
    const quem = paraQuem === "todas" ? time.map((p) => p.id) : [paraQuem];
    const r = await missaoAdicionar(portal.id, dia, quem, texto.trim());
    if (!r.error) setTexto("");
    falha(r.error);
  };

  return (
    <>
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="grade g4 mb">
        {[["Atendimentos", String(resumo.total)], ["Vendas", String(resumo.vendeu)], ["Conversão", pct(resumo.conversao)], ["Tempo médio", resumo.tempoMedioMin === null ? "—" : `${Math.round(resumo.tempoMedioMin)} min`]].map(([r, v]) => (
          <div key={r} className="card" style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 800 }}>{v}</div><small className="mudo">{r}</small></div>
        ))}
      </div>

      {ehHoje && (
        <>
          <div className="secao">Na lista agora</div>
          <div className="card mb">
            {fila.length ? fila.map((f) => (
              <div key={f.pessoa_id} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                <span><b>{f.status === "fila" ? `${espera.findIndex((x) => x.pessoa_id === f.pessoa_id) + 1}º` : "•"} {nomeDe(f.pessoa_id)}</b> <span className="mudo">· {f.status === "atendendo" ? "atendendo" : `chegou às ${horaMin(f.chegou_em)}`}</span></span>
                <button type="button" className="btn s peq" onClick={async () => { if (confirm(`Tirar ${nomeDe(f.pessoa_id)} da lista?`)) falha((await tirarDaFila(portal.id, f.loja, dia, f.pessoa_id)).error); }}>Tirar</button>
              </div>
            )) : <p className="mudo" style={{ margin: 0 }}>Ninguém na lista agora. Quem chega primeiro entra na vez, pelo link do celular.</p>}
          </div>
        </>
      )}

      <div className="secao">Missão do dia</div>
      <div className="card mb">
        <p className="mudo" style={{ marginTop: 0 }}>Escreva algo para fazer hoje, para uma pessoa ou para o time todo. Cada uma vê no celular e dá o check.</p>
        <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          <select value={paraQuem} onChange={(e) => setParaQuem(e.target.value)}>
            <option value="todas">Para todas</option>
            {time.map((p) => <option key={p.id} value={p.id}>{p.nome.split(" ")[0]}</option>)}
          </select>
          <input type="text" placeholder="Ex.: oferecer a segunda peça em todo atendimento" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && adicionar()} style={{ flex: 1, minWidth: 200 }} maxLength={200} />
          <button type="button" className="btn p peq" onClick={adicionar}>Colocar</button>
        </div>
        {missoesDaLoja.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {missoesDaLoja.map((x) => (
              <div key={x.id} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                <span>{x.feito ? "✅" : "⬜"} <b>{nomeDe(x.pessoa_id)}</b>: {x.texto}{x.feito && x.feito_em ? <span className="mudo"> · feito às {horaMin(x.feito_em)}</span> : null}</span>
                <button type="button" className="btn s peq" onClick={async () => { if (confirm("Tirar esta missão?")) falha((await missaoExcluir(x.id)).error); }}>Tirar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="secao">Resumo do dia</div>
      <div className="card mb">
        {resumo.total === 0 ? <p className="mudo" style={{ margin: 0 }}>Nenhum atendimento registrado neste dia.</p> : (
          <>
            <b>Por vendedora</b>
            {resumo.porPessoa.map((p) => <Linha key={p.nome} rotulo={p.nome.split(" ")[0]} valor={p.total} max={Math.max(...resumo.porPessoa.map((x) => x.total))} cor="#2E9D57" extra={` · ${p.vendeu} venda${p.vendeu === 1 ? "" : "s"} (${pct(p.conversao)})`} />)}
            <b style={{ display: "block", marginTop: 14 }}>Fluxo por horário</b>
            {resumo.porHora.map((h) => <Linha key={h.hora} rotulo={`${h.hora}h`} valor={h.total} max={maxHora} extra={h.vendeu ? ` · ${h.vendeu} venda${h.vendeu === 1 ? "" : "s"}` : ""} />)}
            {resumo.motivos.length > 0 && (
              <>
                <b style={{ display: "block", marginTop: 14 }}>Por que não vendeu</b>
                {resumo.motivos.map((x) => <Linha key={x.motivo} rotulo={x.motivo} valor={x.qtd} max={maxMotivo} cor="#B3261E" />)}
                <p className="ajuda" style={{ marginBottom: 0 }}>Cada “não” é uma pista do que comprar e de como vender melhor.</p>
              </>
            )}
            {resumo.procuravam.length > 0 && (
              <>
                <b style={{ display: "block", marginTop: 14 }}>O que as clientes procuravam</b>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {resumo.procuravam.map((x, i) => <li key={i}>{x.obs} <span className="mudo">· {x.nome.split(" ")[0]}{x.motivo ? ` · ${x.motivo.replace(/;/g, ",")}` : ""}</span></li>)}
                </ul>
              </>
            )}
            {resumo.foraDaVez > 0 && <p className="ajuda" style={{ marginBottom: 0 }}>{resumo.foraDaVez} atendimento{resumo.foraDaVez === 1 ? "" : "s"} fora da vez.</p>}
            <div className="linha mt" style={{ gap: 8 }}><Copiar texto={textoDoResumo(loja ?? "", dia, resumo)} rotulo="Copiar o resumo para o WhatsApp" /></div>
          </>
        )}
      </div>

      <div className="secao">Fluxo dos últimos 30 dias</div>
      <div className="card mb" style={{ overflowX: "auto" }}>
        {(() => {
          const f = fluxoSemanal(fluxoBruto ?? []);
          if (!f.total) return <p className="mudo" style={{ margin: 0 }}>O mapa aparece quando houver atendimentos registrados.</p>;
          return (
            <>
              <table style={{ borderCollapse: "separate", borderSpacing: 3, fontSize: 12, minWidth: 320 }}>
                <thead><tr><th />{f.horas.map((h) => <th key={h} style={{ fontWeight: 600 }}>{h}h</th>)}</tr></thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map((dow) => (
                    <tr key={dow}>
                      <td style={{ fontWeight: 700, paddingRight: 6 }}>{DIAS_FLUXO[dow]}</td>
                      {f.horas.map((h) => {
                        const n = f.celulas[`${dow}-${h}`] ?? 0;
                        return <td key={h} title={`${DIAS_FLUXO[dow]} ${h}h: ${n}`} style={{ width: 34, height: 28, textAlign: "center", borderRadius: 6, fontWeight: 700, background: n ? `rgba(183, 64, 14, ${0.15 + 0.75 * (n / f.maximo)})` : "var(--line)", color: n && n / f.maximo > 0.5 ? "#fff" : "inherit" }}>{n || ""}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="ajuda" style={{ marginBottom: 0 }}>
                {f.total} atendimentos. {f.pico ? `Maior movimento: ${DIAS_FLUXO[f.pico.dow]} às ${f.pico.hora}h (${f.pico.qtd}).` : ""} Quanto mais escuro, mais atendimentos começaram naquele dia e horário.
              </p>
            </>
          );
        })()}
      </div>

      <div className="secao">Atendimentos do dia</div>
      <div className="card mb">
        {dados.atend.length ? [...dados.atend].reverse().map((x) => (
          <div key={x.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span>{horaMin(x.inicio_em)} · <b>{nomeDe(x.pessoa_id) || x.nome.split(" ")[0]}</b> · {x.resultado === "vendeu" ? "✅ vendeu" : x.resultado === "nao_vendeu" ? `❌ não vendeu${x.motivo ? `: ${x.motivo}` : ""}` : "em atendimento"}{x.cliente ? ` · ${x.cliente}` : ""}{x.obs ? ` · “${x.obs}”` : ""}{x.fora_da_vez ? <span className="mudo"> · fora da vez</span> : null}</span>
              <span className="linha" style={{ gap: 6 }}>
                <button type="button" className="btn s peq" onClick={() => { setEditar(editar === x.id ? null : x.id); setRes(x.resultado ?? ""); setMot(x.motivo); setObsEd(x.obs ?? ""); }}>Editar</button>
                <button type="button" className="btn s peq" onClick={async () => { if (confirm("Excluir este atendimento?")) falha((await atendExcluir(x.id)).error); }}>Excluir</button>
              </span>
            </div>
            {editar === x.id && (
              <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
                <select value={res} onChange={(e) => setRes(e.target.value as typeof res)}><option value="">Em atendimento</option><option value="vendeu">Vendeu</option><option value="nao_vendeu">Não vendeu</option></select>
                {res === "nao_vendeu" && <select value={mot} onChange={(e) => setMot(e.target.value)}><option value="">Motivo</option>{[...new Set([...(mot && !MOTIVOS.includes(mot) ? [mot] : []), ...MOTIVOS])].map((o) => <option key={o}>{o}</option>)}</select>}
                {res === "nao_vendeu" && <input type="text" placeholder="O que a cliente queria" value={obsEd} onChange={(e) => setObsEd(e.target.value)} maxLength={300} style={{ minWidth: 220 }} />}
                <button type="button" className="btn p peq" onClick={async () => { await salvarAtend(x); setEditar(null); }}>Salvar</button>
              </div>
            )}
          </div>
        )) : <p className="mudo" style={{ margin: 0 }}>Nenhum atendimento neste dia.</p>}
      </div>

      <div className="secao">Links da equipe</div>
      <div className="card mb">
        <p className="mudo" style={{ marginTop: 0 }}>Cada pessoa tem o seu link: abre no celular, sem senha, com a lista da vez, a meta e a missão do dia. Mande pelo WhatsApp e peça para adicionar à tela inicial.</p>
        {time.length ? time.map((p) => (
          <div key={p.id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <span><b>{p.nome.split(" ")[0]}</b>{p.loja ? <span className="mudo"> · {p.loja}</span> : null}</span>
            <span className="linha" style={{ gap: 6, flexWrap: "wrap" }}>
              <Copiar texto={`Oi, ${p.nome.split(" ")[0]}! Este é o seu link da lista da vez, da meta e da missão do dia. Abre direto no celular: ${linkDaVez(origem, p.vez_token)}\n\nAntes de usar, veja o vídeo de 2 minutos que explica tudo: ${linkAula(aulaPorId("lista-da-vez"))}`} rotulo="Copiar para o WhatsApp" />
              <a className="btn s peq" href={linkDaVez(origem, p.vez_token)} target="_blank" rel="noopener">Abrir</a>
              <button type="button" className="btn s peq" onClick={async () => { if (confirm(`Gerar um link novo para ${p.nome.split(" ")[0]}? O link antigo deixa de funcionar.`)) falha((await novoLinkDaPessoa(p.id)).error); }}>Gerar novo</button>
            </span>
          </div>
        )) : <p className="mudo" style={{ margin: 0 }}>Cadastre a equipe em Gestão de pessoas, com a função de vendedora, para gerar os links.</p>}
      </div>
    </>
  );
}

export default function ListaDaVez() {
  const { portal } = usePortal();
  const [lojaFoco] = useLojaFoco();
  const lojas = portal.lojas ?? [];
  const varias = lojas.length > 1;
  // Mais de uma loja: cada loja tem a sua lista, o seu fluxo e a sua conversão, uma embaixo da outra (ou só a loja em foco).
  const paineis: (string | null)[] = varias ? (lojaFoco ? [lojaFoco] : lojas) : [null];
  const [dia, setDia] = useState(hoje());
  const ehHoje = dia === hoje();
  const [a, m, d] = dia.split("-");
  return (
    <>
      <Titulo titulo="Lista da vez" sub="A fila de atendimento de cada loja, a conversão do dia e a missão de cada pessoa. A equipe usa pelo celular, com o link pessoal de cada uma." />
      <div className="linha entre mb" style={{ flexWrap: "wrap", gap: 8 }}>
        <span className="linha" style={{ gap: 8, alignItems: "center" }}>
          <button type="button" className="btn s peq" onClick={() => setDia(somaDias(dia, -1))}>‹</button>
          <b>{d}/{m}/{a}</b>
          <button type="button" className="btn s peq" disabled={ehHoje} onClick={() => setDia(somaDias(dia, 1))}>›</button>
          {!ehHoje && <button type="button" className="btn s peq" onClick={() => setDia(hoje())}>Hoje</button>}
        </span>
        <span className="mudo">{ehHoje ? "Ao vivo: atualiza sozinho" : "Dia anterior"}</span>
      </div>
      {paineis.map((l) => (
        <section key={l ?? "loja"} className="mb" style={varias ? { borderTop: "3px solid var(--red)", paddingTop: 14, marginTop: 22 } : undefined}>
          {varias && <h2 style={{ margin: "0 0 12px" }}>{l}</h2>}
          <PainelDaLoja loja={l} dia={dia} ehHoje={ehHoje} />
        </section>
      ))}
      <PontosGestao />
    </>
  );
}
