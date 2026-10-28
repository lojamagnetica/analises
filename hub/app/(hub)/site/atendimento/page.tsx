"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { atrasado, buscarAtendimentos, excluirAtendimento, salvarAtendimento, type Atendimento } from "@/lib/site";

const CANAIS = ["WhatsApp", "Instagram", "Site (chat)", "E-mail", "Marketplace"];
const ASSUNTOS = ["Dúvida antes de comprar", "Pedido atrasado", "Troca ou devolução", "Problema no pagamento", "Peça com defeito", "Outro"];
const amanha = () => new Date(Date.parse(hoje()) + 86_400_000).toISOString().slice(0, 10);
const novo = (): Partial<Atendimento> => ({ canal: CANAIS[0], cliente: "", assunto: ASSUNTOS[0], responsavel: "", prazo: amanha(), obs: "" });

/** Atendimento do site: cada caso com responsável e prazo. O que passou do prazo fica em vermelho. */
export default function AtendimentoSite() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ l: await buscarAtendimentos(portal.id) }), [portal.id]);
  const [ed, setEd] = useState<Partial<Atendimento> | null>(null);
  const [ver, setVer] = useState<"aberto" | "resolvido">("aberto");
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const l = dados.l;
  const abertos = l.filter((a) => a.status === "aberto");
  const atrasados = abertos.filter(atrasado);
  const resolvidos = l.filter((a) => a.status === "resolvido");
  const noPrazo = resolvidos.filter((a) => !a.prazo || (a.resolvido_em ?? "") <= a.prazo).length;
  const pessoas = [...new Set(abertos.map((a) => a.responsavel || "(sem responsável)"))];
  const lista = (ver === "aberto" ? abertos : resolvidos).sort((a, b) => Number(atrasado(b)) - Number(atrasado(a)) || (a.prazo ?? "").localeCompare(b.prazo ?? ""));

  return (
    <>
      <Titulo titulo="Atendimento do site" sub="Cada conversa que precisa de retorno (troca, atraso, dúvida) com quem cuida e até quando. Nada fica esquecido no WhatsApp." />
      <div className="grade g4 mb">
        <div className="kpi"><small>Em aberto</small><b style={{ fontSize: 26 }}>{abertos.length}</b></div>
        <div className="kpi"><small>Atrasados</small><b style={{ fontSize: 26, color: atrasados.length ? "var(--red)" : undefined }}>{atrasados.length}</b></div>
        <div className="kpi"><small>Resolvidos (60 dias)</small><b style={{ fontSize: 26 }}>{resolvidos.length}</b></div>
        <div className="kpi"><small>Resolvidos no prazo</small><b style={{ fontSize: 26 }}>{resolvidos.length ? `${Math.round((noPrazo / resolvidos.length) * 100)}%` : "—"}</b></div>
      </div>
      {pessoas.length > 0 && <p className="mudo" style={{ marginTop: 0 }}>Em aberto por pessoa: {pessoas.map((p) => `${p} (${abertos.filter((a) => (a.responsavel || "(sem responsável)") === p).length})`).join(" · ")}</p>}
      <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn p peq" onClick={() => setEd(novo())}>+ Novo atendimento</button>
        <div className="chips">
          <button type="button" className={`chip${ver === "aberto" ? " escolhido" : ""}`} onClick={() => setVer("aberto")}>Em aberto</button>
          <button type="button" className={`chip${ver === "resolvido" ? " escolhido" : ""}`} onClick={() => setVer("resolvido")}>Resolvidos</button>
        </div>
      </div>
      {ed && (
        <div className="card mb">
          <div className="grade g3" style={{ gap: "0 8px" }}>
            <label className="ajuda" style={{ display: "block" }}>Cliente<input type="text" value={ed.cliente ?? ""} onChange={(e) => setEd({ ...ed, cliente: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Canal<select value={ed.canal} onChange={(e) => setEd({ ...ed, canal: e.target.value })}>{CANAIS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="ajuda" style={{ display: "block" }}>Assunto<select value={ed.assunto} onChange={(e) => setEd({ ...ed, assunto: e.target.value })}>{ASSUNTOS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="ajuda" style={{ display: "block" }}>Quem cuida<input type="text" value={ed.responsavel ?? ""} onChange={(e) => setEd({ ...ed, responsavel: e.target.value })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Responder até<input type="date" value={ed.prazo ?? ""} onChange={(e) => setEd({ ...ed, prazo: e.target.value || null })} /></label>
          </div>
          <label className="ajuda" style={{ display: "block" }}>Detalhes<textarea rows={2} value={ed.obs ?? ""} onChange={(e) => setEd({ ...ed, obs: e.target.value })} /></label>
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" onClick={async () => {
              setErro(""); const { id, portal_id: _p, ...d } = ed;
              try { await salvarAtendimento(portal.id, id ?? null, d); setEd(null); recarregar(); } catch (e) { setErro((e as Error).message); }
            }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setEd(null)}>Cancelar</button>
          </div>
          {erro && <div className="aviso mt">{erro}</div>}
        </div>
      )}
      <div className="card">
        {!lista.length && <p className="mudo" style={{ margin: 0 }}>{ver === "aberto" ? "Nenhum atendimento em aberto. 🎉" : "Nenhum resolvido nos últimos 60 dias."}</p>}
        {lista.map((a) => (
          <div key={a.id} style={{ borderTop: "1px solid var(--line)", padding: "8px 0" }}>
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span><b>{a.cliente || "Cliente"}</b> · {a.assunto} <small className="mudo">· {a.canal} · desde {dia(a.dia)} · {a.responsavel || "sem responsável"}</small></span>
              {a.status === "aberto"
                ? <span className={`selo ${atrasado(a) ? "erro" : "andamento"}`}>{a.prazo ? `${atrasado(a) ? "Atrasado · era " : "Até "}${dia(a.prazo)}` : "Sem prazo"}</span>
                : <span className="selo feito">Resolvido {a.resolvido_em ? dia(a.resolvido_em) : ""}</span>}
            </div>
            {a.obs && <small className="mudo">{a.obs}</small>}
            <div className="linha" style={{ gap: 12 }}>
              {a.status === "aberto"
                ? <button type="button" className="link-loja" onClick={async () => { await salvarAtendimento(portal.id, a.id, { status: "resolvido", resolvido_em: hoje() }); recarregar(); }}>Marcar como resolvido</button>
                : <button type="button" className="link-loja" onClick={async () => { await salvarAtendimento(portal.id, a.id, { status: "aberto", resolvido_em: null }); recarregar(); }}>Reabrir</button>}
              <button type="button" className="link-loja" onClick={() => setEd(a)}>Editar</button>
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm("Excluir este atendimento?")) { await excluirAtendimento(a.id); recarregar(); } }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
