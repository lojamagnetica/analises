"use client";

import { useEffect, useState } from "react";
import { Escrever } from "@/components/Gravador";
import { Chat } from "@/components/Chat";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { TIPOS, buscarCamilla, buscarDoPortal, enviarNoChat, mensagensDe, prazoTexto, desde, aberta, type Tipo } from "@/lib/assistente";
import { ativarAvisos, situacaoAvisos, type SituacaoAvisos } from "@/lib/novidades";

/** A conversa da loja com a Camilla. `cheia`: a tela inteira do app do celular (fora do portal). */
export function FaleComACamilla({ cheia = false }: { cheia?: boolean }) {
  const { portal, userId, nome } = usePortal();
  const [tipo, setTipo] = useState<Tipo>("Dúvida");
  const [avisos, setAvisos] = useState<SituacaoAvisos | null>(null);
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(() => buscarDoPortal(portal.id), [portal.id]);
  const { dados: camilla } = useDados(() => buscarCamilla(), []);

  // No app do celular a conversa se atualiza sozinha: ao voltar para a tela e a cada 20 segundos.
  useEffect(() => {
    if (!cheia) return;
    const ver = () => { if (document.visibilityState === "visible") recarregar(); };
    const relogio = setInterval(ver, 20_000);
    document.addEventListener("visibilitychange", ver);
    return () => { clearInterval(relogio); document.removeEventListener("visibilitychange", ver); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheia]);
  useEffect(() => { if (cheia) situacaoAvisos().then(setAvisos).catch(() => setAvisos("sem-suporte")); }, [cheia]);

  if (!dados) return <Carregando />;

  // Lista vem da mais nova para a mais antiga: o assunto atual é o primeiro.
  const atual = dados[0] ?? null;
  const emAberto = atual && atual.status !== "Concluída" ? atual : null;
  const espera = atual && aberta(atual) ? prazoTexto({ created_at: desde(atual) }) : null;
  const pedeAviso = cheia && (avisos === "desligado" || avisos === "instalar" || avisos === "bloqueado");

  return (
    <Chat
      cheia={cheia}
      mensagens={mensagensDe(dados)}
      topo={
        <>
          <div className="wa-topo">
            <span className="avatar-camilla">{camilla?.foto ? <img src={camilla.foto} alt="Camilla Ribeiro" /> : "C"}</span>
            <div>
              <b>Camilla Ribeiro</b>
              <small>{espera ? `Responde ${espera.atrasada ? "em breve" : espera.texto}` : "Eu e minha equipe respondemos em até 12 horas úteis (seg a sex, 9h às 18h)"}</small>
            </div>
          </div>
          {pedeAviso && (
            <div className="aviso" style={{ margin: 0, borderRadius: 0, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {avisos === "instalar" ? <span>Para receber o aviso da resposta, coloque este app na tela do celular: Compartilhar › Adicionar à Tela de Início.</span>
                : avisos === "bloqueado" ? <span>Os avisos estão bloqueados neste aparelho. Libere nas configurações do celular.</span>
                : <><span>Receba o aviso no celular quando a Camilla responder.</span>
                  <button type="button" className="btn p peq" onClick={async () => { setErro(""); try { await ativarAvisos(); setAvisos("ativo"); } catch (e) { setErro((e as Error).message); } }}>Ligar os avisos</button></>}
              {erro && <span role="alert">{erro}</span>}
            </div>
          )}
        </>
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
  );
}
