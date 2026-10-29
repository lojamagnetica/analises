"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora, dia } from "@/lib/formato";
import { AGENTES, buscarAgentes, salvarInstrucoes, type Agente, type Versao } from "@/lib/agentes";

function Cartao({ a, dados, recarregar, extra }: { a: Agente; dados: Record<string, unknown>; recarregar: () => void; extra?: React.ReactNode }) {
  const { nome } = useEquipe();
  const atual = String(dados.instrucoes ?? "");
  const historico = (dados.historico ?? []) as Versao[];
  const [texto, setTexto] = useState(atual);
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState("");
  const mudou = texto.trim() !== atual.trim();
  const salvar = async (novo: string) => {
    setMsg("");
    try { await salvarInstrucoes(a.chave, dados, novo, nome.split(" ")[0] || "Camilla"); setMsg("Salvo ✓ O agente já usa na próxima vez."); recarregar(); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: "var(--purple)" }}>
      <h2 style={{ margin: 0 }}>{a.nome}</h2>
      <p style={{ margin: "6px 0" }}>{a.faz}</p>
      <p className="ajuda" style={{ margin: "0 0 4px" }}><b>Onde usa:</b> <Link href={a.href}>{a.onde}</Link></p>
      <p className="ajuda" style={{ margin: 0 }}><b>Como aprende:</b> {a.aprende}</p>
      {extra}
      <button type="button" className="btn s peq mt" onClick={() => setAberto(!aberto)}>{aberto ? "Fechar as instruções" : "Ver e ajustar as instruções"}</button>
      {aberto && (
        <div className="mt">
          <p className="ajuda" style={{ marginTop: 0 }}>Escreva como se fosse explicar para uma pessoa nova da equipe: o que fazer, o que nunca fazer, o tom e a ordem. Se um texto dele saiu errado, acrescente a regra aqui.</p>
          <textarea rows={18} value={texto} onChange={(e) => setTexto(e.target.value)} style={{ fontSize: 14, lineHeight: 1.5 }} />
          <div className="linha mt" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btn p peq" disabled={!mudou || !texto.trim()} onClick={() => salvar(texto)}>Salvar</button>
            {mudou && <button type="button" className="btn s peq" onClick={() => setTexto(atual)}>Descartar</button>}
            {msg && <small className="mudo">{msg}</small>}
          </div>
          {historico.length > 0 && (
            <details className="mt">
              <summary className="ajuda" style={{ cursor: "pointer" }}>Versões anteriores ({historico.length})</summary>
              {historico.map((v, i) => (
                <div key={i} className="linha entre marcar" style={{ cursor: "default" }}>
                  <small>{dataHora(v.em)} · trocada por {v.por}</small>
                  <span className="linha" style={{ gap: 8 }}>
                    <button type="button" className="link-loja" onClick={() => setTexto(v.instrucoes)}>Ver</button>
                    <button type="button" className="link-loja" onClick={() => { if (confirm("Voltar para esta versão? A atual fica guardada nas versões anteriores.")) salvar(v.instrucoes); }}>Voltar para esta</button>
                  </span>
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/** Os agentes do Hub: o que cada um faz, onde se usa, como aprende e as instruções para a Camilla ajustar. */
export default function Agentes() {
  const { dados, recarregar } = useDados(() => buscarAgentes(), []);
  if (!dados) return <Carregando />;
  const exemplos = (
    <details className="mt">
      <summary className="ajuda" style={{ cursor: "pointer" }}>Exemplos que ele já aprendeu com você ({dados.exemplos.length})</summary>
      {!dados.exemplos.length && <p className="mudo">Ainda nenhum: aparecem aqui a partir da primeira leitura que você publicar.</p>}
      {dados.exemplos.map((e, i) => (
        <div key={i} className="grade g2 mt" style={{ gap: 10 }}>
          <div style={{ background: "var(--soft)", borderRadius: 10, padding: 10 }}><small className="mudo">Rascunho do agente · semana de {dia(e.semana)}</small><p style={{ margin: "4px 0", fontSize: 14 }}>{e.rascunho?.texto}</p></div>
          <div style={{ background: "var(--soft)", borderRadius: 10, padding: 10 }}><small className="mudo">A sua versão publicada</small><p style={{ margin: "4px 0", fontSize: 14 }}>{e.final?.texto}</p></div>
        </div>
      ))}
    </details>
  );
  return (
    <>
      <Titulo titulo="Agentes" sub="Os agentes que trabalham no Hub com o Claude. Todos entregam rascunho: nada chega na loja sem você aprovar. Aqui você vê o que cada um faz e ajusta as instruções sem mexer em código." />
      {AGENTES.map((a) => <Cartao key={a.chave} a={a} dados={dados.dados[a.chave] ?? {}} recarregar={recarregar} extra={a.chave === "leitura_agente" ? exemplos : undefined} />)}
      <div className="card mudo">
        <b style={{ color: "var(--ink)" }}>Quer um agente novo ou uma mudança maior?</b> Peça numa conversa com o Claude no projeto do Hub, como você já faz. As regras do método e da linha de gestão que você grava lá valem para todos.
      </div>
    </>
  );
}
