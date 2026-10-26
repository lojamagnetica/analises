"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import {
  FORMAS, buscarCaixa, daLoja, diaDaSemana, fmtPa, indicadores, mensagemCaixa, mesDeHoje, mesValido, nomeMes, numeroDe, removerCaixa, salvarCaixa,
  somaPagamentos, somar, somarMes, somarPagamentos, somarVendedoras, type Caixa, type Forma, type LinhaVendedora, type Pagamentos,
} from "@/lib/caixa";
import { supabaseBrowser } from "@/lib/supabase/client";
import { buscarPlano, metaDoPlano } from "@/lib/plano-mes";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

type Numeros = { faturamento: string; vendas: string; pecas: string };
type Form = {
  id?: string; dia: string; loja: string; faturamento: string; vendas: string; pecas: string; obs: string; pag: Partial<Record<Forma, string>>;
  /** Por vendedora (chave = id da pessoa ou "outras"). */
  vend: Record<string, Numeros>;
  /** Lançar só o total da loja, sem dividir. */
  soTotal: boolean;
};
const novo = (loja: string, soTotal = false): Form => ({ dia: hoje(), loja, faturamento: "", vendas: "", pecas: "", obs: "", pag: {}, vend: {}, soTotal });
const OUTRAS = "outras";
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
  const [enviar, setEnviar] = useState<string | null>(null);
  const { dados: tudo, recarregar } = useDados(async () => {
    const [caixa, { data: equipe }, plano] = await Promise.all([
      buscarCaixa(portal.id, mes),
      supabaseBrowser().from("loja_equipe").select("id, nome").eq("portal_id", portal.id).eq("ativo", true).order("nome"),
      buscarPlano(portal.id, mes).catch(() => null),
    ]);
    return { caixa, equipe: (equipe ?? []) as { id: string; nome: string }[], meta: plano ? metaDoPlano(plano.dados) : null };
  }, [portal.id, mes]);
  if (!tudo) return <Carregando />;
  const dados = tudo.caixa;
  const equipe = tudo.equipe;
  // Com time cadastrado, o dia é lançado por vendedora e o total da loja é a soma.
  const porPessoa = equipe.length > 0 && !f.soTotal;
  const pessoas = [...equipe.map((p) => ({ chave: p.id, nome: p.nome.split(" ")[0] })), { chave: OUTRAS, nome: "Outras vendas" }];
  const linhasVend: LinhaVendedora[] = pessoas.map((p) => ({
    pessoa_id: p.chave === OUTRAS ? null : p.chave, nome: p.chave === OUTRAS ? "Outras vendas" : p.nome,
    faturamento: numeroDe(f.vend[p.chave]?.faturamento) ?? 0, vendas: numeroDe(f.vend[p.chave]?.vendas) ?? 0, pecas: numeroDe(f.vend[p.chave]?.pecas) ?? 0,
  }));
  const somaVend = linhasVend.reduce((a, v) => ({ faturamento: a.faturamento + v.faturamento, vendas: a.vendas + v.vendas, pecas: a.pecas + v.pecas }), { faturamento: 0, vendas: 0, pecas: 0 });
  const mudarVend = (chave: string, campo: keyof Numeros, v: string) =>
    setF({ ...f, vend: { ...f.vend, [chave]: { ...(f.vend[chave] ?? { faturamento: "", vendas: "", pecas: "" }), [campo]: v } } });
  /** O mês até o dia (mesma loja), com a meta do plano, para a mensagem do WhatsApp. */
  const mesAte = (c: Pick<Caixa, "dia" | "loja">, extra?: number) => {
    const ate = dados.filter((x) => x.dia <= c.dia && x.dia.slice(0, 7) === c.dia.slice(0, 7) && (x.loja ?? "") === (c.loja ?? ""));
    const s = somar(ate);
    return { faturamento: s.faturamento + (extra ?? 0), dias: s.dias + (extra != null ? 1 : 0), meta: c.dia.slice(0, 7) === mes ? tudo.meta : null };
  };
  const linkWhats = (c: Omit<Caixa, "id">, mesInfo: ReturnType<typeof mesAte>) =>
    `https://wa.me/?text=${encodeURIComponent(mensagemCaixa(c, portal.loja, mesInfo))}`;
  const vendMes = somarVendedoras(dados.filter((c) => daLoja(c, filtro)));

  const lista = dados.filter((c) => daLoja(c, filtro));
  const t = indicadores(somar(lista));
  const noMesAtual = mes === mesDeHoje();
  const valor = porPessoa ? somaVend : { faturamento: numeroDe(f.faturamento) ?? 0, vendas: numeroDe(f.vendas) ?? 0, pecas: numeroDe(f.pecas) ?? 0 };
  const pag: Pagamentos = {};
  for (const x of FORMAS) { const v = numeroDe(f.pag[x.chave]); if (v) pag[x.chave] = v; }
  const somaPag = somaPagamentos(pag);
  const difere = somaPag > 0 && valor.faturamento > 0 && centavos(somaPag) !== centavos(valor.faturamento);
  const formasMes = somarPagamentos(lista);
  const somaMes = somaPagamentos(formasMes);
  const mudar = (campo: "dia" | "loja" | "faturamento" | "vendas" | "pecas" | "obs") => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [campo]: e.target.value });

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
    if (porPessoa) {
      for (const v of linhasVend) {
        if (v.faturamento < 0 || v.vendas < 0 || v.pecas < 0) return setErro(`${v.nome}: os números não podem ser negativos.`);
        if (!Number.isInteger(v.vendas) || !Number.isInteger(v.pecas)) return setErro(`${v.nome}: vendas e peças são números inteiros.`);
        if (v.faturamento > 0 && v.vendas === 0) return setErro(`${v.nome}: teve faturamento, informe quantas vendas foram.`);
        if (v.vendas > 0 && v.pecas === 0) return setErro(`${v.nome}: informe quantas peças saíram.`);
      }
    }
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
      const vendedoras = porPessoa ? linhasVend.filter((v) => v.faturamento || v.vendas || v.pecas) : null;
      const salvo = { loja, dia: f.dia, faturamento, vendas, pecas, obs: f.obs.trim() || null, pagamentos: Object.keys(pag).length ? pag : null, vendedoras };
      await salvarCaixa(portal.id, { id, ...salvo });
      // Mês até este dia, sem contar a versão antiga do mesmo dia.
      const antes = dados!.filter((x) => x.id !== id);
      const ate = antes.filter((x) => x.dia <= f.dia && x.dia.slice(0, 7) === f.dia.slice(0, 7) && (x.loja ?? "") === (loja ?? ""));
      const s = somar(ate);
      setEnviar(linkWhats(salvo, { faturamento: s.faturamento + faturamento, dias: s.dias + 1, meta: f.dia.slice(0, 7) === mes ? tudo!.meta : null }));
      setAviso(`Fechamento de ${dia(f.dia)} salvo.`);
      setF(novo(f.loja, f.soTotal));
      if (f.dia.slice(0, 7) !== mes) setMes(f.dia.slice(0, 7));
      else recarregar();
    } catch (x) {
      setErro((x as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  function editar(c: Caixa) {
    setErro(""); setAviso(""); setEnviar(null);
    setF({ id: c.id, dia: c.dia, loja: c.loja ?? "", faturamento: texto(c.faturamento), vendas: String(c.vendas), pecas: String(c.pecas), obs: c.obs ?? "",
      pag: Object.fromEntries(FORMAS.filter((x) => c.pagamentos?.[x.chave]).map((x) => [x.chave, texto(c.pagamentos![x.chave]!)])),
      vend: Object.fromEntries((c.vendedoras ?? []).map((v) => [v.pessoa_id ?? OUTRAS, { faturamento: texto(v.faturamento), vendas: String(v.vendas), pecas: String(v.pecas) }])),
      // Dia antigo lançado só no total continua só no total.
      soTotal: !c.vendedoras?.length && c.faturamento > 0 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remover(c: Caixa) {
    if (!confirm(`Tirar o fechamento de ${dia(c.dia)}${c.loja ? ` da ${c.loja}` : ""}?`)) return;
    try {
      await removerCaixa(c.id);
      if (f.id === c.id) setF(novo(f.loja, f.soTotal));
      recarregar();
    } catch (x) {
      setErro((x as Error).message);
    }
  }

  return (
    <>
      <Titulo titulo="Fechamento de caixa" sub="Todo dia, ao fechar a loja: o que cada vendedora vendeu e as formas de pagamento. Depois é só mandar no WhatsApp. É daqui que saem o Resultado do mês e a performance do Diagnóstico." />

      <form className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }} onSubmit={salvar}>
        <div className="linha entre">
          <h3 style={{ margin: 0 }}>{f.id ? `Corrigindo ${dia(f.dia)}` : "Lançar o dia"}</h3>
          {f.id && <button type="button" className="btn s peq" onClick={() => setF(novo(f.loja, f.soTotal))}>Cancelar</button>}
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
          {!porPessoa && (
            <>
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
            </>
          )}
        </div>
        {porPessoa && (
          <div className="tabela-wrap mt">
            <table className="tabela">
              <thead><tr><th>Quem vendeu</th><th>Faturamento (R$)</th><th>Vendas</th><th>Peças</th><th /></tr></thead>
              <tbody>
                {pessoas.map((p, n) => {
                  const v = linhasVend[n];
                  return (
                    <tr key={p.chave}>
                      <td><b>{p.nome}</b></td>
                      {(["faturamento", "vendas", "pecas"] as const).map((campo) => (
                        <td key={campo}>
                          <input type="text" inputMode={campo === "faturamento" ? "decimal" : "numeric"} aria-label={`${campo} de ${p.nome}`} style={{ ...NUM, minWidth: 80 }}
                            placeholder={campo === "faturamento" ? "0,00" : "0"} value={f.vend[p.chave]?.[campo] ?? ""} onChange={(e) => mudarVend(p.chave, campo, e.target.value)} />
                        </td>
                      ))}
                      <td className="mudo" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{v.vendas > 0 ? <Indicadores {...v} /> : ""}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td><b>Total da loja</b></td>
                  <td style={NUM}><b>{moeda(somaVend.faturamento)}</b></td>
                  <td style={NUM}><b>{somaVend.vendas}</b></td>
                  <td style={NUM}><b>{somaVend.pecas}</b></td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="ajuda">
          Vendas = atendimentos que viraram venda (cupons). Peças = total de peças dessas vendas.
          {porPessoa && " \"Outras vendas\" é o que não foi de nenhuma vendedora (a dona, o online)."}
          {equipe.length > 0 && (
            <> <button type="button" className="link-loja" onClick={() => setF({ ...f, soTotal: !f.soTotal })}>
              {f.soTotal ? "Lançar por vendedora" : "Lançar só o total da loja"}
            </button></>
          )}
          {!equipe.length && <> Cadastre o time em <Link className="link-loja" href="/pessoas">Minha equipe</Link> para lançar por vendedora.</>}
        </div>
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
        {aviso && (
          <div className="aviso ok mt linha entre" role="status">
            <span>{aviso}</span>
            {enviar && <a className="btn p peq" href={enviar} target="_blank" rel="noopener">📲 Enviar no WhatsApp</a>}
          </div>
        )}
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

      {vendMes.length > 0 && (
        <div className="card mb">
          <h3 style={{ marginTop: 0 }}>Por vendedora no mês{filtro ? ` · ${filtro}` : ""}</h3>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Quem</th><th>Faturamento</th>{tudo.meta && equipe.length > 0 && <th>Meta</th>}<th>Vendas</th><th>Peças</th><th>PA</th><th>Ticket médio</th><th>Preço médio</th></tr></thead>
              <tbody>
                {vendMes.map((v) => {
                  const i = indicadores({ ...v, dias: 1 });
                  // A meta da loja dividida por igual entre as vendedoras.
                  const meta = tudo.meta && v.pessoa_id && equipe.length ? tudo.meta / equipe.length : null;
                  return (
                    <tr key={v.pessoa_id ?? OUTRAS} style={NUM}>
                      <td><b>{v.nome}</b></td>
                      <td>{moeda(v.faturamento)}</td>
                      {tudo.meta && equipe.length > 0 && <td>{meta ? `${moeda(meta)} · ${Math.round((v.faturamento / meta) * 100)}%` : "—"}</td>}
                      <td>{v.vendas}</td>
                      <td>{v.pecas}</td>
                      <td>{i.pa != null ? fmtPa(i.pa) : "—"}</td>
                      <td>{i.tkm != null ? moeda(i.tkm) : "—"}</td>
                      <td>{i.pm != null ? moeda(i.pm) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              {c.vendedoras && <div className="mudo" style={{ fontSize: 13, ...NUM }}>{c.vendedoras.map((v) => `${v.nome} ${moeda(v.faturamento)}`).join(" · ")}</div>}
              {c.pagamentos && <div className="mudo" style={{ fontSize: 13, ...NUM }}><ListaFormas p={c.pagamentos} /></div>}
              {c.obs && <div className="ajuda" style={{ margin: 0 }}>{c.obs}</div>}
            </div>
            <div className="linha" style={{ flexWrap: "nowrap", gap: 6 }}>
              <a className="btn s peq" href={linkWhats(c, mesAte(c))} target="_blank" rel="noopener" aria-label={`Enviar o fechamento de ${dia(c.dia)} no WhatsApp`}>📲</a>
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
