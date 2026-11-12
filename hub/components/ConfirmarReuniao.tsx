"use client";

// Os botões da pergunta da Assistente Magnética no Conversas: confirmar a reunião no horário, com uns minutos a mais
// ou não mandar nada. Depois de confirmar, fica o botão do WhatsApp com a mesma mensagem que foi para o Hub da loja.
import { useState } from "react";
import { confirmarReuniao, type AcaoReuniao } from "@/lib/conversas";

export function ConfirmarReuniao({ id, acao, aoFeito }: { id: string; acao: AcaoReuniao; aoFeito: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const responder = async (minutos: number | null) => {
    setOcupado(true); setErro("");
    try { await confirmarReuniao(id, minutos); aoFeito(); } catch (e) { setErro((e as Error).message); }
    setOcupado(false);
  };

  if (acao.estado === "nao") return <div className="mudo" style={{ fontSize: 12.5, marginTop: 6 }}>Você preferiu não mandar a confirmação.</div>;
  if (acao.estado === "confirmada") {
    const zap = `https://wa.me/${acao.whatsapp ? (acao.whatsapp.length <= 11 ? "55" : "") + acao.whatsapp : ""}?text=${encodeURIComponent(acao.texto ?? "")}`;
    return (
      <div style={{ marginTop: 6 }}>
        <div className="mudo" style={{ fontSize: 12.5 }}>✓ Confirmada{acao.minutos ? ` com ${acao.minutos} min a mais` : " no horário"}. A cliente já recebeu no Hub.</div>
        <a className="btn p peq" style={{ marginTop: 6 }} href={zap} target="_blank" rel="noopener">Mandar também no WhatsApp</a>
        {!acao.whatsapp && <div className="mudo" style={{ fontSize: 12 }}>Sem WhatsApp no cadastro da loja: escolha o contato no WhatsApp.</div>}
      </div>
    );
  }
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8 }}>
      <div className="linha" style={{ gap: 6, flexWrap: "wrap" }}>
        <button type="button" className="btn p peq" disabled={ocupado} onClick={() => responder(0)}>Confirmar no horário</button>
        <button type="button" className="btn s peq" disabled={ocupado} onClick={() => responder(10)}>+10 min</button>
        <button type="button" className="btn s peq" disabled={ocupado} onClick={() => responder(15)}>+15 min</button>
        <button type="button" className="btn s peq" disabled={ocupado} onClick={() => responder(30)}>+30 min</button>
        <button type="button" className="btn s peq" disabled={ocupado} onClick={() => { if (confirm("Não mandar a confirmação para a cliente?")) responder(null); }}>Não mandar</button>
      </div>
      {erro && <div className="aviso" style={{ marginTop: 6 }}>{erro}</div>}
    </div>
  );
}
