"use client";

import { useState } from "react";
import Link from "next/link";
import { ConsultoriaEvolucao } from "@/components/ConsultoriaEvolucao";
import { EditarAcao, EditarEntrega, EstruturaEditor, NovaAcao, NovaEntrega } from "@/components/ConsultoriaEquipe";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, diasAte, hoje } from "@/lib/formato";
import {
  STATUS_ACAO, STATUS_ENTREGA, acaoStatus, buscarConsultoria, classeStatus, daLoja, entregaRemover, entregaStatus, estruturaPadrao, mesDaConsultoria, mudarLoja,
  type Acao, type Entrega,
} from "@/lib/consultoria";

const doisDigitos = (n: number) => String(n).padStart(2, "0");

export default function Consultoria() {
  const { portal, equipe } = usePortal();
  const { dados, recarregar } = useDados(() => buscarConsultoria(portal.id), [portal.id]);
  const [filtro, setFiltro] = useState("");
  if (!dados) return <Carregando />;
  const c = dados.dados;
  const lojas = portal.lojas ?? [];
  const varias = lojas.length > 1;
  const acoes = dados.acoes.filter((a) => daLoja(a, filtro));

  if (!c) {
    return (
      <>
        <Titulo titulo="Minha consultoria" />
        {equipe
          ? <EstruturaEditor portalId={portal.id} c={estruturaPadrao(portal.inicio ?? hoje())} aoSalvar={recarregar} aberto />
          : <div className="card mudo">A estrutura da sua consultoria está sendo montada pela equipe.</div>}
      </>
    );
  }

  // Só as entregas dos meses do plano (uma entrega tirada do plano fica fora de todos os meses).
  const entregas = dados.entregas.filter((e) => c.meses.some((m) => m.mes === e.mes) && daLoja(e, filtro));
  const n = mesDaConsultoria(c.inicio);
  const atual = c.meses[Math.min(Math.max(n, 1), c.meses.length) - 1];
  const encerrando = n > c.duracao;
  const frenteDe = (num: number) => c.frentes.find((f) => f.n === num);

  // Com mais de uma loja no portal: a etiqueta de cada item (a equipe escolhe a loja ali mesmo).
  const Etiqueta = ({ tabela, item }: { tabela: "consultoria_entregas" | "consultoria_acoes"; item: Acao | Entrega }) => {
    if (!varias) return null;
    if (equipe) {
      return (
        <select value={item.loja ?? ""} aria-label="Loja" style={{ width: "auto", fontSize: 12, padding: "2px 6px", marginTop: 4 }}
          onChange={async (e) => { await mudarLoja(tabela, item.id, e.target.value || null); recarregar(); }}>
          <option value="">As duas lojas</option>
          {lojas.map((l) => <option key={l}>{l}</option>)}
        </select>
      );
    }
    return <span className="chip" style={{ display: "inline-block", fontSize: 11.5, padding: "1px 8px", marginTop: 4 }}>{item.loja ?? "As duas lojas"}</span>;
  };

  const Linha = ({ a }: { a: Acao }) => {
    const prazo = diasAte(a.prazo);
    const feitaPelaLoja = a.tipo === "Ação da loja";
    return (
      <div className="marcar" style={{ cursor: "default", alignItems: "flex-start", gap: 12 }}>
        {equipe ? (
          <select value={a.status} onChange={async (e) => { await acaoStatus(a.id, e.target.value); recarregar(); }} style={{ width: "auto" }}>
            {STATUS_ACAO.map((s) => <option key={s}>{s}</option>)}
          </select>
        ) : feitaPelaLoja ? (
          <input type="checkbox" checked={a.status === "Feito"} aria-label="Feito"
            onChange={async (e) => { await acaoStatus(a.id, e.target.checked ? "Feito" : "A fazer"); recarregar(); }} />
        ) : (
          <span className={`selo ${classeStatus(a.status)}`}>{a.status}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <b style={{ textDecoration: a.status === "Feito" ? "line-through" : undefined }}>{a.acao}</b>
          <div className="mudo" style={{ fontSize: 13 }}>
            {a.quem}{a.prazo ? ` · até ${dia(a.prazo).slice(0, 5)}` : ""}
            {a.status !== "Feito" && prazo === 0 ? " · hoje" : ""}
          </div>
          {a.obs && <div className="ajuda" style={{ margin: 0 }}>{a.obs}</div>}
          <Etiqueta tabela="consultoria_acoes" item={a} />
          {equipe && <EditarAcao a={a} lojas={lojas} aoSalvar={recarregar} />}
        </div>
      </div>
    );
  };

  return (
    <>
      <Titulo
        titulo="Minha consultoria"
        sub={[varias ? lojas.join(" e ") : "", `${c.duracao} meses`, `${dia(c.inicio)} a ${dia(c.fim)}`, c.cidade, ...(c.instagram ?? [])].filter(Boolean).join(" · ")}
      />

      {equipe && <EstruturaEditor portalId={portal.id} c={c} aoSalvar={recarregar} />}

      <div className="heroi mb">
        <div style={{ minWidth: 180 }}>
          <small style={{ opacity: 0.8, letterSpacing: ".08em" }}>VOCÊS ESTÃO NO</small>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>{encerrando ? "Encerramento" : `Mês ${n} de ${c.duracao}`}</div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ textTransform: "uppercase" }}>{encerrando ? c.encerramento : atual.nome}</b>
          {!encerrando && atual.foco && <p>{atual.foco}</p>}
          <div className="linha mt" style={{ gap: 6 }}>
            {c.meses.map((m, i) => (
              <span key={m.mes} className="chip" style={{
                background: i + 1 === n ? "#fff" : "rgba(255,255,255,.12)",
                color: i + 1 === n ? "var(--ink)" : "#fff",
                borderColor: "rgba(255,255,255,.3)",
                opacity: i + 1 < n ? 0.65 : 1,
              }}>{i + 1 < n ? "✓ " : ""}{m.mes}</span>
            ))}
          </div>
        </div>
        {c.visita && <div className="meet"><small>Agenda</small><b>{c.visita}</b></div>}
      </div>

      <ConsultoriaEvolucao portalId={portal.id} c={c} equipe={equipe} aoSalvar={recarregar} />

      {varias && (
        <div className="linha mb" style={{ gap: 8 }} role="group" aria-label="Ver por loja">
          {["", ...lojas].map((l) => (
            <button key={l || "todas"} type="button" className="chip" aria-pressed={filtro === l} onClick={() => setFiltro(l)}
              style={filtro === l ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)" } : undefined}>
              {l || "As duas lojas"}
            </button>
          ))}
        </div>
      )}

      <div className="secao">Ações da quinzena</div>
      <div className="grade g2">
        <div className="card">
          <h3>O que vocês fazem</h3>
          <p className="mudo" style={{ marginTop: -4 }}>Até o próximo encontro. Terminou? Marque como feito.</p>
          {acoes.filter((a) => a.tipo === "Ação da loja").map((a) => <Linha key={a.id} a={a} />)}
          {equipe && <NovaAcao portalId={portal.id} tipo="Ação da loja" lojas={lojas} aoSalvar={recarregar} />}
        </div>
        <div className="card">
          <h3>O que a Loja Magnética entrega</h3>
          <p className="mudo" style={{ marginTop: -4 }}>O que preparamos para vocês nesta quinzena.</p>
          {acoes.filter((a) => a.tipo !== "Ação da loja").map((a) => <Linha key={a.id} a={a} />)}
          {equipe && <NovaAcao portalId={portal.id} tipo="Entrega Loja Magnética" lojas={lojas} aoSalvar={recarregar} />}
        </div>
      </div>

      <div className="secao">As {c.frentes.length} frentes da sua consultoria</div>
      <div className="grade g2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
        {c.frentes.map((f) => {
          const delas = entregas.filter((e) => e.frente === f.n);
          const feitas = delas.filter((e) => e.status === "Entregue").length;
          return (
            <div key={f.n} className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
              <small className="mudo" style={{ fontWeight: 700, letterSpacing: ".08em" }}>{doisDigitos(f.n)}</small>
              <h3 style={{ margin: "2px 0 6px", textTransform: "uppercase" }}>{f.nome}</h3>
              <p className="mudo" style={{ margin: "0 0 10px" }}>{f.oque}</p>
              <div className="barra"><i style={{ width: `${delas.length ? (feitas / delas.length) * 100 : 0}%` }} /></div>
              <small className="mudo">{feitas} de {delas.length} entregas</small>
            </div>
          );
        })}
      </div>

      <div className="secao">As entregas · mês a mês</div>
      <p className="mudo" style={{ marginTop: -6 }}>{entregas.length} entregas até {c.meses[c.meses.length - 1]?.nome.toLowerCase()}. {c.encerramento}</p>
      <div className="grade g2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {c.meses.map((m, i) => {
          const doMes = entregas.filter((e) => e.mes === m.mes);
          if (!doMes.length && !equipe) return null;
          const agora = i + 1 === n;
          return (
            <div key={m.mes} className={`card ${agora ? "card-borda" : ""}`} style={{ ["--c" as string]: "var(--red)" }}>
              <div className="linha entre">
                <h3 style={{ margin: 0 }}>{m.nome}</h3>
                {agora && <span className="selo andamento">este mês</span>}
              </div>
              {doMes.map((e) => (
                <div key={e.id} className="marcar" style={{ cursor: "default", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{e.entrega}</b>
                    <div className="mudo" style={{ fontSize: 13 }}>
                      {doisDigitos(e.frente)} · {frenteDe(e.frente)?.nome}
                      {(() => {
                        const mat = dados.materiais.find((x) => x.entrega_id === e.id);
                        if (mat) return <> · <Link href={`/consultoria/materiais/ver?id=${mat.id}`}>abrir material</Link>{equipe && !mat.liberado ? " (rascunho)" : ""}</>;
                        return e.material_url && <> · <a href={e.material_url} target="_blank" rel="noopener">abrir material</a></>;
                      })()}
                    </div>
                    <Etiqueta tabela="consultoria_entregas" item={e} />
                    {equipe && <EditarEntrega e={e} c={c} lojas={lojas} aoSalvar={recarregar} />}
                  </div>
                  {equipe ? (
                    <div className="linha" style={{ flexWrap: "nowrap", gap: 6 }}>
                      <select value={e.status} onChange={async (x) => { await entregaStatus(e.id, x.target.value); recarregar(); }} style={{ width: "auto" }}>
                        {STATUS_ENTREGA.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button type="button" className="btn s peq" aria-label={`Tirar "${e.entrega}" do plano`}
                        onClick={async () => { if (confirm(`Tirar "${e.entrega}" do plano?`)) { await entregaRemover(e.id); recarregar(); } }}>✕</button>
                    </div>
                  ) : (
                    <span className={`selo ${classeStatus(e.status)}`}>{e.status}</span>
                  )}
                </div>
              ))}
              {equipe && <NovaEntrega portalId={portal.id} c={c} lojas={lojas} mes={m.mes} ordem={(dados.entregas.reduce((x, e) => Math.max(x, e.ordem), 0)) + 1} aoSalvar={recarregar} />}
            </div>
          );
        })}
      </div>

      <div className="secao">Como funciona</div>
      <div className="grade g3">
        {c.como.map((x) => (
          <div key={x.titulo} className="card">
            <h3>{x.titulo}</h3>
            <p className="mudo" style={{ margin: 0 }}>{x.texto}</p>
          </div>
        ))}
      </div>
    </>
  );
}
