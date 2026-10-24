"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Escrever } from "@/components/Gravador";
import { Conversa } from "@/components/Conversa";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import {
  STATUS, aberta, buscarCaixa, buscarEquipe, desde, mudarResponsavel, mudarStatus, prazoDe, responder, virarTarefa,
  type Solicitacao, type Status,
} from "@/lib/assistente";

type Filtro = "abertas" | "minhas" | "sem" | "respondidas" | "concluidas";
const FILTROS: [Filtro, string][] = [
  ["abertas", "Em aberto"], ["minhas", "Comigo"], ["sem", "Sem quem cuida"], ["respondidas", "Respondidas"], ["concluidas", "Concluídas"],
];

const passa = (f: Filtro, s: Solicitacao, eu: string) =>
  f === "abertas" ? aberta(s)
    : f === "minhas" ? aberta(s) && s.responsavel === eu
      : f === "sem" ? aberta(s) && !s.responsavel
        : f === "respondidas" ? s.status === "Respondida"
          : s.status === "Concluída";

// Urgentes primeiro; depois quem está esperando há mais tempo.
const ordem = (a: Solicitacao, b: Solicitacao) =>
  Number(b.tipo === "Urgente") - Number(a.tipo === "Urgente") || prazoDe({ created_at: desde(a) }).getTime() - prazoDe({ created_at: desde(b) }).getTime();

export default function CaixaAssistente() {
  const { userId, nome, abrirPortal } = useEquipe();
  const [filtro, setFiltro] = useState<Filtro>("abertas");
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const [lista, equipe] = await Promise.all([buscarCaixa(), buscarEquipe()]);
    return { lista, equipe };
  }, []);
  if (!dados) return <Carregando />;

  const conta = (f: Filtro) => dados.lista.filter((s) => passa(f, s, userId)).length;
  const lista = dados.lista.filter((s) => passa(filtro, s, userId));
  if (filtro === "abertas" || filtro === "minhas" || filtro === "sem") lista.sort(ordem);

  const fazer = async (f: () => Promise<unknown>) => {
    setErro("");
    try { await f(); recarregar(); } catch (e) { setErro(e instanceof Error ? e.message : "Não deu certo. Tente de novo."); }
  };

  return (
    <>
      <Titulo titulo="Caixa da Assistente" sub="Tudo o que as lojas mandam pela Assistente Magnética: dúvidas, pedidos, avisos e urgências. Prazo de 12 horas úteis." />
      <div className="chips mb">
        {FILTROS.map(([f, rotulo]) => (
          <button key={f} type="button" className={`chip ${filtro === f ? "escolhido" : ""}`} onClick={() => setFiltro(f)}>
            {rotulo} ({conta(f)})
          </button>
        ))}
      </div>
      {erro && <div className="aviso mb">{erro}</div>}
      {lista.length === 0 && <div className="aviso ok mb">{filtro === "abertas" ? "Nada esperando resposta. 🎉" : "Nenhuma mensagem aqui."}</div>}

      <div style={{ maxWidth: 820 }}>
        {lista.map((s) => {
          const consultoria = s.portal?.tipo === "Consultoria";
          return (
            <div key={s.id}>
              <div className="linha entre" style={{ margin: "0 0 6px" }}>
                <button type="button" className="link-loja" onClick={() => abrirPortal(s.portal_id, "/equipe/portal")}>{s.portal?.loja ?? "Loja"}</button>
                <small className="mudo">{s.portal?.tipo}</small>
              </div>
              <Conversa s={s} equipe>
                <div className="controles mt">
                  <label>
                    <span>Quem cuida</span>
                    <select
                      value={s.responsavel ?? ""}
                      onChange={(e) => fazer(() => mudarResponsavel(s.id, dados.equipe.find((p) => p.id === e.target.value) ?? null))}
                    >
                      <option value="">Ninguém ainda</option>
                      {dados.equipe.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Status</span>
                    <select value={s.status} onChange={(e) => fazer(() => mudarStatus(s.id, e.target.value as Status))}>
                      {STATUS.map((st) => <option key={st}>{st}</option>)}
                    </select>
                  </label>
                </div>
                {respondendo === s.id ? (
                  <div className="mt">
                    <Escrever
                      rotulo="Responder à loja"
                      placeholder="Sua resposta… (a loja vê o seu nome)"
                      enviar={async (e) => {
                        await responder(s, userId, nome, true, e);
                        if (!s.responsavel) await mudarResponsavel(s.id, { id: userId, nome });
                        setRespondendo(null); recarregar();
                      }}
                    />
                  </div>
                ) : (
                  <div className="linha mt" style={{ gap: 8 }}>
                    <button type="button" className="btn p peq" onClick={() => setRespondendo(s.id)}>Responder</button>
                    {!s.responsavel && <button type="button" className="btn s peq" onClick={() => fazer(() => mudarResponsavel(s.id, { id: userId, nome }))}>Eu cuido</button>}
                    {!s.vinculo && s.status !== "Concluída" && (
                      <button type="button" className="btn s peq" onClick={() => fazer(() => virarTarefa(s, { consultoria, quem: s.responsavel_nome ?? nome, inicio: s.portal?.inicio ?? null }))}>
                        {consultoria ? "Virar entrega da consultoria" : "Virar tarefa do Plano"}
                      </button>
                    )}
                    {s.status !== "Concluída" && <button type="button" className="btn s peq" onClick={() => fazer(() => mudarStatus(s.id, "Concluída"))}>Concluir</button>}
                  </div>
                )}
              </Conversa>
            </div>
          );
        })}
      </div>
    </>
  );
}
