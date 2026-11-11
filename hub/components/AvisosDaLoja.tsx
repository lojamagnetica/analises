"use client";

import { useEffect, useState } from "react";
import { ativarAvisos, situacaoAvisos, type SituacaoAvisos } from "@/lib/novidades";

const TEXTO: Partial<Record<SituacaoAvisos, string>> = {
  "desligado": "Ligue os avisos e receba direto no celular: o bom dia com a sua rotina, o lembrete do caixa do dia e o aviso quando a Camilla deixar algo novo para você ver. Sem precisar de mensagem no WhatsApp.",
  "instalar": "No iPhone, os avisos só funcionam com o portal na tela de início: no Safari, toque em Compartilhar › Adicionar à Tela de Início, abra o portal por lá e volte aqui.",
  "bloqueado": "Os avisos estão bloqueados neste aparelho. Libere em Ajustes › Notificações › magnética.hub e volte aqui.",
};

/** No Início da loja: convida a pessoa a ligar os avisos no celular (lembretes do dia). Some quando já está ligado. */
export function AvisosDaLoja() {
  const [s, setS] = useState<SituacaoAvisos | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => { situacaoAvisos().then(setS).catch(() => setS("sem-suporte")); }, []);
  if (!s || s === "ativo" || s === "sem-suporte") return null;
  return (
    <div className="card card-borda mt mb" style={{ ["--c" as string]: "var(--orange)" }}>
      <h3 style={{ margin: "0 0 4px" }}>🔔 Ligue os avisos no celular</h3>
      <p className="mudo" style={{ margin: "0 0 8px" }}>{TEXTO[s]}</p>
      {s === "desligado" && (
        <button type="button" className="btn p peq" disabled={ocupado} onClick={async () => {
          setOcupado(true); setErro("");
          try { await ativarAvisos(); setS(await situacaoAvisos()); } catch (e) { setErro((e as Error).message); }
          setOcupado(false);
        }}>{ocupado ? "Ligando…" : "Ligar os avisos"}</button>
      )}
      {erro && <div className="aviso mt" role="alert">{erro}</div>}
    </div>
  );
}
