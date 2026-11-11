"use client";

import { PASSOS_FEEDBACK, novaPessoaFeedback, type PessoaFeedback } from "@/lib/reunioes-gestao";

const iniciais = (n: string) => (n.trim()[0] ?? "?").toUpperCase();

/** O feedback de uma pessoa, em cartão: os 4 passos numerados e o combinado que sai dela. */
function CartaoPessoa({ p }: { p: PessoaFeedback }) {
  const temCombinado = !!(p.oque || p.quanto || p.ate);
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="linha" style={{ alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span aria-hidden style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--red)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, flex: "none" }}>{iniciais(p.nome)}</span>
        <div><b style={{ fontSize: 17 }}>{p.nome || "Sem nome"}</b>{p.funcao && <div className="mudo" style={{ fontSize: 13 }}>{p.funcao}</div>}</div>
      </div>
      {PASSOS_FEEDBACK.filter((x) => p[x.chave]?.trim()).map((x) => (
        <div key={x.chave} style={{ display: "flex", gap: 10, margin: "10px 0" }}>
          <span aria-hidden style={{ width: 24, height: 24, borderRadius: "50%", background: x.cor, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, flex: "none", marginTop: 1 }}>{x.n}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: x.cor, textTransform: "uppercase", letterSpacing: ".04em" }}>{x.titulo}</div>
            <div style={{ whiteSpace: "pre-line", fontSize: 14.5 }}>{p[x.chave]}</div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, margin: "12px 0 0" }}>
        <span aria-hidden style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--ink)", color: "var(--bg)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, flex: "none", marginTop: 1 }}>5</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: ".04em" }}>O combinado, que sai dela</div>
          {temCombinado ? (
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 6 }}>
              {[["O quê", p.oque], ["Quanto", p.quanto], ["Até quando", p.ate]].map(([t, v]) => (
                <div key={t} style={{ background: "var(--feito-soft)", borderRadius: 10, padding: "8px 10px" }}>
                  <small className="mudo">{t}</small><div style={{ fontWeight: 600 }}>{v || "—"}</div>
                </div>
              ))}
            </div>
          ) : <div className="mudo" style={{ border: "1.5px dashed var(--line)", borderRadius: 10, padding: "8px 10px", marginTop: 6, fontSize: 14 }}>A combinar com ela na conversa: o quê, quanto e até quando.</div>}
          {p.link && <a className="btn p peq" style={{ marginTop: 10 }} href={p.link} target="_blank" rel="noopener">{p.linkRotulo || "Abrir o material de apoio"} →</a>}
        </div>
      </div>
    </div>
  );
}

/** Como o feedback do time aparece no registro: um cartão por pessoa. */
export function FeedbackVisual({ pessoas }: { pessoas: PessoaFeedback[] }) {
  return <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>{pessoas.map((p, i) => <CartaoPessoa key={i} p={p} />)}</div>;
}

/** Preencher o feedback do time: uma conversa por pessoa, passo a passo. */
export function FeedbackEditor({ pessoas, mudar }: { pessoas: PessoaFeedback[]; mudar: (p: PessoaFeedback[]) => void }) {
  const troca = (i: number, parte: Partial<PessoaFeedback>) => mudar(pessoas.map((p, j) => (j === i ? { ...p, ...parte } : p)));
  return (
    <div className="mt">
      {pessoas.map((p, i) => (
        <div key={i} className="card mb" style={{ padding: 14, background: "var(--soft)" }}>
          <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
            <input type="text" aria-label="Nome da pessoa" placeholder="Nome (ex.: Thamy)" value={p.nome} onChange={(e) => troca(i, { nome: e.target.value })} style={{ flex: "1 1 180px" }} />
            <input type="text" aria-label="Função" placeholder="Função (ex.: Vendas, Marketing, Gestor)" value={p.funcao} onChange={(e) => troca(i, { funcao: e.target.value })} style={{ flex: "1 1 200px" }} />
            <button type="button" className="btn s peq" onClick={() => { if (confirm(`Tirar o feedback de ${p.nome || "esta pessoa"}?`)) mudar(pessoas.filter((_, j) => j !== i)); }}>Tirar</button>
          </div>
          {PASSOS_FEEDBACK.map((x) => (
            <div key={x.chave} className="mt">
              <label className="rotulo" style={{ color: x.cor }}>{x.n}) {x.titulo}</label>
              <p className="ajuda" style={{ margin: "0 0 4px" }}>{x.ajuda}</p>
              <textarea rows={3} value={p[x.chave]} onChange={(e) => troca(i, { [x.chave]: e.target.value })} />
            </div>
          ))}
          <label className="rotulo mt" style={{ display: "block" }}>5) O combinado, que sai dela</label>
          <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
            <input type="text" placeholder="O quê" value={p.oque} onChange={(e) => troca(i, { oque: e.target.value })} style={{ flex: "2 1 200px" }} />
            <input type="text" placeholder="Quanto" value={p.quanto} onChange={(e) => troca(i, { quanto: e.target.value })} style={{ flex: "1 1 140px" }} />
            <input type="text" placeholder="Até quando" value={p.ate} onChange={(e) => troca(i, { ate: e.target.value })} style={{ flex: "1 1 140px" }} />
          </div>
          <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
            <input type="url" aria-label="Link de apoio" placeholder="Link de apoio (opcional): a lista, o material…" value={p.link ?? ""} onChange={(e) => troca(i, { link: e.target.value })} style={{ flex: "2 1 240px" }} />
            <input type="text" aria-label="Nome do botão do link" placeholder="Nome do botão (ex.: Abrir a lista)" value={p.linkRotulo ?? ""} onChange={(e) => troca(i, { linkRotulo: e.target.value })} style={{ flex: "1 1 160px" }} />
          </div>
        </div>
      ))}
      <button type="button" className="btn s" onClick={() => mudar([...pessoas, novaPessoaFeedback()])}>+ Pessoa</button>
    </div>
  );
}
