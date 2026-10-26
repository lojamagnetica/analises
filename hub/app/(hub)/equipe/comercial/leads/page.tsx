"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { ETAPAS_LEAD, atrasado, buscarLeads, funil, linkWhatsapp, moverLead, salvarLead, type EtapaLead, type Lead } from "@/lib/leads";
import { PERIODOS, type Periodo } from "@/lib/gestao-clientes";
import { dataCurta, moeda } from "@/lib/formato";
import { normalizar } from "@/lib/agenda-regras";

type Aba = "quadro" | "funil";
const COR_ETAPA: Record<string, string> = { Novo: "var(--blue)", Conversando: "var(--orange)", Proposta: "var(--purple)", Fechou: "var(--green)" };

function CamposLead({ l, responsaveis }: { l?: Lead; responsaveis: string[] }) {
  return (
    <>
      <div className="grade g2" style={{ gap: 12 }}>
        <div><label className="rotulo">Nome</label><input name="nome" required defaultValue={l?.nome ?? ""} /></div>
        <div><label className="rotulo">Loja</label><input name="loja" defaultValue={l?.loja ?? ""} /></div>
        <div><label className="rotulo">WhatsApp</label><input name="whatsapp" defaultValue={l?.whatsapp ?? ""} /></div>
        <div><label className="rotulo">Instagram</label><input name="instagram" defaultValue={l?.instagram ?? ""} placeholder="@loja" /></div>
        <div><label className="rotulo">Como chegou</label><input name="origem" defaultValue={l?.origem ?? ""} placeholder="Ex.: Instagram, indicação, evento" /></div>
        <div><label className="rotulo">Valor estimado (R$)</label><input name="valor_estimado" inputMode="decimal" defaultValue={l?.valor_estimado ?? ""} /></div>
        <div>
          <label className="rotulo">Quem atende</label>
          <input name="responsavel" list="responsaveis" defaultValue={l?.responsavel ?? ""} />
          <datalist id="responsaveis">{responsaveis.map((r) => <option key={r} value={r} />)}</datalist>
        </div>
        <div><label className="rotulo">Próximo contato</label><input name="proximo_contato" type="date" defaultValue={l?.proximo_contato ?? ""} /></div>
      </div>
      <label className="rotulo">Anotações</label>
      <textarea name="obs" rows={3} defaultValue={l?.obs ?? ""} />
    </>
  );
}

export default function LeadsEPipeline() {
  const { nome } = useEquipe();
  const { dados, recarregar } = useDados(buscarLeads, []);
  const [aba, setAba] = useState<Aba>("quadro");
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [responsavel, setResponsavel] = useState("");
  const [busca, setBusca] = useState("");
  const [soAtrasados, setSoAtrasados] = useState(false);
  const [aberto, setAberto] = useState<{ id: string; modo: "editar" | "perder" } | null>(null);
  const [novo, setNovo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;

  const responsaveis = [...new Set([...dados.equipe.map((p) => p.nome ?? ""), ...dados.leads.map((l) => l.responsavel ?? "")].filter(Boolean))].sort();
  const q = normalizar(busca);
  const visiveis = dados.leads.filter((l) =>
    (!responsavel || l.responsavel === responsavel) && (!soAtrasados || atrasado(l)) &&
    (!q || normalizar(`${l.nome} ${l.loja ?? ""} ${l.origem ?? ""}`).includes(q)));
  const f = funil(dados.leads, periodo);
  const mover = async (l: Lead, etapa: EtapaLead) => { setErro(""); try { await moverLead(l.id, etapa); recarregar(); } catch (e) { setErro((e as Error).message); } };

  const Cartao = ({ l }: { l: Lead }) => {
    const i = ETAPAS_LEAD.indexOf(l.etapa as (typeof ETAPAS_LEAD)[number]);
    const zap = linkWhatsapp(l.whatsapp);
    const edicao = aberto?.id === l.id ? aberto.modo : null;
    return (
      <div className="card" style={{ padding: 12, marginBottom: 10 }}>
        <div><b>{l.nome}</b>{l.loja && <span className="mudo"> · {l.loja}</span>}</div>
        <div className="mudo" style={{ fontSize: 13 }}>
          {zap ? <a href={zap} target="_blank" rel="noopener noreferrer">{l.whatsapp}</a> : (l.whatsapp ?? "")}
          {l.origem && <> · {l.origem}</>}{l.valor_estimado ? <> · {moeda(Number(l.valor_estimado))}</> : null}
        </div>
        <div className="linha" style={{ flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
          {l.indicado_por && <span className="selo feito">indicada por {dados.indicadoras[l.indicado_por] ?? "uma loja"}</span>}
          {l.responsavel && <span className="selo espera">{l.responsavel.split(" ")[0]}</span>}
          {l.proximo_contato && <span className={`selo ${atrasado(l) ? "erro" : "andamento"}`}>{atrasado(l) ? "atrasado" : "contato"} {dataCurta(l.proximo_contato)}</span>}
          {l.etapa === "Perdido" && l.motivo_perda && <span className="selo alerta">{l.motivo_perda}</span>}
        </div>
        {l.obs && edicao !== "editar" && <div className="mudo" style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{l.obs}</div>}
        <div className="linha" style={{ flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {i > 0 && <button type="button" className="btn s peq" onClick={() => mover(l, ETAPAS_LEAD[i - 1])} aria-label="Voltar etapa">◀</button>}
          {i >= 0 && i < ETAPAS_LEAD.length - 1 && <button type="button" className="btn p peq" onClick={() => mover(l, ETAPAS_LEAD[i + 1])}>{ETAPAS_LEAD[i + 1]} ▶</button>}
          {l.etapa === "Fechou" && !l.portal_id && <Link className="btn p peq" href={`/equipe/comercial/venda?lead=${l.id}`}>Registrar venda</Link>}
          {l.etapa === "Fechou" && l.portal_id && <Link className="btn s peq" href={`/equipe/portal?id=${l.portal_id}#ficha`}>Ver a ficha</Link>}
          {l.etapa === "Perdido" && <button type="button" className="btn s peq" onClick={() => mover(l, "Novo")}>Reabrir</button>}
          <button type="button" className="btn s peq" onClick={() => setAberto(edicao === "editar" ? null : { id: l.id, modo: "editar" })}>Editar</button>
          {l.etapa !== "Perdido" && l.etapa !== "Fechou" && <button type="button" className="btn s peq" onClick={() => { setMotivo(""); setAberto({ id: l.id, modo: "perder" }); }}>Perdido</button>}
        </div>
        {edicao === "perder" && (
          <div className="mt">
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que não fechou? (opcional)" />
            <div className="linha mt"><button type="button" className="btn p peq" onClick={async () => { await moverLead(l.id, "Perdido", motivo); setAberto(null); recarregar(); }}>Marcar como perdido</button><button type="button" className="btn s peq" onClick={() => setAberto(null)}>Cancelar</button></div>
          </div>
        )}
        {edicao === "editar" && (
          <form className="mt" action={async (fd) => { try { await salvarLead(l.id, fd, nome); setAberto(null); recarregar(); } catch (e) { setErro((e as Error).message); } }}>
            <CamposLead l={l} responsaveis={responsaveis} />
            <div className="linha mt"><button className="btn p peq" type="submit">Salvar</button><button type="button" className="btn s peq" onClick={() => setAberto(null)}>Cancelar</button></div>
          </form>
        )}
      </div>
    );
  };

  const ordenar = (a: Lead, b: Lead) => Number(atrasado(b)) - Number(atrasado(a)) || (a.proximo_contato ?? "9999").localeCompare(b.proximo_contato ?? "9999") || b.created_at.localeCompare(a.created_at);
  const perdidos = visiveis.filter((l) => l.etapa === "Perdido");

  return (
    <>
      <Titulo voltar={{ href: "/equipe/comercial", rotulo: "Comercial" }} titulo="Leads e funil" sub="Quem está negociando com a equipe, em que etapa e quando é o próximo contato. Quando fecha, registre a venda e a cliente passa para a CS." />
      {erro && <div className="aviso mb">{erro}</div>}

      <div className="linha entre mb" style={{ flexWrap: "wrap", gap: 8 }}>
        <div className="chips">
          <button type="button" className={`chip${aba === "quadro" ? " escolhido" : ""}`} onClick={() => setAba("quadro")}>Quadro</button>
          <button type="button" className={`chip${aba === "funil" ? " escolhido" : ""}`} onClick={() => setAba("funil")}>Funil</button>
        </div>
        <button type="button" className="btn p" onClick={() => setNovo(!novo)}>{novo ? "Fechar" : "+ Novo lead"}</button>
      </div>

      {novo && (
        <form className="card mb" action={async (fd) => { try { setErro(""); await salvarLead(null, fd, nome); setNovo(false); recarregar(); } catch (e) { setErro((e as Error).message); } }}>
          <h2>Novo lead</h2>
          <CamposLead responsaveis={responsaveis} />
          <div className="linha mt"><button className="btn p" type="submit">Salvar lead</button></div>
        </form>
      )}

      {aba === "quadro" && (
        <>
          <div className="card mb">
            <div className="linha" style={{ flexWrap: "wrap", gap: 8 }}>
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, loja ou origem" style={{ maxWidth: 280 }} />
              <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} style={{ maxWidth: 220 }}>
                <option value="">Todos que atendem</option>
                {responsaveis.map((r) => <option key={r}>{r}</option>)}
              </select>
              <button type="button" className={`chip${soAtrasados ? " escolhido" : ""}`} onClick={() => setSoAtrasados(!soAtrasados)}>Só contatos atrasados</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(250px, 1fr))", gap: 14, alignItems: "start" }}>
              {ETAPAS_LEAD.map((e) => {
                const da = visiveis.filter((l) => l.etapa === e).sort(ordenar);
                const valor = da.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);
                return (
                  <div key={e}>
                    <div className="card card-borda" style={{ ["--c" as string]: COR_ETAPA[e], padding: 12, marginBottom: 10 }}>
                      <b>{e}</b> <span className="mudo">· {da.length}</span>{valor > 0 && <div className="mudo" style={{ fontSize: 13 }}>{moeda(valor)}</div>}
                    </div>
                    {da.length === 0 && <p className="mudo" style={{ fontSize: 13 }}>Ninguém aqui.</p>}
                    {da.map((l) => <Cartao key={l.id} l={l} />)}
                  </div>
                );
              })}
            </div>
          </div>
          <details className="mt">
            <summary className="btn s peq" style={{ display: "inline-flex" }}>Perdidos ({perdidos.length})</summary>
            <div className="mt" style={{ maxWidth: 420 }}>{perdidos.sort(ordenar).map((l) => <Cartao key={l.id} l={l} />)}</div>
          </details>
        </>
      )}

      {aba === "funil" && (
        <>
          <div className="chips mb">
            {PERIODOS.map((p) => <button key={p.id} type="button" className={`chip${periodo === p.id ? " escolhido" : ""}`} onClick={() => setPeriodo(p.id)}>{p.rotulo}</button>)}
          </div>
          <p className="ajuda mb">Leads criados no período. Cada etapa conta quem chegou até ela ou além; os perdidos ficam à parte.</p>
          <div className="grade g4 mb">
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--blue)" }}><b>{f.total}</b><small>leads no período</small></div>
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--green)" }}><b>{f.conversao.geral === null ? "—" : `${f.conversao.geral}%`}</b><small>chegaram a fechar</small></div>
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--orange)" }}><b>{moeda(f.valorAberto)}</b><small>valor em negociação</small></div>
            <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--purple)" }}><b>{moeda(f.valorFechado)}</b><small>valor fechado ({f.perdidos} perdidos)</small></div>
          </div>
          <div className="card">
            {ETAPAS_LEAD.map((e) => {
              const n = f.chegaram[e];
              const largura = f.chegaram.Novo ? Math.max(4, Math.round((n / f.chegaram.Novo) * 100)) : 4;
              const conv = e === "Novo" ? null : f.conversao[e];
              return (
                <div key={e} className="mb">
                  <div className="linha entre"><b>{e}</b><span>{n} {n === 1 ? "lead" : "leads"}{conv !== null && <span className="mudo"> · {conv}% da etapa anterior</span>}</span></div>
                  <div className="barra"><i style={{ width: `${largura}%`, background: COR_ETAPA[e] }} /></div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
