"use client";

import { RegrasDosPontos } from "@/components/PontosDaVez";
import { useRef } from "react";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RankingMentoria } from "@/components/RankingMentoria";
import { CrachaDestaque } from "@/components/CrachaDestaque";
import { DestaqueInstagram } from "@/components/DestaqueInstagram";
import { CustoDaCampanha } from "@/components/CustoDaCampanha";
import { DesafiosGestao } from "@/components/DesafiosGestao";
import { hoje } from "@/lib/formato";
import { subirFotoMarca } from "@/lib/marcas";
import { LojinhaGestao } from "@/components/LojinhaGestao";
import { buscarPontos, responsavelCaixa } from "@/lib/vez";

/** Pontos, estrelas e vouchers de cada pessoa da equipe (visão da gestora). A entrega do voucher tira 500 pontos do saldo. */
export function PontosGestao() {
  const { portal, equipe } = usePortal();
  const arqFoto = useRef<HTMLInputElement>(null);
  const { dados, recarregar } = useDados(async () => {
    const [pontos, e] = await Promise.all([buscarPontos(portal.id), supabaseBrowser().from("loja_equipe").select("id, nome, loja, responsavel_caixa, foto").eq("portal_id", portal.id).eq("ativo", true).order("nome")]);
    const pontosPor = new Map(pontos.map((p) => [p.pessoa_id, p]));
    return ((e.data ?? []) as { id: string; nome: string; loja: string | null; responsavel_caixa: boolean; foto: string | null }[]).map((p) => ({ ...p, r: pontosPor.get(p.id) ?? { pessoa_id: p.id, saldo: 0, acumulado: 0, estrelas: 0, estrelasMes: 0, vouchers: 0 } }))
      .sort((a, b) => b.r.estrelasMes - a.r.estrelasMes || b.r.acumulado - a.r.acumulado);
  }, [portal.id]);
  if (!dados) return <Carregando />;
  return (
    <>
      <CustoDaCampanha />
      {equipe && <RankingMentoria />}
      <div className="secao">Pontos e vouchers</div>
      <div className="card mb">
        <RegrasDosPontos />
      </div>
      <div className="card mb">
        {dados.some((d) => d.loja && d.r.estrelasMes > 0) && <p style={{ margin: "0 0 6px" }}><b>🏆 Destaque do mês até agora:</b> {dados.find((d) => d.loja)?.nome.split(" ")[0]} · {dados.find((d) => d.loja)?.r.estrelasMes} ⭐</p>}
        {dados.map(({ id, nome, loja, r, responsavel_caixa }) => (
          <div key={id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <span><b>{nome.split(" ")[0]}</b>{loja ? <span className="mudo"> · {loja}</span> : null}</span>
            <span className="linha" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label className="ajuda" style={{ display: "flex", gap: 4, alignItems: "center", margin: 0 }}><input type="checkbox" checked={!!responsavel_caixa} onChange={async (e) => { await responsavelCaixa(id, e.target.checked); recarregar(); }} />cuida do caixa</label>
              <span title="Estrelas no mês e no total">⭐ {r.estrelasMes} no mês · {r.estrelas}</span><b>{r.saldo} pontos</b>
            </span>
          </div>
        ))}
        {dados.length === 0 && <p className="mudo" style={{ margin: 0 }}>Os pontos aparecem quando a equipe começar a cumprir as missões.</p>}
      </div>
      <DesafiosGestao />
      <LojinhaGestao />
      <div className="secao">Destaque absoluto do mês</div>
      {(() => {
        const l = dados.find((d) => d.loja && d.r.estrelasMes > 0);
        return (
          <>
            <CrachaDestaque mes={`${hoje().slice(5, 7)}/${hoje().slice(0, 4)}`} nome={l?.nome.split(" ")[0] ?? null} loja={l?.loja ?? null} estrelas={l?.r.estrelasMes ?? 0} foto={l?.foto ?? null} />
            {l && (
              <div className="linha mb" style={{ gap: 8, alignItems: "center" }}>
                <input ref={arqFoto} type="file" accept="image/*" hidden onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  try { const caminho = await subirFotoMarca(portal.id, f); await supabaseBrowser().from("loja_equipe").update({ foto: caminho }).eq("id", l.id); recarregar(); } catch (x) { alert((x as Error).message); }
                  e.target.value = "";
                }} />
                <button type="button" className="btn s peq" onClick={() => arqFoto.current?.click()}>{l.foto ? "Trocar a foto" : "Subir a foto"} de {l.nome.split(" ")[0]}</button>
              </div>
            )}
            <div className="secao">Imagem para o Instagram</div>
            <div className="card mb"><DestaqueInstagram pessoas={dados.filter((d) => d.loja).map((d) => ({ id: d.id, nome: d.nome.split(" ")[0], loja: d.loja, foto: d.foto }))} sugerida={l?.id} /></div>
          </>
        );
      })()}
    </>
  );
}
