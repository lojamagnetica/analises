"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NossaHistoria } from "@/components/NossaHistoria";
import { Simbolo } from "@/components/Simbolo";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Historia, Respostas } from "@/lib/historia";
import { CAMPOS_MARCA, montarQuiz, urlFotoMarca, type Marca, type ResultadoQuiz } from "@/lib/marcas";

// O material de estudo da pessoa nova (link do onboarding, sem login): a história, o guia das marcas e o quiz.
type Estudo = { pessoa: string; loja: string; historia: { loja: string; respostas: Respostas } | null; marcas: Marca[] };

function Quiz({ e, token }: { e: Estudo; token: string }) {
  const qs = montarQuiz(e.marcas, token);
  const [i, setI] = useState(-1);
  const [resp, setResp] = useState<number[]>([]);
  const [fim, setFim] = useState<ResultadoQuiz | null>(null);
  const [erro, setErro] = useState("");
  if (qs.length < 2) return <p className="mudo">O quiz aparece quando a loja tiver pelo menos 2 fichas no guia.</p>;
  if (fim) {
    return (
      <div>
        <h2 style={{ margin: "0 0 6px" }}>Você acertou {fim.acertos} de {fim.total} {fim.acertos === fim.total ? "🎉" : ""}</h2>
        {fim.erros.length > 0 && <>
          <p className="mudo">Reveja estas:</p>
          {fim.erros.map((x, k) => <p key={k} style={{ fontSize: 14, margin: "6px 0" }}>{x.pergunta}<br /><b>Resposta: {x.certa}</b></p>)}
        </>}
        <p className="mudo">O resultado foi para a sua líder. Pode refazer quando quiser.</p>
        <button type="button" className="btn s" onClick={() => { setFim(null); setResp([]); setI(0); }}>Refazer o quiz</button>
      </div>
    );
  }
  if (i < 0) return <button type="button" className="btn p" onClick={() => setI(0)}>Começar o quiz ({qs.length} perguntas)</button>;
  const q = qs[i];
  return (
    <div>
      <small className="mudo">{i + 1} de {qs.length}</small>
      <h3 style={{ margin: "4px 0 10px" }}>{q.pergunta}</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {q.opcoes.map((o, k) => (
          <button key={k} type="button" className="chip" style={{ textAlign: "left", padding: "12px 14px", fontSize: 15 }} onClick={async () => {
            const r = [...resp, k];
            if (i + 1 < qs.length) { setResp(r); setI(i + 1); return; }
            const res: ResultadoQuiz = {
              acertos: qs.filter((x, n) => r[n] === x.certa).length, total: qs.length,
              erros: qs.filter((x, n) => r[n] !== x.certa).map((x) => ({ pergunta: x.pergunta, certa: x.opcoes[x.certa] })),
            };
            const { error } = await supabaseBrowser().rpc("estudo_quiz", { p_token: token, p_resultado: res });
            if (error) setErro("Não deu para enviar o resultado. Confira a internet.");
            setFim(res);
          }}>{o}</button>
        ))}
      </div>
      {erro && <div className="aviso mt">{erro}</div>}
    </div>
  );
}

function Material() {
  const token = useSearchParams().get("t") ?? "";
  const [e, setE] = useState<Estudo | null | undefined>(undefined);
  useEffect(() => {
    document.title = "Material de estudo · magnética.hub";
    if (!/^[0-9a-f-]{36}$/.test(token)) { setE(null); return; }
    supabaseBrowser().rpc("estudo_abrir", { p_token: token }).then(({ data }) => setE((data as Estudo | null) ?? null));
  }, [token]);
  if (e === undefined) return <div className="carregando">Carregando…</div>;
  if (!e) return <div className="card"><h2>Este link não abre</h2><p className="mudo">Confira o link com quem te enviou.</p></div>;
  const h = e.historia ? ({ loja: e.historia.loja || e.loja, respostas: e.historia.respostas, fotos: [] } as unknown as Historia) : null;
  return (
    <>
      <div className="card mb">
        <h1 style={{ margin: "0 0 6px" }}>Boas-vindas, {e.pessoa.split(" ")[0]}!</h1>
        <p style={{ margin: 0 }}>Este é o seu material de estudo da <b>{e.loja}</b>: {h ? "a nossa história, " : ""}as marcas e os produtos que a gente trabalha e um quiz para você ver o quanto já aprendeu.</p>
      </div>
      {h && <NossaHistoria h={h} urls={{}} />}
      {e.marcas.length > 0 && (
        <>
          <div className="secao">As marcas e os produtos</div>
          {e.marcas.map((m) => (
            <div key={m.id} className="card mb">
              {m.foto && <img src={urlFotoMarca(m.foto)} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 12, marginBottom: 10 }} />}
              <h3 style={{ margin: "0 0 6px" }}>{m.nome}</h3>
              {CAMPOS_MARCA.filter((c) => m[c.id]?.trim()).map((c) => <p key={c.id} style={{ margin: "6px 0", fontSize: 14.5, whiteSpace: "pre-wrap" }}><b>{c.rotulo}:</b> {m[c.id]}</p>)}
            </div>
          ))}
          <div className="secao">Quiz</div>
          <div className="card mb"><Quiz e={e} token={token} /></div>
        </>
      )}
    </>
  );
}

export default function Pagina() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px max(16px, env(safe-area-inset-left, 0px)) 48px" }}>
        <div className="linha mb" style={{ gap: 10 }}>
          <div className="logo"><Simbolo /></div>
          <b className="marca-nome" style={{ fontSize: 20 }}>magnética<span>.hub</span></b>
        </div>
        <Suspense fallback={<div className="carregando">Carregando…</div>}><Material /></Suspense>
      </div>
    </div>
  );
}
