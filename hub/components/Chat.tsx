"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ouvir } from "@/components/Gravador";
import type { Mensagem } from "@/lib/assistente";

const FUSO = "America/Recife";
const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const diaChave = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(iso));

function rotuloDia(iso: string) {
  const hoje = diaChave(new Date().toISOString());
  const ontem = diaChave(new Date(Date.now() - 86_400_000).toISOString());
  const d = diaChave(iso);
  if (d === hoje) return "Hoje";
  if (d === ontem) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "2-digit", month: "long" }).format(new Date(iso));
}

const DIAS_VISIVEIS = 30;

/** Conversa contínua no estilo WhatsApp. `equipe`: quem olha é a equipe (as bolhas da equipe ficam à direita).
 *  Mostra os últimos 30 dias; as mensagens mais antigas aparecem ao pedir. */
export function Chat({ mensagens, equipe, rodape, topo }: { mensagens: Mensagem[]; equipe?: boolean; rodape: React.ReactNode; topo?: React.ReactNode }) {
  const [antigas, setAntigas] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const corte = Date.now() - DIAS_VISIVEIS * 86_400_000;
  const escondidas = useMemo(() => mensagens.filter((m) => new Date(m.created_at).getTime() < corte).length, [mensagens, corte]);
  const visiveis = antigas ? mensagens : mensagens.filter((m) => new Date(m.created_at).getTime() >= corte);

  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [visiveis.length]);

  // Marca ✓✓ azul nas mensagens de quem olha que já tiveram resposta depois.
  const ultimaDaOutra = [...mensagens].reverse().find((m) => m.da_loja === !!equipe && !m.automatica)?.created_at ?? "";

  let diaAnterior = "";
  return (
    <div className="wa">
      {topo}
      <div className="wa-fundo">
        {escondidas > 0 && !antigas && (
          <button type="button" className="wa-aviso" onClick={() => setAntigas(true)}>Ver mensagens anteriores ({escondidas})</button>
        )}
        {visiveis.length === 0 && <div className="wa-aviso">Nenhuma mensagem ainda. Escreva abaixo para começar a conversa.</div>}
        {visiveis.map((m) => {
          const minha = equipe ? !m.da_loja : m.da_loja;
          const dia = diaChave(m.created_at);
          const mostraDia = dia !== diaAnterior;
          diaAnterior = dia;
          const lida = minha && ultimaDaOutra !== "" && m.created_at <= ultimaDaOutra;
          return (
            <div key={m.id}>
              {mostraDia && <div className="wa-dia"><span>{rotuloDia(m.created_at)}</span></div>}
              <div className={`wa-linha-msg ${minha ? "minha" : ""}`}>
                <div className={`wa-bolha ${minha ? "minha" : ""} ${m.automatica ? "auto" : ""}`}>
                  {(equipe || !minha) && (
                    <span className="wa-nome">
                      {m.automatica ? "Assistente Magnética" : m.da_loja ? (m.nome || "Loja") : equipe ? `${m.nome || "Equipe"} (a loja vê: Camilla)` : "Camilla"}
                    </span>
                  )}
                  {m.tipo && m.tipo !== "Dúvida" && <span className={`wa-tipo ${m.tipo === "Urgente" ? "urgente" : ""}`}>{m.tipo}</span>}
                  {m.audio && <Ouvir caminho={m.audio} transcricao={m.transcricao} />}
                  {m.texto && <span className="wa-texto">{m.texto}</span>}
                  <span className="wa-hora">{hora(m.created_at)}{minha && <span className={`wa-ticks ${lida ? "lida" : ""}`}>✓✓</span>}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>
      <div className="wa-rodape">{rodape}</div>
    </div>
  );
}
