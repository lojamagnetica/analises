"use client";

import { RegrasDosPontos } from "@/components/PontosDaVez";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { buscarPontos, voucherEntregar } from "@/lib/vez";

/** Pontos, estrelas e vouchers de cada pessoa da equipe (visão da gestora). A entrega do voucher tira 500 pontos do saldo. */
export function PontosGestao() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => {
    const [pontos, e] = await Promise.all([buscarPontos(portal.id), supabaseBrowser().from("loja_equipe").select("id, nome, loja").eq("portal_id", portal.id).eq("ativo", true).order("nome")]);
    const pontosPor = new Map(pontos.map((p) => [p.pessoa_id, p]));
    return ((e.data ?? []) as { id: string; nome: string; loja: string | null }[]).map((p) => ({ ...p, r: pontosPor.get(p.id) ?? { pessoa_id: p.id, saldo: 0, acumulado: 0, estrelas: 0, vouchers: 0 } }))
      .sort((a, b) => b.r.acumulado - a.r.acumulado);
  }, [portal.id]);
  if (!dados) return <Carregando />;
  return (
    <>
      <div className="secao">Pontos e vouchers</div>
      <div className="card mb">
        <RegrasDosPontos />
      </div>
      <div className="card mb">
        {dados.map(({ id, nome, loja, r }) => (
          <div key={id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <span><b>{nome.split(" ")[0]}</b>{loja ? <span className="mudo"> · {loja}</span> : null}</span>
            <span className="linha" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span>⭐ {r.estrelas}</span><b>{r.saldo} pontos</b>
              {r.vouchers > 0 && <span className="selo feito">{r.vouchers} {r.vouchers === 1 ? "voucher" : "vouchers"} de R$ 500</span>}
              <button type="button" className="btn s peq" disabled={r.vouchers < 1}
                onClick={async () => { if (confirm(`Entregar 1 voucher de R$ 500 em compras para ${nome.split(" ")[0]}? Tira 500 pontos do saldo.`)) { await voucherEntregar(portal.id, id); recarregar(); } }}>Entregar voucher</button>
            </span>
          </div>
        ))}
        {dados.length === 0 && <p className="mudo" style={{ margin: 0 }}>Os pontos aparecem quando a equipe começar a cumprir as missões.</p>}
      </div>
    </>
  );
}
