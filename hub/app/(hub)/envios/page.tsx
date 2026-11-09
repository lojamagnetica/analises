"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { CaixaDaSemana } from "@/components/LeituraDaSemana";
import { RelatoriosGestao } from "@/components/RelatoriosGestao";
import { RankingVendedoras } from "@/components/RankingVendedoras";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import { daLoja, diaDaSemana, fimDoMes, fmtPa, indicadores, mesDeHoje, nomeMes, somar, somarCadastros, somarMalinha, somarMes, somarVendedoras } from "@/lib/caixa";
import { buscarCaixaPeriodo, buscarConferencia, desfazerConferencia, marcarConferido, semanaDoDia, type TipoEnvio } from "@/lib/envios";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** "Conferi: os números que mandei batem com o sistema". Fica registrado com quem conferiu e quando. */
function Conferir({ tipo, periodo }: { tipo: TipoEnvio; periodo: string }) {
  const { portal, nome } = usePortal();
  const { dados, recarregar } = useDados(() => buscarConferencia(portal.id, tipo, periodo), [portal.id, tipo, periodo]);
  const [erro, setErro] = useState("");
  if (dados === undefined) return null;
  const agir = async (fazer: () => Promise<void>) => { setErro(""); try { await fazer(); recarregar(); } catch (e) { setErro((e as Error).message); } };
  return (
    <div className="mt">
      {dados ? (
        <div className="aviso ok linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
          <span>✓ Conferido{dados.por_nome ? ` por ${dados.por_nome}` : ""} em {dia(dados.conferido_em.slice(0, 10))}: os números batem com o sistema.</span>
          <button type="button" className="link-loja" onClick={() => agir(() => desfazerConferencia(portal.id, tipo, periodo))}>Desfazer</button>
        </div>
      ) : (
        <div className="linha" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn p peq" onClick={() => agir(() => marcarConferido(portal.id, tipo, periodo, nome))}>✓ Conferi: bate com o sistema</button>
          <Link className="btn s peq" href="/assistente">Não bate: avisar a Camilla</Link>
        </div>
      )}
      {erro && <div className="aviso mt" role="alert">{erro}</div>}
    </div>
  );
}

function Quadro({ titulo, lista }: { titulo: string; lista: Awaited<ReturnType<typeof buscarCaixaPeriodo>> }) {
  const t = indicadores(somar(lista));
  const mal = somarMalinha(lista);
  const cad = somarCadastros(lista);
  const vend = somarVendedoras(lista);
  const porDia = [...new Set(lista.map((c) => c.dia))].sort().map((d) => ({ d, ...somar(lista.filter((c) => c.dia === d)) }));
  return (
    <>
      <div className="grade mt" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", ...NUM }} aria-label={titulo}>
        <div className="kpi"><small>Faturamento</small><b style={{ fontSize: 22 }}>{moeda(t.faturamento)}</b></div>
        <div className="kpi"><small>Vendas</small><b style={{ fontSize: 22 }}>{t.vendas}</b></div>
        <div className="kpi"><small>Peças</small><b style={{ fontSize: 22 }}>{t.pecas}</b></div>
        <div className="kpi"><small>PA</small><b style={{ fontSize: 22 }}>{t.pa != null ? fmtPa(t.pa) : "—"}</b></div>
        <div className="kpi"><small>Ticket médio</small><b style={{ fontSize: 22 }}>{t.tkm != null ? moeda(t.tkm) : "—"}</b></div>
      </div>
      {(mal.faturamento > 0 || mal.saidas > 0) && (
        <p className="ajuda" style={NUM}>Malinha: {moeda(mal.faturamento)} ({mal.pct ?? 0}% do total) · {mal.vendas} {mal.vendas === 1 ? "venda" : "vendas"}{mal.saidas > 0 ? ` de ${mal.saidas} que saíram` : ""} · loja física: {moeda(mal.fisica)}</p>
      )}
      {cad.dias > 0 && <p className="ajuda" style={NUM}>Clientes novas cadastradas: <b>{cad.cadastros}</b>{cad.por100 != null ? ` (${cad.por100} a cada 100 vendas)` : ""} · informado em {cad.dias} {cad.dias === 1 ? "dia" : "dias"}.</p>}
      {vend.length > 0 && (
        <div className="tabela-wrap mt">
          <table className="tabela">
            <thead><tr><th>Quem vendeu</th><th>Faturamento</th><th>Vendas</th><th>Peças</th><th>PA</th><th>Ticket</th></tr></thead>
            <tbody>
              {vend.map((v, i) => {
                const k = indicadores({ faturamento: v.faturamento, vendas: v.vendas, pecas: v.pecas, dias: 1 });
                return (
                  <tr key={`${v.nome}-${i}`} style={NUM}>
                    <td>{v.nome}</td><td>{moeda(v.faturamento)}</td><td>{v.vendas}</td><td>{v.pecas}</td><td>{k.pa != null ? fmtPa(k.pa) : "—"}</td><td>{k.tkm != null ? moeda(k.tkm) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {porDia.length > 0 && (
        <div className="tabela-wrap mt">
          <table className="tabela">
            <thead><tr><th>Dia</th><th>Faturamento</th><th>Vendas</th><th>Peças</th></tr></thead>
            <tbody>
              {porDia.map((d) => (
                <tr key={d.d} style={NUM}><td>{diaDaSemana(d.d)}, {dia(d.d)}</td><td>{moeda(d.faturamento)}</td><td>{d.vendas}</td><td>{d.pecas}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!lista.length && <p className="ajuda">Ainda não tem nenhum dia lançado neste período.</p>}
    </>
  );
}

/** O que a loja manda e confere: o caixa do dia, os números e os relatórios da semana, e os do mês que fechou.
 *  É a página de quem recebeu o acesso só caixa (em geral o ADM) e também serve à dona e à equipe. */
export default function Envios() {
  const { portal } = usePortal();
  const lojas = portal.lojas ?? [];
  const [loja, setLoja] = useState("");
  const { de, ate } = semanaDoDia(hoje());
  const mesFechado = somarMes(mesDeHoje(), -1);
  const { dados } = useDados(async () => ({
    semana: await buscarCaixaPeriodo(portal.id, de, ate),
    mes: await buscarCaixaPeriodo(portal.id, `${mesFechado}-01`, fimDoMes(mesFechado)),
  }), [portal.id, de, ate, mesFechado]);
  if (!dados) return <Carregando />;
  const semana = dados.semana.filter((c) => daLoja(c, loja));
  const mes = dados.mes.filter((c) => daLoja(c, loja));

  return (
    <>
      <Titulo titulo="Envios da loja" sub="O que a loja manda para a Camilla: o caixa de todo dia, os números e relatórios da semana e os do mês que fechou. Confira se o que você mandou bate com o sistema." />

      <CaixaDaSemana />

      {lojas.length > 1 && (
        <div className="linha mt" style={{ gap: 8 }} role="group" aria-label="Ver por loja">
          {["", ...lojas].map((l) => (
            <button key={l || "todas"} type="button" className="chip" aria-pressed={loja === l} onClick={() => setLoja(l)}
              style={loja === l ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)" } : undefined}>
              {l || "As lojas juntas"}
            </button>
          ))}
        </div>
      )}

      <div className="card mt">
        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Os números da semana · {dia(de)} a {dia(ate)}</h3>
          <Link className="btn s peq" href="/gestao/caixa">Lançar o caixa de hoje</Link>
        </div>
        <p className="ajuda" style={{ margin: "4px 0 0" }}>Abra o relatório de vendas da semana no sistema da loja e compare com estes números, inclusive os de cada vendedora. Se bateu, marque abaixo.</p>
        <Quadro titulo="Semana" lista={semana} />
        <Conferir tipo="semanal" periodo={de} />
      </div>

      <RankingVendedoras lista={semana} titulo="Ranking da semana" />

      <div className="mt"><RelatoriosGestao portalId={portal.id} lojas={lojas} /></div>

      <div className="card mb">
        <h3 style={{ margin: 0 }}>O mês que fechou · {nomeMes(mesFechado)}</h3>
        <p className="ajuda" style={{ margin: "4px 0 0" }}>Todo começo de mês, confira o fechamento do mês anterior com o relatório do sistema.</p>
        <Quadro titulo="Mês" lista={mes} />
        <Conferir tipo="mensal" periodo={mesFechado} />
      </div>

      <div className="card mb">
        <h3 style={{ margin: 0 }}>Mural da loja e dúvidas</h3>
        <p className="ajuda" style={{ margin: "4px 0 8px" }}>Toda semana, imprima o mural e atualize o que mudou (metas, eventos e valores).</p>
        <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link className="btn s peq" href="/mural">🖨️ Imprimir o mural da semana</Link>
          <Link className="btn s peq" href="/assistente">💬 Fale com a Camilla</Link>
          <Link className="btn s peq" href="/gestao/caixa">🧾 Fechamento de caixa</Link>
        </div>
      </div>
    </>
  );
}
