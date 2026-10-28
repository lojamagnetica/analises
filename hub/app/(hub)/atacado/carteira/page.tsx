"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { LinhaLojista } from "@/components/ClienteAtacado";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { SITUACOES, buscarAtacado, curvaAbc, importarClientes, lerPlanilha, salvarCliente, situacao, type ClienteAtacado, type Situacao } from "@/lib/atacado";

/** Carteira de lojistas: a lista completa, com filtros, importação da planilha e cadastro manual. */
export default function Carteira() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarAtacado(portal.id), [portal.id]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Situacao | "todos">("todos");
  const [vend, setVend] = useState("");
  const [uf, setUf] = useState("");
  const [qtd, setQtd] = useState(50);
  const [previa, setPrevia] = useState<ReturnType<typeof lerPlanilha> | null>(null);
  const [msg, setMsg] = useState("");
  const [novo, setNovo] = useState(false);
  const [n, setN] = useState({ nome: "", cidade: "", uf: "", vendedora: "", canal: "", telefone: "" });
  if (!dados) return <Carregando />;
  const cs = dados.clientes;
  const curva = curvaAbc(cs);
  const vendedoras = [...new Set(cs.map((c) => c.vendedora).filter(Boolean))].sort();
  const ufs = [...new Set(cs.map((c) => c.uf).filter(Boolean))].sort();
  const t = busca.trim().toLowerCase();
  const lista = cs.filter((c) => (filtro === "todos" || situacao(c) === filtro) && (!vend || c.vendedora === vend) && (!uf || c.uf === uf)
    && (!t || [c.nome, c.cidade, c.documento].some((x) => x.toLowerCase().includes(t))));

  const lerArquivo = async (f: File) => {
    setMsg("");
    const texto = await f.text();
    const p = lerPlanilha(texto);
    if (!p.clientes.length) { setMsg("Não achei lojistas nesse arquivo. Salve a planilha como CSV, com a primeira linha de títulos (nome, cidade, UF, vendedora, último pedido, total)."); return; }
    setPrevia(p);
  };

  return (
    <>
      <Titulo titulo="Carteira de lojistas" sub="Todos os lojistas do atacado, com a situação pelo último pedido e a curva ABC (A = os que fazem 80% do faturamento)." />

      <div className="card mb">
        <div className="linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
          <span><b>Importar a planilha do sistema</b><br /><small className="mudo">Arquivo CSV com uma linha por lojista. Quem já está no Hub é atualizado (pelo CNPJ ou nome); o resto entra novo.</small></span>
          <div className="linha" style={{ gap: 8 }}>
            <label className="btn s peq" style={{ cursor: "pointer" }}>Escolher arquivo<input type="file" accept=".csv,text/csv,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) lerArquivo(f); e.target.value = ""; }} /></label>
            <button type="button" className="btn s peq" onClick={() => setNovo(!novo)}>+ Lojista</button>
          </div>
        </div>
        {previa && (
          <div className="mt">
            <p style={{ margin: "0 0 6px" }}><b>{previa.clientes.length} lojistas</b> no arquivo. Colunas que reconheci:</p>
            <div className="chips mb">{Object.entries(previa.mapa).map(([k, v]) => <span key={k} className="chip">{v} → {k.replace("_", " ")}</span>)}</div>
            {!previa.mapa.ultimo_pedido && <div className="aviso mb">Não achei a coluna do último pedido: sem ela o Hub não sabe quem está parado.</div>}
            <div className="linha" style={{ gap: 8 }}>
              <button type="button" className="btn p peq" onClick={async () => {
                try { const r = await importarClientes(portal.id, previa.clientes, cs); setMsg(`Pronto: ${r.novos} novos e ${r.atualizados} atualizados.`); setPrevia(null); recarregar(); } catch (e) { setMsg((e as Error).message); }
              }}>Importar</button>
              <button type="button" className="btn s peq" onClick={() => setPrevia(null)}>Cancelar</button>
            </div>
          </div>
        )}
        {novo && (
          <div className="mt">
            <div className="grade g3" style={{ gap: "0 8px" }}>
              {([["nome", "Nome do lojista"], ["cidade", "Cidade"], ["uf", "UF"], ["vendedora", "Vendedora"], ["canal", "Canal"], ["telefone", "WhatsApp"]] as [keyof typeof n, string][]).map(([k, rot]) => (
                <label key={k} className="ajuda" style={{ display: "block" }}>{rot}<input type="text" value={n[k]} onChange={(e) => setN({ ...n, [k]: e.target.value })} /></label>
              ))}
            </div>
            <button type="button" className="btn p peq" disabled={!n.nome.trim()} onClick={async () => {
              try { await salvarCliente(portal.id, null, { ...n, nome: n.nome.trim(), uf: n.uf.toUpperCase().slice(0, 2) } as Partial<ClienteAtacado>); setN({ nome: "", cidade: "", uf: "", vendedora: "", canal: "", telefone: "" }); setNovo(false); recarregar(); } catch (e) { setMsg((e as Error).message); }
            }}>Salvar lojista</button>
          </div>
        )}
        {msg && <div className="aviso ok mt">{msg}</div>}
      </div>

      <div className="card">
        <div className="chips mb">
          {(["todos", "ativo", "risco", "parado", "sem"] as const).map((s) => (
            <button key={s} type="button" className={`chip${filtro === s ? " escolhido" : ""}`} onClick={() => setFiltro(s)}>
              {s === "todos" ? "Todos" : SITUACOES[s].nome} ({s === "todos" ? cs.length : cs.filter((c) => situacao(c) === s).length})
            </button>
          ))}
        </div>
        <div className="grade g3" style={{ gap: "0 8px" }}>
          <input type="search" placeholder="Buscar nome, cidade ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={vend} onChange={(e) => setVend(e.target.value)}><option value="">Todas as vendedoras</option>{vendedoras.map((v) => <option key={v}>{v}</option>)}</select>
          <select value={uf} onChange={(e) => setUf(e.target.value)}><option value="">Todas as UFs</option>{ufs.map((v) => <option key={v}>{v}</option>)}</select>
        </div>
        <small className="mudo">{lista.length} lojistas · {moeda(lista.reduce((s, c) => s + Number(c.total_ano), 0))} no ano. Toque no lojista para registrar contato, editar ou excluir.</small>
        {!cs.length && <p className="mudo">Nenhum lojista ainda. Importe a planilha ou cadastre o primeiro.</p>}
        {lista.slice(0, qtd).map((c) => <LinhaLojista key={c.id} c={c} contatos={dados.contatos} portalId={portal.id} recarregar={recarregar} curva={curva.get(c.id)} />)}
        {lista.length > qtd && <button type="button" className="btn s peq mt" onClick={() => setQtd(qtd + 100)}>Mostrar mais</button>}
      </div>
    </>
  );
}
