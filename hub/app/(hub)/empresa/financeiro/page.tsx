"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados } from "@/lib/hub";
import { MESES_ABREV, hoje, moeda } from "@/lib/formato";
import {
  CATEGORIAS_DESPESA, PAGADORES, buscarFinanceiro, excluirFixa, excluirLanc, lancarFixas, parcelaNoMes, resumo, salvarConfig,
  salvarFixa, salvarLanc, somaMes, type Config, type Fixa, type Lanc,
} from "@/lib/financeiro";

const ABAS = [
  { id: "mes", rotulo: "Mês" },
  { id: "fixas", rotulo: "Despesas fixas" },
  { id: "ano", rotulo: "Ano" },
  { id: "socios", rotulo: "Sócios" },
] as const;
type Aba = (typeof ABAS)[number]["id"];
const nomeMes = (m: string) => `${MESES_ABREV[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`;
const pagadores = (atual: string) => [...new Set([...PAGADORES, atual].filter(Boolean))];

/** Formulário de um lançamento (entrada ou saída variável). */
function FormLanc({ l, aoSalvar, aoCancelar }: { l: Partial<Lanc> & { mes: string; tipo: Lanc["tipo"] }; aoSalvar: () => void; aoCancelar: () => void }) {
  const [r, setR] = useState({ descricao: "", categoria: l.tipo === "entrada" ? "Venda" : "Outros", valor: 0, bruto: null as number | null, pagador: "Empresa", parcela: "", pago: true, obs: "", natureza: "variavel" as Lanc["natureza"], ...l });
  const [erro, setErro] = useState("");
  const entrada = r.tipo === "entrada";
  return (
    <form className="card mb" style={{ background: "var(--soft)" }} onSubmit={async (e) => {
      e.preventDefault(); setErro("");
      try { await salvarLanc({ ...r, descricao: r.descricao.trim(), bruto: entrada ? (r.bruto ?? r.valor) : null }); aoSalvar(); } catch (x) { setErro((x as Error).message); }
    }}>
      <div className="grade g4" style={{ gap: "0 10px" }}>
        <label className="ajuda">{entrada ? "Cliente ou produto" : "Despesa"}<input type="text" required value={r.descricao} onChange={(e) => setR({ ...r, descricao: e.target.value })} /></label>
        {entrada
          ? <label className="ajuda">Valor da venda (R$)<input type="number" step="0.01" min={0} value={r.bruto ?? ""} onChange={(e) => setR({ ...r, bruto: e.target.value === "" ? null : Number(e.target.value) })} /></label>
          : <label className="ajuda">Categoria<select value={r.categoria} onChange={(e) => setR({ ...r, categoria: e.target.value })}>{[...new Set([...CATEGORIAS_DESPESA, r.categoria])].map((c) => <option key={c}>{c}</option>)}</select></label>}
        <label className="ajuda">{entrada ? "Líquido, o que caiu (R$)" : "Valor (R$)"}<input type="number" step="0.01" min={0} required value={r.valor || ""} onChange={(e) => setR({ ...r, valor: Number(e.target.value) })} /></label>
        {entrada
          ? <label className="ajuda">Observação<input type="text" value={r.obs} placeholder="Ex.: cartão 12x, taxa da máquina" onChange={(e) => setR({ ...r, obs: e.target.value })} /></label>
          : <label className="ajuda">Quem pagou<select value={r.pagador} onChange={(e) => setR({ ...r, pagador: e.target.value })}>{pagadores(r.pagador).map((p) => <option key={p}>{p}</option>)}</select></label>}
      </div>
      {!entrada && (
        <div className="grade g4" style={{ gap: "0 10px" }}>
          <label className="ajuda">Parcela<input type="text" value={r.parcela} placeholder="Ex.: 1/5" onChange={(e) => setR({ ...r, parcela: e.target.value })} /></label>
          <label className="ajuda" style={{ gridColumn: "span 2" }}>Observação<input type="text" value={r.obs} onChange={(e) => setR({ ...r, obs: e.target.value })} /></label>
          <label className="marcar" style={{ alignSelf: "end" }}><input type="checkbox" checked={r.pago} onChange={(e) => setR({ ...r, pago: e.target.checked })} /><span>Já pago</span></label>
        </div>
      )}
      {entrada && r.bruto != null && r.valor > 0 && r.bruto > r.valor && <p className="ajuda" style={{ margin: 0 }}>Taxas e descontos: {moeda(r.bruto - r.valor)}</p>}
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="linha" style={{ gap: 8 }}><button type="submit" className="btn p peq">Salvar</button><button type="button" className="btn s peq" onClick={aoCancelar}>Cancelar</button></div>
    </form>
  );
}

/** Uma tabela de lançamentos com editar, marcar pago e excluir. */
function Tabela({ itens, entrada, recarregar, editar }: { itens: Lanc[]; entrada?: boolean; recarregar: () => void; editar: (l: Lanc) => void }) {
  const [erro, setErro] = useState("");
  if (!itens.length) return <p className="mudo" style={{ margin: "4px 0 10px" }}>Nada lançado.</p>;
  return (
    <div className="tabela-wrap mb">
      <table className="tabela">
        <thead><tr>
          <th>{entrada ? "Cliente / produto" : "Despesa"}</th>
          {entrada ? <><th>Venda</th><th>Líquido</th></> : <><th>Valor</th><th>Parcela</th><th>Quem pagou</th><th>Pago</th></>}
          <th />
        </tr></thead>
        <tbody>{itens.map((l) => (
          <tr key={l.id}>
            <td><b>{l.descricao}</b>{l.obs ? <><br /><small className="mudo">{l.obs}</small></> : null}{!entrada && l.categoria ? <><br /><small className="mudo">{l.categoria}</small></> : null}</td>
            {entrada
              ? <><td>{moeda(l.bruto ?? l.valor)}</td><td>{moeda(l.valor)}</td></>
              : <><td>{moeda(l.valor)}</td><td>{l.parcela}</td><td>{l.pagador}</td>
                <td><input type="checkbox" checked={l.pago} aria-label="Pago" onChange={async (e) => { try { await salvarLanc({ ...l, pago: e.target.checked }); recarregar(); } catch (x) { setErro((x as Error).message); } }} /></td></>}
            <td style={{ whiteSpace: "nowrap" }}>
              <button type="button" className="link-loja" onClick={() => editar(l)}>Editar</button>{" "}
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir "${l.descricao}" deste mês?`)) { try { await excluirLanc(l.id); recarregar(); } catch (x) { setErro((x as Error).message); } } }}>Excluir</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
      {erro && <div className="aviso">{erro}</div>}
    </div>
  );
}

function FormFixa({ f, aoSalvar, aoCancelar }: { f: Partial<Fixa>; aoSalvar: () => void; aoCancelar: () => void }) {
  const [r, setR] = useState<Partial<Fixa> & { nome: string }>({ nome: "", categoria: "Ferramentas/Software", valor: 0, dia: null, recorrencia: "Mensal", pagador: "Empresa", parcelas: null, inicio: null, ativo: true, obs: "", ...f });
  const [erro, setErro] = useState("");
  return (
    <form className="card mb" style={{ background: "var(--soft)" }} onSubmit={async (e) => {
      e.preventDefault(); setErro("");
      try { await salvarFixa({ ...r, nome: r.nome.trim(), inicio: r.inicio || null }); aoSalvar(); } catch (x) { setErro((x as Error).message); }
    }}>
      <div className="grade g4" style={{ gap: "0 10px" }}>
        <label className="ajuda">Despesa<input type="text" required value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} /></label>
        <label className="ajuda">Valor (R$)<input type="number" step="0.01" min={0} required value={r.valor || ""} onChange={(e) => setR({ ...r, valor: Number(e.target.value) })} /></label>
        <label className="ajuda">Categoria<select value={r.categoria} onChange={(e) => setR({ ...r, categoria: e.target.value })}>{[...new Set([...CATEGORIAS_DESPESA, r.categoria ?? ""])].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="ajuda">Quem paga<select value={r.pagador} onChange={(e) => setR({ ...r, pagador: e.target.value })}>{pagadores(r.pagador ?? "").map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="ajuda">Dia do vencimento<input type="number" min={1} max={31} value={r.dia ?? ""} onChange={(e) => setR({ ...r, dia: e.target.value ? Number(e.target.value) : null })} /></label>
        <label className="ajuda">Repete<select value={r.recorrencia} onChange={(e) => setR({ ...r, recorrencia: e.target.value as Fixa["recorrencia"] })}><option>Mensal</option><option>Trimestral</option><option>Anual</option></select></label>
        <label className="ajuda">Parcelas (se for parcelado)<input type="number" min={1} value={r.parcelas ?? ""} placeholder="Ex.: 12" onChange={(e) => setR({ ...r, parcelas: e.target.value ? Number(e.target.value) : null })} /></label>
        <label className="ajuda">Mês da 1ª parcela / começo<input type="month" value={r.inicio ?? ""} onChange={(e) => setR({ ...r, inicio: e.target.value || null })} /></label>
      </div>
      <label className="ajuda" style={{ display: "block" }}>Observação<input type="text" value={r.obs} onChange={(e) => setR({ ...r, obs: e.target.value })} /></label>
      <label className="marcar"><input type="checkbox" checked={!!r.ativo} onChange={(e) => setR({ ...r, ativo: e.target.checked })} /><span>Ativa (entra todo mês)</span></label>
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="linha" style={{ gap: 8 }}><button type="submit" className="btn p peq">Salvar</button><button type="button" className="btn s peq" onClick={aoCancelar}>Cancelar</button></div>
    </form>
  );
}

function Socios({ config, recarregar }: { config: Config; recarregar: () => void }) {
  const [r, setR] = useState<Config>(config);
  const [msg, setMsg] = useState("");
  const total = r.socios.reduce((s, x) => s + Number(x.pct || 0), 0);
  return (
    <div className="card">
      <p className="ajuda" style={{ marginTop: 0 }}>Como o lucro do mês é dividido. A soma precisa dar 100%.</p>
      {r.socios.map((s, i) => (
        <div key={i} className="linha mb" style={{ gap: 8, alignItems: "flex-end" }}>
          <label className="ajuda" style={{ flex: 2, margin: 0 }}>Nome<input type="text" value={s.nome} onChange={(e) => setR({ ...r, socios: r.socios.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} /></label>
          <label className="ajuda" style={{ flex: 1, margin: 0 }}>% do lucro<input type="number" min={0} max={100} value={s.pct} onChange={(e) => setR({ ...r, socios: r.socios.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)) })} /></label>
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Tirar ${s.nome || "este sócio"} da divisão?`)) setR({ ...r, socios: r.socios.filter((_, j) => j !== i) }); }}>Tirar</button>
        </div>
      ))}
      <button type="button" className="btn s peq mb" onClick={() => setR({ ...r, socios: [...r.socios, { nome: "", pct: 0 }] })}>+ Sócio</button>
      <label className="ajuda" style={{ display: "block", maxWidth: 220 }}>Imposto sobre as vendas (%)<input type="number" step="0.1" min={0} value={r.imposto} onChange={(e) => setR({ ...r, imposto: Number(e.target.value) })} /></label>
      <p style={{ color: total === 100 ? undefined : "var(--red)" }}>Soma: {total}%</p>
      <div className="linha" style={{ gap: 8, alignItems: "center" }}>
        <button type="button" className="btn p peq" disabled={total !== 100} onClick={async () => { setMsg(""); try { await salvarConfig(r); setMsg("Salvo ✓"); recarregar(); } catch (x) { setMsg((x as Error).message); } }}>Salvar</button>
        {msg && <small className="mudo">{msg}</small>}
      </div>
    </div>
  );
}

/** Financeiro da empresa (Nossa empresa): toda a equipe vê e lança. */
export default function Financeiro() {
  const [mes, setMes] = useState(hoje().slice(0, 7));
  const [aba, setAba] = useState<Aba>("mes");
  const { dados, recarregar } = useDados(() => buscarFinanceiro(mes), [mes]);
  const [form, setForm] = useState<(Partial<Lanc> & { mes: string; tipo: Lanc["tipo"] }) | null>(null);
  const [formFixa, setFormFixa] = useState<Partial<Fixa> | null>(null);
  const [msg, setMsg] = useState("");
  if (!dados) return <Carregando />;
  const r = resumo(dados.lancs, dados.config);
  const entradas = dados.lancs.filter((l) => l.tipo === "entrada");
  const fixas = dados.lancs.filter((l) => l.tipo === "saida" && l.natureza === "fixa");
  const variaveis = dados.lancs.filter((l) => l.tipo === "saida" && l.natureza === "variavel");
  const faltamFixas = dados.fixas.filter((f) => parcelaNoMes(f, mes) !== null && !fixas.some((l) => l.fixa_id === f.id)).length;
  const editar = (l: Lanc) => setForm(l);
  const imposto = (r.vendas * dados.config.imposto) / 100;
  const temImposto = variaveis.some((l) => l.categoria === "Impostos");

  return (
    <>
      <Titulo titulo="Financeiro" sub="O que entrou, as despesas fixas e variáveis, o lucro do mês e a parte de cada sócio." />
      <div className="chips mb">{ABAS.map((a) => <button key={a.id} type="button" className={`chip${aba === a.id ? " escolhido" : ""}`} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}</div>

      {aba === "mes" && <>
        <div className="linha mb" style={{ gap: 8, alignItems: "center" }}>
          <button type="button" className="btn s peq" onClick={() => { setMes(somaMes(mes, -1)); setForm(null); }}>←</button>
          <b style={{ fontSize: 18, minWidth: 90, textAlign: "center" }}>{nomeMes(mes)}</b>
          <button type="button" className="btn s peq" onClick={() => { setMes(somaMes(mes, 1)); setForm(null); }}>→</button>
        </div>
        <div className="grade g4 mb">
          <div className="kpi"><small>Vendas</small><b style={{ fontSize: 22 }}>{moeda(r.vendas)}</b>{r.vendas > r.entradas && <small className="mudo">caiu {moeda(r.entradas)}</small>}</div>
          <div className="kpi"><small>Despesas</small><b style={{ fontSize: 22 }}>{moeda(r.saidas)}</b><small className="mudo">fixas {moeda(r.fixas)} · variáveis {moeda(r.variaveis)}</small></div>
          <div className="kpi"><small>Lucro</small><b style={{ fontSize: 22, color: r.lucro < 0 ? "var(--red)" : "var(--green)" }}>{moeda(r.lucro)}</b><small className="mudo">{r.entradas ? `${Math.round((r.lucro / r.entradas) * 100)}% do que entrou` : ""}</small></div>
          <div className="kpi"><small>A pagar no mês</small><b style={{ fontSize: 22 }}>{moeda(r.aPagar)}</b></div>
        </div>

        {r.socios.length > 0 && (
          <div className="card mb">
            <b>Divisão do lucro</b>
            <div className="tabela-wrap mt"><table className="tabela">
              <thead><tr><th>Sócio</th><th>%</th><th>Parte do lucro</th><th>Pagou do bolso</th><th>Recebe no total</th></tr></thead>
              <tbody>{r.socios.map((s) => <tr key={s.nome}><td><b>{s.nome}</b></td><td>{s.pct}%</td><td>{moeda(s.parte)}</td><td>{moeda(s.pagou)}</td><td><b>{moeda(s.parte + s.pagou)}</b></td></tr>)}</tbody>
            </table></div>
            <p className="ajuda" style={{ marginBottom: 0 }}>"Pagou do bolso" são as despesas do mês pagas por cada um, que a empresa devolve.</p>
          </div>
        )}

        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}><h3 style={{ margin: "8px 0" }}>Entradas</h3>
          <button type="button" className="btn s peq" onClick={() => setForm({ mes, tipo: "entrada" })}>+ Entrada</button></div>
        {form && !form.id && form.tipo === "entrada" && <FormLanc l={form} aoSalvar={() => { setForm(null); recarregar(); }} aoCancelar={() => setForm(null)} />}
        <Tabela itens={entradas} entrada recarregar={recarregar} editar={editar} />

        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}><h3 style={{ margin: "8px 0" }}>Despesas fixas</h3>
          {faltamFixas > 0 && <button type="button" className="btn p peq" onClick={async () => { setMsg(""); try { const n = await lancarFixas(mes, dados.fixas, dados.lancs); setMsg(`${n} despesas fixas lançadas em ${nomeMes(mes)}.`); recarregar(); } catch (x) { setMsg((x as Error).message); } }}>Lançar as {faltamFixas} fixas do mês</button>}</div>
        {msg && <p className="ajuda">{msg}</p>}
        <Tabela itens={fixas} recarregar={recarregar} editar={editar} />

        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}><h3 style={{ margin: "8px 0" }}>Despesas variáveis</h3>
          <span className="linha" style={{ gap: 8 }}>
            {!temImposto && r.vendas > 0 && <button type="button" className="btn s peq" onClick={() => setForm({ mes, tipo: "saida", natureza: "variavel", descricao: `Impostos (${dados.config.imposto}%)`, categoria: "Impostos", valor: Math.round(imposto * 100) / 100, pagador: "Empresa", pago: false })}>+ Impostos ({moeda(imposto)})</button>}
            <button type="button" className="btn s peq" onClick={() => setForm({ mes, tipo: "saida", natureza: "variavel" })}>+ Despesa variável</button>
          </span></div>
        {form && !form.id && form.tipo === "saida" && <FormLanc l={form} aoSalvar={() => { setForm(null); recarregar(); }} aoCancelar={() => setForm(null)} />}
        <Tabela itens={variaveis} recarregar={recarregar} editar={editar} />
        {form?.id && <><h3>Editar lançamento</h3><FormLanc key={form.id} l={form} aoSalvar={() => { setForm(null); recarregar(); }} aoCancelar={() => setForm(null)} /></>}
      </>}

      {aba === "fixas" && <>
        <p className="ajuda" style={{ marginTop: 0 }}>O cadastro das despesas que se repetem. No mês, o botão "Lançar as fixas do mês" traz todas de uma vez (as parceladas com o número da parcela).</p>
        {!formFixa && <button type="button" className="btn p peq mb" onClick={() => setFormFixa({})}>+ Despesa fixa</button>}
        {formFixa && <FormFixa key={formFixa.id ?? "nova"} f={formFixa} aoSalvar={() => { setFormFixa(null); recarregar(); }} aoCancelar={() => setFormFixa(null)} />}
        <div className="tabela-wrap"><table className="tabela">
          <thead><tr><th>Despesa</th><th>Valor</th><th>Dia</th><th>Repete</th><th>Quem paga</th><th>Em {nomeMes(hoje().slice(0, 7))}</th><th /></tr></thead>
          <tbody>{dados.fixas.map((f) => (
            <tr key={f.id} style={{ opacity: f.ativo ? 1 : 0.5 }}>
              <td><b>{f.nome}</b><br /><small className="mudo">{f.categoria}{f.obs ? ` · ${f.obs}` : ""}</small></td>
              <td>{moeda(f.valor)}</td><td>{f.dia ?? "—"}</td>
              <td>{f.parcelas ? `${f.parcelas}x desde ${f.inicio ? nomeMes(f.inicio) : "—"}` : f.recorrencia}</td>
              <td>{f.pagador}</td><td>{parcelaNoMes(f, hoje().slice(0, 7)) ?? "não entra"}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button type="button" className="link-loja" onClick={() => setFormFixa(f)}>Editar</button>{" "}
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir "${f.nome}" do cadastro? Os meses já lançados ficam como estão.`)) { await excluirFixa(f.id); recarregar(); } }}>Excluir</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
        <p className="ajuda">Total por mês das fixas ativas: <b>{moeda(dados.fixas.filter((f) => parcelaNoMes(f, hoje().slice(0, 7)) !== null).reduce((s, f) => s + f.valor, 0))}</b></p>
      </>}

      {aba === "ano" && (() => {
        const ano = mes.slice(0, 4);
        const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
        const linha = (m: string) => {
          const l = dados.ano.filter((x) => x.mes === m);
          const ent = l.filter((x) => x.tipo === "entrada").reduce((s, x) => s + Number(x.valor), 0);
          const sai = l.filter((x) => x.tipo === "saida").reduce((s, x) => s + Number(x.valor), 0);
          return { ent, sai, lucro: ent - sai, tem: l.length > 0 };
        };
        const tot = meses.map(linha).reduce((a, x) => ({ ent: a.ent + x.ent, sai: a.sai + x.sai }), { ent: 0, sai: 0 });
        return (
          <div className="card">
            <b>Faturamento de {ano}</b>
            <div className="tabela-wrap mt"><table className="tabela">
              <thead><tr><th>Mês</th><th>Entrou</th><th>Saiu</th><th>Saldo</th></tr></thead>
              <tbody>
                {meses.map((m) => { const x = linha(m); return (
                  <tr key={m} style={{ opacity: x.tem ? 1 : 0.45, cursor: "pointer" }} onClick={() => { setMes(m); setAba("mes"); }}>
                    <td><b>{nomeMes(m)}</b></td><td>{moeda(x.ent)}</td><td>{moeda(x.sai)}</td>
                    <td>{x.tem ? <span className={`selo ${x.lucro >= 0 ? "feito" : "erro"}`}>{x.lucro >= 0 ? "Lucro" : "Prejuízo"} {moeda(x.lucro)}</span> : "—"}</td>
                  </tr>); })}
                <tr><td><b>Ano</b></td><td><b>{moeda(tot.ent)}</b></td><td><b>{moeda(tot.sai)}</b></td><td><b>{moeda(tot.ent - tot.sai)}</b></td></tr>
              </tbody>
            </table></div>
            <p className="ajuda" style={{ marginBottom: 0 }}>Clique num mês para abrir.</p>
          </div>
        );
      })()}

      {aba === "socios" && <Socios key={JSON.stringify(dados.config)} config={dados.config} recarregar={recarregar} />}
    </>
  );
}
