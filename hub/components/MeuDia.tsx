"use client";

import Link from "next/link";
import { useState } from "react";
import { Carregando, useDados, useLojaFoco } from "@/lib/hub";
import { dataCurta, moeda } from "@/lib/formato";
import { Copiar } from "@/components/Copiar";
import { fmtPa, pmDoEstoque } from "@/lib/caixa";
import type { Respostas } from "@/lib/conteudo";
import { buscarMetodo } from "@/lib/pessoas";
import { deHoje, frentesDa, salvarPlanner, type Planner } from "@/lib/planner";
import {
  type Modo, DIAS, SITUACOES, acompanhamento, atitudes, buscarMeuDia, feedback, meuDiaDaLoja, padraoPm, placar, problemaDaLoja, salvarRotina, tarefas, vendedoras,
  type Config, type Rotina,
} from "@/lib/meu-dia";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const COR = { CRM: "var(--purple)", Conteúdo: "var(--blue)", Ação: "var(--orange)" } as const;

/** O norte do dia no Início: placar, rotina, o time e as atitudes de atração, tudo a partir dos números. */
export function MeuDia({ portalId, estoque, modo = {}, lojas = [], canais = [] }: { portalId: string; estoque: Respostas | undefined; modo?: Modo; lojas?: string[]; canais?: string[] }) {
  // Mais de uma loja: vale a loja em foco do portal inteiro (seletor no topo).
  const [loja] = useLojaFoco();
  // O planner é de cada loja: com as lojas juntas, ele não aparece aqui.
  const lojaPlanner = lojas.length > 1 ? (loja || null) : "";
  const { dados, recarregar } = useDados(async () => ({ d: await buscarMeuDia(portalId, modo, lojaPlanner), m: await buscarMetodo().catch(() => null) }), [portalId, modo.solo, modo.vendaDiaria, modo.apoio, lojaPlanner]);
  const [rotina, setRotina] = useState<Rotina | null>(null);
  const [plannerMarcado, setPlanner] = useState<Planner | null | undefined>(undefined);
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const { m } = dados;
  const d = meuDiaDaLoja(dados.d, loja);
  const r = rotina ?? d.rotina;
  // A rotina marcada de cada loja fica separada.
  const ch = (k: string) => (loja ? `${loja}:${k}` : k);
  const p = placar(d);
  // Loja sem equipe: a dona não recebe feedback de vendedora sobre ela mesma.
  const vs = modo.solo ? [] : vendedoras(d, pmDoEstoque(estoque)?.valor ?? null);
  const padrao = modo.solo ? null : padraoPm(d, pmDoEstoque(estoque)?.valor ?? null);
  const lista = tarefas(d, p, vs);
  const feitosHoje = r.feitos[d.agora] ?? [];
  const at = atitudes(d, problemaDaLoja(vs, d.caixa), vs.filter((v) => v.vendas > 0).length);
  const ac = acompanhamento({ ...d, rotina: r });
  // Mensagem de direção do dia: os números da loja já preenchidos; o resto a gestora completa.
  const direcao = [
    "Bom dia, time! ☀️",
    p.ontem != null ? `Ontem: ${moeda(p.ontem)}${p.metaOntem ? ` de ${moeda(p.metaOntem)} da meta` : ""}.` : "Ontem: [venda de ontem].",
    "Destaque: [nome], que [o que fez]. 👏",
    p.meta ? `Hoje a meta é ${moeda(p.metaHoje ?? 0)}. Faltam ${moeda(Math.max(0, p.meta - p.vendido))} para a meta do mês, em ${p.restantes} ${p.restantes === 1 ? "dia" : "dias"}.` : "Hoje a meta é [meta de hoje].",
    "Foco de hoje: [uma ação concreta].",
    "Missão das clientes: [x] contatos da sua carteira até as [hora].",
    "Conto com vocês! 💪",
  ].join("\n");
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(new Date(`${d.agora}T12:00:00Z`));

  const salvar = async (nova: Rotina) => {
    setRotina(nova); setErro("");
    try { await salvarRotina(portalId, nova); } catch (e) { setErro((e as Error).message); }
  };
  // As demandas de hoje do Planner de gestão (quando liberado): marcar aqui marca no planner.
  const planner = plannerMarcado === undefined ? dados.d.planner : plannerMarcado;
  const doPlanner = planner ? deHoje(planner, d.agora).filter((b) => frentesDa(canais, planner.blocos).includes(b.frente)) : [];
  const feitosPlanner = planner?.feitos[d.agora] ?? [];
  const marcarPlanner = async (id: string, feito: boolean) => {
    if (!planner) return;
    const novo = { ...planner, feitos: { ...planner.feitos, [d.agora]: feito ? [...new Set([...feitosPlanner, id])] : feitosPlanner.filter((x) => x !== id) } };
    setPlanner(novo); setErro("");
    try { await salvarPlanner(portalId, novo, lojaPlanner ?? ""); } catch (e) { setErro((e as Error).message); }
  };
  const marcar = (chave: string, feito: boolean) =>
    salvar({ ...r, feitos: { ...r.feitos, [d.agora]: feito ? [...new Set([...feitosHoje, chave])] : feitosHoje.filter((x) => x !== chave) } });
  const mudarConfig = (c: Config) => salvar({ ...r, config: c });

  return (
    <>
      <div className="secao">Meu dia · {semana}, {dataCurta(d.agora)}{loja ? ` · ${loja}` : ""}</div>
      {lojaPlanner === null && <p className="ajuda mb">Cada loja tem o seu planner de gestão: escolha a loja no topo para ver as demandas de hoje dela.</p>}
      {erro && <div className="aviso mb">{erro}</div>}

      {!p.meta ? (
        <Link href={`/planeje/mes?m=${d.agora.slice(0, 7)}`} className="card card-borda mb linha entre" style={{ ["--c" as string]: "var(--red)", textDecoration: "none", color: "inherit" }}>
          <span><b>Sem meta para este mês.</b> Monte o plano do mês no PLANEJE AQUI e o Hub calcula a sua meta de cada dia.</span>
          <span className="btn s peq">Definir a meta</span>
        </Link>
      ) : (
        <div className="grade g3 mb" style={NUM}>
          <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
            <small className="mudo">Meta de hoje</small>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{moeda(p.metaHoje ?? 0)}</div>
            {p.deHoje > 0 && <small>Parcial lançada: {moeda(p.deHoje)} · faltam {moeda(Math.max(0, (p.metaHoje ?? 0) - p.deHoje))}</small>}
            {p.ontem != null
              ? <div><small>Ontem: <b>{moeda(p.ontem)}</b>{p.metaOntem ? (p.ontem >= p.metaOntem ? " ✓ bateu a meta" : <span style={{ color: "var(--red)" }}> · {moeda(p.metaOntem - p.ontem)} abaixo</span>) : ""}</small></div>
              : <div><small style={{ color: "var(--red)" }}>{modo.vendaDiaria ? "Nenhuma venda registrada ontem" : "O caixa de ontem não foi lançado"}</small></div>}
          </div>
          <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
            <small className="mudo">No mês · meta {moeda(p.meta)}</small>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{moeda(p.vendido)}</div>
            <div className="barra"><i style={{ width: `${Math.min(100, Math.round((p.vendido / p.meta) * 100))}%` }} /></div>
            <small>{p.vendido >= p.meta ? "Meta do mês batida! 🎉" : <>Faltam <b>{moeda(p.meta - p.vendido)}</b> em <b>{p.restantes} {p.restantes === 1 ? "dia" : "dias"}</b></>}</small>
          </div>
          <div className="card card-borda" style={{ ["--c" as string]: p.abaixo ? "var(--orange)" : "var(--green)" }}>
            <small className="mudo">Ritmo</small>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{p.ritmo != null ? <>{moeda(p.ritmo)}<span className="mudo" style={{ fontSize: 15 }}>/dia</span></> : "—"}</div>
            <small>Precisa de <b>{moeda(p.metaHoje ?? 0)}/dia</b>{p.abaixo ? <> · <b style={{ color: "var(--red)" }}>{Math.round(p.abaixo * 100)}% abaixo</b></> : p.ritmo != null ? " · no ritmo ✓" : ""}</small>
          </div>
        </div>
      )}

      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--green)" }}>
        <h3 style={{ marginTop: 0 }}>✅ Sua rotina de hoje</h3>
        {!lista.length && !doPlanner.length && <p className="mudo" style={{ margin: 0 }}>Nada pendente hoje. Bom trabalho!</p>}
        {!modo.solo && new Date(`${d.agora}T12:00:00Z`).getUTCDay() !== 0 && (
          <details className="mt" style={{ marginBottom: 6 }}>
            <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>Mensagem de direção de hoje, pronta para o grupo</summary>
            <div className="card mt" style={{ whiteSpace: "pre-wrap", background: "var(--soft)", fontSize: 14 }}>{direcao}</div>
            <Copiar texto={direcao} rotulo="Copiar a mensagem" />
            <p className="ajuda" style={{ margin: "6px 0 0" }}>Troque o que está entre colchetes. Reconheça alguém pelo nome e diga uma ação concreta: a direção vale mesmo quando você está fora da loja.</p>
          </details>
        )}
        {doPlanner.map((b) => {
          const feito = feitosPlanner.includes(b.id);
          return (
            <div key={b.id} className="marcar" style={{ cursor: "default", gap: 10 }}>
              <input type="checkbox" checked={feito} onChange={(e) => marcarPlanner(b.id, e.target.checked)} aria-label={b.titulo} />
              <span style={feito ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
                {b.titulo}{b.detalhe ? <span className="mudo"> · {b.detalhe}</span> : null}{!feito && <> · <Link className="link-loja" href="/consultoria/planner">como fazer</Link></>}
              </span>
            </div>
          );
        })}
        {lista.map((t) => {
          const feito = !!t.auto || feitosHoje.includes(ch(t.chave));
          return (
            <div key={t.chave} className="marcar" style={{ cursor: "default", gap: 10 }}>
              <input type="checkbox" checked={feito} disabled={!!t.auto} onChange={(e) => marcar(ch(t.chave), e.target.checked)} aria-label={t.texto} />
              <span style={feito ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
                {t.texto}{t.href && !feito && <> · <Link className="link-loja" href={t.href}>abrir</Link></>}
              </span>
            </div>
          );
        })}
      </div>

      {vs.length > 0 && (
        <>
          <div className="linha entre">
            <div className="secao">Seu time no mês</div>
            <Link className="link-loja" style={{ fontSize: 13.5 }} href={`/planeje/mes?m=${d.agora.slice(0, 7)}`}>Ajustar a meta de cada vendedora →</Link>
          </div>
          {padrao && <div className="aviso mb"><b>Padrão da loja:</b> {padrao.texto}</div>}
          <div className="grade g2 mb">
            {vs.map((v) => {
              const fb = feedback(v);
              const s = SITUACOES[v.problema];
              const ruim = v.problema === "pa" || v.problema === "pm" || v.problema === "volume";
              return (
                <div key={v.id} className="card card-borda" style={{ ["--c" as string]: ruim ? "var(--red)" : v.problema === "ok" ? "var(--green)" : "var(--line)" }}>
                  <div className="linha entre">
                    <b>{v.nome}</b>
                    <span className={`selo ${ruim ? "erro" : v.problema === "ok" ? "feito" : "espera"}`}>{s.titulo}</span>
                  </div>
                  {v.vendas > 0 && (
                    <div className="chips mt" style={NUM}>
                      <span className="chip">{moeda(v.faturamento)}{v.meta ? ` de ${moeda(v.meta)}` : ""}</span>
                      <span className="chip" style={v.problema === "pa" ? { borderColor: "var(--red)", color: "var(--red)" } : undefined}>PA {v.pa != null ? fmtPa(v.pa) : "—"}</span>
                      <span className="chip">TKM {v.tkm != null ? moeda(v.tkm) : "—"}</span>
                      <span className="chip" style={v.problema === "pm" ? { borderColor: "var(--red)", color: "var(--red)" } : undefined}>PM {v.pm != null ? moeda(v.pm) : "—"}</span>
                    </div>
                  )}
                  <p style={{ margin: "10px 0 6px" }}><b>O que está acontecendo:</b> {v.diagnostico}</p>
                  {fb && (
                    <details open={ruim}>
                      <summary style={{ cursor: "pointer" }}><b>Feedback pronto</b>{v.letra && m ? <> · perfil {m.perfis[v.letra].nome}</> : ""}</summary>
                      {fb.comoAbrir && <p className="mudo" style={{ margin: "6px 0 2px" }}>Para abrir: {fb.comoAbrir.replace(/:$/, "")}.</p>}
                      {fb.passos.map((x) => (
                        <div key={x.titulo} style={{ margin: "6px 0" }}>
                          <small><b>{x.titulo}</b></small>
                          {x.fala && <div>{x.fala}</div>}
                          {x.dica && <div className="ajuda" style={{ margin: 0 }}>{x.dica}</div>}
                        </div>
                      ))}
                      {v.letra && m
                        ? <p className="ajuda" style={{ margin: 0 }}>Como dar retorno para ela: {m.perfis[v.letra].retorno}</p>
                        : <p className="ajuda" style={{ margin: 0 }}>Sem teste de perfil: <Link className="link-loja" href="/pessoas">faça o teste</Link> para o feedback sair no jeito dela.</p>}
                    </details>
                  )}
                  <b>{s.acoes.length === 1 ? "O que fazer" : "3 ações"}</b>
                  <ol style={{ margin: "4px 0 0 18px", padding: 0 }}>{s.acoes.map((a) => <li key={a}>{a}</li>)}</ol>
                </div>
              );
            })}
          </div>
        </>
      )}
      {vs.length === 0 && !modo.solo && (
        <Link href="/pessoas" className="card mb linha entre" style={{ textDecoration: "none", color: "inherit" }}>
          <span>Cadastre o seu time em <b>Minha equipe</b> e lance o caixa por vendedora para ver o feedback de cada uma aqui.</span>
          <span className="btn s peq">Cadastrar</span>
        </Link>
      )}

      <div className="secao">3 atitudes para atrair clientes hoje</div>
      <div className="grade g3 mb">
        {at.map((a) => (
          <div key={a.tipo} className="card card-borda" style={{ ["--c" as string]: COR[a.tipo] }}>
            <span className="selo andamento">{a.tipo}</span>
            <h3 style={{ margin: "8px 0 4px" }}>{a.titulo}</h3>
            <p className="mudo" style={{ margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{a.texto}</p>
            <Link className="btn s peq" href={a.href}>{a.botao}</Link>
          </div>
        ))}
      </div>

      {planner ? (
        <Link href="/consultoria/planner" className="card mb linha entre" style={{ textDecoration: "none", color: "inherit" }}>
          <span><b>Minha rotina de gestão</b> <span className="mudo">· os dias fixos ficam no Planner de gestão</span></span>
          <span className="btn s peq">Abrir o planner</span>
        </Link>
      ) : (
      <details className="card mb">
        <summary style={{ cursor: "pointer" }}><b>Minha rotina</b> <span className="mudo">· os dias fixos da sua gestão: o Hub te lembra e acompanha</span></summary>
        <div className="grade g3 mt" style={{ gap: 12 }}>
          {!modo.solo && <div>
            <label className="rotulo" htmlFor="rot-reuniao">Reunião semanal individual</label>
            <select id="rot-reuniao" value={r.config.reuniao ?? ""} onChange={(e) => mudarConfig({ ...r.config, reuniao: e.target.value === "" ? undefined : Number(e.target.value) })}>
              <option value="">Escolha o dia</option>
              {[1, 2, 3, 4, 5, 6, 0].map((x) => <option key={x} value={x}>Toda {DIAS[x]}</option>)}
            </select>
            {ac.reuniao && <small className="mudo">Este mês: {ac.reuniao.feitos} de {ac.reuniao.previstos} feitas</small>}
          </div>}
          <div>
            <label className="rotulo" htmlFor="rot-conteudo">{modo.apoio ? `Combinar o conteúdo com ${modo.apoio}` : "Calendário de conteúdo da semana"}</label>
            <select id="rot-conteudo" value={r.config.conteudo ?? ""} onChange={(e) => mudarConfig({ ...r.config, conteudo: e.target.value === "" ? undefined : Number(e.target.value) })}>
              <option value="">Escolha o dia</option>
              {[1, 2, 3, 4, 5, 6, 0].map((x) => <option key={x} value={x}>Toda {DIAS[x]}</option>)}
            </select>
            {ac.conteudo && <small className="mudo">Este mês: {ac.conteudo.feitos} de {ac.conteudo.previstos} feitos</small>}
          </div>
          <div>
            <label className="rotulo" htmlFor="rot-plano">Planejamento do mês seguinte</label>
            <select id="rot-plano" value={r.config.planejamento ?? ""} onChange={(e) => mudarConfig({ ...r.config, planejamento: e.target.value === "" ? undefined : Number(e.target.value) })}>
              <option value="">Escolha o dia</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((x) => <option key={x} value={x}>Todo dia {x}</option>)}
            </select>
            <small className="mudo">O plano vai para a Camilla até o dia 20.</small>
          </div>
        </div>
        <p className="ajuda">No dia escolhido, a tarefa aparece em &quot;Sua rotina de hoje&quot;. Marque quando fizer: o Hub conta quantas vezes você cumpriu no mês.</p>
        <button type="button" className="btn s peq" onClick={recarregar}>Atualizar</button>
      </details>
      )}
    </>
  );
}
