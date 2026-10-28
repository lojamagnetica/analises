"use client";

import { useState } from "react";
import { dia, moeda } from "@/lib/formato";
import {
  DECISOES, MOTIVOS, RESULTADOS, SITUACOES, diasSemPedido, excluirCliente, registrarContato, salvarCliente, situacao,
  type ClienteAtacado, type Contato,
} from "@/lib/atacado";

/** Um lojista: os dados, a situação, os contatos e (no modo reativação) o motivo e a decisão. */
export function LinhaLojista({ c, contatos, portalId, recarregar, reativacao, curva }: {
  c: ClienteAtacado; contatos: Contato[]; portalId: string; recarregar: () => void; reativacao?: boolean; curva?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [r, setR] = useState(c);
  const [res, setRes] = useState(RESULTADOS[0]);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const s = situacao(c);
  const dias = diasSemPedido(c);
  const meus = contatos.filter((k) => k.cliente_id === c.id);
  const salvar = async (d: Partial<ClienteAtacado>) => { setErro(""); try { await salvarCliente(portalId, c.id, d); recarregar(); } catch (e) { setErro((e as Error).message); } };

  return (
    <div style={{ borderTop: "1px solid var(--line)", padding: "8px 0" }}>
      <div className="linha entre" style={{ gap: 8, alignItems: "flex-start", cursor: "pointer" }} onClick={() => setAberto(!aberto)}>
        <div style={{ minWidth: 0 }}>
          <b>{c.nome}</b>{curva && <span className="selo espera" style={{ marginLeft: 6, fontSize: 11 }}>{curva}</span>}
          <div><small className="mudo">{[c.cidade, c.uf].filter(Boolean).join("/") || "sem praça"} · {c.canal || "sem canal"} · {c.vendedora || "sem vendedora"}{dias !== null ? ` · último pedido há ${dias} dias` : ""}{meus[0] ? ` · contato ${dia(meus[0].dia)}: ${meus[0].resultado}` : ""}</small></div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <b>{moeda(Number(c.total_ano))}</b><br /><span className={`selo ${SITUACOES[s].classe}`} style={{ fontSize: 11 }}>{SITUACOES[s].nome}</span>
        </div>
      </div>
      {reativacao && (
        <div className="grade g2" style={{ gap: "0 10px", marginTop: 6 }}>
          <label className="ajuda" style={{ display: "block", margin: 0 }}>Por que parou?
            <select value={c.motivo} onChange={(e) => salvar({ motivo: e.target.value })}><option value="">Escolher…</option>{MOTIVOS.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
          <label className="ajuda" style={{ display: "block", margin: 0 }}>O que fazer
            <select value={c.decisao} onChange={(e) => salvar({ decisao: e.target.value })}>{DECISOES.map((m) => <option key={m} value={m}>{m || "Escolher…"}</option>)}</select>
          </label>
        </div>
      )}
      {aberto && (
        <div style={{ background: "var(--soft)", borderRadius: 12, padding: 10, marginTop: 6 }}>
          <b style={{ fontSize: 13.5 }}>Registrar contato</b>
          <div className="linha" style={{ gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            <select value={res} onChange={(e) => setRes(e.target.value)} style={{ width: "auto", margin: 0 }}>{RESULTADOS.map((x) => <option key={x}>{x}</option>)}</select>
            <input type="text" placeholder="Observação (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} style={{ flex: 1, minWidth: 160, margin: 0 }} />
            <button type="button" className="btn p peq" onClick={async () => {
              setErro(""); try { await registrarContato(portalId, c.id, c.vendedora, res, obs.trim()); setObs(""); recarregar(); } catch (e) { setErro((e as Error).message); }
            }}>Registrar</button>
          </div>
          {meus.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>{meus.slice(0, 5).map((k) => <li key={k.id}>{dia(k.dia)} · {k.vendedora || "—"} · {k.resultado}{k.obs ? ` · ${k.obs}` : ""}</li>)}</ul>}
          {c.telefone && <a className="link-loja" style={{ fontSize: 13 }} href={`https://wa.me/55${c.telefone.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noopener">Abrir o WhatsApp</a>}
          {!editando ? (
            <div className="linha mt" style={{ gap: 12 }}>
              <button type="button" className="link-loja" onClick={() => setEditando(true)}>Editar dados</button>
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir ${c.nome} da carteira?`)) { try { await excluirCliente(c.id); recarregar(); } catch (e) { setErro((e as Error).message); } } }}>Excluir</button>
            </div>
          ) : (
            <div className="mt">
              <div className="grade g3" style={{ gap: "0 8px" }}>
                {([["nome", "Nome"], ["documento", "CNPJ/CPF"], ["telefone", "WhatsApp"], ["cidade", "Cidade"], ["uf", "UF"], ["canal", "Canal"], ["vendedora", "Vendedora"]] as [keyof ClienteAtacado, string][]).map(([k, rot]) => (
                  <label key={k} className="ajuda" style={{ display: "block" }}>{rot}<input type="text" value={String(r[k] ?? "")} onChange={(e) => setR({ ...r, [k]: e.target.value })} /></label>
                ))}
                <label className="ajuda" style={{ display: "block" }}>Último pedido<input type="date" value={r.ultimo_pedido ?? ""} onChange={(e) => setR({ ...r, ultimo_pedido: e.target.value || null })} /></label>
                <label className="ajuda" style={{ display: "block" }}>Total no ano (R$)<input type="number" value={r.total_ano} onChange={(e) => setR({ ...r, total_ano: Number(e.target.value) })} /></label>
              </div>
              <label className="ajuda" style={{ display: "block" }}>Observação<textarea rows={2} value={r.obs} onChange={(e) => setR({ ...r, obs: e.target.value })} /></label>
              <div className="linha" style={{ gap: 8 }}>
                <button type="button" className="btn p peq" onClick={async () => { const { id: _i, portal_id: _p, ...d } = r; await salvar({ ...d, uf: d.uf.toUpperCase().slice(0, 2) }); setEditando(false); }}>Salvar</button>
                <button type="button" className="btn s peq" onClick={() => { setR(c); setEditando(false); }}>Cancelar</button>
              </div>
            </div>
          )}
          {erro && <div className="aviso mt">{erro}</div>}
        </div>
      )}
    </div>
  );
}
