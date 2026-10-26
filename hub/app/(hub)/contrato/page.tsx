"use client";

import { Renovacao } from "@/components/Renovacao";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia } from "@/lib/formato";
import { buscarMeuContrato, pertoDoFim, tempoDoContrato, type MeuContrato } from "@/lib/contrato";

const SELO: Record<string, string> = { Ativo: "andamento", Renovado: "feito", Encerrado: "espera" };

function Situacao({ c }: { c: MeuContrato }) {
  const t = tempoDoContrato(c);
  if (c.status !== "Ativo") return <span className={`selo ${SELO[c.status] ?? "espera"}`}>{c.status}</span>;
  if (t && !t.comecou) return <span className="selo espera">Começa em {dia(c.inicio)}</span>;
  if (t?.acabou) return <span className="selo alerta">Terminou em {dia(c.fim)}</span>;
  return <span className="selo andamento">Ativo</span>;
}

export default function Contrato() {
  const { portal } = usePortal();
  const consultoria = portal.tipo === "Consultoria";
  const { dados } = useDados(() => buscarMeuContrato(portal.id).catch(() => ({ atual: null, anteriores: [], pedida: false })), [portal.id]);
  if (!dados) return <Carregando />;
  const { atual, anteriores, pedida } = dados;
  const t = atual ? tempoDoContrato(atual) : null;

  return (
    <>
      <Titulo titulo="Contrato e renovação" sub={`O tempo da sua ${consultoria ? "consultoria" : "mentoria"} com a Loja Magnética.`} />

      {!atual ? (
        <div className="card" style={{ maxWidth: 640 }}>
          <h3 style={{ marginTop: 0 }}>Ainda não há um contrato ativo aqui</h3>
          <p className="mudo" style={{ margin: 0 }}>Assim que a equipe cadastrar o seu contrato, você vê aqui o plano, o início, o fim e quanto falta. Alguma dúvida? Fale com a Camilla.</p>
        </div>
      ) : (
        <div className="card card-borda" style={{ ["--c" as string]: "var(--red)", maxWidth: 760 }}>
          <div className="linha entre">
            <div><small className="mudo">Seu plano</small><h2 style={{ margin: "2px 0 0" }}>{atual.plano}</h2></div>
            <Situacao c={atual} />
          </div>
          <div className="grade g3 mt">
            <div className="kpi"><small>Começou em</small><b style={{ fontSize: 22 }}>{dia(atual.inicio)}</b></div>
            <div className="kpi"><small>Termina em</small><b style={{ fontSize: 22 }}>{dia(atual.fim)}</b></div>
            <div className="kpi"><small>Faltam</small><b style={{ fontSize: 22 }}>{t ? `${t.faltam} dia${t.faltam === 1 ? "" : "s"}` : "—"}</b></div>
          </div>
          {t && (
            <div className="mt">
              <div className="linha entre" style={{ fontSize: 14, marginBottom: 6 }}>
                <b>Mês {t.mes} de {t.total}</b>
                <span className="mudo">{t.acabou ? "terminou" : `faltam ${t.faltam} dia${t.faltam === 1 ? "" : "s"}`}</span>
              </div>
              <div className="barra" role="progressbar" aria-valuenow={t.pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${t.pct}%` }} /></div>
            </div>
          )}
        </div>
      )}

      {atual && t && pertoDoFim(atual) && <div style={{ maxWidth: 760 }}><Renovacao portalId={portal.id} faltam={t.faltam} consultoria={consultoria} pedida={pedida} /></div>}

      {anteriores.length > 0 && (
        <>
          <div className="secao">Contratos anteriores</div>
          <div className="card tabela-wrap" style={{ maxWidth: 760 }}>
            <table className="tabela">
              <thead><tr><th>Plano</th><th>Início</th><th>Fim</th><th>Situação</th></tr></thead>
              <tbody>
                {anteriores.map((c) => (
                  <tr key={c.id}><td><b>{c.plano}</b></td><td>{dia(c.inicio)}</td><td>{dia(c.fim)}</td><td><Situacao c={c} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
