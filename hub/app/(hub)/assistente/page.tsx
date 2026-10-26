"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Escrever } from "@/components/Gravador";
import { Conversa } from "@/components/Conversa";
import { Carregando, primeiroNome, useDados, usePortal } from "@/lib/hub";
import { TIPOS, aberta, buscarCamilla, buscarDoPortal, enviarSolicitacao, responder, type Tipo } from "@/lib/assistente";

const DICA: Record<Tipo, string> = {
  "Dúvida": "Algo do método, de uma ferramenta ou de uma ação que não ficou claro.",
  "Pedido": "Precisa que a equipe faça ou revise algo: uma análise, um material, um ajuste.",
  "Aviso": "Só para a equipe saber: uma mudança na loja, uma viagem, um resultado.",
  "Urgente": "Não pode esperar o próximo encontro. A equipe vê primeiro.",
};

export default function FaleComACamilla() {
  const { portal, userId, nome } = usePortal();
  const [tipo, setTipo] = useState<Tipo>("Dúvida");
  const [enviada, setEnviada] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const { dados, recarregar } = useDados(() => buscarDoPortal(portal.id), [portal.id]);
  const { dados: camilla } = useDados(() => buscarCamilla(), []);
  if (!dados) return <Carregando />;

  const abertas = dados.filter((s) => aberta(s) || s.status === "Respondida");
  const fechadas = dados.filter((s) => s.status === "Concluída");
  const lista = verTodas ? dados : abertas;

  return (
    <>
      <Titulo titulo="Fale com a Camilla" aba="Fale com a Camilla" />

      <div className="card mb" style={{ maxWidth: 760 }}>
        <div className="linha" style={{ gap: 14, alignItems: "center", flexWrap: "nowrap", marginBottom: 12 }}>
          <span className="avatar-camilla">{camilla?.foto ? <img src={camilla.foto} alt="Camilla Ribeiro" /> : "C"}</span>
          <div>
            <h3 style={{ margin: "0 0 2px" }}>Oiê, {primeiroNome(nome)}! Me conta o que você precisa.</h3>
            <p className="ajuda" style={{ margin: 0 }}>Me escreve ou manda um áudio. Eu e a minha equipe respondemos em até 12 horas úteis (segunda a sexta, das 9h às 18h).</p>
          </div>
        </div>
        {enviada && <div className="aviso ok mb">Mensagem enviada. A resposta aparece aqui embaixo.</div>}
        <Escrever
          rotulo="Enviar para a Camilla"
          placeholder="Escreva aqui, ou grave um áudio…"
          antes={
            <>
              <div className="chips mb">
                {TIPOS.map((t) => (
                  <button key={t} type="button" className={`chip ${tipo === t ? "escolhido" : ""}`} onClick={() => setTipo(t)}>{t}</button>
                ))}
              </div>
              <p className="ajuda" style={{ margin: "0 0 8px" }}>{DICA[tipo]}</p>
            </>
          }
          enviar={async (e) => {
            await enviarSolicitacao(portal.id, userId, nome, tipo, e);
            setEnviada(true); setTipo("Dúvida"); recarregar();
          }}
        />
      </div>

      <div className="linha entre" style={{ maxWidth: 760 }}>
        <div className="secao" style={{ margin: "20px 0 12px" }}>{verTodas ? "Todas as mensagens" : "Em aberto e respondidas"}</div>
        {fechadas.length > 0 && (
          <button type="button" className="btn s peq" onClick={() => setVerTodas(!verTodas)}>
            {verTodas ? "Esconder as concluídas" : `Ver as concluídas (${fechadas.length})`}
          </button>
        )}
      </div>
      <div style={{ maxWidth: 760 }}>
        {lista.length === 0 && <p className="mudo">Nenhuma mensagem por aqui ainda.</p>}
        {lista.map((s) => (
          <Conversa key={s.id} s={s}>
            {s.status !== "Concluída" && (respondendo === s.id
              ? <div className="mt"><Escrever rotulo="Enviar" placeholder="Complemente ou responda…" enviar={async (e) => { await responder(s, userId, nome, false, e); setRespondendo(null); recarregar(); }} /></div>
              : <div className="linha mt"><button type="button" className="btn s peq" onClick={() => setRespondendo(s.id)}>Responder</button></div>)}
          </Conversa>
        ))}
      </div>
    </>
  );
}
