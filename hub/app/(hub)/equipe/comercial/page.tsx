"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataCurta, dataHora, moeda } from "@/lib/formato";
import { buscarComercial } from "@/lib/comercial";

function Comercial() {
  useEquipe();
  const nova = useSearchParams().get("nova");
  const { dados } = useDados(() => buscarComercial(), []);
  if (!dados) return <Carregando />;
  const mes = new Date().toISOString().slice(0, 7);
  const doMes = dados.vendas.filter((v) => (v.pagamento_em ?? v.created_at).slice(0, 7) === mes);
  const aguardando = dados.vendas.filter((v) => !v.recebida_em);
  const plano = (id: string | null) => dados.planos.find((p) => p.id === id)?.nome ?? "—";

  return (
    <>
      <Titulo titulo="Comercial" sub="Vendas e passagem de bastão para a CS, e as oportunidades de renovação e upgrade que a jornada abre." />
      {nova && <div className="aviso ok mb">Venda registrada. A passagem já está na Central do Cliente esperando a Claudia.</div>}
      <div className="grade g3 mb">
        <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--red)" }}><b>{doMes.length}</b><small>vendas no mês</small><small className="mudo">{moeda(doMes.reduce((s, v) => s + (Number(v.valor) || 0), 0))}</small></div>
        <div className="card card-borda kpi" style={{ ["--c" as string]: aguardando.length ? "var(--orange)" : "var(--green)" }}><b>{aguardando.length}</b><small>passagens esperando a CS</small></div>
        <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--purple)" }}><b>{dados.oportunidades.length}</b><small>oportunidades nos próximos 30 dias</small></div>
      </div>
      <div className="linha mb"><Link className="btn p" href="/equipe/comercial/venda">+ Nova venda</Link><Link className="btn s" href="/equipe/comercial/leads">Leads e funil</Link></div>

      <div className="secao">Oportunidades: renovação e upgrade</div>
      <div className="card tabela-wrap mb">
        <table className="tabela">
          <thead><tr><th>Loja</th><th>Plano</th><th>O que oferecer</th><th>Contrato termina</th></tr></thead>
          <tbody>
            {dados.oportunidades.length === 0 && <tr><td colSpan={4} className="mudo">Nenhum contrato terminando nos próximos 30 dias.</td></tr>}
            {dados.oportunidades.map((o) => (
              <tr key={o.portal_id + o.data}><td><b>{o.loja}</b></td><td>{plano(o.plano)}</td><td>{o.motivo}</td><td style={{ whiteSpace: "nowrap" }}>{dataCurta(o.data)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="secao">Vendas e passagens</div>
      <div className="card tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Loja</th><th>Plano</th><th>Valor</th><th>Pagamento</th><th>Vendido por</th><th>Passagem</th></tr></thead>
          <tbody>
            {dados.vendas.length === 0 && <tr><td colSpan={6} className="mudo">Nenhuma venda registrada no Hub ainda.</td></tr>}
            {dados.vendas.map((v) => (
              <tr key={v.portal_id}>
                <td><b>{v.loja}</b></td><td>{plano(v.plano_id)}</td><td>{v.valor ? moeda(Number(v.valor)) : "—"}</td>
                <td>{v.pagamento_em ? dataCurta(v.pagamento_em) : "—"}</td><td>{v.vendido_por ?? "—"}</td>
                <td>{v.recebida_em ? <span className="selo feito">recebida por {v.recebida_por} · {dataHora(v.recebida_em)}</span> : <span className="selo alerta">esperando a CS</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Comercial /></Suspense>;
}
