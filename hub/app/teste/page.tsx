"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ORDENS, type Letra } from "@/lib/pessoas";

type Aberto = { nome: string; loja: string; perguntas: { pergunta: string; opcoes: Record<Letra, string> }[] };

// O teste de perfil que a própria pessoa da equipe responde pelo link, sem entrar no Hub.
function Teste() {
  const token = useSearchParams().get("t") ?? "";
  const [t, setT] = useState<Aberto | null | undefined>(undefined);
  const [respostas, setRespostas] = useState<(Letra | null)[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    document.title = "Teste de perfil · magnética.hub";
    if (!/^[0-9a-f-]{36}$/.test(token)) { setT(null); return; }
    supabaseBrowser().rpc("teste_abrir", { p_token: token }).then(({ data }) => setT((data as Aberto | null) ?? null));
  }, [token]);

  if (t === undefined) return <div className="carregando">Carregando…</div>;
  if (pronto) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🥂</div>
        <h2>Pronto, {t?.nome}!</h2>
        <p className="mudo">Suas respostas foram enviadas. Obrigada por responder com sinceridade.</p>
      </div>
    );
  }
  if (!t) {
    return (
      <div className="card">
        <h2>Este link não abre mais</h2>
        <p className="mudo">O teste já foi respondido ou o link foi trocado. Peça um link novo para quem te enviou.</p>
      </div>
    );
  }

  const faltam = t.perguntas.filter((_, i) => !respostas[i]).length;
  return (
    <>
      <div className="card mb">
        <h1 style={{ margin: "0 0 6px" }}>Oi, {t.nome}!</h1>
        <p className="mudo" style={{ margin: 0 }}>
          São {t.perguntas.length} situações da loja. Em cada uma, escolha a frase que mais parece com você no dia a dia.
          Não existe resposta certa: responda como você é, não como acha que deveria ser.
        </p>
      </div>
      {t.perguntas.map((q, i) => (
        <fieldset key={q.pergunta} className="card mb" style={{ border: 0 }}>
          <legend style={{ fontWeight: 700, color: "var(--ink)", padding: 0, marginBottom: 8 }}>{i + 1}. {q.pergunta}</legend>
          {ORDENS[i % 4].map((l) => (
            <label key={l} className="marcar">
              <input type="radio" name={`q${i}`} checked={respostas[i] === l} onChange={() => setRespostas((r) => { const n = [...r]; n[i] = l; return n; })} />
              <span>{q.opcoes[l]}</span>
            </label>
          ))}
        </fieldset>
      ))}
      {erro && <div className="aviso mb">{erro}</div>}
      <button
        className="btn p"
        type="button"
        disabled={faltam > 0 || enviando}
        onClick={async () => {
          setErro(""); setEnviando(true);
          const { data, error } = await supabaseBrowser().rpc("teste_responder", { p_token: token, p_respostas: t.perguntas.map((_, i) => respostas[i]) });
          setEnviando(false);
          if (error || !data) setErro("Não deu para enviar. Confira a internet e tente de novo.");
          else setPronto(true);
        }}
      >{faltam ? `Faltam ${faltam}` : enviando ? "Enviando…" : "Enviar minhas respostas"}</button>
    </>
  );
}

export default function Pagina() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px max(16px, env(safe-area-inset-left, 0px)) 48px" }}>
        <div className="linha mb" style={{ gap: 10 }}>
          <div className="logo"><Simbolo /></div>
          <b className="marca-nome" style={{ fontSize: 20 }}>magnética<span>.hub</span></b>
          <span className="mudo" style={{ marginLeft: "auto", fontSize: 13 }}>Teste de perfil</span>
        </div>
        <Suspense fallback={<div className="carregando">Carregando…</div>}><Teste /></Suspense>
      </div>
    </div>
  );
}
