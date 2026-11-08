"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useLojaFoco, usePortal } from "@/lib/hub";
import { dataCurta, diasAte, hoje } from "@/lib/formato";
import { fimDoMes, mesDeHoje, nomeMes, somarMes, buscarCaixa } from "@/lib/caixa";
import { buscarPessoas } from "@/lib/pessoas";
import { buscarPlanner, deHoje, rotuloDia } from "@/lib/planner";
import { RELATORIOS_MES, RELATORIOS_SEMANA, listarEnvios, proximoUmAUm, segundaDa } from "@/lib/rotina";

const ddmm = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`;

/** A rotina da gestão numa tela só: o que vence hoje, o caixa, os relatórios, as reuniões e as conversas individuais. */
export default function RotinaGestao() {
  const { portal } = usePortal();
  const [lojaFoco] = useLojaFoco();
  // Loja em foco (seletor no topo): só a rotina dela; com as lojas juntas, todas.
  const lojas = portal.lojas?.length ? (lojaFoco ? [lojaFoco] : portal.lojas) : [""];
  const h = hoje(), mes = mesDeHoje(), seg = segundaDa(h), fechado = somarMes(mes, -1);
  const { dados } = useDados(async () => {
    const [planner, caixa, pessoas, envios] = await Promise.all([
      buscarPlanner(portal.id, lojaFoco), buscarCaixa(portal.id, mes), buscarPessoas(portal.id),
      Promise.all(lojas.map(async (l) => ({ l, sem: await listarEnvios(portal.id, l, seg), mes: await listarEnvios(portal.id, l, fechado) }))),
    ]);
    return { planner, caixa, pessoas, envios };
  }, [portal.id, lojaFoco]);
  if (!dados) return <Carregando />;

  const { planner, caixa, pessoas, envios } = dados;
  const hojeLista = planner ? deHoje(planner, h) : [];
  const reunioes = pessoas.reunioes as unknown as { tipo: string; data: string; dados: Record<string, unknown> }[];
  const fez = (tipo: string, ok: (d: Record<string, unknown>, data: string) => boolean) => reunioes.some((r) => r.tipo === tipo && ok(r.dados ?? {}, r.data));
  const prazoPlano = `${mes}-20`;
  const planejado = fez("planejamento", (d) => d.mes === somarMes(mes, 1));
  const analisado = fez("analise", (d) => d.mes === fechado);
  const proximo = proximoUmAUm(h);
  const ativos = pessoas.pessoas.filter((p) => p.ativo !== false);
  const ultimaConversa = (id: string) => {
    const datas = pessoas.retornos.filter((r) => r.pessoa_id === id).map((r) => r.created_at.slice(0, 10)).sort();
    return datas[datas.length - 1] ?? null;
  };

  return (
    <>
      <Titulo titulo="Rotina da gestão" sub="O que vence hoje, o caixa, os relatórios, as reuniões e as conversas individuais, num lugar só." />

      <div className="secao">Hoje</div>
      <div className="card mb">
        {hojeLista.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {hojeLista.map((b) => <li key={b.id}><b>{b.titulo}</b> <span className="mudo">· {b.quem || "sem quem faz"} · {rotuloDia(b)}</span></li>)}
          </ul>
        ) : <p className="mudo" style={{ margin: 0 }}>{planner ? "Nada marcado no Planner para hoje." : "O Planner de gestão ainda não foi montado."}</p>}
        <Link className="btn s peq mt" href="/consultoria/planner">Abrir o Planner de gestão</Link>
      </div>

      <div className="secao">Fechar o dia</div>
      <div className="card mb">
        {lojas.map((l) => {
          const lancado = caixa.some((c) => c.dia === h && (c.loja ?? "") === l);
          return (
            <div key={l || "loja"} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0" }}>
              <span>{l || "Caixa de hoje"}</span>
              <span className={`selo ${lancado ? "feito" : "espera"}`}>{lancado ? "caixa lançado" : "falta lançar"}</span>
            </div>
          );
        })}
        <Link className="btn p peq mt" href="/gestao/caixa">Fechar o caixa e enviar relatórios</Link>
      </div>

      <div className="secao">Relatórios para a análise</div>
      <div className="card mb">
        {envios.map(({ l, sem, mes: m }) => {
          const a = RELATORIOS_SEMANA.filter((s) => sem.some((e) => e.slot === s.chave)).length;
          const b = RELATORIOS_MES.filter((s) => m.some((e) => e.slot === s.chave)).length;
          return (
            <div key={l || "loja"} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0" }}>
              <span>{l || "Relatórios"}</span>
              <span className="mudo">
                Semana (sexta, 18h): <b>{a} de {RELATORIOS_SEMANA.length}</b> · {nomeMes(fechado)} (dia 5): <b>{b} de {RELATORIOS_MES.length}</b>
              </span>
            </div>
          );
        })}
        <Link className="btn s peq mt" href="/gestao/caixa">Enviar relatórios</Link>
      </div>

      <div className="secao">Reuniões</div>
      <div className="card mb">
        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0" }}>
          <span><b>Análise do mês</b> <span className="mudo">· {nomeMes(fechado)}, no começo do mês</span></span>
          <span className={`selo ${analisado ? "feito" : "espera"}`}>{analisado ? "feita" : "a fazer"}</span>
        </div>
        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0" }}>
          <span><b>Planejamento de {nomeMes(somarMes(mes, 1))}</b> <span className="mudo">· até o dia 20</span></span>
          <span className={`selo ${planejado ? "feito" : diasAte(prazoPlano) < 0 ? "alerta" : "espera"}`}>
            {planejado ? "feito" : diasAte(prazoPlano) < 0 ? "atrasado" : `faltam ${diasAte(prazoPlano)} dias`}
          </span>
        </div>
        {lojas.map((l) => {
          const feita = fez("analise_semana", (d) => (d.loja ?? "") === l && d.semana === seg);
          return (
            <div key={l || "loja"} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0" }}>
              <span><b>Análise da semana</b> <span className="mudo">· {l ? `${l} · ` : ""}semana de {ddmm(seg)}</span></span>
              <span className={`selo ${feita ? "feito" : "espera"}`}>{feita ? "feita" : "a fazer"}</span>
            </div>
          );
        })}
        <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link className="btn p peq" href="/consultoria/reunioes">Reuniões de gestão</Link>
          <Link className="btn s peq" href="/pessoas/reuniao-semanal">Reunião semanal do time</Link>
          <Link className="btn s peq" href="/pessoas/reuniao-mensal">Reunião do mês com o time</Link>
        </div>
      </div>

      <div className="secao">Conversas individuais (1:1)</div>
      <div className="card mb">
        <p style={{ margin: "0 0 8px" }}>Próxima rodada: <b>{dataCurta(proximo)}</b> <span className="mudo">· nos dias 10, 20 e último dia do mês ({nomeMes(mes)} termina em {dataCurta(fimDoMes(mes))})</span></p>
        {ativos.length ? ativos.map((p) => {
          const u = ultimaConversa(p.id);
          const dias = u ? -diasAte(u) : null;
          return (
            <div key={p.id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <span>{p.nome} <span className="mudo">· {p.funcao ?? ""}</span></span>
              <span className="linha" style={{ gap: 8, alignItems: "center" }}>
                <span className="mudo">{u ? `última conversa há ${dias} ${dias === 1 ? "dia" : "dias"}` : "ainda sem conversa registrada"}</span>
                <span className={`selo ${u && (dias ?? 99) <= 12 ? "feito" : "alerta"}`}>{u && (dias ?? 99) <= 12 ? "em dia" : "marcar"}</span>
              </span>
            </div>
          );
        }) : <p className="mudo" style={{ margin: 0 }}>Cadastre a equipe em Minha equipe para acompanhar as conversas.</p>}
        <Link className="btn p peq mt" href="/pessoas/retorno">Dar retorno</Link>
      </div>
    </>
  );
}
