"use client";

// Programa Loja Magnética · Brasil: a Missão do Mês, como cada ação é comprovada e o placar entre as lojas.
import { useEffect } from "react";
import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { RankingMentoria } from "@/components/RankingMentoria";
import { CardsDaCampanha } from "@/components/CardsDaCampanha";
import { MISSAO_DO_MES, PROVAS, RESGATES, totalMissao } from "@/lib/programa-brasil";

export default function ProgramaBrasil() {
  useEffect(() => { document.title = "Programa Brasil · magnética.hub"; }, []);
  return (
    <>
      <Titulo titulo="Programa Loja Magnética · Brasil" sub="A Missão do Mês de todas as lojas da mentoria: o que vale, como se comprova e quem está na frente." />

      <div className="secao">Missão do Mês · {totalMissao()} pontos</div>
      <p className="ajuda">Mesma chance para todas as lojas. O placar fecha no último dia do mês e o Card do Mês é apresentado na reunião em grupo.</p>
      {MISSAO_DO_MES.map((p) => (
        <div key={p.nome} className="card mb">
          <div className="linha entre"><b>{p.nome}</b><span className="selo andamento">{p.total} pontos</span></div>
          {p.acoes.map((a) => (
            <div key={a.acao} className="linha entre" style={{ gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <span style={{ flex: "1 1 260px" }}>{a.acao}<br /><span className="mudo" style={{ fontSize: 13 }}>{a.regra}</span></span>
              <span className="linha" style={{ gap: 6, alignItems: "center" }}>
                <span className={`selo ${a.prova === "automatico" ? "feito" : "espera"}`}>{PROVAS[a.prova].selo}</span>
                <b>{a.pontos}</b>
              </span>
            </div>
          ))}
        </div>
      ))}

      <div className="secao">Como se comprova</div>
      <div className="card mb">
        {Object.values(PROVAS).map((p) => <p key={p.selo} style={{ margin: "0 0 8px" }}><b>{p.selo}:</b> {p.texto}</p>)}
        <p className="ajuda" style={{ marginBottom: 0 }}>Feito fora do prazo não conta. O que fica só no story precisa de print guardado no Hub.</p>
      </div>

      <div className="secao">Card do Mês</div>
      <div className="card mb">
        <p style={{ marginTop: 0 }}>Todo mês, na reunião em grupo, apresentamos o Card do Mês: destaque do mês anterior, placar Brasil, quem mais cresceu, vitórias compartilhadas, quem já recebeu o troféu e a missão do mês seguinte.</p>
      </div>

      <div className="secao">Resgates de prêmio</div>
      <div className="card mb">
        {RESGATES.map((r) => (
          <div key={r.quando} className="linha" style={{ gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <span className="selo andamento" style={{ flex: "0 0 auto" }}>{r.quando}</span>
            <span>{r.premio}</span>
          </div>
        ))}
        <p className="ajuda" style={{ marginBottom: 0 }}>Todas as lojas da mentoria podem ganhar, todo mês.</p>
      </div>

      <CardsDaCampanha />

      <RankingMentoria />

      <p className="ajuda"><Link href="/gestao/pontos">Gamificação do time (pontos, lojinha e destaque)</Link></p>
    </>
  );
}
