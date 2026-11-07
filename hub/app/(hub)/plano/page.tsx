"use client";

import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useHub, usePortal } from "@/lib/hub";
import { planoApagar } from "@/lib/acoes";
import { NovaTarefaPlano } from "@/components/NovaTarefaPlano";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MESES_PLANO } from "@/lib/conteudo";
import { periodoDoMes } from "@/lib/periodo-plano";
import { Checklist } from "./Checklist";

export default function Plano() {
  const { portal } = usePortal();
  // A equipe (Camilla e CS) inclui e tira tarefas aqui mesmo; a loja só marca o que fez.
  const hub = useHub();
  const equipe = hub.equipe && !hub.comoLoja; // no "Ver como a loja" fica igual ao que a loja vê
  const { dados: itens, recarregar } = useDados(
    async () => (await supabaseBrowser().from("plano_itens").select("id, mes, texto, feito").eq("portal_id", portal.id).order("mes").order("ordem")).data ?? [],
    [portal.id],
  );
  if (!itens) return <Carregando />;
  const editar = (m: number) => equipe && (
    <div className="mt">
      {itens.filter((i) => i.mes === m).map((i) => (
        <div key={i.id} className="linha entre" style={{ gap: 6, flexWrap: "nowrap" }}>
          <small className="mudo">{i.texto}</small>
          <button className="btn s peq" type="button" aria-label="Excluir tarefa" onClick={async () => { if (!confirm("Excluir esta tarefa do plano?")) return; try { await planoApagar(i.id); recarregar(); } catch (e) { alert((e as Error).message); } }}>✕</button>
        </div>
      ))}
      <NovaTarefaPlano portalId={portal.id} mes={m} rotuloMes={MESES_PLANO[m]} aoIncluir={recarregar} />
    </div>
  );
  const feitos = itens.filter((i) => i.feito).length;
  const pct = itens.length ? Math.round((feitos / itens.length) * 100) : 0;

  return (
    <>
      <Titulo titulo="Plano de Ação · 90 dias" aba="Plano de Ação" sub="O seu PLANO DE AÇÃO é 100% personalizado. Marque o que for concluindo: a Camilla acompanha daqui." />
      {itens.length === 0 && !equipe ? (
        <div className="card">Seu Plano de Ação está sendo montado. Ele é entregue em até 7 dias após o envio da documentação.</div>
      ) : (
        <>
          <div className="card mb">
            <div className="linha entre"><b>{feitos} de {itens.length} tarefas</b><span className="mudo">{pct}%</span></div>
            <div className="barra mt"><i style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="grade g3">
            {[1, 2, 3].map((m) => (
              <div key={m} className="card card-borda" style={{ ["--c" as string]: ["", "var(--red)", "var(--purple)", "var(--green)"][m] }}>
                <h3 style={{ marginBottom: 2 }}>{MESES_PLANO[m]}</h3>
                {periodoDoMes(m, portal.plano_inicio, portal.inicio) && <div className="mudo mb" style={{ fontSize: 13.5, fontWeight: 600 }}>{periodoDoMes(m, portal.plano_inicio, portal.inicio)}</div>}
                <Checklist itens={itens.filter((i) => i.mes === m)} aoMudar={recarregar} />
                {editar(m)}
              </div>
            ))}
          </div>
          {(itens.some((i) => i.mes === 4) || equipe) && (
            <div className="card card-borda mt" style={{ ["--c" as string]: "var(--ink)" }}>
              <h3 style={{ marginBottom: 2 }}>{MESES_PLANO[4]}</h3>
              {periodoDoMes(4, portal.plano_inicio, portal.inicio) && <div className="mudo mb" style={{ fontSize: 13.5, fontWeight: 600 }}>Por volta de {periodoDoMes(4, portal.plano_inicio, portal.inicio)}</div>}
              <Checklist itens={itens.filter((i) => i.mes === 4)} aoMudar={recarregar} />
              {editar(4)}
            </div>
          )}
        </>
      )}
    </>
  );
}
