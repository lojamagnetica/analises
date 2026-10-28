"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ABERTAS, SITUACOES, VALORES_TRABALHO, type Teste } from "@/lib/contratacao";

// O teste do candidato pelo link, sem login: uma situação por tela; envia tudo no fim.
const TOTAL = SITUACOES.length + 2; // situações + valores + perguntas abertas

function TesteCandidato() {
  const token = useSearchParams().get("t") ?? "";
  const [info, setInfo] = useState<{ nome: string; loja: string } | null | undefined>(undefined);
  const [i, setI] = useState(-1);
  const [t, setT] = useState<Teste>({ respostas: {}, valores: [], abertas: {} });
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    document.title = "Teste · magnética.hub";
    if (!/^[0-9a-f-]{36}$/.test(token)) { setInfo(null); return; }
    supabaseBrowser().rpc("candidato_abrir", { p_token: token }).then(({ data }) => setInfo((data as { nome: string; loja: string } | null) ?? null));
  }, [token]);

  if (info === undefined) return <div className="carregando">Carregando…</div>;
  if (pronto) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <h2 style={{ margin: "8px 0" }}>Pronto, {info?.nome.split(" ")[0]}!</h2>
        <p className="mudo" style={{ margin: 0 }}>Suas respostas foram enviadas para a {info?.loja}. Agradecemos por responder com sinceridade.</p>
      </div>
    );
  }
  if (!info) {
    return <div className="card"><h2>Este link não abre mais</h2><p className="mudo">O teste já foi respondido ou o link não está certo. Fale com quem te enviou.</p></div>;
  }

  const barra = (
    <div className="mb" style={{ height: 6, background: "var(--line)", borderRadius: 3 }}>
      <div style={{ width: `${(Math.max(0, i) / TOTAL) * 100}%`, height: 6, background: "var(--red)", borderRadius: 3 }} />
    </div>
  );
  const ir = (n: number) => { setI(n); window.scrollTo(0, 0); };

  if (i < 0) {
    return (
      <div className="card">
        <h1 style={{ margin: "0 0 8px" }}>Oi, {info.nome.split(" ")[0]}!</h1>
        <p style={{ marginTop: 0 }}>Este é o próximo passo para a vaga da <b>{info.loja}</b>.</p>
        <p className="mudo">São {SITUACOES.length} situações do dia a dia e algumas perguntas sobre você. Leva uns 10 minutos. Não existe resposta certa: escolha a que <b>mais parece com você</b>, do jeito que você é de verdade. Vale para quem nunca trabalhou também: pense na escola, na família, nos amigos.</p>
        <button type="button" className="btn p" onClick={() => ir(0)}>Começar</button>
      </div>
    );
  }

  if (i < SITUACOES.length) {
    const s = SITUACOES[i];
    const escolhida = t.respostas[s.n];
    return (
      <>
        {barra}
        <div className="card">
          <small className="mudo">{i + 1} de {TOTAL}</small>
          <h2 style={{ margin: "4px 0 12px", fontSize: 19 }}>{s.pergunta}</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {s.opcoes.map((o, k) => (
              <button key={k} type="button" className={`chip${escolhida === k ? " escolhido" : ""}`} style={{ textAlign: "left", padding: "12px 14px", fontSize: 15 }}
                onClick={() => { setT({ ...t, respostas: { ...t.respostas, [s.n]: k } }); setTimeout(() => ir(i + 1), 200); }}>{o.t}</button>
            ))}
          </div>
          {i > 0 && <button type="button" className="btn s mt" onClick={() => ir(i - 1)}>Voltar</button>}
        </div>
      </>
    );
  }

  if (i === SITUACOES.length) {
    const tem = (v: string) => t.valores.includes(v);
    return (
      <>
        {barra}
        <div className="card">
          <small className="mudo">{i + 1} de {TOTAL}</small>
          <h2 style={{ margin: "4px 0 6px", fontSize: 19 }}>Escolha os 3 que são mais importantes para você no trabalho</h2>
          <div className="chips mb">
            {VALORES_TRABALHO.map((v) => (
              <button key={v} type="button" className={`chip${tem(v) ? " escolhido" : ""}`} aria-pressed={tem(v)}
                onClick={() => setT({ ...t, valores: tem(v) ? t.valores.filter((x) => x !== v) : t.valores.length >= 3 ? t.valores : [...t.valores, v] })}>{tem(v) ? "✓ " : ""}{v}</button>
            ))}
          </div>
          <div className="linha entre" style={{ gap: 8 }}>
            <button type="button" className="btn s" onClick={() => ir(i - 1)}>Voltar</button>
            <button type="button" className="btn p" disabled={t.valores.length < 3} onClick={() => ir(i + 1)}>{t.valores.length < 3 ? `Escolha ${3 - t.valores.length}` : "Continuar"}</button>
          </div>
        </div>
      </>
    );
  }

  const ok = ABERTAS.every((a) => (t.abertas[a.id] ?? "").trim().length > 2);
  return (
    <>
      {barra}
      <div className="card">
        <small className="mudo">{TOTAL} de {TOTAL}</small>
        <h2 style={{ margin: "4px 0 12px", fontSize: 19 }}>Para terminar, conta um pouco sobre você</h2>
        {ABERTAS.map((a) => (
          <label key={a.id} className="ajuda" style={{ display: "block" }}><b style={{ color: "var(--ink)", fontSize: 15 }}>{a.pergunta}</b>
            <textarea rows={4} value={t.abertas[a.id] ?? ""} onChange={(e) => setT({ ...t, abertas: { ...t.abertas, [a.id]: e.target.value.slice(0, 2000) } })} />
          </label>
        ))}
        {erro && <div className="aviso mb">{erro}</div>}
        <div className="linha entre" style={{ gap: 8 }}>
          <button type="button" className="btn s" onClick={() => ir(i - 1)}>Voltar</button>
          <button type="button" className="btn p" disabled={!ok || enviando} onClick={async () => {
            setErro(""); setEnviando(true);
            const { data, error } = await supabaseBrowser().rpc("candidato_enviar", { p_token: token, p_teste: t });
            setEnviando(false);
            if (error || !data) setErro("Não deu para enviar. Confira a internet e tente de novo.");
            else setPronto(true);
          }}>{enviando ? "Enviando…" : "Enviar minhas respostas"}</button>
        </div>
      </div>
    </>
  );
}

export default function Pagina() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px max(16px, env(safe-area-inset-left, 0px)) 48px" }}>
        <div className="linha mb" style={{ gap: 10 }}>
          <div className="logo"><Simbolo /></div>
          <b className="marca-nome" style={{ fontSize: 20 }}>magnética<span>.hub</span></b>
        </div>
        <Suspense fallback={<div className="carregando">Carregando…</div>}><TesteCandidato /></Suspense>
      </div>
    </div>
  );
}
