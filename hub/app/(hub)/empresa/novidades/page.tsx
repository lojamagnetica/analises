"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados } from "@/lib/hub";
import { dataHora, haQuanto } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  ativarAvisos, buscarNovidades, desativarAvisos, excluirNovidade, marcarVisto, situacaoAvisos, vistoEm, type SituacaoAvisos,
} from "@/lib/novidades";

const TEXTO: Record<SituacaoAvisos, string> = {
  "ativo": "Os avisos estão ligados neste celular. Toda vez que uma loja fizer algo importante no Hub, chega uma notificação.",
  "desligado": "Ligue para receber uma notificação no celular quando uma loja enviar a história, responder um teste de perfil, mandar o plano do mês, concluir uma etapa ou fizer uma pergunta.",
  "instalar": "No iPhone, os avisos só funcionam com o Hub na tela de início: no Safari, toque em Compartilhar › Adicionar à Tela de Início, abra o Hub por lá e volte aqui.",
  "bloqueado": "Os avisos foram bloqueados neste aparelho. Libere em Ajustes › Notificações › magnética.hub e volte aqui.",
  "sem-suporte": "Este navegador não recebe avisos. Use o Hub instalado no celular (tela de início) ou o Chrome.",
};

/** Os avisos no celular desta pessoa: ligar, testar e desligar. */
function Avisos() {
  const [s, setS] = useState<SituacaoAvisos | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { situacaoAvisos().then(setS).catch(() => setS("sem-suporte")); }, []);
  if (!s) return null;
  const fazer = async (f: () => Promise<void>, ok: string) => {
    setOcupado(true); setMsg("");
    try { await f(); setMsg(ok); } catch (e) { setMsg((e as Error).message); }
    setS(await situacaoAvisos().catch(() => "sem-suporte" as SituacaoAvisos)); setOcupado(false);
  };
  return (
    <div className={`card mb card-borda`} style={{ ["--c" as string]: s === "ativo" ? "var(--green)" : "var(--red)" }}>
      <h3 style={{ margin: "0 0 4px" }}>🔔 Avisos no celular {s === "ativo" && <span className="selo feito" style={{ marginLeft: 6 }}>ligados</span>}</h3>
      <p style={{ margin: "0 0 10px", fontSize: 14.5 }}>{TEXTO[s]}</p>
      <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
        {s === "desligado" && <button type="button" className="btn p peq" disabled={ocupado} onClick={() => fazer(ativarAvisos, "Pronto! Os avisos estão ligados neste celular.")}>Ligar os avisos neste celular</button>}
        {s === "ativo" && <>
          <button type="button" className="btn s peq" disabled={ocupado} onClick={() => fazer(async () => {
            const { error } = await supabaseBrowser().rpc("novidade_teste");
            if (error) throw new Error("Não deu para mandar o teste.");
          }, "Aviso de teste enviado. Ele chega em alguns segundos.")}>Mandar um aviso de teste</button>
          <button type="button" className="link-loja" disabled={ocupado} onClick={() => { if (confirm("Desligar os avisos neste celular?")) fazer(desativarAvisos, "Avisos desligados neste celular."); }}>Desligar</button>
        </>}
      </div>
      {msg && <p className="ajuda" style={{ marginBottom: 0 }}>{msg}</p>}
    </div>
  );
}

/** O que as lojas fizeram no Hub, do mais novo para o mais antigo. */
export default function Novidades() {
  const { dados, recarregar } = useDados(buscarNovidades, []);
  const [visto] = useState(vistoEm);
  const [erro, setErro] = useState("");
  useEffect(() => { if (dados) marcarVisto(); }, [dados]);
  if (!dados) return <Carregando />;
  const novas = dados.filter((n) => !visto || n.created_at > visto).length;
  return (
    <>
      <Titulo titulo="Novidades das lojas" sub="O que as lojas fizeram no Hub: história enviada, teste de perfil respondido, plano do mês, etapas concluídas e perguntas." />
      <Avisos />
      {erro && <div className="aviso mb">{erro}</div>}
      {novas > 0 && <p className="mb"><b>{novas} {novas === 1 ? "novidade nova" : "novidades novas"}</b> desde a última vez que você olhou.</p>}
      {!dados.length && <div className="card mudo">Nada novo por enquanto. Assim que uma loja fizer algo, aparece aqui.</div>}
      {dados.length > 0 && (
        <div className="card">
          {dados.map((n) => {
            const nova = !visto || n.created_at > visto;
            return (
              <div key={n.id} className="linha entre" style={{ gap: 10, padding: "10px 0", borderTop: "1px solid var(--line)", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  {n.link ? <Link href={n.link} style={{ color: "inherit", fontWeight: nova ? 700 : 400 }}>{n.texto}</Link> : <span style={{ fontWeight: nova ? 700 : 400 }}>{n.texto}</span>}
                  <div><small className="mudo" title={dataHora(n.created_at)}>{haQuanto(n.created_at)}</small>{nova && <span className="selo andamento" style={{ marginLeft: 8 }}>nova</span>}</div>
                </div>
                <button type="button" className="link-loja" style={{ fontSize: 12.5, color: "var(--red)", flexShrink: 0 }} onClick={async () => {
                  if (!confirm("Tirar esta novidade da lista?")) return;
                  try { await excluirNovidade(n.id); recarregar(); } catch (e) { setErro((e as Error).message); }
                }}>Tirar</button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
