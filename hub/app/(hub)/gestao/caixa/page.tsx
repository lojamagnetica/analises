"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import {
  FORMAS, buscarCaixa, daLoja, diaDaSemana, fmtPa, indicadores, mesDeHoje, mesValido, nomeMes, numeroDe, removerCaixa, salvarCaixa, somaPagamentos,
  somar, somarMes, somarPagamentos, type Caixa, type Forma, type Pagamentos,
} from "@/lib/caixa";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

type Form = { id?: string; dia: string; loja: string; faturamento: string; vendas: string; pecas: string; obs: string; pag: Partial<Record<Forma, string>> };
const novo = (loja: string): Form => ({ dia: hoje(), loja, faturamento: "", vendas: "", pecas: "", obs: "", pag: {} });
const texto = (n: number) => String(n).replace(".", ",");
const centavos = (n: number) => Math.round(n * 100);

/** "Pix R$ 800 · Crédito R$ 1.200", só as formas com valor. */
function ListaFormas({ p }: { p: Pagamentos }) {
  return <>{FORMAS.filter((x) => p[x.chave]).map((x) => `${x.nome} ${moeda(p[x.chave]!)}`).join(" · ")}</>;
}

function Indicadores({ faturamento, vendas, pecas }: { faturamento: number; vendas: number; pecas: number }) {
  const i = indicadores({ faturamento, vendas, pecas, dias: 1 });
  return (
    <span style={NUM}>
      PA {i.pa != null ? fmtPa(i.pa) : "—"} · TKM {i.tkm != null ? moeda(i.tkm) : "—"} · PM {i.pm != null ? moeda(i.pm) : "—"}
    </span>
  );
}

function FechamentoCaixa() {
  const params = useSearchParams();
  const { portal } = usePortal();
  const lojas = portal.lojas ?? [];
  const varias = lojas.length > 1;
  const [mes, setMes] = useState(() => { const m = params.get("mes"); return mesValido(m) ? m : mesDeHoje(); });
  const [filtro, setFiltro] = useState("");
  const [f, setF] = useState<Form>(() => novo(varias ? lojas[0] : ""));
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { dados, recarregar } = useDados(() => buscarCaixa(portal.id, mes), [portal.id, mes]);
  if (!dados) return <Carregando />;

  const lista = dados.filter((c) => daLoja(c, filtro));
  const t = indicadores(somar(lista));
  const noMesAtual = mes === mesDeHoje();
  const valor = { faturamento: numeroDe(f.faturamento) ?? 0, vendas: numeroDe(f.vendas) ?? 0, pecas: numeroDe(f.pecas) ?? 0 };
  const pag: Pagamentos = {};
  for (const x of FORMAS) { const v = numeroDe(f.pag[x.chave]); if (v) pag[x.chave] = v; }
  const somaPag = somaPagamentos(pag);
  const difere = somaPag > 0 && valor.faturamento > 0 && centavos(somaPag) !== centavos(valor.faturamento);
  const formasMes = somarPagamentos(lista);
  const somaMes = somaPagamentos(formasMes);
  const mudar = (campo: Exclude<keyof Form, "pag">) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [campo]: e.target.value });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setAviso("");
    const { vendas, pecas } = valor;
    // Sem faturamento digitado, vale a soma das formas de pagamento.
    const faturamento = valor.faturamento || somaPag;
    if (!f.dia) return setErro("Escolha o dia.");
    if (f.dia > hoje()) return setErro("Esse dia ainda não chegou.");
    if (varias && !f.loja) return setErro("Escolha a loja.");
    if (faturamento < 0 || vendas < 0 || pecas < 0 || FORMAS.some((x) => (pag[x.chave] ?? 0) < 0)) return setErro("Os números não podem ser negativos.");
    if (difere && !confirm(`A soma das formas de pagamento (${moeda(somaPag)}) está diferente do faturamento (${moeda(faturamento)}). Salvar assim mesmo?`)) return;
    if (!Number.isInteger(vendas) || !Number.isInteger(pecas)) return setErro("Vendas e peças são números inteiros.");
    if (faturamento > 0 && vendas === 0) return setErro("Teve faturamento: informe quantas vendas foram.");
    if (vendas > 0 && pecas === 0) return setErro("Informe quantas peças saíram nessas vendas.");
    const loja = varias ? f.loja : null;
    let id = f.id;
    if (!id) {
      const ja = dados!.find((c) => c.dia === f.dia && (c.loja ?? "") === (loja ?? ""));
      if (ja) {
        if (!confirm(`Já tem fechamento em ${dia(f.dia)}${loja ? ` na ${loja}` : ""}. Trocar pelos números novos?`)) return;
        id = ja.id;
      }
    }
    setSalvando(true);
    try {
      await salvarCaixa(portal.id, { id, loja, dia: f.dia, faturamento, vendas, pecas, obs: f.obs, pagamentos: pag });
      setAviso(`Fechamento de ${dia(f.dia)} salvo.`);
      setF(novo(f.loja));
      if (f.dia.slice(0, 7) !== mes) setMes(f.dia.slice(0, 7));
      else recarregar();
    } catch (x) {
      setErro((x as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  function editar(c: Caixa) {
    setErro(""); setAviso("");
    setF({ id: c.id, dia: c.dia, loja: c.loja ?? "", faturamento: texto(c.faturamento), vendas: String(c.vendas), pecas: String(c.pecas), obs: c.obs ?? "",
      pag: Object.fromEntries(FORMAS.filter((x) => c.pagamentos?.[x.chave]).map((x) => [x.chave, texto(c.pagamentos![x.chave]!)])) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remover(c: Caixa) {
    if (!confirm(`Tirar o fechamento de ${dia(c.dia)}${c.loja ? ` da ${c.loja}` : ""}?`)) return;
    try {
      await removerCaixa(c.id);
      if (f.id === c.id) setF(novo(f.loja));
      recarregar();
    } catch (x) {
      setErro((x as Error).message);
    }
  }

  return (
    <>
      <Titulo titulo="Fechamento de caixa" sub="Todo dia, ao fechar a loja: faturamento, vendas, peças e formas de pagamento. É daqui que saem o Resultado do mês e a performance do Diagnóstico." />

      <form className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }} onSubmit={salvar}>
        <div className="linha entre">
          <h3 style={{ margin: 0 }}>{f.id ? `Corrigindo ${dia(f.dia)}` : "Lançar o dia"}</h3>
          {f.id && <button type="button" className="btn s peq" onClick={() => setF(novo(f.loja))}>Cancelar</button>}
        </div>
        <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0 12px" }}>
          <div>
            <label className="rotulo" htmlFor="cx-dia">Dia</label>
            <input id="cx-dia" type="date" value={f.dia} max={hoje()} onChange={mudar("dia")} required />
          </div>
          {varias && (
            <div>
              <label className="rotulo" htmlFor="cx-loja">Loja</label>
              <select id="cx-loja" value={f.loja} onChange={mudar("loja")} required>
                {!f.loja && <option value="">Escolha a loja</option>}
                {lojas.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="rotulo" htmlFor="cx-fat">Faturamento (R$)</label>
            <input id="cx-fat" type="text" inputMode="decimal" placeholder="Ex.: 2.340,00" value={f.faturamento} onChange={mudar("faturamento")} style={NUM} />
          </div>
          <div>
            <label className="rotulo" htmlFor="cx-vendas">Número de vendas</label>
            <input id="cx-vendas" type="text" inputMode="numeric" placeholder="Ex.: 12" value={f.vendas} onChange={mudar("vendas")} style={NUM} />
          </div>
          <div>
            <label className="rotulo" htmlFor="cx-pecas">Peças vendidas</label>
            <input id="cx-pecas" type="text" inputMode="numeric" placeholder="Ex.: 25" value={f.pecas} onChange={mudar("pecas")} style={NUM} />
          </div>
        </div>
        <div className="ajuda">Vendas = atendimentos que viraram venda (cupons). Peças = total de peças dessas vendas.</div>
        <label className="rotulo" style={{ marginTop: 10 }}>Formas de pagamento (R$)</label>
        <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0 12px" }}>
          {FORMAS.map((x) => (
            <div key={x.chave}>
              <label className="rotulo" htmlFor={`cx-${x.chave}`} style={{ fontWeight: 400 }}>{x.nome}</label>
              <input id={`cx-${x.chave}`} type="text" inputMode="decimal" placeholder="0,00" value={f.pag[x.chave] ?? ""} style={NUM}
                onChange={(e) => setF({ ...f, pag: { ...f.pag, [x.chave]: e.target.value } })} />
            </div>
          ))}
        </div>
        <div className="ajuda" style={difere ? { color: "var(--red)" } : undefined}>
          {somaPag > 0
            ? difere
              ? `Soma das formas: ${moeda(somaPag)}. Está diferente do faturamento (${moeda(valor.faturamento)}): confira.`
              : `Soma das formas: ${moeda(somaPag)}${valor.faturamento ? " ✓ bate com o faturamento" : " (vira o faturamento do dia)"}.`
            : "Coloque quanto entrou em cada forma. A soma precisa bater com o faturamento."}
        </div>
        <label className="rotulo" htmlFor="cx-obs">Observação</label>
        <input id="cx-obs" type="text" maxLength={500} placeholder="Ex.: chuva forte, ação de sábado, vitrine nova" value={f.obs} onChange={mudar("obs")} />
        {valor.vendas > 0 && <div className="ajuda mt">Este dia: <Indicadores {...valor} faturamento={valor.faturamento || somaPag} /></div>}
        {erro && <div className="aviso mt" role="alert">{erro}</div>}
        {aviso && <div className="aviso ok mt" role="status">{aviso}</div>}
        <div className="linha mt">
          <button className="btn p" type="submit" disabled={salvando}>{salvando ? "Salvando…" : f.id ? "Salvar correção" : "Salvar o dia"}</button>
        </div>
      </form>

      <div className="linha entre mb">
        <div className="linha" style={{ gap: 6 }}>
          <button type="button" className="btn s peq" aria-label="Mês anterior" onClick={() => setMes(somarMes(mes, -1))}>‹</button>
          <b style={{ minWidth: 150, textAlign: "center" }}>{nomeMes(mes)}</b>
          <button type="button" className="btn s peq" aria-label="Próximo mês" disabled={noMesAtual} onClick={() => setMes(somarMes(mes, 1))}>›</button>
        </div>
        <Link className="btn s peq" href={`/gestao/resultado?mes=${mes}`}>Ver o resultado do mês</Link>
      </div>

      {varias && (
        <div className="linha mb" style={{ gap: 8 }} role="group" aria-label="Ver por loja">
          {["", ...lojas].map((l) => (
            <button key={l || "todas"} type="button" className="chip" aria-pressed={filtro === l} onClick={() => setFiltro(l)}
              style={filtro === l ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)" } : undefined}>
              {l || (lojas.length === 2 ? "As duas lojas" : "Todas as lojas")}
            </button>
          ))}
        </div>
      )}

      <div className="card mb">
        <div className="linha entre">
          <h3 style={{ margin: 0 }}>Total do mês{filtro ? ` · ${filtro}` : ""}</h3>
          <span className="mudo" style={NUM}>{t.dias} {t.dias === 1 ? "dia lançado" : "dias lançados"}</span>
        </div>
        <div className="grade mt" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", ...NUM }}>
          <div className="kpi"><small>Faturamento</small><b style={{ fontSize: 24 }}>{moeda(t.faturamento)}</b></div>
          <div className="kpi"><small>Vendas</small><b style={{ fontSize: 24 }}>{t.vendas}</b></div>
          <div className="kpi"><small>Peças</small><b style={{ fontSize: 24 }}>{t.pecas}</b></div>
          <div className="kpi"><small>PA</small><b style={{ fontSize: 24 }}>{t.pa != null ? fmtPa(t.pa) : "—"}</b></div>
          <div className="kpi"><small>Ticket médio</small><b style={{ fontSize: 24 }}>{t.tkm != null ? moeda(t.tkm) : "—"}</b></div>
          <div className="kpi"><small>Preço médio</small><b style={{ fontSize: 24 }}>{t.pm != null ? moeda(t.pm) : "—"}</b></div>
        </div>
        {somaMes > 0 && (
          <>
            <h3 className="mt">Formas de pagamento</h3>
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", ...NUM }}>
              {FORMAS.map((x) => (
                <div key={x.chave} className="kpi">
                  <small>{x.nome}</small>
                  <b style={{ fontSize: 20 }}>{moeda(formasMes[x.chave] ?? 0)}</b>
                  <small className="mudo">{Math.round(((formasMes[x.chave] ?? 0) / somaMes) * 100)}%</small>
                </div>
              ))}
            </div>
            {(formasMes.crediario ?? 0) / somaMes > 0.05 && (
              <div className="ajuda">O crediário passou de 5% do que entrou no mês. Acompanhe o saldo em aberto de cada cliente.</div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h3>Dias lançados</h3>
        {!lista.length && <p className="mudo" style={{ margin: 0 }}>Nenhum fechamento em {nomeMes(mes).toLowerCase()}{filtro ? ` na ${filtro}` : ""}.</p>}
        {lista.map((c) => (
          <div key={c.id} className="marcar" style={{ cursor: "default", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{diaDaSemana(c.dia)}, {dia(c.dia).slice(0, 5)}</b>
              {varias && c.loja && <span className="chip" style={{ fontSize: 11.5, padding: "1px 8px", marginLeft: 8 }}>{c.loja}</span>}
              <div style={{ fontSize: 14, ...NUM }}>
                {moeda(c.faturamento)} · {c.vendas} {c.vendas === 1 ? "venda" : "vendas"} · {c.pecas} {c.pecas === 1 ? "peça" : "peças"}
              </div>
              {c.vendas > 0 && <div className="mudo" style={{ fontSize: 13 }}><Indicadores {...c} /></div>}
              {c.pagamentos && <div className="mudo" style={{ fontSize: 13, ...NUM }}><ListaFormas p={c.pagamentos} /></div>}
              {c.obs && <div className="ajuda" style={{ margin: 0 }}>{c.obs}</div>}
            </div>
            <div className="linha" style={{ flexWrap: "nowrap", gap: 6 }}>
              <button type="button" className="btn s peq" onClick={() => editar(c)}>Corrigir</button>
              <button type="button" className="btn s peq" aria-label={`Tirar o fechamento de ${dia(c.dia)}`} onClick={() => remover(c)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><FechamentoCaixa /></Suspense>;
}
