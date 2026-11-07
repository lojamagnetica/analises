"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { CampoReais } from "@/components/CampoReais";
import { Excluir } from "@/components/Excluir";
import { ListaParcelas } from "@/components/Parcelas";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import { fimDoMes, mesDeHoje, nomeMes, somarMes } from "@/lib/caixa";
import {
  CATEGORIAS, buscarCompras, buscarVendas, emAberto, gerarParcelas, marcarParcelasCompra, removerCompra, salvarCompra, somarMeses, type Compra, type Parcela,
} from "@/lib/loja-na-mao";

type Form = { id?: string; dia: string; fornecedor: string; categoria: string; pecas: string; valor: number; aVista: boolean; n: number; primeira: string; obs: string; parcelas: Parcela[] | null };
const novo = (): Form => ({ dia: hoje(), fornecedor: "", categoria: "", pecas: "", valor: 0, aVista: true, n: 1, primeira: somarMeses(hoje(), 1), obs: "", parcelas: null });

export default function MinhasCompras() {
  const { portal } = usePortal();
  const [mes, setMes] = useState(mesDeHoje());
  const [f, setF] = useState<Form | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(async () => ({
    compras: await buscarCompras(portal.id),
    vendasMes: await buscarVendas(portal.id, `${mes}-01`, fimDoMes(mes)),
  }), [portal.id, mes]);
  if (!dados) return <Carregando />;
  const { compras, vendasMes } = dados;
  const ref = hoje();
  const em30 = new Date(Date.parse(`${ref}T12:00:00Z`) + 30 * 86_400_000).toISOString().slice(0, 10);
  const doMes = compras.filter((c) => c.dia.startsWith(mes));
  const totalMes = doMes.reduce((s, c) => s + c.valor, 0);
  const pecasMes = doMes.reduce((s, c) => s + (c.pecas ?? 0), 0);
  const vendido = vendasMes.reduce((s, v) => s + v.valor, 0);
  const aPagar = compras.flatMap((c) => c.parcelas.filter((p) => !p.pago_em && p.vence <= em30).map((p) => ({ ...p, fornecedor: c.fornecedor }))).sort((a, b) => a.vence.localeCompare(b.vence));
  const fornecedores = [...new Set(compras.map((c) => c.fornecedor))].sort();
  const mudar = (x: Partial<Form>) => setF((a) => (a ? { ...a, ...x } : a));

  async function salvar() {
    if (!f) return;
    setErro("");
    try {
      const parcelas = f.parcelas ?? (f.aVista ? [{ vence: f.dia, valor: f.valor, pago_em: f.dia }] : gerarParcelas(f.valor, f.n, f.primeira));
      await salvarCompra(portal.id, { id: f.id, dia: f.dia, fornecedor: f.fornecedor, categoria: f.categoria || null, pecas: Number(f.pecas) || null, valor: f.valor, parcelas, obs: f.obs });
      setF(null); recarregar();
    } catch (x) { setErro((x as Error).message); }
  }

  return (
    <>
      <Titulo titulo="Compras" sub="Tudo o que você comprou para a loja: de quem, quantas peças, quanto e quando vence cada parcela." />
      <div className="linha mb" style={{ gap: 10 }}>
        <button type="button" className="btn s peq" onClick={() => setMes(somarMes(mes, -1))}>‹</button>
        <b>{nomeMes(mes)}</b>
        <button type="button" className="btn s peq" disabled={mes >= mesDeHoje()} onClick={() => setMes(somarMes(mes, 1))}>›</button>
      </div>
      <div className="grade g3 mb" style={{ gap: 12 }}>
        <div className="card"><div className="mudo">Comprado no mês</div><div style={{ fontSize: 26, fontWeight: 800 }}>{moeda(totalMes)}</div><div className="mudo" style={{ fontSize: 13 }}>{doMes.length} {doMes.length === 1 ? "compra" : "compras"}{pecasMes ? ` · ${pecasMes} peças` : ""}</div></div>
        <div className="card"><div className="mudo">Vendido no mês</div><div style={{ fontSize: 26, fontWeight: 800 }}>{moeda(vendido)}</div><div className="mudo" style={{ fontSize: 13 }}>pelas Vendas do dia</div></div>
        <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}><div className="mudo">A pagar nos próximos 30 dias</div><div style={{ fontSize: 26, fontWeight: 800 }}>{moeda(aPagar.reduce((s, p) => s + p.valor, 0))}</div><div className="mudo" style={{ fontSize: 13 }}>{aPagar.filter((p) => p.vence < ref).length ? `${aPagar.filter((p) => p.vence < ref).length} já vencida(s)` : `${aPagar.length} parcela(s)`}</div></div>
      </div>
      {totalMes > 0 && vendido > 0 && totalMes > vendido && <div className="aviso mb">Neste mês você comprou mais do que vendeu. Antes da próxima compra, veja o que mais saiu em Vendas do dia.</div>}

      {f ? (
        <div className="card mb" style={{ maxWidth: 620 }}>
          <h2 style={{ marginTop: 0 }}>{f.id ? "Corrigir compra" : "Nova compra"}</h2>
          <label className="rotulo">De quem comprou</label>
          <input type="text" list="fornecedores" value={f.fornecedor} placeholder="Fornecedor" onChange={(e) => mudar({ fornecedor: e.target.value })} />
          <datalist id="fornecedores">{fornecedores.map((x) => <option key={x} value={x} />)}</datalist>
          <label className="rotulo">O que comprou (opcional)</label>
          <div className="chips">
            {[...CATEGORIAS, "Várias"].map((c) => <button key={c} type="button" className={`chip ${f.categoria === c ? "escolhido" : ""}`} onClick={() => mudar({ categoria: f.categoria === c ? "" : c })}>{c}</button>)}
          </div>
          <div className="grade mt" style={{ gridTemplateColumns: "1fr 100px 1fr", gap: 10 }}>
            <CampoReais rotulo="Valor total" valor={f.valor} mudar={(v) => mudar({ valor: v })} vazio />
            <div><label className="rotulo">Peças</label><input type="number" inputMode="numeric" min={0} value={f.pecas} onChange={(e) => mudar({ pecas: e.target.value })} /></div>
            <div><label className="rotulo">Dia da compra</label><input type="date" value={f.dia} max={hoje()} onChange={(e) => mudar({ dia: e.target.value })} /></div>
          </div>
          {f.parcelas ? (
            <p className="ajuda">As parcelas desta compra você marca como pagas na lista.</p>
          ) : (
            <>
              <label className="rotulo">Como pagou</label>
              <div className="chips">
                <button type="button" className={`chip ${f.aVista ? "escolhido" : ""}`} onClick={() => mudar({ aVista: true })}>À vista (já pago)</button>
                <button type="button" className={`chip ${!f.aVista ? "escolhido" : ""}`} onClick={() => mudar({ aVista: false })}>Parcelado / boleto</button>
              </div>
              {!f.aVista && (
                <div className="grade mt" style={{ gridTemplateColumns: "100px 1fr", gap: 10 }}>
                  <div><label className="rotulo">Parcelas</label><input type="number" inputMode="numeric" min={1} max={24} value={f.n} onChange={(e) => mudar({ n: Number(e.target.value) || 1 })} /></div>
                  <div><label className="rotulo">1º vencimento</label><input type="date" value={f.primeira} onChange={(e) => mudar({ primeira: e.target.value })} /></div>
                </div>
              )}
            </>
          )}
          <label className="rotulo">Observação (opcional)</label>
          <input type="text" value={f.obs} onChange={(e) => mudar({ obs: e.target.value })} />
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt" style={{ gap: 8 }}>
            <button type="button" className="btn p" onClick={salvar}>Salvar</button>
            <button type="button" className="btn s" onClick={() => { setF(null); setErro(""); }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn p mb" onClick={() => setF(novo())}>+ Registrar compra</button>
      )}

      {aPagar.length > 0 && (
        <div className="card mb">
          <h2 style={{ marginTop: 0 }}>A pagar nos próximos 30 dias</h2>
          {aPagar.map((p, i) => <div key={i} className="linha entre" style={{ padding: "4px 0", color: p.vence < ref ? "var(--red)" : undefined }}><span>{dia(p.vence)} · {p.fornecedor}</span><b>{moeda(p.valor)}</b></div>)}
        </div>
      )}

      {doMes.length === 0 && <p className="mudo">Nenhuma compra em {nomeMes(mes).toLowerCase()}.</p>}
      {doMes.map((c: Compra) => {
        const aberto = emAberto(c.parcelas);
        return (
          <div key={c.id} className="card mb">
            <div className="linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
              <div>
                <b>{c.fornecedor}</b> · {moeda(c.valor)} <span className={`selo ${aberto === 0 ? "feito" : "andamento"}`}>{aberto === 0 ? "Pago" : `Falta ${moeda(aberto)}`}</span>
                <div className="mudo" style={{ fontSize: 13 }}>{dia(c.dia)}{c.categoria ? ` · ${c.categoria}` : ""}{c.pecas ? ` · ${c.pecas} peças` : ""}{c.obs ? ` · ${c.obs}` : ""}</div>
              </div>
              <button type="button" className="link-loja" onClick={() => setAberta(aberta === c.id ? null : c.id)}>{aberta === c.id ? "fechar" : "detalhes"}</button>
            </div>
            {aberta === c.id && (
              <div className="mt">
                <ListaParcelas parcelas={c.parcelas} mudar={async (p) => { await marcarParcelasCompra(c.id, p).catch((x) => alert(x.message)); recarregar(); }} />
                <div className="linha mt" style={{ gap: 14 }}>
                  <button type="button" className="link-loja" onClick={() => { setF({ id: c.id, dia: c.dia, fornecedor: c.fornecedor, categoria: c.categoria ?? "", pecas: c.pecas ? String(c.pecas) : "", valor: c.valor, aVista: false, n: 1, primeira: ref, obs: c.obs ?? "", parcelas: c.parcelas }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                  <Excluir pergunta={`Excluir a compra de ${moeda(c.valor)} de ${c.fornecedor}?`} fazer={() => removerCompra(c.id)} aoFim={recarregar} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
