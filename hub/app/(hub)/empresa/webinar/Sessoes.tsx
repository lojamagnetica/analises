"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import { PERGUNTAS, STATUS, buscarSessoes, excluirSessao, linkSessao, salvarSessao, whatsSessao, type Sessao, type Status } from "@/lib/webinar-sessao";

/** A oferta do webinar: o link e o QR code do formulário e a lista de quem pediu a Sessão Estratégica. */
export function Sessoes({ setMsg }: { setMsg: (s: string) => void }) {
  const { dados, recarregar } = useDados(buscarSessoes, []);
  const [qr, setQr] = useState("");
  const [filtro, setFiltro] = useState<Status | "todos">("todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const link = linkSessao();
  useEffect(() => { QRCode.toDataURL(link, { width: 900, margin: 2, color: { dark: "#171412", light: "#ffffff" } }).then(setQr).catch(() => setQr("")); }, [link]);
  if (!dados) return <Carregando />;

  const fazer = async (f: () => Promise<void>, aviso: string) => { setMsg(""); try { await f(); setMsg(aviso); recarregar(); } catch (e) { setMsg((e as Error).message); } };
  const lista = dados.filter((s) => filtro === "todos" || s.status === filtro);
  const quentes = dados.filter((s) => s.interesse === "Sim").length;

  return (
    <>
      <div className="card mb">
        <div className="linha" style={{ gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {qr && <img src={qr} alt="QR code do formulário da Sessão Estratégica" style={{ width: 160, height: 160, border: "1px solid var(--line)", borderRadius: 8 }} />}
          <div style={{ flex: 1, minWidth: 220 }}>
            <b>Formulário da Sessão Estratégica de Fim de Ano</b>
            <p className="ajuda" style={{ margin: "2px 0 8px" }}>É o link da oferta no fim da aula: vai no slide, no chat do Meet e no grupo. Quem responde aparece aqui embaixo, marcado como vindo do webinar.</p>
            <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
              <Copiar texto={link} rotulo="Copiar o link" />
              {qr && <a className="btn s peq" href={qr} download="qr-sessao-estrategica.png">Baixar o QR code</a>}
              <a className="btn s peq" href={link} target="_blank" rel="noreferrer">Ver o formulário</a>
            </div>
          </div>
        </div>
      </div>

      <div className="grade g4 mb">
        <div className="card"><small className="mudo">Pedidos</small><div style={{ fontSize: 26, fontWeight: 700 }}>{dados.length}</div></div>
        <div className="card"><small className="mudo">Querem o acompanhamento</small><div style={{ fontSize: 26, fontWeight: 700 }}>{quentes}</div></div>
        <div className="card"><small className="mudo">Agendados</small><div style={{ fontSize: 26, fontWeight: 700 }}>{dados.filter((s) => s.status === "agendado").length}</div></div>
        <div className="card"><small className="mudo">Sessões feitas</small><div style={{ fontSize: 26, fontWeight: 700 }}>{dados.filter((s) => s.status === "feito").length}</div></div>
      </div>

      <div className="chips mb" role="group" aria-label="Filtrar pela situação">
        <button type="button" className={`chip ${filtro === "todos" ? "escolhido" : ""}`} onClick={() => setFiltro("todos")}>Todos ({dados.length})</button>
        {STATUS.map((s) => <button key={s.v} type="button" className={`chip ${filtro === s.v ? "escolhido" : ""}`} onClick={() => setFiltro(s.v)}>{s.r} ({dados.filter((x) => x.status === s.v).length})</button>)}
      </div>

      {lista.length === 0 && <div className="card"><p className="mudo" style={{ margin: 0 }}>Ninguém aqui ainda.</p></div>}
      {lista.map((s: Sessao) => {
        const st = STATUS.find((x) => x.v === s.status) ?? STATUS[0];
        return (
          <div key={s.id} className="card mb">
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <div>
                <b>{s.nome}</b> · {s.loja || "—"} <small className="mudo">({s.cidade || "—"})</small>
                {s.interesse === "Sim" && <span className="selo feito" style={{ marginLeft: 6 }}>quer o acompanhamento</span>}
                <br /><small className="mudo">{dataHora(s.created_at)} · {s.faturamento || "—"} · desafio: {s.desafio || "—"}{s.origem !== "webinar" ? ` · origem: ${s.origem}` : ""}</small>
              </div>
              <span className={`selo ${st.selo}`}>{st.r}</span>
            </div>
            <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
              <a className="btn p peq" href={whatsSessao(s)} target="_blank" rel="noreferrer" onClick={() => { if (s.status === "novo") salvarSessao(s.id, { status: "chamado" }).then(recarregar); }}>Chamar no WhatsApp</a>
              <select value={s.status} onChange={(e) => fazer(() => salvarSessao(s.id, { status: e.target.value as Status }), "Situação salva ✓")}>
                {STATUS.map((x) => <option key={x.v} value={x.v}>{x.r}</option>)}
              </select>
              <button type="button" className="link-loja" onClick={() => setAberto(aberto === s.id ? null : s.id)}>{aberto === s.id ? "Esconder as respostas" : "Ver as respostas"}</button>
              <button type="button" className="link-loja" onClick={() => { const o = prompt("Anotação do time:", s.obs); if (o != null) fazer(() => salvarSessao(s.id, { obs: o.trim() }), "Anotação salva ✓"); }}>{s.obs ? "Editar a anotação" : "Anotar"}</button>
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Excluir o pedido de ${s.nome}?`)) fazer(() => excluirSessao(s.id), "Pedido excluído."); }}>Excluir</button>
            </div>
            {s.obs && <p className="ajuda" style={{ margin: "8px 0 0" }}>📝 {s.obs}</p>}
            {aberto === s.id && (
              <table className="tabela mt">
                <tbody>
                  {PERGUNTAS.map((p) => <tr key={p.id}><td style={{ width: "45%" }}><small>{p.pergunta}</small></td><td>{s[p.id] || "—"}</td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </>
  );
}
