"use client";

import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { MODELO_RESUMO, buscarRascunho, liberarResumo, recolherResumo, salvarRascunho } from "@/lib/reunioes";

/** Resumo da reunião em rascunho (só a equipe vê). Ao liberar, o texto vira a ata que a loja lê. */
export function RascunhoReuniao({ reuniaoId, portalId, ataLiberada, aoMudar }: { reuniaoId: string; portalId: string; ataLiberada: string | null; aoMudar: () => void }) {
  const { dados, recarregar } = useDados(() => buscarRascunho(reuniaoId), [reuniaoId]);
  const [resumo, setResumo] = useState<string | null>(null);
  const [interno, setInterno] = useState<string | null>(null);
  const [fonte, setFonte] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>({});
  if (dados === undefined) return <Carregando />;
  const r = resumo ?? dados?.resumo ?? (ataLiberada ? ataLiberada : MODELO_RESUMO);
  const i = interno ?? dados?.interno ?? "";
  const f = fonte ?? dados?.fonte ?? "";
  const igual = ataLiberada != null && ataLiberada.trim() === r.trim();
  const tenta = async (fn: () => Promise<void>, ok: string) => {
    setMsg({});
    try { await fn(); setMsg({ ok }); recarregar(); aoMudar(); } catch (e) { setMsg({ erro: (e as Error).message }); }
  };

  return (
    <div className="card mt" style={{ background: "var(--soft)" }}>
      <b>Resumo da reunião</b>{" "}
      <span className={`selo ${igual ? "feito" : ataLiberada ? "andamento" : "espera"}`}>{igual ? "a loja vê este texto" : ataLiberada ? "a loja vê uma versão anterior" : "rascunho: a loja ainda não vê"}</span>
      <p className="ajuda" style={{ margin: "4px 0 0" }}>Três blocos: o que trouxemos da análise, correções pendentes e direcionamentos. Revise e libere. A loja só lê depois que você liberar.</p>
      <label className="rotulo">Resumo para a loja</label>
      <textarea rows={12} value={r} onChange={(e) => setResumo(e.target.value)} />
      <label className="rotulo">Só para a equipe (a loja não vê)</label>
      <textarea rows={3} value={i} onChange={(e) => setInterno(e.target.value)} placeholder="Ex.: conversa com fornecedor, dúvidas sobre os dados, avaliação de pessoas" />
      <label className="rotulo">De onde veio o texto</label>
      <input type="text" value={f} onChange={(e) => setFonte(e.target.value)} placeholder="Ex.: transcrição do Meet, Fireflies, anotações da Camilla" />
      {msg.erro && <div className="aviso mt">{msg.erro}</div>}
      {msg.ok && <div className="aviso ok mt">{msg.ok}</div>}
      <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn s peq" onClick={() => tenta(() => salvarRascunho(reuniaoId, portalId, r, i, f), "Rascunho salvo.")}>Salvar rascunho</button>
        <button type="button" className="btn p peq" onClick={async () => {
          if (!confirm("Liberar este resumo para a loja ler?")) return;
          await tenta(async () => { await salvarRascunho(reuniaoId, portalId, r, i, f); await liberarResumo(reuniaoId, r); }, "Resumo liberado: a loja já lê.");
        }}>Liberar para a loja</button>
        {ataLiberada && (
          <button type="button" className="btn s peq" onClick={async () => {
            if (!confirm("Tirar o resumo da loja? Ele volta a ser só rascunho.")) return;
            await tenta(() => recolherResumo(reuniaoId), "Resumo recolhido: a loja não vê mais.");
          }}>Recolher</button>
        )}
      </div>
    </div>
  );
}
