"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora, haQuanto } from "@/lib/formato";
import { linkZap, painelCs, type LojaCs, type Nivel } from "@/lib/cs";

const COR: Record<Nivel, string> = { vermelho: "var(--red)", amarelo: "var(--orange)", verde: "var(--feito)" };
const ROTULO: Record<Nivel, string> = { vermelho: "Precisa de você hoje", amarelo: "Atenção", verde: "Em dia" };

function Ponto({ nivel }: { nivel: Nivel }) {
  return <span aria-hidden style={{ display: "inline-block", width: 11, height: 11, borderRadius: "50%", background: COR[nivel], marginRight: 7, flex: "none" }} />;
}

/** Início da CS: o que precisa da Claudia hoje, em ordem, com a mensagem pronta para cada loja. */
export default function InicioCs() {
  const { nome, abrirPortal } = useEquipe();
  const { dados, recarregar } = useDados(() => painelCs(), []);
  const [ver, setVer] = useState<"agora" | "todas">("agora");
  const [copiada, setCopiada] = useState("");
  if (!dados) return <Carregando />;

  const { lojas, reunioes } = dados;
  const vermelhas = lojas.filter((l) => l.nivel === "vermelho");
  const amarelas = lojas.filter((l) => l.nivel === "amarelo");
  const comCaixa = lojas.filter((l) => l.caixaCompleto !== null);
  const caixaOk = comCaixa.filter((l) => l.caixaCompleto).length;
  // Faça agora: os alertas graves, loja por loja, do mais urgente para o menos.
  const tarefas = lojas.flatMap((l) => l.alertas.filter((a) => a.grave).map((a) => ({ l, a })));
  const copiar = async (id: string, msg: string) => {
    try { await navigator.clipboard.writeText(msg); setCopiada(id); setTimeout(() => setCopiada(""), 2000); } catch { /* sem permissão */ }
  };

  return (
    <>
      <Titulo titulo={`Bom dia${nome ? `, ${nome.split(" ")[0]}` : ""}`} sub="O que precisa de você hoje, em ordem. Resolva de cima para baixo: cada item já traz a mensagem pronta para mandar à loja." />

      <div className="grade g4 mb">
        <div className="kpi"><small>Precisam de você hoje</small><b style={{ fontSize: 28, color: vermelhas.length ? "var(--red)" : "var(--feito)" }}>{vermelhas.length}</b><small className="mudo">de {lojas.length} lojas</small></div>
        <div className="kpi"><small>Em atenção</small><b style={{ fontSize: 28 }}>{amarelas.length}</b></div>
        <div className="kpi"><small>Caixa da semana completo</small><b style={{ fontSize: 28 }}>{caixaOk}<span className="mudo" style={{ fontSize: 16 }}> de {comCaixa.length}</span></b></div>
        <div className="kpi"><small>Reuniões nos próximos 7 dias</small><b style={{ fontSize: 28 }}>{reunioes.length}</b></div>
      </div>

      <div className="chips mb">
        <button type="button" className={`chip${ver === "agora" ? " escolhido" : ""}`} onClick={() => setVer("agora")}>Faça agora · {tarefas.length}</button>
        <button type="button" className={`chip${ver === "todas" ? " escolhido" : ""}`} onClick={() => setVer("todas")}>Todas as lojas · {lojas.length}</button>
        <button type="button" className="chip" onClick={recarregar}>Atualizar</button>
      </div>

      {ver === "agora" && (
        <>
          {!tarefas.length && <div className="card mudo">Nada urgente agora. Todas as lojas estão em dia. 🎉</div>}
          {tarefas.map(({ l, a }) => (
            <div key={`${l.id}-${a.chave}`} className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
              <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
                <b>{l.loja}</b>
                <small className="mudo">{l.ultimo ? `último acesso ${haQuanto(l.ultimo)}` : "nunca entrou"}</small>
              </div>
              <p style={{ margin: "4px 0 8px" }}>{a.txt}</p>
              <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
                {a.msg && <a className="btn p peq" href={linkZap(l.whatsapp, a.msg)} target="_blank" rel="noopener">Mandar no WhatsApp</a>}
                {a.msg && <button type="button" className="btn s peq" onClick={() => copiar(`${l.id}-${a.chave}`, a.msg as string)}>{copiada === `${l.id}-${a.chave}` ? "Copiada ✓" : "Copiar a mensagem"}</button>}
                <button type="button" className="btn s peq" onClick={() => abrirPortal(l.id, a.destino ?? "/inicio")}>Abrir a loja</button>
              </div>
            </div>
          ))}
        </>
      )}

      {ver === "todas" && <Lojas lojas={lojas} abrir={abrirPortal} />}

      {reunioes.length > 0 && (
        <>
          <div className="secao">Reuniões desta semana</div>
          <div className="card mb">
            {reunioes.map((r, i) => (
              <div key={i} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: i ? "1px solid var(--line)" : 0 }}>
                <span><b>{r.loja}</b> <span className="mudo">· {r.titulo || "Reunião"}</span></span>
                <span style={{ textTransform: "capitalize" }}>{dataHora(r.data)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="secao">Atalhos</div>
      <div className="grade g4 mb">
        {[["/equipe/central", "Jornada das clientes"], ["/equipe/pendencias", "Pendências por cliente"], ["/empresa/acompanhamento", "Lojas que precisam de atenção"], ["/empresa/caixa-do-dia", "Caixa do dia"]].map(([href, rot]) => (
          <Link key={href} href={href} className="card" style={{ textDecoration: "none", color: "inherit", fontWeight: 600 }}>{rot}</Link>
        ))}
      </div>
    </>
  );
}

function Lojas({ lojas, abrir }: { lojas: LojaCs[]; abrir: (id: string, destino?: string) => void }) {
  return (
    <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {lojas.map((l) => (
        <div key={l.id} className="card card-borda" style={{ ["--c" as string]: COR[l.nivel] }}>
          <div className="linha" style={{ alignItems: "center" }}><Ponto nivel={l.nivel} /><b style={{ fontSize: 16 }}>{l.loja}</b></div>
          <small className="mudo">{ROTULO[l.nivel]} · {l.ultimo ? `acesso ${haQuanto(l.ultimo)}` : "nunca entrou"}{l.proxReuniao ? ` · reunião ${dataHora(l.proxReuniao)}` : ""}</small>
          <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 14 }}>
            {l.alertas.map((a) => <li key={a.chave} style={{ color: a.grave ? "var(--red)" : "var(--muted)" }}>{a.txt}</li>)}
            {!l.alertas.length && <li className="mudo">Tudo em dia ✓</li>}
          </ul>
          <button type="button" className="btn s peq" onClick={() => abrir(l.id, "/inicio")}>Abrir a loja</button>
        </div>
      ))}
    </div>
  );
}
