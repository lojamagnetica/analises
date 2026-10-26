"use client";

import { useState } from "react";
import { pedirRenovacao } from "@/lib/contrato";

/** Card "Sua mentoria termina em N dias" com o pedido para conversar sobre a renovação (vira lead no Comercial). */
export function Renovacao({ portalId, faltam, consultoria, pedida }: { portalId: string; faltam: number; consultoria: boolean; pedida: boolean }) {
  const [estado, setEstado] = useState<"" | "indo" | "pedido" | "ja_pedido" | "erro">(pedida ? "ja_pedido" : "");
  const [erro, setErro] = useState("");
  const nome = consultoria ? "consultoria" : "mentoria";
  return (
    <div className="card card-borda mt" style={{ ["--c" as string]: "var(--orange)" }}>
      <h3 style={{ marginTop: 0 }}>Sua {nome} termina {faltam === 0 ? "hoje" : faltam === 1 ? "amanhã" : `em ${faltam} dias`}</h3>
      <p className="mudo" style={{ margin: 0 }}>Quer seguir com a gente? Peça uma conversa e a equipe te chama para falar dos próximos passos da sua loja.</p>
      {estado === "pedido" ? <div className="aviso ok mt">Pedido enviado! A equipe vai te chamar no WhatsApp para conversar.</div>
        : estado === "ja_pedido" ? <div className="aviso ok mt">Você já pediu essa conversa. A equipe vai te chamar em breve.</div>
        : (
          <>
            {estado === "erro" && <div className="aviso mt">{erro}</div>}
            <button type="button" className="btn p peq mt" disabled={estado === "indo"} onClick={async () => {
              setEstado("indo");
              try { setEstado(await pedirRenovacao(portalId)); } catch (e) { setErro((e as Error).message); setEstado("erro"); }
            }}>{estado === "indo" ? "Enviando…" : "Quero conversar sobre renovar"}</button>
          </>
        )}
    </div>
  );
}
