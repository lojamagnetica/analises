"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PerguntasDisc, faltamDisc, type MaisMenos, type Pergunta } from "@/components/PerguntasDisc";
import { RetornoPerfil } from "@/components/RetornoPerfil";
import { pontuarMaisMenos, principal } from "@/lib/pessoas";

type Aberto = { nome: string; loja: string; perguntas: Pergunta[] };

// O teste de perfil que a própria pessoa da equipe responde pelo link, sem entrar no Hub.
function Teste() {
  const token = useSearchParams().get("t") ?? "";
  const [t, setT] = useState<Aberto | null | undefined>(undefined);
  const [r, setR] = useState<MaisMenos>({ mais: [], menos: [] });
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
    // A mesma conta do banco: o resultado aparece na hora para quem respondeu.
    const pontos = pontuarMaisMenos(r.mais.filter((x): x is NonNullable<typeof x> => !!x), r.menos.filter((x): x is NonNullable<typeof x> => !!x));
    const pr = principal(pontos);
    return (
      <>
        <div className="card mb" style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 0 4px" }}>Pronto, {t?.nome}!</h2>
          <p className="mudo" style={{ margin: 0 }}>Suas respostas foram enviadas. Obrigada por responder com sinceridade. Veja o que o seu teste mostrou:</p>
        </div>
        {pr && <RetornoPerfil nome={t?.nome ?? ""} loja={t?.loja ?? ""} perfil={pontos} />}
        <p className="ajuda" style={{ textAlign: "center" }}>A sua líder também pode te enviar este relatório por link.</p>
      </>
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

  const faltam = faltamDisc(t.perguntas, r);
  return (
    <>
      <div className="card mb">
        <h1 style={{ margin: "0 0 6px" }}>Oi, {t.nome}!</h1>
        <p className="mudo" style={{ margin: 0 }}>
          São {t.perguntas.length} situações do dia a dia. Em cada uma, marque a frase que <b>mais</b> parece com você
          e a que <b>menos</b> parece. Leva uns 8 minutos. Não existe resposta certa: responda como você é no dia a dia,
          não como acha que deveria ser.
        </p>
      </div>
      <PerguntasDisc perguntas={t.perguntas} r={r} mudar={setR} />
      {erro && <div className="aviso mb">{erro}</div>}
      <button
        className="btn p"
        type="button"
        disabled={faltam > 0 || enviando}
        onClick={async () => {
          setErro(""); setEnviando(true);
          const { data, error } = await supabaseBrowser().rpc("teste_enviar", { p_token: token, p_mais: r.mais, p_menos: r.menos });
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
