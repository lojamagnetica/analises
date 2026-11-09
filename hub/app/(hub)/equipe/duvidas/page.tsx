"use client";

import { useMemo, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Escrever } from "@/components/Gravador";
import { Chat } from "@/components/Chat";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import {
  STATUS, aberta, buscarCaixa, buscarEquipe, mensagensDe, mudarResponsavel, mudarStatus, prazoTexto, desde, responder, virarTarefa,
  type Solicitacao, type Status,
} from "@/lib/assistente";

type Conversa = { portal_id: string; loja: string; tipo: string; inicio: string | null; lista: Solicitacao[]; ultima: string; abertas: number; urgente: boolean };

/** Caixa do Fale com a Camilla: uma conversa contínua por loja, como o WhatsApp. */
export default function CaixaAssistente() {
  const { userId, nome, abrirPortal } = useEquipe();
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [soAbertas, setSoAbertas] = useState(false);
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const [lista, equipe] = await Promise.all([buscarCaixa(), buscarEquipe()]);
    return { lista, equipe };
  }, []);

  const conversas = useMemo(() => {
    const por = new Map<string, Conversa>();
    (dados?.lista ?? []).forEach((s) => {
      const c = por.get(s.portal_id) ?? { portal_id: s.portal_id, loja: s.portal?.loja ?? "Loja", tipo: s.portal?.tipo ?? "", inicio: s.portal?.inicio ?? null, lista: [], ultima: "", abertas: 0, urgente: false };
      c.lista.push(s);
      const fim = [s.created_at, ...s.respostas.map((r) => r.created_at)].sort().pop() ?? s.created_at;
      if (fim > c.ultima) c.ultima = fim;
      if (aberta(s)) { c.abertas++; if (s.tipo === "Urgente") c.urgente = true; }
      por.set(s.portal_id, c);
    });
    // Cada lista em ordem da mais nova para a mais antiga; lojas com algo esperando primeiro.
    const todas = [...por.values()].map((c) => ({ ...c, lista: c.lista.sort((a, b) => b.created_at.localeCompare(a.created_at)) }));
    return todas.sort((a, b) => Number(b.abertas > 0) - Number(a.abertas > 0) || b.ultima.localeCompare(a.ultima));
  }, [dados]);

  if (!dados) return <Carregando />;

  const visiveis = conversas.filter((c) => !soAbertas || c.abertas > 0);
  const atual = conversas.find((c) => c.portal_id === escolhida) ?? visiveis[0] ?? null;
  const assunto = atual?.lista.find((s) => s.status !== "Concluída") ?? null; // o assunto em aberto desta loja
  const consultoria = atual?.tipo === "Consultoria";

  const fazer = async (f: () => Promise<unknown>) => {
    setErro("");
    try { await f(); recarregar(); } catch (e) { setErro(e instanceof Error ? e.message : "Não deu certo. Tente de novo."); }
  };

  const espera = assunto && aberta(assunto) ? prazoTexto({ created_at: desde(assunto) }) : null;

  return (
    <>
      <Titulo titulo="Caixa do Fale com a Camilla" sub="Uma conversa por loja, como no WhatsApp. Para a loja, toda resposta aparece como da Camilla; aqui você vê quem respondeu. Prazo de 12 horas úteis." />
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="wa-caixa">
        <div>
          <div className="chips mb">
            <button type="button" className={`chip ${!soAbertas ? "escolhido" : ""}`} onClick={() => setSoAbertas(false)}>Todas</button>
            <button type="button" className={`chip ${soAbertas ? "escolhido" : ""}`} onClick={() => setSoAbertas(true)}>Esperando resposta ({conversas.filter((c) => c.abertas > 0).length})</button>
          </div>
          <div className="wa-lojas">
            {visiveis.length === 0 && <p className="mudo" style={{ padding: 14 }}>Nenhuma conversa aqui.</p>}
            {visiveis.map((c) => {
              const msgs = mensagensDe(c.lista);
              const ultimaMsg = msgs[msgs.length - 1];
              return (
                <button key={c.portal_id} type="button" className={`wa-loja ${atual?.portal_id === c.portal_id ? "on" : ""}`} onClick={() => setEscolhida(c.portal_id)}>
                  <span className="ini">{c.loja.slice(0, 1).toUpperCase()}</span>
                  <span style={{ minWidth: 0 }}>
                    <b>{c.loja}{c.urgente && " 🔴"}</b>
                    <small>{ultimaMsg ? (ultimaMsg.da_loja ? "" : "Você: ") + (ultimaMsg.texto || (ultimaMsg.audio ? "🎤 Áudio" : "")) : ""}</small>
                  </span>
                  {c.abertas > 0 && <span className="num">{c.abertas}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {atual ? (
          <Chat
            key={atual.portal_id}
            equipe
            mensagens={mensagensDe(atual.lista)}
            topo={
              <>
                <div className="wa-topo">
                  <span className="ini avatar-camilla" style={{ background: "rgba(255,255,255,.25)" }}>{atual.loja.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <button type="button" className="link-loja" style={{ color: "inherit", fontSize: 16 }} onClick={() => abrirPortal(atual.portal_id, "/equipe/portal")}>{atual.loja}</button>
                    <small style={{ display: "block" }}>{atual.tipo}{espera ? ` · prazo ${espera.texto}` : ""}</small>
                  </div>
                </div>
                {assunto && (
                  <div className="wa-controles">
                    <span>Quem cuida:</span>
                    <select value={assunto.responsavel ?? ""} onChange={(e) => fazer(() => mudarResponsavel(assunto.id, dados.equipe.find((p) => p.id === e.target.value) ?? null))}>
                      <option value="">Ninguém ainda</option>
                      {dados.equipe.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    <select value={assunto.status} onChange={(e) => fazer(() => mudarStatus(assunto.id, e.target.value as Status))}>
                      {STATUS.map((st) => <option key={st}>{st}</option>)}
                    </select>
                    {!assunto.vinculo && (
                      <button type="button" className="btn s peq" onClick={() => fazer(() => virarTarefa(assunto, { consultoria, quem: assunto.responsavel_nome ?? nome, inicio: atual.inicio }))}>
                        {consultoria ? "Virar entrega" : "Virar tarefa do Plano"}
                      </button>
                    )}
                    <button type="button" className="btn s peq" onClick={() => fazer(() => mudarStatus(assunto.id, "Concluída"))}>Concluir assunto</button>
                  </div>
                )}
              </>
            }
            rodape={
              <Escrever
                chat
                rotulo="Responder"
                placeholder="Responder à loja (aparece como Camilla)"
                enviar={async (e) => {
                  await responder(assunto ?? atual.lista[0], userId, nome, true, e);
                  if (assunto && !assunto.responsavel) await mudarResponsavel(assunto.id, { id: userId, nome });
                  recarregar();
                }}
              />
            }
          />
        ) : <div className="aviso ok">Nada esperando resposta. 🎉</div>}
      </div>
    </>
  );
}
