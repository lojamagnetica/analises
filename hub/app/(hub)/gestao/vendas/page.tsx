"use client";

import { useState } from "react";
import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { CampoReais } from "@/components/CampoReais";
import { Excluir } from "@/components/Excluir";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import { semAcento } from "@/lib/clientes";
import {
  CATEGORIAS, FORMAS, buscarClientesSimples, buscarVendas, gerarParcelas, nomeForma, novaCliente, removerVenda, salvarConta, salvarVenda, somarMeses,
  type ClienteSimples, type Venda,
} from "@/lib/loja-na-mao";
import { fimDoMes, type Forma } from "@/lib/caixa";

type Form = {
  id?: string; dia: string; categoria: string; produto: string; valor: number; pecas: number; forma: Forma; maleta: boolean;
  cliente: ClienteSimples | null; parcelas: number; primeira: string;
};
const novo = (d = hoje()): Form => ({ dia: d, categoria: "", produto: "", valor: 0, pecas: 1, forma: "pix", maleta: false, cliente: null, parcelas: 1, primeira: somarMeses(hoje(), 1) });
const passarDia = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export default function VendasDoDia() {
  const { portal } = usePortal();
  const [diaVer, setDiaVer] = useState(hoje());
  const [f, setF] = useState<Form>(() => novo());
  const [antes, setAntes] = useState<Venda | null>(null);
  const [busca, setBusca] = useState("");
  const [whats, setWhats] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { dados, recarregar } = useDados(async () => {
    const [vendas, clientes, mes] = await Promise.all([
      buscarVendas(portal.id, diaVer, diaVer), buscarClientesSimples(portal.id), buscarVendas(portal.id, `${diaVer.slice(0, 7)}-01`, fimDoMes(diaVer.slice(0, 7))),
    ]);
    return { vendas, clientes, mes };
  }, [portal.id, diaVer]);
  if (!dados) return <Carregando />;
  const { vendas, clientes, mes } = dados;
  const mudar = (x: Partial<Form>) => setF((a) => ({ ...a, ...x }));
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const achadas = busca.trim().length >= 2 ? clientes.filter((c) => semAcento(c.nome).includes(semAcento(busca)) || (c.whatsapp ?? "").replace(/\D/g, "").includes(busca.replace(/\D/g, "") || "§")).slice(0, 6) : [];
  const total = vendas.reduce((s, v) => s + v.valor, 0);
  const pecas = vendas.reduce((s, v) => s + v.pecas, 0);
  const totalMes = mes.reduce((s, v) => s + v.valor, 0);
  const formas = FORMAS.map((x) => ({ ...x, v: vendas.filter((v) => v.forma === x.chave).reduce((s, v) => s + v.valor, 0) })).filter((x) => x.v);

  async function salvar() {
    setErro(""); setAviso("");
    if (f.forma === "crediario" && !f.cliente) { setErro("No crediário, escolha ou cadastre a cliente."); return; }
    setSalvando(true);
    try {
      const id = await salvarVenda(portal.id, { id: f.id, dia: f.dia, categoria: f.categoria, produto: f.produto, valor: f.valor, pecas: f.pecas, forma: f.forma, maleta: f.maleta, cliente_id: f.cliente?.id ?? null }, antes);
      // Venda nova no crediário: abre a conta da cliente com as parcelas.
      if (!f.id && f.forma === "crediario" && f.cliente) {
        await salvarConta(portal.id, { cliente_id: f.cliente.id, nome: f.cliente.nome, whatsapp: f.cliente.whatsapp, venda_id: id, descricao: [f.categoria, f.produto].filter(Boolean).join(" · "), parcelas: gerarParcelas(f.valor, f.parcelas, f.primeira) });
      }
      setAviso(f.id ? "Venda corrigida ✓" : `Venda de ${moeda(f.valor)} registrada ✓${f.forma === "crediario" ? " · conta aberta no Crediário" : ""}`);
      setF(novo(f.dia)); setAntes(null); setBusca(""); setDiaVer(f.dia); recarregar();
    } catch (x) { setErro((x as Error).message); }
    setSalvando(false);
  }

  async function cadastrar() {
    setErro("");
    try {
      const c = await novaCliente(portal.id, busca, whats);
      mudar({ cliente: c }); setCadastrando(false); setBusca(""); setWhats(""); recarregar();
    } catch (x) { setErro((x as Error).message); }
  }

  return (
    <>
      <Titulo titulo="Vendas do dia" sub="Cada venda numa linha: o que saiu, o valor e como pagou. O fechamento do dia e a ficha da cliente se atualizam sozinhos." />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <div className="card" style={{ flex: "1 1 340px", maxWidth: 560 }}>
          <h2 style={{ marginTop: 0 }}>{f.id ? "Corrigir venda" : "Nova venda"}</h2>
          <label className="rotulo">O que vendeu</label>
          <div className="chips">
            {CATEGORIAS.map((c) => <button key={c} type="button" className={`chip ${f.categoria === c ? "escolhido" : ""}`} onClick={() => mudar({ categoria: c })}>{c}</button>)}
          </div>
          <input type="text" className="mt" placeholder="Qual peça (opcional). Ex.: anel solitário prata" value={f.produto} onChange={(e) => mudar({ produto: e.target.value })} />
          <div className="grade" style={{ gridTemplateColumns: "1fr 110px", gap: 10 }}>
            <CampoReais rotulo="Valor total" valor={f.valor} mudar={(v) => mudar({ valor: v })} vazio />
            <div><label className="rotulo">Peças</label><input type="number" inputMode="numeric" min={1} value={f.pecas} onChange={(e) => mudar({ pecas: Number(e.target.value) || 1 })} /></div>
          </div>
          <label className="rotulo">Como pagou</label>
          <div className="chips">
            {FORMAS.map((x) => <button key={x.chave} type="button" className={`chip ${f.forma === x.chave ? "escolhido" : ""}`} onClick={() => mudar({ forma: x.chave })}>{x.nome}</button>)}
          </div>
          {f.forma === "crediario" && !f.id && (
            <div className="grade mt" style={{ gridTemplateColumns: "110px 1fr", gap: 10 }}>
              <div><label className="rotulo">Parcelas</label><input type="number" inputMode="numeric" min={1} max={24} value={f.parcelas} onChange={(e) => mudar({ parcelas: Number(e.target.value) || 1 })} /></div>
              <div><label className="rotulo">1º vencimento</label><input type="date" value={f.primeira} onChange={(e) => mudar({ primeira: e.target.value })} /></div>
            </div>
          )}
          {f.forma === "crediario" && f.id && <p className="ajuda">As parcelas desta venda você ajusta no <Link href="/gestao/crediario">Crediário</Link>.</p>}

          <label className="rotulo">Cliente {f.forma === "crediario" ? "" : "(opcional, mas é assim que a sua base cresce)"}</label>
          {f.cliente ? (
            <div className="linha entre card-borda" style={{ padding: "8px 12px" }}>
              <span><b>{f.cliente.nome}</b> <span className="mudo">{f.cliente.whatsapp ?? ""}</span></span>
              <button type="button" className="link-loja" onClick={() => mudar({ cliente: null })}>trocar</button>
            </div>
          ) : (
            <>
              <input type="text" placeholder="Nome ou WhatsApp da cliente" value={busca} onChange={(e) => { setBusca(e.target.value); setCadastrando(false); }} />
              {achadas.length > 0 && (
                <div className="chips mt">{achadas.map((c) => <button key={c.id} type="button" className="chip" onClick={() => { mudar({ cliente: c }); setBusca(""); }}>{c.nome}</button>)}</div>
              )}
              {busca.trim().length >= 2 && !cadastrando && <button type="button" className="btn s peq mt" onClick={() => setCadastrando(true)}>+ Cadastrar &quot;{busca.trim()}&quot;</button>}
              {cadastrando && (
                <div className="linha mt" style={{ gap: 8 }}>
                  <input type="text" inputMode="tel" placeholder="WhatsApp (com DDD)" value={whats} onChange={(e) => setWhats(e.target.value)} />
                  <button type="button" className="btn p peq" onClick={cadastrar}>Cadastrar</button>
                </div>
              )}
            </>
          )}
          <label className="marcar mt"><input type="checkbox" checked={f.maleta} onChange={(e) => mudar({ maleta: e.target.checked })} /><span>Foi venda da maleta</span></label>
          <div className="grade" style={{ gridTemplateColumns: "1fr", gap: 6 }}>
            <label className="rotulo" style={{ marginTop: 4 }}>Dia</label>
            <input type="date" value={f.dia} max={hoje()} onChange={(e) => mudar({ dia: e.target.value })} />
          </div>
          {erro && <div className="aviso mt">{erro}</div>}
          {aviso && <div className="aviso ok mt">{aviso}</div>}
          <div className="linha mt" style={{ gap: 8 }}>
            <button type="button" className="btn p" disabled={salvando} onClick={salvar} style={{ flex: 1 }}>{salvando ? "Salvando..." : f.id ? "Salvar correção" : "Registrar venda"}</button>
            {f.id && <button type="button" className="btn s" onClick={() => { setF(novo(f.dia)); setAntes(null); }}>Cancelar</button>}
          </div>
        </div>

        <div style={{ flex: "1 1 340px" }}>
          <div className="card mb">
            <div className="linha entre">
              <button type="button" className="btn s peq" onClick={() => setDiaVer(passarDia(diaVer, -1))}>‹</button>
              <b>{diaVer === hoje() ? "Hoje" : dia(diaVer)}</b>
              <button type="button" className="btn s peq" disabled={diaVer >= hoje()} onClick={() => setDiaVer(passarDia(diaVer, 1))}>›</button>
            </div>
            <div className="grade g3 mt" style={{ gap: 10, textAlign: "center" }}>
              <div><div style={{ fontSize: 24, fontWeight: 800 }}>{moeda(total)}</div><div className="mudo">vendido</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 800 }}>{vendas.length}</div><div className="mudo">{vendas.length === 1 ? "venda" : "vendas"} · {pecas} {pecas === 1 ? "peça" : "peças"}</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 800 }}>{vendas.length ? moeda(total / vendas.length) : "—"}</div><div className="mudo">por venda</div></div>
            </div>
            {formas.length > 0 && <p className="ajuda">{formas.map((x) => `${x.nome} ${moeda(x.v)}`).join(" · ")}</p>}
            <p className="ajuda" style={{ marginBottom: 0 }}>No mês: <b>{moeda(totalMes)}</b> em {mes.length} {mes.length === 1 ? "venda" : "vendas"}.</p>
          </div>
          <div className="card">
            {vendas.length === 0 && <p className="mudo" style={{ margin: 0 }}>Nenhuma venda registrada neste dia.</p>}
            {vendas.map((v) => {
              const c = v.cliente_id ? porId.get(v.cliente_id) : null;
              return (
                <div key={v.id} className="linha entre" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", gap: 10 }}>
                  <div>
                    <b>{moeda(v.valor)}</b> · {v.categoria}{v.pecas > 1 ? ` (${v.pecas})` : ""}{v.produto ? <span className="mudo"> · {v.produto}</span> : null}
                    <div className="mudo" style={{ fontSize: 13 }}>{nomeForma(v.forma)}{v.maleta ? " · maleta" : ""}{c ? ` · ${c.nome}` : ""}</div>
                  </div>
                  <div className="linha" style={{ gap: 10 }}>
                    <button type="button" className="link-loja" onClick={() => { setAntes(v); setF({ id: v.id, dia: v.dia, categoria: v.categoria, produto: v.produto ?? "", valor: v.valor, pecas: v.pecas, forma: v.forma, maleta: v.maleta, cliente: c ?? null, parcelas: 1, primeira: somarMeses(hoje(), 1) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                    <Excluir pergunta={`Excluir a venda de ${moeda(v.valor)}?${v.forma === "crediario" ? " A conta dela no Crediário sai junto." : ""}`} fazer={() => removerVenda(portal.id, v)} aoFim={recarregar} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
