"use client";

import Link from "next/link";
import { Ouvir } from "@/components/Gravador";
import { dataHora } from "@/lib/formato";
import { aberta, desde, classeStatus, classeTipo, prazoTexto, type Solicitacao } from "@/lib/assistente";

/** Uma mensagem da Assistente com a conversa embaixo. A equipe usa a mesma, com os controles em children. */
export function Conversa({ s, equipe, children }: { s: Solicitacao; equipe?: boolean; children?: React.ReactNode }) {
  const prazo = aberta(s) ? prazoTexto({ created_at: desde(s) }) : null;
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: s.tipo === "Urgente" ? "var(--red)" : aberta(s) ? "var(--orange)" : "var(--green)" }}>
      <div className="linha entre">
        <div className="linha" style={{ gap: 6 }}>
          <span className={`selo ${classeTipo(s.tipo)}`}>{s.tipo}</span>
          <span className={`selo ${classeStatus(s.status)}`}>{s.status}</span>
        </div>
        <small className="mudo" style={{ textTransform: "capitalize" }}>{dataHora(s.created_at)}</small>
      </div>
      <p className="ajuda" style={{ margin: "8px 0 0" }}>
        {s.responsavel_nome ? <>Quem cuida: <b style={{ color: "var(--ink)" }}>{s.responsavel_nome}</b></> : "A equipe vai definir quem cuida."}
        {prazo && <> · <span style={prazo.atrasada ? { color: "var(--red)" } : undefined}>{equipe ? "prazo" : "resposta"} {prazo.texto}</span></>}
      </p>
      {s.texto && <p style={{ whiteSpace: "pre-wrap", margin: "10px 0 0" }}><b>{s.texto}</b></p>}
      {s.audio && <Ouvir caminho={s.audio} transcricao={s.transcricao} />}
      {s.autor_nome && <small className="mudo">Enviado por {s.autor_nome}</small>}

      {s.respostas.map((r) => (
        <div key={r.id} className={`resposta ${r.equipe ? "da-equipe" : ""}`}>
          <small><b>{r.autor_nome || (r.equipe ? "Equipe Loja Magnética" : "Loja")}</b> · <span className="mudo" style={{ textTransform: "capitalize" }}>{dataHora(r.created_at)}</span></small>
          {r.texto && <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{r.texto}</p>}
          {r.audio && <Ouvir caminho={r.audio} transcricao={r.transcricao} />}
        </div>
      ))}
      {s.vinculo === "acao" && <p className="ajuda">Virou uma entrega da equipe{equipe ? " nas ações da consultoria" : <>. Acompanhe no <Link href="/consultoria">Painel da consultoria</Link></>}.</p>}
      {s.vinculo === "plano" && <p className="ajuda">Virou tarefa no {equipe ? "Plano de Ação da loja" : <>seu <Link href="/plano">Plano de Ação</Link></>}.</p>}
      {children}
    </div>
  );
}
