"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import {
  MSG_ANIVERSARIO, REGUA, buscarClientesSite, diasDesdeCompra, excluirClienteSite, fazAniversarioEsteMes, importarClientesSite,
  lerClientesSite, marcarPasso, passoDe, salvarClienteSite, type ClienteSite,
} from "@/lib/site";

const zap = (tel: string, msg: string) => `https://wa.me/55${tel.replace(/\D/g, "").replace(/^55/, "")}?text=${encodeURIComponent(msg)}`;
const primeiro = (n: string) => n.trim().split(/\s+/)[0];

/** Recompra da base: quem está no momento de receber cada mensagem da régua hoje. */
export default function Recompra() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ cs: await buscarClientesSite(portal.id) }), [portal.id]);
  const [aba, setAba] = useState<"hoje" | "base">("hoje");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [ed, setEd] = useState<Partial<ClienteSite> | null>(null);
  if (!dados) return <Carregando />;
  const cs = dados.cs;
  const porPasso = REGUA.map((r) => ({ r, l: cs.filter((c) => passoDe(c)?.id === r.id) }));
  const aniv = cs.filter(fazAniversarioEsteMes);
  const total = porPasso.reduce((s, x) => s + x.l.length, 0) + aniv.length;
  const t = busca.trim().toLowerCase();

  const Linha = ({ c, etapa, texto }: { c: ClienteSite; etapa: string; texto: string }) => (
    <div className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0", gap: 8, flexWrap: "wrap" }}>
      <span><b>{c.nome}</b> <small className="mudo">{c.ultima_compra ? `comprou em ${dia(c.ultima_compra)} (${diasDesdeCompra(c)} dias)` : ""}</small></span>
      <span className="linha" style={{ gap: 10 }}>
        {c.telefone ? <a className="btn s peq" href={zap(c.telefone, texto.replace("{nome}", primeiro(c.nome)))} target="_blank" rel="noopener">WhatsApp</a> : <small className="mudo">sem telefone</small>}
        <button type="button" className="btn p peq" onClick={async () => { await marcarPasso(c, etapa); recarregar(); }}>Feito</button>
      </span>
    </div>
  );

  return (
    <>
      <Titulo titulo="Recompra da base" sub="A régua de mensagens depois de cada compra: pós-venda, 30, 60 e 90 dias, e o aniversário. Cada dia o Hub mostra quem está na hora." />
      <div className="chips mb">
        <button type="button" className={`chip${aba === "hoje" ? " escolhido" : ""}`} onClick={() => setAba("hoje")}>Para mandar hoje ({total})</button>
        <button type="button" className={`chip${aba === "base" ? " escolhido" : ""}`} onClick={() => setAba("base")}>A base ({cs.length})</button>
      </div>
      {aba === "hoje" && (
        <>
          {!cs.length && <div className="card mudo">A base ainda está vazia. Vá em <b>A base</b> e importe a lista de clientes do site (nome, telefone, data da última compra e aniversário).</div>}
          {porPasso.map(({ r, l }) => (
            <div key={r.id} className="card mb">
              <div className="linha entre"><h3 style={{ margin: 0 }}>{r.nome}</h3><small className="mudo">{l.length} cliente{l.length === 1 ? "" : "s"}</small></div>
              <p className="ajuda" style={{ margin: "4px 0 6px" }}>“{r.msg.replace("{nome}", "Ana")}”</p>
              {!l.length && <small className="mudo">Ninguém nesta etapa hoje.</small>}
              {l.map((c) => <Linha key={c.id} c={c} etapa={r.id} texto={r.msg} />)}
            </div>
          ))}
          <div className="card">
            <div className="linha entre"><h3 style={{ margin: 0 }}>Aniversariantes do mês 🎂</h3><small className="mudo">{aniv.length}</small></div>
            {!aniv.length && <small className="mudo">Ninguém com aniversário pendente neste mês.</small>}
            {aniv.map((c) => <Linha key={c.id} c={c} etapa={`aniv-${hoje().slice(0, 4)}`} texto={MSG_ANIVERSARIO} />)}
          </div>
        </>
      )}
      {aba === "base" && (
        <div className="card">
          <div className="linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
            <small className="mudo">Planilha CSV com nome, telefone, última compra e aniversário. Quem já existe é atualizado; compra nova reinicia a régua.</small>
            <div className="linha" style={{ gap: 8 }}>
              <label className="btn s peq" style={{ cursor: "pointer" }}>Importar CSV<input type="file" accept=".csv,text/csv,.txt" hidden onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
                const novos = lerClientesSite(await f.text());
                if (!novos.length) { setMsg("Não achei clientes no arquivo. A primeira linha precisa ter os títulos (nome, telefone, última compra, aniversário)."); return; }
                try { const r = await importarClientesSite(portal.id, novos, cs); setMsg(`Pronto: ${r.novos} novos e ${r.atualizados} atualizados.`); recarregar(); } catch (er) { setMsg((er as Error).message); }
              }} /></label>
              <button type="button" className="btn s peq" onClick={() => setEd({ nome: "", telefone: "", ultima_compra: hoje(), aniversario: null, obs: "" })}>+ Cliente</button>
            </div>
          </div>
          {msg && <div className="aviso ok mt">{msg}</div>}
          {ed && (
            <div className="mt" style={{ background: "var(--soft)", borderRadius: 12, padding: 10 }}>
              <div className="grade g4" style={{ gap: "0 8px" }}>
                <label className="ajuda" style={{ display: "block" }}>Nome<input type="text" value={ed.nome ?? ""} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></label>
                <label className="ajuda" style={{ display: "block" }}>WhatsApp<input type="text" value={ed.telefone ?? ""} onChange={(e) => setEd({ ...ed, telefone: e.target.value })} /></label>
                <label className="ajuda" style={{ display: "block" }}>Última compra<input type="date" value={ed.ultima_compra ?? ""} onChange={(e) => setEd({ ...ed, ultima_compra: e.target.value || null, etapa: "" })} /></label>
                <label className="ajuda" style={{ display: "block" }}>Aniversário<input type="date" value={ed.aniversario ?? ""} onChange={(e) => setEd({ ...ed, aniversario: e.target.value || null })} /></label>
              </div>
              <div className="linha" style={{ gap: 8 }}>
                <button type="button" className="btn p peq" disabled={!ed.nome?.trim()} onClick={async () => {
                  const { id, portal_id: _p, ...d } = ed; await salvarClienteSite(portal.id, id ?? null, d); setEd(null); recarregar();
                }}>Salvar</button>
                <button type="button" className="btn s peq" onClick={() => setEd(null)}>Cancelar</button>
              </div>
            </div>
          )}
          <input type="search" className="mt" placeholder="Buscar cliente" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {cs.filter((c) => !t || c.nome.toLowerCase().includes(t) || c.telefone.includes(t)).slice(0, 200).map((c) => (
            <div key={c.id} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0", gap: 8, flexWrap: "wrap" }}>
              <span><b>{c.nome}</b> <small className="mudo">{c.telefone || "sem telefone"}{c.ultima_compra ? ` · última compra ${dia(c.ultima_compra)}` : ""}{c.aniversario ? ` · aniversário ${dia(c.aniversario).slice(0, 5)}` : ""}</small></span>
              <span className="linha" style={{ gap: 12 }}>
                <button type="button" className="link-loja" onClick={() => setEd(c)}>Editar</button>
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir ${c.nome} da base?`)) { await excluirClienteSite(c.id); recarregar(); } }}>Excluir</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
