"use client";

import Link from "next/link";
import { useState } from "react";
import { CampoNumero, lerNumero } from "@/components/Numero";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { MESES_ABREV, hoje, dia } from "@/lib/formato";
import { buscarPessoas, metasSugeridas, pautaMensal, reuniaoSalvar, type LinhaMes } from "@/lib/pessoas";

type Linha = { venda: string; meta: string; ticket: string; pa: string; proxima: string };
const COLUNAS: [keyof Linha, string][] = [["venda", "Venda do mês"], ["meta", "Meta do mês"], ["ticket", "Ticket"], ["pa", "PA"]];

export default function ReuniaoMensal() {
  const { portal } = usePortal();
  const [mes, setMes] = useState(hoje().slice(0, 7));
  const [linhas, setLinhas] = useState<Record<string, Linha>>({});
  const [loja, setLoja] = useState({ meta: "", venda: "", ticket: "", pa: "", antVenda: "", antTicket: "", antPa: "", metaProxima: "" });
  const [t, setT] = useState({ funcionou: "", travou: "", foco: "" });
  const [salvo, setSalvo] = useState(false);
  const { dados, recarregar } = useDados(() => buscarPessoas(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const ativos = dados.pessoas.filter((p) => p.ativo);
  const vazia: Linha = { venda: "", meta: "", ticket: "", pa: "", proxima: "" };
  const lm: LinhaMes[] = ativos.map((p) => {
    const l = linhas[p.id] ?? vazia;
    return { pessoa_id: p.id, nome: p.nome, venda: lerNumero(l.venda), meta: lerNumero(l.meta), ticket: lerNumero(l.ticket), pa: lerNumero(l.pa) };
  });
  const somaVendas = lm.reduce((s, l) => s + l.venda, 0);
  const vendaLoja = lerNumero(loja.venda) || somaVendas;
  const sugeridas = metasSugeridas(lm, lerNumero(loja.metaProxima));
  const metas = sugeridas.map((s) => ({ nome: s.nome, proxima: lerNumero((linhas[s.pessoa_id] ?? vazia).proxima) || s.proxima })).filter((m) => m.proxima > 0);
  const [a, m] = mes.split("-");
  const nomeMes = `${MESES_ABREV[Number(m) - 1]}/${a}`;
  const anterior = loja.antVenda || loja.antTicket || loja.antPa ? { venda: lerNumero(loja.antVenda), ticket: lerNumero(loja.antTicket), pa: lerNumero(loja.antPa) } : null;
  const pauta = pautaMensal({
    mes: nomeMes, metaLoja: lerNumero(loja.meta), vendaLoja, ticketLoja: lerNumero(loja.ticket), paLoja: lerNumero(loja.pa), anterior,
    linhas: lm, funcionou: t.funcionou, travou: t.travou, foco: t.foco, metaProxima: lerNumero(loja.metaProxima), metas,
  });
  const ml = (k: keyof typeof loja, rotulo: string, dica = "") => (
    <div><label className="rotulo">{rotulo}</label><CampoNumero rotulo={rotulo} dica={dica} valor={loja[k]} aoMudar={(v) => { setLoja({ ...loja, [k]: v }); setSalvo(false); }} /></div>
  );
  const anteriores = dados.reunioes.filter((r) => r.tipo === "mensal");

  return (
    <>
      <Titulo voltar={{ href: "/pessoas", rotulo: "Minha equipe" }} titulo="Reunião do mês" sub="Fechamento do mês e metas individuais · 45 min. Traga os resultados e o Hub monta a reunião ideal do seu mês." />
      {!ativos.length && <div className="card mb">Cadastre a sua equipe primeiro. <Link href="/pessoas">Ir para Minha equipe →</Link></div>}

      <div className="card mb">
        <div className="linha entre"><h2 style={{ margin: 0 }}>O resultado da loja</h2><input type="month" value={mes} onChange={(e) => setMes(e.target.value)} style={{ maxWidth: 170 }} /></div>
        <div className="grade g4 mt" style={{ gap: 12 }}>
          {ml("meta", "Meta do mês", "R$")}
          {ml("venda", "Venda do mês", somaVendas ? `soma da equipe: ${somaVendas.toLocaleString("pt-BR")}` : "R$")}
          {ml("ticket", "Ticket médio", "R$")}
          {ml("pa", "PA", "1,6")}
          {ml("antVenda", "Venda do mês anterior", "opcional")}
          {ml("antTicket", "Ticket do mês anterior", "opcional")}
          {ml("antPa", "PA do mês anterior", "opcional")}
          {ml("metaProxima", "Meta do próximo mês", "R$")}
        </div>
      </div>

      <div className="card mb">
        <h2>Por pessoa</h2>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Pessoa</th>{COLUNAS.map(([, r]) => <th key={r}>{r}</th>)}<th>Meta do próximo mês</th></tr></thead>
            <tbody>
              {ativos.map((p) => {
                const sug = sugeridas.find((s) => s.pessoa_id === p.id)?.proxima ?? 0;
                return (
                  <tr key={p.id}>
                    <td><b>{p.nome}</b></td>
                    {COLUNAS.map(([k, r]) => (
                      <td key={k}><CampoNumero rotulo={`${r} de ${p.nome}`} valor={(linhas[p.id] ?? vazia)[k]} aoMudar={(v) => { setLinhas({ ...linhas, [p.id]: { ...(linhas[p.id] ?? vazia), [k]: v } }); setSalvo(false); }} /></td>
                    ))}
                    <td><CampoNumero rotulo={`Meta do próximo mês de ${p.nome}`} dica={sug ? `sugerida: ${sug.toLocaleString("pt-BR")}` : ""} valor={(linhas[p.id] ?? vazia).proxima} aoMudar={(v) => { setLinhas({ ...linhas, [p.id]: { ...(linhas[p.id] ?? vazia), proxima: v } }); setSalvo(false); }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="ajuda">A meta sugerida divide a meta do próximo mês pela participação de cada pessoa na venda deste mês. Ajuste à mão quando precisar.</p>
      </div>

      <div className="grade g2">
        <div className="card">
          <label className="rotulo">O que funcionou no mês</label><textarea rows={2} value={t.funcionou} onChange={(e) => { setT({ ...t, funcionou: e.target.value }); setSalvo(false); }} />
          <label className="rotulo">O que travou</label><textarea rows={2} value={t.travou} onChange={(e) => { setT({ ...t, travou: e.target.value }); setSalvo(false); }} />
          <label className="rotulo">O foco do próximo mês (um comportamento, 30 dias)</label>
          <input type="text" value={t.foco} onChange={(e) => { setT({ ...t, foco: e.target.value }); setSalvo(false); }} placeholder="Deixe vazio para o Hub sugerir pelos números" />
        </div>
        <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
          <h2>A reunião do mês</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.55, margin: 0 }}>{pauta}</pre>
          <div className="linha mt">
            <Copiar texto={pauta} rotulo="Copiar roteiro" />
            <button className="btn s peq" type="button" disabled={salvo || !ativos.length} onClick={async () => {
              await reuniaoSalvar(portal.id, "mensal", `${mes}-01`, { loja, linhas: lm, metas, ...t }, pauta); setSalvo(true); recarregar();
            }}>{salvo ? "Registrada ✓" : "Registrar reunião"}</button>
          </div>
        </div>
      </div>

      {anteriores.length > 0 && (
        <>
          <div className="secao">Reuniões do mês registradas</div>
          <div className="card">
            {anteriores.map((r) => (
              <details key={r.id} className="marcar" style={{ display: "block" }}>
                <summary style={{ cursor: "pointer" }}>{dia(r.data).slice(3)}</summary>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13.5 }}>{r.pauta}</pre>
              </details>
            ))}
          </div>
        </>
      )}
    </>
  );
}
