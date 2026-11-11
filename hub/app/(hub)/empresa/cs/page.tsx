"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora, haQuanto } from "@/lib/formato";
import { linkZap, painelCs, type AlertaCs, type LojaCs, type Nivel } from "@/lib/cs";
import { supabaseBrowser } from "@/lib/supabase/client";

const COR: Record<Nivel, string> = { vermelho: "var(--red)", amarelo: "var(--orange)", verde: "var(--feito)" };
const ROTULO: Record<Nivel, string> = { vermelho: "Precisa de você hoje", amarelo: "Atenção", verde: "Em dia" };

function Ponto({ nivel }: { nivel: Nivel }) {
  return <span aria-hidden style={{ display: "inline-block", width: 11, height: 11, borderRadius: "50%", background: COR[nivel], marginRight: 7, flex: "none" }} />;
}

/** Registrar a conversa com a loja: o que ela respondeu, se precisa de ajuda e o próximo passo. Fecha o alerta que pediu o contato. */
function RegistrarConversa({ loja, registro, nome, feito }: { loja: LojaCs; registro: { tipo: string; ref: string }; nome: string; feito: () => void }) {
  const [resumo, setResumo] = useState("");
  const [ajuda, setAjuda] = useState(false);
  const [passo, setPasso] = useState("");
  const [quando, setQuando] = useState("");
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    const { error } = await supabaseBrowser().from("cs_contatos").insert({ portal_id: loja.id, tipo: registro.tipo, ref: registro.ref, feito_em: new Date().toISOString(), feito_por: nome || null, resumo: resumo.trim() || null, precisa_ajuda: ajuda, proximo_passo: passo.trim() || null, proximo_em: quando || null });
    setSalvando(false);
    if (error) { alert(error.message); return; }
    feito();
  };
  return (
    <div className="card mt" style={{ background: "var(--soft)" }}>
      <label className="rotulo">O que a loja respondeu?</label>
      <textarea rows={2} value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Ex.: viu, entendeu, vai começar pela vitrine" />
      <label className="marcar"><input type="checkbox" checked={ajuda} onChange={(e) => setAjuda(e.target.checked)} /><span>Tem uma dificuldade em que precisamos ajudar</span></label>
      <div className="grade g2" style={{ gap: 10 }}>
        <div><label className="rotulo">Próximo passo</label><input type="text" value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="Ex.: ligar na quinta" /></div>
        <div><label className="rotulo">Quando</label><input type="date" value={quando} onChange={(e) => setQuando(e.target.value)} /></div>
      </div>
      <div className="linha mt" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar a conversa"}</button>
      </div>
    </div>
  );
}

/** Um cartão por loja: tudo o que ela precisa hoje, cada item com a mensagem pronta e o registro da conversa. */
function CartaoLoja({ l, nome, abrir, recarregar }: { l: LojaCs; nome: string; abrir: (id: string, destino?: string) => void; recarregar: () => void }) {
  const [copiada, setCopiada] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const alertas = [...l.alertas].sort((a, b) => Number(b.grave) - Number(a.grave));
  const copiar = async (id: string, msg: string) => { try { await navigator.clipboard.writeText(msg); setCopiada(id); setTimeout(() => setCopiada(""), 2000); } catch { /* sem permissão */ } };
  const item = (a: AlertaCs) => (
    <div key={a.chave} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ color: a.grave ? "var(--red)" : "inherit" }}>{a.txt}</div>
      <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
        {a.msg && <a className="btn p peq" href={linkZap(l.whatsapp, a.msg)} target="_blank" rel="noopener">Mandar no WhatsApp</a>}
        {a.msg && <button type="button" className="btn s peq" onClick={() => copiar(`${l.id}-${a.chave}`, a.msg as string)}>{copiada === `${l.id}-${a.chave}` ? "Copiada ✓" : "Copiar a mensagem"}</button>}
        {a.registro && <button type="button" className="btn s peq" onClick={() => setAberto(aberto === a.chave ? null : a.chave)}>Conversei</button>}
        {a.destino && !a.msg && <button type="button" className="btn s peq" onClick={() => abrir(l.id, a.destino)}>Abrir</button>}
      </div>
      {a.registro && aberto === a.chave && <RegistrarConversa loja={l} registro={a.registro} nome={nome} feito={() => { setAberto(null); recarregar(); }} />}
    </div>
  );
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: COR[l.nivel] }}>
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className="linha" style={{ alignItems: "center" }}><Ponto nivel={l.nivel} /><b style={{ fontSize: 16 }}>{l.loja}</b></span>
        <small className="mudo">{l.ultimo ? `acesso ${haQuanto(l.ultimo)}` : "nunca entrou"}{l.contato ? ` · conversamos ${haQuanto(l.contato.feito_em)}` : ""}{l.contato?.precisa_ajuda ? " · pediu ajuda" : ""}</small>
      </div>
      {l.contato?.resumo && <small className="mudo" style={{ display: "block", marginTop: 2 }}>Última conversa: {l.contato.resumo}</small>}
      {alertas.map(item)}
      <div className="linha mt"><button type="button" className="btn s peq" onClick={() => abrir(l.id, "/inicio")}>Abrir a loja</button></div>
    </div>
  );
}

/** Faça agora da CS: uma loja, um cartão, os mais urgentes primeiro. Cada alerta some sozinho quando o dado entra ou a conversa é registrada. */
export default function InicioCs() {
  const { nome, abrirPortal } = useEquipe();
  const { dados, recarregar } = useDados(() => painelCs(), []);
  const [ver, setVer] = useState<"agora" | "depois" | "todas">("agora");
  if (!dados) return <Carregando />;

  const { lojas, reunioes } = dados;
  const vermelhas = lojas.filter((l) => l.nivel === "vermelho");
  const amarelas = lojas.filter((l) => l.nivel === "amarelo");
  const comCaixa = lojas.filter((l) => l.caixaCompleto !== null);
  const caixaOk = comCaixa.filter((l) => l.caixaCompleto).length;
  const depois = lojas.filter((l) => l.nivel !== "vermelho" && l.alertas.length);
  const nomeCs = nome?.split(" ")[0] ?? "";

  return (
    <>
      <Titulo titulo={`Bom dia${nome ? `, ${nome.split(" ")[0]}` : ""}`} sub="Uma loja, um cartão. Resolva de cima para baixo: cada item traz a mensagem pronta, e a conversa que você registrar fecha o alerta." />

      <div className="grade g4 mb">
        <div className="kpi"><small>Precisam de você hoje</small><b style={{ fontSize: 28, color: vermelhas.length ? "var(--red)" : "var(--feito)" }}>{vermelhas.length}</b><small className="mudo">de {lojas.length} lojas</small></div>
        <div className="kpi"><small>Em atenção</small><b style={{ fontSize: 28 }}>{amarelas.length}</b></div>
        <div className="kpi"><small>Caixa da semana completo</small><b style={{ fontSize: 28 }}>{caixaOk}<span className="mudo" style={{ fontSize: 16 }}> de {comCaixa.length}</span></b></div>
        <div className="kpi"><small>Reuniões nos próximos 7 dias</small><b style={{ fontSize: 28 }}>{reunioes.length}</b></div>
      </div>

      <div className="chips mb">
        <button type="button" className={`chip${ver === "agora" ? " escolhido" : ""}`} onClick={() => setVer("agora")}>Faça agora · {vermelhas.length}</button>
        <button type="button" className={`chip${ver === "depois" ? " escolhido" : ""}`} onClick={() => setVer("depois")}>Depois · {depois.length}</button>
        <button type="button" className={`chip${ver === "todas" ? " escolhido" : ""}`} onClick={() => setVer("todas")}>Todas as lojas · {lojas.length}</button>
        <button type="button" className="chip" onClick={recarregar}>Atualizar</button>
      </div>

      {ver === "agora" && (
        <>
          {!vermelhas.length && <div className="card mudo">Nada urgente agora. Todas as lojas estão em dia. 🎉</div>}
          {vermelhas.map((l) => <CartaoLoja key={l.id} l={l} nome={nomeCs} abrir={abrirPortal} recarregar={recarregar} />)}
        </>
      )}
      {ver === "depois" && (
        <>
          {!depois.length && <div className="card mudo">Nada para depois.</div>}
          {depois.map((l) => <CartaoLoja key={l.id} l={l} nome={nomeCs} abrir={abrirPortal} recarregar={recarregar} />)}
        </>
      )}
      {ver === "todas" && <Lojas lojas={lojas} abrir={abrirPortal} />}

      {reunioes.length > 0 && (
        <>
          <div className="secao">Reuniões desta semana</div>
          <div className="card mb">
            {reunioes.map((r, i) => (
              <div key={i} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: i ? "1px solid var(--line)" : 0 }}>
                <span><b>{r.loja}</b> <span className="mudo">· {r.titulo || "Reunião"}</span></span>
                <span style={{ textTransform: "capitalize" }}>{dataHora(r.data)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="ajuda"><Link href="/equipe/controle">Voltar ao Controle de clientes</Link></p>
    </>
  );
}

function Lojas({ lojas, abrir }: { lojas: LojaCs[]; abrir: (id: string, destino?: string) => void }) {
  return (
    <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {lojas.map((l) => (
        <div key={l.id} className="card card-borda" style={{ ["--c" as string]: COR[l.nivel] }}>
          <div className="linha" style={{ alignItems: "center" }}><Ponto nivel={l.nivel} /><b style={{ fontSize: 16 }}>{l.loja}</b></div>
          <small className="mudo">{ROTULO[l.nivel]} · {l.ultimo ? `acesso ${haQuanto(l.ultimo)}` : "nunca entrou"}{l.proxReuniao ? ` · reunião ${dataHora(l.proxReuniao)}` : ""}</small>
          <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 14 }}>
            {l.alertas.map((a) => <li key={a.chave} style={{ color: a.grave ? "var(--red)" : "var(--muted)" }}>{a.txt}</li>)}
            {!l.alertas.length && <li className="mudo">Tudo em dia ✓</li>}
          </ul>
          <button type="button" className="btn s peq" onClick={() => abrir(l.id, "/inicio")}>Abrir a loja</button>
        </div>
      ))}
    </div>
  );
}
