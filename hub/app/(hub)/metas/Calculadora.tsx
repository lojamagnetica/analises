"use client";

import { useState } from "react";

const brl = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type Inicial = { meta: number; dias: number; ticket: number; conversao: number; markup: number };

function Campo({ rotulo, valor, mudar, passo }: { rotulo: string; valor: number; mudar: (v: number) => void; passo?: string }) {
  return (
    <div>
      <label className="rotulo">{rotulo}</label>
      <input type="number" step={passo ?? "any"} value={valor} onChange={(e) => mudar(Number(e.target.value))} />
    </div>
  );
}

function Kpi({ valor, rotulo }: { valor: string; rotulo: string }) {
  return <div className="kpi"><b style={{ fontSize: 22 }}>{valor}</b><small>{rotulo}</small></div>;
}

export function Calculadora({ inicial }: { inicial: Inicial }) {
  const [v, setV] = useState({ ...inicial, custo: 89.9, desconto: 30 });
  const set = (k: keyof typeof v) => (n: number) => setV((a) => ({ ...a, [k]: n }));
  const porDia = v.meta / Math.max(v.dias, 1);
  const vendas = porDia / Math.max(v.ticket, 1);
  const atendimentos = vendas / Math.max(v.conversao / 100, 0.01);
  const preco = v.custo * v.markup;
  const queima = preco * (1 - v.desconto / 100);

  return (
    <div className="grade g2">
      <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
        <h3>Meta diária</h3>
        <Campo rotulo="Meta de faturamento do mês (R$)" valor={v.meta} mudar={set("meta")} />
        <div className="grade g2" style={{ gap: 12 }}>
          <Campo rotulo="Dias de loja aberta" valor={v.dias} mudar={set("dias")} passo="1" />
          <Campo rotulo="Ticket médio (R$)" valor={v.ticket} mudar={set("ticket")} />
        </div>
        <Campo rotulo="Conversão (% de quem entra e compra)" valor={v.conversao} mudar={set("conversao")} />
        <div className="grade g3 mt">
          <Kpi valor={brl(porDia)} rotulo="por dia" />
          <Kpi valor={String(Math.ceil(vendas))} rotulo="vendas por dia" />
          <Kpi valor={String(Math.ceil(atendimentos))} rotulo="atendimentos por dia" />
        </div>
      </div>
      <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
        <h3>Preço de venda e queima</h3>
        <Campo rotulo="Custo da peça (R$)" valor={v.custo} mudar={set("custo")} />
        <Campo rotulo="Markup" valor={v.markup} mudar={set("markup")} passo="0.1" />
        <Campo rotulo="Desconto na queima (%)" valor={v.desconto} mudar={set("desconto")} />
        <div className="grade g3 mt">
          <Kpi valor={brl(preco)} rotulo="preço de venda" />
          <Kpi valor={brl(queima)} rotulo="preço na queima" />
          <Kpi valor={`${(queima / Math.max(v.custo, 0.01)).toFixed(2)}x`} rotulo="markup na queima" />
        </div>
      </div>
    </div>
  );
}
