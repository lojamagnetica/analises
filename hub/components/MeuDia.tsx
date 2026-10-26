"use client";

import Link from "next/link";
import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { dataCurta, moeda } from "@/lib/formato";
import { fmtPa, pmDoEstoque } from "@/lib/caixa";
import type { Respostas } from "@/lib/conteudo";
import { buscarMetodo } from "@/lib/pessoas";
import {
  DIAS, SITUACOES, acompanhamento, atitudes, buscarMeuDia, feedback, placar, problemaDaLoja, salvarRotina, tarefas, vendedoras,
  type Config, type Rotina,
} from "@/lib/meu-dia";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const COR = { CRM: "var(--purple)", Conteúdo: "var(--blue)", Ação: "var(--orange)" } as const;

/** O norte do dia no Início: placar, rotina, o time e as atitudes de atração, tudo a partir dos números. */
export function MeuDia({ portalId, estoque }: { portalId: string; estoque: Respostas | undefined }) {
  const { dados, recarregar } = useDados(async () => ({ d: await buscarMeuDia(portalId), m: await buscarMetodo().catch(() => null) }), [portalId]);
  const [rotina, setRotina] = useState<Rotina | null>(null);
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const { d, m } = dados;
  const r = rotina ?? d.rotina;
  const p = placar(d);
  const vs = vendedoras(d, pmDoEstoque(estoque)?.valor ?? null);
  const lista = tarefas(d, p, vs);
  const feitosHoje = r.feitos[d.agora] ?? [];
  const at = atitudes(d, problemaDaLoja(vs, d.caixa));
  const ac = acompanhamento({ ...d, rotina: r });
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(new Date(`${d.agora}T12:00:00Z`));

  const salvar = async (nova: Rotina) => {
    setRotina(nova); setErro("");
    try { await salvarRotina(portalId, nova); } catch (e) { setErro((e as Error).message); }
  };
  const marcar = (chave: string, feito: boolean) =>
    salvar({ ...r, feitos: { ...r.feitos, [d.agora]: feito ? [...new Set([...feitosHoje, chave])] : feitosHoje.filter((x) => x !== chave) } });
  const mudarConfig = (c: Config) => salvar({ ...r, config: c });

  return (
    <>
      <div className="secao">Meu dia · {semana}, {dataCurta(d.agora)}</div>
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
              : <div><small style={{ color: "var(--red)" }}>O caixa de ontem não foi lançado</small></div>}
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
        {!lista.length && <p className="mudo" style={{ margin: 0 }}>Nada pendente hoje. Bom trabalho!</p>}
        {lista.map((t) => {
          const feito = feitosHoje.includes(t.chave);
          return (
            <div key={t.chave} className="marcar" style={{ cursor: "default", gap: 10 }}>
              <input type="checkbox" checked={feito} onChange={(e) => marcar(t.chave, e.target.checked)} aria-label={t.texto} />
              <span style={feito ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
                {t.texto}{t.href && !feito && <> · <Link className="link-loja" href={t.href}>abrir</Link></>}
              </span>
            </div>
          );
        })}
      </div>

      {vs.length > 0 && (
        <>
          <div className="secao">Seu time no mês</div>
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
                      {fb.comoAbrir && <p className="mudo" style={{ margin: "6px 0 2px" }}>{fb.comoAbrir}</p>}
                      <p style={{ margin: "4px 0" }}>{fb.fala}</p>
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
      {vs.length === 0 && (
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

      <details className="card mb">
        <summary style={{ cursor: "pointer" }}><b>Minha rotina</b> <span className="mudo">· os dias fixos da sua gestão: o Hub te lembra e acompanha</span></summary>
        <div className="grade g3 mt" style={{ gap: 12 }}>
          <div>
            <label className="rotulo" htmlFor="rot-reuniao">Reunião semanal individual</label>
            <select id="rot-reuniao" value={r.config.reuniao ?? ""} onChange={(e) => mudarConfig({ ...r.config, reuniao: e.target.value === "" ? undefined : Number(e.target.value) })}>
              <option value="">Escolha o dia</option>
              {[1, 2, 3, 4, 5, 6, 0].map((x) => <option key={x} value={x}>Toda {DIAS[x]}</option>)}
            </select>
            {ac.reuniao && <small className="mudo">Este mês: {ac.reuniao.feitos} de {ac.reuniao.previstos} feitas</small>}
          </div>
          <div>
            <label className="rotulo" htmlFor="rot-conteudo">Calendário de conteúdo da semana</label>
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
    </>
  );
}
