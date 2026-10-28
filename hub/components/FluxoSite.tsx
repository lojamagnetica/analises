"use client";

import { useState } from "react";
import { CampoReais } from "@/components/CampoReais";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import { COLUNAS, atrasadoFluxo, buscarFluxo, excluirItemFluxo, mensagem, salvarItemFluxo, type Fluxo, type ItemFluxo } from "@/lib/site-fluxos";

const zap = (tel: string, msg: string) => `https://wa.me/55${tel.replace(/\D/g, "").replace(/^55/, "")}?text=${encodeURIComponent(msg)}`;
const somaDias = (n: number) => new Date(Date.parse(hoje()) + n * 86_400_000).toISOString().slice(0, 10);

/** Um fluxo do site em colunas por etapa: cadastrar, avançar, avisar o cliente pelo WhatsApp, editar e excluir. */
export function FluxoSite({ fluxo, etapas, resumo }: {
  fluxo: Fluxo;
  /** Só estas etapas aparecem como colunas (ex.: a separação mostra só Pago, Em separação e Separado). */
  etapas?: string[];
  /** Os números do topo, calculados da lista. */
  resumo?: (l: ItemFluxo[]) => { rotulo: string; valor: string; alerta?: boolean }[];
}) {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ l: await buscarFluxo(portal.id, fluxo.tipo) }), [portal.id, fluxo.tipo]);
  const [ed, setEd] = useState<Partial<ItemFluxo> | null>(null);
  const [ver, setVer] = useState<"abertos" | "concluidos">("abertos");
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const l = dados.l;
  const colunas = (etapas ?? fluxo.etapas).filter((e) => !fluxo.finais.includes(e));
  const concluidos = l.filter((i) => fluxo.finais.includes(i.etapa));
  const tenta = async (f: () => Promise<unknown>) => { setErro(""); try { await f(); recarregar(); } catch (e) { setErro((e as Error).message); } };
  const mover = (i: ItemFluxo, etapa: string) => tenta(() => salvarItemFluxo(portal.id, i.id, { etapa, ...(fluxo.prazoDias && !fluxo.finais.includes(etapa) ? { prazo: somaDias(fluxo.prazoDias) } : {}) }));
  const novo = (): Partial<ItemFluxo> => ({ etapa: colunas[0], nome: "", telefone: "", numero: "", valor: 0, responsavel: "", prazo: fluxo.prazoDias ? somaDias(fluxo.prazoDias) : null, info: {} });
  const valorDe = (i: Partial<ItemFluxo>, k: string) => (COLUNAS.includes(k) ? (i as Record<string, unknown>)[k] : i.info?.[k]) as string | number | null | undefined;
  const muda = (k: string, v: string | number | null) => setEd(COLUNAS.includes(k) ? { ...ed, [k]: v } : { ...ed, info: { ...(ed?.info ?? {}), [k]: v as string } });
  const nums = resumo?.(l);

  const Cartao = ({ i }: { i: ItemFluxo }) => {
    const idx = fluxo.etapas.indexOf(i.etapa);
    const proxima = fluxo.etapas[idx + 1] && !fluxo.finais.includes(fluxo.etapas[idx + 1]) ? fluxo.etapas[idx + 1] : null;
    const msg = mensagem(fluxo, i, portal.loja);
    const check = fluxo.checklist?.[i.etapa];
    const feitos = (i.info?.check as number[] | undefined) ?? [];
    const faltaCheck = !!check && feitos.length < check.length;
    const atras = atrasadoFluxo(fluxo, i);
    return (
      <div style={{ background: "var(--card)", border: `1px solid ${atras ? "var(--red)" : "var(--line)"}`, borderRadius: 12, padding: 10, marginBottom: 8 }}>
        <div className="linha entre" style={{ gap: 6 }}><b>{i.numero ? `#${i.numero} · ` : ""}{i.nome || "Sem nome"}</b>{Number(i.valor) > 0 && <small>{moeda(Number(i.valor))}</small>}</div>
        <small className="mudo">{[i.responsavel, i.prazo ? `${atras ? "atrasado · era" : "até"} ${dia(i.prazo)}` : "", ...fluxo.campos.filter((c) => !COLUNAS.includes(c.k) && c.tipo !== "longo" && i.info?.[c.k]).map((c) => String(i.info[c.k]))].filter(Boolean).join(" · ")}</small>
        {typeof i.info?.itens === "string" && i.info.itens && <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{i.info.itens}</div>}
        {check && (
          <div style={{ marginTop: 6 }}>
            {check.map((c, k) => (
              <label key={c} className="linha" style={{ gap: 6, fontSize: 13, cursor: "pointer", alignItems: "flex-start", flexWrap: "nowrap" }}>
                <input type="checkbox" style={{ width: "auto", margin: "2px 0 0" }} checked={feitos.includes(k)}
                  onChange={(e) => tenta(() => salvarItemFluxo(portal.id, i.id, { info: { ...i.info, check: e.target.checked ? [...feitos, k] : feitos.filter((x) => x !== k) } }))} />
                <span style={{ textDecoration: feitos.includes(k) ? "line-through" : undefined }}>{c}</span>
              </label>
            ))}
          </div>
        )}
        {msg && i.telefone && (
          <a className={`btn ${i.avisado === i.etapa ? "s" : "p"} peq`} style={{ marginTop: 6, display: "inline-block" }} href={zap(i.telefone, msg)} target="_blank" rel="noopener"
            onClick={() => { if (i.avisado !== i.etapa) salvarItemFluxo(portal.id, i.id, { avisado: i.etapa }).then(recarregar); }}>
            {i.avisado === i.etapa ? "Avisado ✓ (mandar de novo)" : "Avisar no WhatsApp"}
          </a>
        )}
        {msg && !i.telefone && <div><small className="mudo">Sem WhatsApp para avisar.</small></div>}
        <div className="linha" style={{ gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {idx > 0 && <button type="button" className="link-loja" onClick={() => mover(i, fluxo.etapas[idx - 1])}>← voltar</button>}
          {proxima && <button type="button" className="link-loja" onClick={() => { if (faltaCheck && !confirm("O checklist ainda não está completo. Avançar mesmo assim?")) return; mover(i, proxima); }}>{proxima} →</button>}
          {fluxo.finais.map((f) => <button key={f} type="button" className="link-loja" onClick={() => mover(i, f)}>{f}</button>)}
          <button type="button" className="link-loja" onClick={() => setEd(i)}>Editar</button>
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Excluir ${i.nome || "este item"}?`)) tenta(() => excluirItemFluxo(i.id)); }}>Excluir</button>
        </div>
      </div>
    );
  };

  return (
    <>
      {nums && <div className="grade g4 mb">{nums.map((n) => <div key={n.rotulo} className="kpi"><small>{n.rotulo}</small><b style={{ fontSize: 24, color: n.alerta ? "var(--red)" : undefined }}>{n.valor}</b></div>)}</div>}
      <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn p peq" onClick={() => setEd(novo())}>+ Novo {fluxo.item}</button>
        <div className="chips">
          <button type="button" className={`chip${ver === "abertos" ? " escolhido" : ""}`} onClick={() => setVer("abertos")}>Em andamento ({l.length - concluidos.length})</button>
          <button type="button" className={`chip${ver === "concluidos" ? " escolhido" : ""}`} onClick={() => setVer("concluidos")}>{fluxo.finais.join(" / ")} ({concluidos.length})</button>
        </div>
      </div>
      {ed && (
        <div className="card mb">
          <div className="grade g3" style={{ gap: "0 8px" }}>
            {fluxo.campos.filter((c) => c.tipo !== "longo").map((c) => {
              const v = valorDe(ed, c.k);
              if (c.tipo === "valor") return <CampoReais key={c.k} rotulo={c.rotulo} vazio valor={Number(v ?? 0)} mudar={(x) => muda(c.k, x)} />;
              if (c.tipo === "opcoes") return <label key={c.k} className="ajuda" style={{ display: "block" }}>{c.rotulo}<select value={String(v ?? "")} onChange={(e) => muda(c.k, e.target.value)}><option value="">Escolher…</option>{c.opcoes!.map((o) => <option key={o}>{o}</option>)}</select></label>;
              return <label key={c.k} className="ajuda" style={{ display: "block" }}>{c.rotulo}<input type={c.tipo === "data" ? "date" : "text"} value={String(v ?? "")} onChange={(e) => muda(c.k, c.tipo === "data" ? e.target.value || null : e.target.value)} /></label>;
            })}
            <label className="ajuda" style={{ display: "block" }}>Etapa<select value={ed.etapa} onChange={(e) => setEd({ ...ed, etapa: e.target.value })}>{fluxo.etapas.map((e) => <option key={e}>{e}</option>)}</select></label>
          </div>
          {fluxo.campos.filter((c) => c.tipo === "longo").map((c) => (
            <label key={c.k} className="ajuda" style={{ display: "block" }}>{c.rotulo}<textarea rows={2} value={String(valorDe(ed, c.k) ?? "")} onChange={(e) => muda(c.k, e.target.value)} /></label>
          ))}
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" onClick={() => tenta(async () => { const { id, portal_id: _p, updated_at: _u, ...d } = ed; await salvarItemFluxo(portal.id, id ?? null, { ...d, tipo: fluxo.tipo }); setEd(null); })}>Salvar</button>
            <button type="button" className="btn s peq" onClick={() => setEd(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {erro && <div className="aviso mb">{erro}</div>}
      {ver === "abertos" ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${colunas.length}, minmax(240px, 1fr))`, gap: 10, overflowX: "auto", paddingBottom: 8 }}>
          {colunas.map((e) => {
            const nela = l.filter((i) => i.etapa === e);
            return (
              <div key={e} style={{ background: "var(--soft)", borderRadius: 14, padding: 10, minWidth: 240 }}>
                <div className="linha entre" style={{ marginBottom: 8 }}><b style={{ fontSize: 14 }}>{e}</b><small className="mudo">{nela.length}</small></div>
                {nela.map((i) => <Cartao key={i.id} i={i} />)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          {!concluidos.length && <p className="mudo" style={{ margin: 0 }}>Nada nos últimos 90 dias.</p>}
          {concluidos.map((i) => (
            <div key={i.id} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0", gap: 8, flexWrap: "wrap" }}>
              <span><b>{i.numero ? `#${i.numero} · ` : ""}{i.nome || "Sem nome"}</b> <small className="mudo">{i.etapa} · {dia(i.updated_at.slice(0, 10))}{i.responsavel ? ` · ${i.responsavel}` : ""}</small></span>
              <span className="linha" style={{ gap: 10 }}>
                {Number(i.valor) > 0 && <b>{moeda(Number(i.valor))}</b>}
                <button type="button" className="link-loja" onClick={() => mover(i, colunas[colunas.length - 1])}>Reabrir</button>
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Excluir ${i.nome || "este item"}?`)) tenta(() => excluirItemFluxo(i.id)); }}>Excluir</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
