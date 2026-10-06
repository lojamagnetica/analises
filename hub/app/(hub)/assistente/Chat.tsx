"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/Icone";
import { limparChat } from "../acoes";

type Msg = { id: string; papel: "user" | "assistant"; conteudo: string };

const SUGESTOES = [
  "Quanto preciso vender por dia para bater a meta?",
  "Crie uma ação para a próxima data comercial",
  "Escreva uma mensagem de reativação para clientes sumidas",
  "Qual deve ser a minha prioridade desta semana no Plano de Ação?",
];

export function Chat({ nome, inicial, pedir }: { nome: string; inicial: Msg[]; pedir: string }) {
  const [msgs, setMsgs] = useState<Msg[]>(inicial);
  const [texto, setTexto] = useState(pedir);
  const [ocupado, setOcupado] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function enviar(conteudo: string) {
    const t = conteudo.trim();
    if (!t || ocupado) return;
    setTexto("");
    setOcupado(true);
    const idResp = "r" + Date.now();
    setMsgs((m) => [...m, { id: "u" + Date.now(), papel: "user", conteudo: t }, { id: idResp, papel: "assistant", conteudo: "" }]);
    const atualizar = (fn: (s: string) => string) =>
      setMsgs((m) => m.map((x) => (x.id === idResp ? { ...x, conteudo: fn(x.conteudo) } : x)));
    try {
      const r = await fetch("/api/assistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensagem: t }) });
      if (!r.ok || !r.body) {
        atualizar(() => "Não consegui responder agora. Tente de novo em instantes.");
        return;
      }
      const leitor = r.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        const pedaco = dec.decode(value, { stream: true });
        atualizar((s) => s + pedaco);
      }
    } catch {
      atualizar((s) => s + "\n\n(A conexão caiu. Tente de novo.)");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="card conversa">
      <div className="mensagens">
        {msgs.length === 0 && (
          <div className="msg assistant">
            Oi, {nome}! Eu conheço a sua Personalização, o seu Plano de Ação e o método Loja Magnética. Posso escrever mensagens para clientes, montar a ação do mês, revisar a sua meta ou ajudar a priorizar a semana. Por onde começamos?
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`msg ${m.papel}`}>{m.conteudo || (ocupado ? "…" : "")}</div>
        ))}
        <div ref={fim} />
      </div>
      <div className="chips mt">
        {SUGESTOES.map((s) => (
          <button key={s} className="chip" style={{ cursor: "pointer" }} disabled={ocupado} onClick={() => enviar(s)}>{s}</button>
        ))}
      </div>
      <form className="compor" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); } }}
          placeholder="Pergunte qualquer coisa sobre a sua loja…"
        />
        <button className="btn p" disabled={ocupado} type="submit" aria-label="Enviar"><Icone nome="send" /></button>
        {msgs.length > 0 && (
          <button className="btn s" type="button" disabled={ocupado} title="Limpar conversa"
            onClick={async () => { if (confirm("Apagar a conversa?")) { await limparChat(); setMsgs([]); } }}>
            <Icone nome="trash" />
          </button>
        )}
      </form>
    </div>
  );
}
