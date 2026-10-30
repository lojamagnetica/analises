"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { PERGUNTAS, enviarSessao } from "@/lib/webinar-sessao";

// O formulário da oferta do webinar, pelo link público (sem login): a lojista pede a Sessão Estratégica de Fim de Ano.
function Formulario() {
  const origem = (useSearchParams().get("o") ?? "webinar").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "webinar";
  const [r, setR] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => { document.title = "Sessão Estratégica de Fim de Ano · Loja Magnética"; }, []);

  if (pronto) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <h2 style={{ margin: "8px 0" }}>Recebemos, {(r.nome ?? "").split(" ")[0]}!</h2>
        <p className="mudo" style={{ margin: 0 }}>O meu time vai te chamar no WhatsApp para marcar o melhor horário da sua Sessão Estratégica. Fica de olho nas mensagens.</p>
      </div>
    );
  }

  const falta = PERGUNTAS.filter((p) => p.obrigatoria && (r[p.id] ?? "").trim().length < (p.tipo === "whats" ? 10 : 2));
  const muda = (id: string, v: string) => setR({ ...r, [id]: v.slice(0, 300) });
  return (
    <>
      <div className="card mb">
        <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Sessão Estratégica de Fim de Ano</h1>
        <p style={{ margin: 0 }}>Que bom que você quer bater o recorde da sua loja neste fim de ano! Responda em 2 minutos para o meu time preparar a sua sessão de 45 minutos. Depois, a gente te chama no WhatsApp para marcar o horário.</p>
      </div>
      <div className="card">
        {PERGUNTAS.map((p, i) => (
          <div key={p.id} className="mb">
            <b style={{ display: "block", marginBottom: 6 }}>{i + 1}. {p.pergunta}{p.obrigatoria && <span style={{ color: "var(--red)" }}> *</span>}</b>
            {p.dica && <small className="mudo" style={{ display: "block", marginBottom: 6 }}>{p.dica}</small>}
            {p.tipo === "escolha" ? (
              <div style={{ display: "grid", gap: 6 }}>
                {p.opcoes!.map((o) => (
                  <button key={o} type="button" className={`chip${r[p.id] === o ? " escolhido" : ""}`} aria-pressed={r[p.id] === o}
                    style={{ textAlign: "left", padding: "10px 14px", fontSize: 15 }} onClick={() => muda(p.id, o)}>{o}</button>
                ))}
              </div>
            ) : (
              <input type={p.tipo === "whats" ? "tel" : "text"} inputMode={p.tipo === "whats" ? "tel" : undefined} value={r[p.id] ?? ""}
                placeholder={p.tipo === "whats" ? "(00) 00000-0000" : ""} onChange={(e) => muda(p.id, e.target.value)} />
            )}
          </div>
        ))}
        {erro && <div className="aviso mb">{erro}</div>}
        <button type="button" className="btn p" style={{ width: "100%" }} disabled={enviando || falta.length > 0} onClick={async () => {
          setErro(""); setEnviando(true);
          const certo = await enviarSessao(r, origem);
          setEnviando(false);
          if (certo) { setPronto(true); window.scrollTo(0, 0); } else setErro("Não deu para enviar. Confira o WhatsApp e a internet e tente de novo.");
        }}>{enviando ? "Enviando…" : falta.length ? `Falta responder ${falta.length}` : "Quero a minha Sessão Estratégica"}</button>
      </div>
    </>
  );
}

export default function Pagina() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px max(16px, env(safe-area-inset-left, 0px)) 48px" }}>
        <div className="linha mb" style={{ gap: 10 }}>
          <Simbolo tamanho={28} />
          <b style={{ fontSize: 18 }}>Loja Magnética</b>
        </div>
        <Suspense fallback={<div className="carregando">Carregando…</div>}><Formulario /></Suspense>
      </div>
    </div>
  );
}
