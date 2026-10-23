"use client";

import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MESES_PLANO } from "@/lib/conteudo";
import { Checklist } from "./Checklist";

export default function Plano() {
  const { portal } = usePortal();
  const { dados: itens, recarregar } = useDados(
    async () => (await supabaseBrowser().from("plano_itens").select("id, mes, texto, feito").eq("portal_id", portal.id).order("mes").order("ordem")).data ?? [],
    [portal.id],
  );
  if (!itens) return <Carregando />;
  const feitos = itens.filter((i) => i.feito).length;
  const pct = itens.length ? Math.round((feitos / itens.length) * 100) : 0;

  return (
    <>
      <Titulo titulo="Plano de Ação · 90 dias" aba="Plano de Ação" sub="O seu PLANO DE AÇÃO é 100% personalizado. Marque o que for concluindo: a Camilla acompanha daqui." />
      {itens.length === 0 ? (
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
                <h3>{MESES_PLANO[m]}</h3>
                <Checklist itens={itens.filter((i) => i.mes === m)} aoMudar={recarregar} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
