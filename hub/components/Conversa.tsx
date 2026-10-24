"use client";

import Link from "next/link";
import { Ouvir } from "@/components/Gravador";
import { dataHora } from "@/lib/formato";
import { aberta, desde, classeStatus, classeTipo, prazoTexto, type Solicitacao } from "@/lib/assistente";

/** Uma mensagem do Fale com a Camilla com a conversa embaixo. A equipe usa a mesma, com os controles em children.
 *  Para a loja, toda resposta da equipe aparece como da Camilla; a equipe vê quem respondeu de verdade. */
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
      {(equipe || prazo) && (
        <p className="ajuda" style={{ margin: "8px 0 0" }}>
          {equipe && (s.responsavel_nome ? <>Quem cuida: <b style={{ color: "var(--ink)" }}>{s.responsavel_nome}</b></> : "Ninguém cuidando ainda.")}
          {equipe && prazo && " · "}
          {prazo && (equipe
            ? <span style={prazo.atrasada ? { color: "var(--red)" } : undefined}>prazo {prazo.texto}</span>
            : <span>Camilla responde {prazo.atrasada ? "em breve" : prazo.texto}</span>)}
        </p>
      )}
      {s.texto && <p style={{ whiteSpace: "pre-wrap", margin: "10px 0 0" }}><b>{s.texto}</b></p>}
      {s.audio && <Ouvir caminho={s.audio} transcricao={s.transcricao} />}
      {s.autor_nome && <small className="mudo">Enviado por {s.autor_nome}</small>}

      {s.respostas.map((r) => (
        <div key={r.id} className={`resposta ${r.equipe ? "da-equipe" : ""}`}>
          <small><b>{r.automatica ? `Assistente Magnética${equipe ? " (aviso automático de espera)" : ""}` : r.equipe ? (equipe ? `${r.autor_nome || "Equipe"} (a loja vê: Camilla)` : "Camilla") : r.autor_nome || "Loja"}</b> · <span className="mudo" style={{ textTransform: "capitalize" }}>{dataHora(r.created_at)}</span></small>
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
