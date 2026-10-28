"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, moeda } from "@/lib/formato";
import { CampoReais } from "@/components/CampoReais";
import { ETAPAS_PROSPECCAO, abrirCliente, buscarAtacado, excluirCliente, registrarContato, salvarCliente, type ClienteAtacado } from "@/lib/atacado";

const vazio = { nome: "", cidade: "", uf: "", vendedora: "", canal: "", telefone: "", obs: "" };

/** Prospecção: lojistas novos do primeiro contato ao primeiro pedido. Fechou, vira cliente e conta na meta de abertura. */
export default function Prospeccao() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarAtacado(portal.id), [portal.id]);
  const [novo, setNovo] = useState<typeof vazio | null>(null);
  const [vend, setVend] = useState("");
  const [fechando, setFechando] = useState<{ id: string; valor: number } | null>(null);
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const ps = dados.prospects.filter((c) => !vend || c.vendedora === vend);
  const vendedoras = [...new Set([...dados.prospects, ...dados.clientes].map((c) => c.vendedora).filter(Boolean))].sort();
  const naEtapa = (e: string) => ps.filter((c) => (c.etapa || ETAPAS_PROSPECCAO[0]) === e);
  const tenta = async (f: () => Promise<unknown>) => { setErro(""); try { await f(); recarregar(); } catch (e) { setErro((e as Error).message); } };

  const Cartao = ({ c }: { c: ClienteAtacado }) => {
    const i = ETAPAS_PROSPECCAO.indexOf(c.etapa || ETAPAS_PROSPECCAO[0]);
    const ultimo = dados.contatos.find((k) => k.cliente_id === c.id);
    return (
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 10, marginBottom: 8 }}>
        <b>{c.nome}</b>
        <div><small className="mudo">{[c.cidade, c.uf].filter(Boolean).join("/") || "sem praça"} · {c.vendedora || "sem vendedora"}</small></div>
        {ultimo && <small className="mudo">Último contato {dia(ultimo.dia)}: {ultimo.resultado}</small>}
        {c.obs && <div style={{ fontSize: 13 }}>{c.obs}</div>}
        <div className="linha" style={{ gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {i > 0 && <button type="button" className="link-loja" onClick={() => tenta(() => salvarCliente(portal.id, c.id, { etapa: ETAPAS_PROSPECCAO[i - 1] }))}>← voltar</button>}
          {i < ETAPAS_PROSPECCAO.length - 2 && <button type="button" className="link-loja" onClick={() => tenta(async () => { await salvarCliente(portal.id, c.id, { etapa: ETAPAS_PROSPECCAO[i + 1] }); await registrarContato(portal.id, c.id, c.vendedora, ETAPAS_PROSPECCAO[i + 1]); })}>avançar →</button>}
          {c.etapa !== "Perdido" && <button type="button" className="link-loja" style={{ color: "var(--green)" }} onClick={() => setFechando({ id: c.id, valor: 0 })}>Fez o 1º pedido</button>}
          {c.etapa !== "Perdido" && <button type="button" className="link-loja" onClick={() => tenta(() => salvarCliente(portal.id, c.id, { etapa: "Perdido" }))}>Perdido</button>}
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Excluir ${c.nome} da prospecção?`)) tenta(() => excluirCliente(c.id)); }}>Excluir</button>
        </div>
        {fechando && fechando.id === c.id && (
          <div className="mt">
            <CampoReais rotulo="Valor do primeiro pedido" vazio valor={fechando.valor} mudar={(v) => setFechando({ id: c.id, valor: v })} />
            <div className="linha" style={{ gap: 8 }}>
              <button type="button" className="btn p peq" onClick={() => tenta(async () => { await abrirCliente(c.id, fechando.valor); setFechando(null); })}>Confirmar: virou cliente</button>
              <button type="button" className="btn s peq" onClick={() => setFechando(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Titulo titulo="Prospecção" sub="Lojistas novos, do primeiro contato até o primeiro pedido. Quem fecha vira cliente da carteira e conta na meta de abertura da coleção." />
      <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn p peq" onClick={() => setNovo(vazio)}>+ Lojista para prospectar</button>
        <select value={vend} onChange={(e) => setVend(e.target.value)} style={{ width: "auto", margin: 0 }}><option value="">Todas as vendedoras</option>{vendedoras.map((v) => <option key={v}>{v}</option>)}</select>
      </div>
      {novo && (
        <div className="card mb">
          <div className="grade g3" style={{ gap: "0 8px" }}>
            {([["nome", "Nome da loja"], ["cidade", "Cidade"], ["uf", "UF"], ["vendedora", "Vendedora"], ["telefone", "WhatsApp"], ["obs", "Como chegou (indicação, feira, Instagram…)"]] as [keyof typeof vazio, string][]).map(([k, rot]) => (
              <label key={k} className="ajuda" style={{ display: "block" }}>{rot}<input type="text" value={novo[k]} onChange={(e) => setNovo({ ...novo, [k]: e.target.value })} /></label>
            ))}
          </div>
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" disabled={!novo.nome.trim()} onClick={() => tenta(async () => {
              await salvarCliente(portal.id, null, { ...novo, nome: novo.nome.trim(), uf: novo.uf.toUpperCase().slice(0, 2), tipo: "prospect", etapa: ETAPAS_PROSPECCAO[0] }); setNovo(null);
            })}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setNovo(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {erro && <div className="aviso mb">{erro}</div>}
      {!dados.prospects.length && !novo && <div className="card mudo mb">Nenhum lojista em prospecção ainda. Comece pelas áreas potenciais mapeadas.</div>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${ETAPAS_PROSPECCAO.length}, minmax(220px, 1fr))`, gap: 10, overflowX: "auto", paddingBottom: 8 }}>
        {ETAPAS_PROSPECCAO.map((e) => (
          <div key={e} style={{ background: "var(--soft)", borderRadius: 14, padding: 10, minWidth: 220 }}>
            <div className="linha entre" style={{ marginBottom: 8 }}><b style={{ fontSize: 14 }}>{e}</b><small className="mudo">{naEtapa(e).length}</small></div>
            {naEtapa(e).map((c) => <Cartao key={c.id} c={c} />)}
          </div>
        ))}
      </div>
      <p className="ajuda">Abertos nos últimos 90 dias: {dados.clientes.filter((c) => c.aberto_em && Date.now() - Date.parse(c.aberto_em) < 90 * 86_400_000).length} lojistas · {moeda(dados.clientes.filter((c) => c.aberto_em && Date.now() - Date.parse(c.aberto_em) < 90 * 86_400_000).reduce((s, c) => s + Number(c.total_ano), 0))}</p>
    </>
  );
}
