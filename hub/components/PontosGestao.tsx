"use client";

import { RegrasDosPontos } from "@/components/PontosDaVez";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LojinhaGestao } from "@/components/LojinhaGestao";
import { buscarPontos, responsavelCaixa } from "@/lib/vez";

/** Pontos, estrelas e vouchers de cada pessoa da equipe (visão da gestora). A entrega do voucher tira 500 pontos do saldo. */
export function PontosGestao() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => {
    const [pontos, e] = await Promise.all([buscarPontos(portal.id), supabaseBrowser().from("loja_equipe").select("id, nome, loja, responsavel_caixa").eq("portal_id", portal.id).eq("ativo", true).order("nome")]);
    const pontosPor = new Map(pontos.map((p) => [p.pessoa_id, p]));
    return ((e.data ?? []) as { id: string; nome: string; loja: string | null; responsavel_caixa: boolean }[]).map((p) => ({ ...p, r: pontosPor.get(p.id) ?? { pessoa_id: p.id, saldo: 0, acumulado: 0, estrelas: 0, vouchers: 0 } }))
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
        {dados.map(({ id, nome, loja, r, responsavel_caixa }) => (
          <div key={id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <span><b>{nome.split(" ")[0]}</b>{loja ? <span className="mudo"> · {loja}</span> : null}</span>
            <span className="linha" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label className="ajuda" style={{ display: "flex", gap: 4, alignItems: "center", margin: 0 }}><input type="checkbox" checked={!!responsavel_caixa} onChange={async (e) => { await responsavelCaixa(id, e.target.checked); recarregar(); }} />cuida do caixa</label>
              <span>⭐ {r.estrelas}</span><b>{r.saldo} pontos</b>
            </span>
          </div>
        ))}
        {dados.length === 0 && <p className="mudo" style={{ margin: 0 }}>Os pontos aparecem quando a equipe começar a cumprir as missões.</p>}
      </div>
      <LojinhaGestao />
    </>
  );
}
