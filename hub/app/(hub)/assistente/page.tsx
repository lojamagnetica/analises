"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Escrever } from "@/components/Gravador";
import { Chat } from "@/components/Chat";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { TIPOS, buscarCamilla, buscarDoPortal, enviarNoChat, mensagensDe, prazoTexto, desde, aberta, type Tipo } from "@/lib/assistente";

export default function FaleComACamilla() {
  const { portal, userId, nome } = usePortal();
  const [tipo, setTipo] = useState<Tipo>("Dúvida");
  const { dados, recarregar } = useDados(() => buscarDoPortal(portal.id), [portal.id]);
  const { dados: camilla } = useDados(() => buscarCamilla(), []);
  if (!dados) return <Carregando />;

  // Lista vem da mais nova para a mais antiga: o assunto atual é o primeiro.
  const atual = dados[0] ?? null;
  const emAberto = atual && atual.status !== "Concluída" ? atual : null;
  const espera = atual && aberta(atual) ? prazoTexto({ created_at: desde(atual) }) : null;

  return (
    <>
      <Titulo titulo="Fale com a Camilla" aba="Fale com a Camilla" />
      <Chat
        mensagens={mensagensDe(dados)}
        topo={
          <div className="wa-topo">
            <span className="avatar-camilla">{camilla?.foto ? <img src={camilla.foto} alt="Camilla Ribeiro" /> : "C"}</span>
            <div>
              <b>Camilla Ribeiro</b>
              <small>{espera ? `Responde ${espera.atrasada ? "em breve" : espera.texto}` : "Eu e minha equipe respondemos em até 12 horas úteis (seg a sex, 9h às 18h)"}</small>
            </div>
          </div>
        }
        rodape={
          <Escrever
            chat
            rotulo="Enviar"
            placeholder="Mensagem"
            antes={!emAberto ? (
              <div className="wa-tipos">
                {TIPOS.map((t) => <button key={t} type="button" className={tipo === t ? "on" : ""} onClick={() => setTipo(t)}>{t}</button>)}
              </div>
            ) : undefined}
            enviar={async (e) => { await enviarNoChat(portal.id, userId, nome, false, tipo, atual, e); setTipo("Dúvida"); recarregar(); }}
          />
        }
      />
    </>
  );
}
