"use client";

import { useEffect, useRef, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { dataHora } from "@/lib/formato";
import { lerAgente, lerPrint, rodarAgente, type Agente, type Analise, type Print } from "@/lib/instagram";

const ATIVO = ["coletando", "analisando"];
const ROTULO: Record<string, string> = {
  coletando: "Coletando o Instagram…", analisando: "Analisando com o Claude… (leva de 1 a 3 minutos)", pronta: "Análise pronta", erro: "Não deu certo",
};

/** O teleprompter do vídeo da análise: texto grande rolando, para a Mila gravar. */
function Teleprompter({ texto, aoFechar }: { texto: string; aoFechar: () => void }) {
  const [rodando, setRodando] = useState(false);
  const [vel, setVel] = useState(1);
  useEffect(() => {
    if (!rodando) return;
    const el = document.getElementById("teleprompter");
    const t = setInterval(() => el?.scrollBy(0, vel), 40);
    return () => clearInterval(t);
  }, [rodando, vel]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b0908", color: "#f3ece8", zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div className="linha" style={{ gap: 8, padding: 12, borderBottom: "1px solid #333" }}>
        <button type="button" className="btn p peq" onClick={() => setRodando(!rodando)}>{rodando ? "Pausar" : "Rolar"}</button>
        <button type="button" className="btn s peq" onClick={() => setVel(Math.max(1, vel - 1))}>− devagar</button>
        <button type="button" className="btn s peq" onClick={() => setVel(vel + 1)}>+ rápido</button>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn s peq" onClick={aoFechar}>Fechar</button>
      </div>
      <div id="teleprompter" style={{ overflowY: "auto", flex: 1, padding: "40vh 8vw", fontSize: 34, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        {texto.split(/(\[[^\]]+\])/).map((t, i) => (t.startsWith("[") ? <span key={i} style={{ color: "#E08A3C" }}>{t}</span> : t))}
      </div>
    </div>
  );
}

export function AgenteAnalise({ portalId, instagram, agenteInicial, temAnalise, aoTerminar }: {
  portalId: string; instagram: string; agenteInicial: Agente | undefined; temAnalise: boolean; aoTerminar: (dados: Partial<Analise>) => void;
}) {
  const [agente, setAgente] = useState<Agente>(agenteInicial ?? {});
  const [arroba, setArroba] = useState(instagram);
  const [prints, setPrints] = useState<Print[]>([]);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [tele, setTele] = useState(false);
  const ativo = ATIVO.includes(agente.estado ?? "");
  const terminar = useRef(aoTerminar);
  terminar.current = aoTerminar;

  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(async () => {
      const r = await lerAgente(portalId);
      if (!r) return;
      setAgente(r.agente ?? {});
      if (r.agente?.estado === "pronta") terminar.current(r.dados);
    }, 5000);
    return () => clearInterval(t);
  }, [ativo, portalId]);

  const rodar = async () => {
    setErro("");
    if (temAnalise && !confirm("O agente vai refazer a análise e substituir o que está no editor. Continuar?")) return;
    setEnviando(true);
    try {
      await rodarAgente(portalId, arroba, prints, obs);
      setAgente({ estado: "coletando", instagram: arroba, inicio: new Date().toISOString() });
    } catch (e) { setErro((e as Error).message); }
    setEnviando(false);
  };

  return (
    <div className="card mb card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
      <div className="linha entre">
        <div><b style={{ fontSize: 16 }}>✨ Agente de análise</b><div className="mudo" style={{ fontSize: 13.5 }}>Dê o @ e o agente faz a análise inteira no padrão do método. Você revisa, ajusta e libera.</div></div>
        {agente.estado && <span className={`selo ${agente.estado === "pronta" ? "feito" : agente.estado === "erro" ? "erro" : "andamento"}`}>{ROTULO[agente.estado]}</span>}
      </div>

      {agente.estado === "erro" && <div className="aviso mt">{agente.msg}</div>}
      {agente.estado === "pronta" && (
        <div className="mt">
          <small className="mudo">Feita {agente.fim ? dataHora(agente.fim) : ""}{agente.fonte ? ` · dados: ${agente.fonte}` : ""}</small>
          {!!agente.pendencias?.length && (
            <div className="aviso mt"><b>Antes de liberar, confira:</b><ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{agente.pendencias.map((p) => <li key={p}>{p}</li>)}</ul></div>
          )}
          {agente.roteiro_video && (
            <div className="linha mt" style={{ gap: 8 }}>
              <button type="button" className="btn s peq" onClick={() => setTele(true)}>🎬 Abrir o teleprompter do vídeo</button>
              <Copiar texto={agente.roteiro_video} rotulo="Copiar roteiro do vídeo" />
            </div>
          )}
        </div>
      )}

      {!ativo && (
        <details className="mt" open={!agente.estado}>
          <summary style={{ cursor: "pointer" }}><b>{agente.estado ? "Rodar de novo" : "Rodar o agente"}</b></summary>
          <div className="grade g2 mt" style={{ gap: 12 }}>
            <div><label className="rotulo">@ do Instagram</label><input type="text" value={arroba} onChange={(e) => setArroba(e.target.value)} placeholder="@loja" /></div>
            <div>
              <label className="rotulo">Prints do perfil (opcional, até 8)</label>
              <input type="file" accept="image/*" multiple onChange={async (e) => {
                setErro("");
                try { setPrints(await Promise.all([...(e.target.files ?? [])].slice(0, 8).map(lerPrint))); } catch (x) { setErro((x as Error).message); }
              }} />
              <p className="ajuda">Topo do perfil (bio e destaques), aba Reels com as visualizações e o link da bio. O Instagram às vezes não libera esses dados sem login: com os prints, a análise sai completa.</p>
            </div>
          </div>
          <label className="rotulo">Observações para o agente (opcional)</label>
          <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: a loja abriu filial; o foco agora é a linha masculina." />
          {erro && <div className="aviso mt">{erro}</div>}
          <button type="button" className="btn p mt" disabled={enviando || !arroba.trim()} onClick={rodar}>{enviando ? "Enviando…" : "✨ Fazer a análise"}</button>
        </details>
      )}
      {ativo && <p className="ajuda">Pode continuar usando o Hub. Esta tela atualiza sozinha quando a análise ficar pronta.</p>}
      {tele && agente.roteiro_video && <Teleprompter texto={agente.roteiro_video} aoFechar={() => setTele(false)} />}
    </div>
  );
}
