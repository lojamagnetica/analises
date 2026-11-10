"use client";

// Lista da vez, na visão da gestora: a fila ao vivo, a missão do dia de cada pessoa, o resumo do dia
// (fluxo por horário, conversão, motivos) e os links pessoais da equipe.
import { useEffect, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useLojaFoco, usePortal } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { quemVende } from "@/lib/pessoas";
import { MOTIVOS, filaDeEspera, horaMin, ordenarFila, resumoDoDia, textoDoResumo } from "@/lib/vez-calculo";
import { atendEditar, atendExcluir, buscarVezDoDia, linkDaVez, missaoAdicionar, missaoExcluir, novoLinkDaPessoa, tirarDaFila, type AtendGestao } from "@/lib/vez";

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

export default function ListaDaVez() {
  const { portal } = usePortal();
  const [lojaFoco] = useLojaFoco();
  const varias = (portal.lojas?.length ?? 0) > 1;
  const loja = varias ? lojaFoco : null; // com as lojas juntas, mostra todas
  const [dia, setDia] = useState(hoje());
  const ehHoje = dia === hoje();
  const { dados, recarregar } = useDados(() => buscarVezDoDia(portal.id, loja, dia), [portal.id, loja, dia]);
  useEffect(() => { if (!ehHoje) return; const t = setInterval(recarregar, 10000); return () => clearInterval(t); }, [ehHoje, recarregar]);
  const [editar, setEditar] = useState<string | null>(null);
  const [res, setRes] = useState<"vendeu" | "nao_vendeu" | "">("");
  const [mot, setMot] = useState("");
  const [paraQuem, setParaQuem] = useState("todas");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;

  const time = quemVende(dados.equipe.filter((p) => !loja || !p.loja || p.loja === loja));
  const nomeDe = (id: string | null) => dados.equipe.find((p) => p.id === id)?.nome.split(" ")[0] ?? "";
  const resumo = resumoDoDia(dados.atend);
  const fila = ordenarFila(dados.fila);
  const espera = filaDeEspera(dados.fila);
  const maxHora = Math.max(1, ...resumo.porHora.map((h) => h.total));
  const maxMotivo = Math.max(1, ...resumo.motivos.map((m) => m.qtd));
  const [a, m, d] = dia.split("-");
  const origem = typeof window !== "undefined" ? window.location.origin : "";

  const falha = (e: { message: string } | null) => { setErro(e ? `Não deu certo: ${e.message}` : ""); recarregar(); };
  const salvarAtend = async (x: AtendGestao) => falha((await atendEditar(x.id, { resultado: res || null, motivo: res === "nao_vendeu" ? mot : "" })).error);
  const adicionar = async () => {
    if (!texto.trim()) return;
    const quem = paraQuem === "todas" ? time.map((p) => p.id) : [paraQuem];
    const r = await missaoAdicionar(portal.id, dia, quem, texto.trim());
    if (!r.error) setTexto("");
    falha(r.error);
  };

  return (
    <>
      <Titulo titulo={`Lista da vez${varias && lojaFoco ? ` · ${lojaFoco}` : ""}`} sub="A fila de atendimento da loja, a conversão do dia e a missão de cada pessoa. A equipe usa pelo celular, com o link pessoal de cada uma." />
      {erro && <div className="aviso mb">{erro}</div>}

      <div className="linha entre mb" style={{ flexWrap: "wrap", gap: 8 }}>
        <span className="linha" style={{ gap: 8, alignItems: "center" }}>
          <button type="button" className="btn s peq" onClick={() => setDia(somaDias(dia, -1))}>‹</button>
          <b>{d}/{m}/{a}</b>
          <button type="button" className="btn s peq" disabled={ehHoje} onClick={() => setDia(somaDias(dia, 1))}>›</button>
          {!ehHoje && <button type="button" className="btn s peq" onClick={() => setDia(hoje())}>Hoje</button>}
        </span>
        <span className="mudo">{ehHoje ? "Ao vivo: atualiza sozinho" : "Dia anterior"}</span>
      </div>

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
        {dados.missoes.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {dados.missoes.map((x) => (
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
            {resumo.foraDaVez > 0 && <p className="ajuda" style={{ marginBottom: 0 }}>{resumo.foraDaVez} atendimento{resumo.foraDaVez === 1 ? "" : "s"} fora da vez.</p>}
            <div className="linha mt" style={{ gap: 8 }}><Copiar texto={textoDoResumo(loja ?? "", dia, resumo)} rotulo="Copiar o resumo para o WhatsApp" /></div>
          </>
        )}
      </div>

      <div className="secao">Atendimentos do dia</div>
      <div className="card mb">
        {dados.atend.length ? [...dados.atend].reverse().map((x) => (
          <div key={x.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span>{horaMin(x.inicio_em)} · <b>{nomeDe(x.pessoa_id) || x.nome.split(" ")[0]}</b> · {x.resultado === "vendeu" ? "✅ vendeu" : x.resultado === "nao_vendeu" ? `❌ não vendeu${x.motivo ? `: ${x.motivo}` : ""}` : "em atendimento"}{x.cliente ? ` · ${x.cliente}` : ""}{x.fora_da_vez ? <span className="mudo"> · fora da vez</span> : null}</span>
              <span className="linha" style={{ gap: 6 }}>
                <button type="button" className="btn s peq" onClick={() => { setEditar(editar === x.id ? null : x.id); setRes(x.resultado ?? ""); setMot(x.motivo); }}>Editar</button>
                <button type="button" className="btn s peq" onClick={async () => { if (confirm("Excluir este atendimento?")) falha((await atendExcluir(x.id)).error); }}>Excluir</button>
              </span>
            </div>
            {editar === x.id && (
              <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
                <select value={res} onChange={(e) => setRes(e.target.value as typeof res)}><option value="">Em atendimento</option><option value="vendeu">Vendeu</option><option value="nao_vendeu">Não vendeu</option></select>
                {res === "nao_vendeu" && <select value={mot} onChange={(e) => setMot(e.target.value)}><option value="">Motivo</option>{MOTIVOS.map((o) => <option key={o}>{o}</option>)}</select>}
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
              <Copiar texto={`Oi, ${p.nome.split(" ")[0]}! Este é o seu link da lista da vez, da meta e da missão do dia. Abre direto no celular: ${linkDaVez(origem, p.vez_token)}`} rotulo="Copiar para o WhatsApp" />
              <a className="btn s peq" href={linkDaVez(origem, p.vez_token)} target="_blank" rel="noopener">Abrir</a>
              <button type="button" className="btn s peq" onClick={async () => { if (confirm(`Gerar um link novo para ${p.nome.split(" ")[0]}? O link antigo deixa de funcionar.`)) falha((await novoLinkDaPessoa(p.id)).error); }}>Gerar novo</button>
            </span>
          </div>
        )) : <p className="mudo" style={{ margin: 0 }}>Cadastre a equipe em Gestão de pessoas, com a função de vendedora, para gerar os links.</p>}
      </div>
    </>
  );
}
