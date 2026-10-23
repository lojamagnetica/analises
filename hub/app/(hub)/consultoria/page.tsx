"use client";

import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, diasAte } from "@/lib/formato";
import {
  STATUS_ACAO, STATUS_ENTREGA, acaoStatus, buscarConsultoria, classeStatus, entregaRemover, entregaStatus, mesDaConsultoria, type Acao,
} from "@/lib/consultoria";

const doisDigitos = (n: number) => String(n).padStart(2, "0");

export default function Consultoria() {
  const { portal, equipe } = usePortal();
  const { dados, recarregar } = useDados(() => buscarConsultoria(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const { dados: c, acoes } = dados;

  if (!c) {
    return (
      <>
        <Titulo titulo="Minha consultoria" />
        <div className="card mudo">A estrutura da sua consultoria está sendo montada pela equipe.</div>
      </>
    );
  }

  // Só as entregas dos meses do plano (uma entrega tirada do plano fica fora de todos os meses).
  const entregas = dados.entregas.filter((e) => c.meses.some((m) => m.mes === e.mes));
  const n = mesDaConsultoria(c.inicio);
  const atual = c.meses[Math.min(Math.max(n, 1), c.meses.length) - 1];
  const encerrando = n > c.duracao;
  const frenteDe = (num: number) => c.frentes.find((f) => f.n === num);

  const Linha = ({ a }: { a: Acao }) => {
    const prazo = diasAte(a.prazo);
    const daLoja = a.tipo === "Ação da loja";
    return (
      <div className="marcar" style={{ cursor: "default", alignItems: "flex-start", gap: 12 }}>
        {equipe ? (
          <select value={a.status} onChange={async (e) => { await acaoStatus(a.id, e.target.value); recarregar(); }} style={{ width: "auto" }}>
            {STATUS_ACAO.map((s) => <option key={s}>{s}</option>)}
          </select>
        ) : daLoja ? (
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
        </div>
      </div>
    );
  };

  return (
    <>
      <Titulo
        titulo="Minha consultoria"
        sub={[`${c.duracao} meses`, `${dia(c.inicio)} a ${dia(c.fim)}`, c.cidade, ...(c.instagram ?? [])].filter(Boolean).join(" · ")}
      />

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

      <div className="secao">Ações da quinzena</div>
      <div className="grade g2">
        <div className="card">
          <h3>O que vocês fazem</h3>
          <p className="mudo" style={{ marginTop: -4 }}>Até o próximo encontro. Terminou? Marque como feito.</p>
          {acoes.filter((a) => a.tipo === "Ação da loja").map((a) => <Linha key={a.id} a={a} />)}
        </div>
        <div className="card">
          <h3>O que a Loja Magnética entrega</h3>
          <p className="mudo" style={{ marginTop: -4 }}>O que preparamos para vocês nesta quinzena.</p>
          {acoes.filter((a) => a.tipo !== "Ação da loja").map((a) => <Linha key={a.id} a={a} />)}
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
          if (!doMes.length) return null;
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
                      {e.material_url && <> · <a href={e.material_url} target="_blank" rel="noopener">abrir material</a></>}
                    </div>
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
