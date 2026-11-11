"use client";

import { useState } from "react";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarCustoDoMes, salvarConfigCusto } from "@/lib/vez";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const ROTULO: Record<string, string> = { missao: "Missões", estrela: "Estrelas", desafio: "Desafio do dia", semana: "Semana em dia", indicacao: "Indique e ganhe", clientes: "Clientes completos", caixa: "Caixa e relatórios", destaque: "Destaque do mês", ajuste: "Ajustes" };

/** O custo da campanha no mês: pontos emitidos x quanto custa cada ponto, contra o orçamento definido pela gestão. */
export function CustoDaCampanha() {
  const { portal } = usePortal();
  const { dados: c, recarregar } = useDados(() => buscarCustoDoMes(portal.id), [portal.id]);
  const [edit, setEdit] = useState(false);
  const [orc, setOrc] = useState(""), [cp, setCp] = useState("");
  if (!c) return <Carregando />;
  const { orcamento, custo_ponto } = c.config;
  const custo = c.emitidos * custo_ponto;
  const projecao = c.dia > 0 ? (custo / c.dia) * c.diasNoMes : 0;
  const pct = orcamento > 0 ? custo / orcamento : 0, pctProj = orcamento > 0 ? projecao / orcamento : 0;
  const cor = pctProj > 1 ? "#D9332B" : pctProj > 0.8 ? "#E0A800" : "#2E9D57";
  const cabem = custo_ponto > 0 ? orcamento / custo_ponto : 0;
  const porPessoaDia = c.pessoas > 0 ? cabem / c.pessoas / c.diasNoMes : 0;
  const tipos = Object.entries(c.porTipo).sort((a, b) => b[1] - a[1]);
  const maior = tipos[0]?.[1] ?? 1;
  return (
    <>
      <div className="secao">Custo da campanha em {c.mes}</div>
      <div className="card mb">
        <div className="linha entre" style={{ alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <span><b style={{ fontSize: 26 }}>{brl(custo)}</b> <span className="mudo">de {brl(orcamento)} do orçamento do mês</span></span>
          <span style={{ color: cor, fontWeight: 800 }}>{Math.round(pct * 100)}% usado</span>
        </div>
        <div style={{ position: "relative", height: 12, borderRadius: 6, background: "var(--line)", margin: "8px 0" }}>
          <div style={{ width: `${Math.min(100, pct * 100)}%`, height: "100%", borderRadius: 6, background: cor }} />
          <div title="projeção do fim do mês" style={{ position: "absolute", left: `${Math.min(100, pctProj * 100)}%`, top: -4, bottom: -4, width: 3, background: "var(--text)", borderRadius: 2 }} />
        </div>
        <p style={{ margin: "0 0 6px" }}>No ritmo de hoje, o mês fecha em <b style={{ color: cor }}>{brl(projecao)}</b> ({Math.round(pctProj * 100)}% do orçamento).{pctProj > 1 && " Acima do orçamento: revise os pontos do desafio ou o teto antes de continuar."}</p>
        <div className="grade g3" style={{ margin: "8px 0" }}>
          <div><small className="mudo">Pontos dados no mês</small><div style={{ fontSize: 20, fontWeight: 800 }}>{c.emitidos.toLocaleString("pt-BR")}</div></div>
          <div><small className="mudo">Pontos trocados</small><div style={{ fontSize: 20, fontWeight: 800 }}>{c.resgatados.toLocaleString("pt-BR")}</div></div>
          <div><small className="mudo">Saldo ainda com o time</small><div style={{ fontSize: 20, fontWeight: 800 }}>{c.emAberto.toLocaleString("pt-BR")} <span className="mudo" style={{ fontSize: 13 }}>({brl(c.emAberto * custo_ponto)})</span></div></div>
        </div>
        <p className="ajuda" style={{ margin: "0 0 8px" }}>
          Cabem <b>{Math.round(cabem).toLocaleString("pt-BR")} pontos</b> no orçamento, ou <b>{Math.round(porPessoaDia)} pontos por pessoa por dia</b>.
          {c.faturamento > 0 && <> O custo é <b>{((custo / c.faturamento) * 100).toFixed(2).replace(".", ",")}%</b> do faturamento lançado no mês ({brl(c.faturamento)}).</>}
        </p>
        {tipos.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <small className="mudo">De onde vêm os pontos</small>
            {tipos.map(([t, v]) => (
              <div key={t} className="linha" style={{ gap: 8, alignItems: "center", margin: "4px 0", fontSize: 13 }}>
                <span style={{ flex: "0 0 130px" }}>{ROTULO[t] ?? t}</span>
                <div style={{ flex: 1, height: 10, borderRadius: 5, background: "var(--line)" }}><div style={{ width: `${(v / maior) * 100}%`, height: "100%", borderRadius: 5, background: "var(--orange)" }} /></div>
                <b style={{ flex: "0 0 auto" }}>{v.toLocaleString("pt-BR")}</b>
              </div>
            ))}
          </div>
        )}
        {!edit ? (
          <button type="button" className="btn s peq mt" onClick={() => { setOrc(String(orcamento)); setCp(String(custo_ponto).replace(".", ",")); setEdit(true); }}>Ajustar orçamento e custo do ponto</button>
        ) : (
          <div className="linha mt" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label className="ajuda">Orçamento do mês (R$)<input type="number" min={0} value={orc} onChange={(e) => setOrc(e.target.value)} style={{ width: 110 }} /></label>
            <label className="ajuda">Custo de 1 ponto (R$)<input type="text" inputMode="decimal" value={cp} onChange={(e) => setCp(e.target.value)} style={{ width: 90 }} /></label>
            <button type="button" className="btn p peq" onClick={async () => { await salvarConfigCusto(portal.id, { orcamento: Number(orc) || 0, custo_ponto: Number(cp.replace(",", ".")) || 0 }); setEdit(false); recarregar(); }}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setEdit(false)}>Cancelar</button>
          </div>
        )}
        <p className="ajuda" style={{ marginBottom: 0 }}>Custo de 1 ponto: média de quanto cada ponto custa para a empresa. Mimos e brindes saem perto de R$ 0,20; voucher de R$ 500 pelo preço de custo sai perto de R$ 0,50. A sugestão é R$ 0,30.</p>
      </div>
    </>
  );
}
