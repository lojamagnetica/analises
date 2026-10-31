"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { pontuar, respostasVazias, somaTempo, type Conduz, type Conteudo, type Papel, type Respostas } from "@/lib/lojista";

type Aberto = { nome: string; papel: Papel; loja: string; respondido: boolean; conteudo: Conteudo | null };

const ESCALA = ["Discordo muito", "Discordo", "Mais ou menos", "Concordo", "Concordo muito"];
const PARTES = ["A sua loja no dia a dia", "Como você conduz", "Combinados e rotina", "Suas habilidades"];

function Escala({ valor, mudar, nome }: { valor: number; mudar: (n: number) => void; nome: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={nome} style={{ marginTop: 6 }}>
      {ESCALA.map((t, i) => (
        <button key={t} type="button" role="radio" aria-checked={valor === i + 1} className={`chip${valor === i + 1 ? " escolhido" : ""}`} onClick={() => mudar(i + 1)}>{t}</button>
      ))}
    </div>
  );
}

function Tempo({ itens, valores, mudar, titulo }: { itens: string[]; valores: number[]; mudar: (v: number[]) => void; titulo: string }) {
  const soma = somaTempo(valores);
  return (
    <div className="card mb">
      <b>{titulo}</b>
      <p className="ajuda" style={{ margin: "4px 0 8px" }}>Os números precisam somar 100.</p>
      {itens.map((t, i) => (
        <label key={t} className="linha entre" style={{ padding: "6px 0", borderTop: "1px solid var(--line)", gap: 10 }}>
          <span style={{ minWidth: 0 }}>{t}</span>
          <span className="linha" style={{ gap: 4, flexShrink: 0 }}>
            <input type="number" inputMode="numeric" min={0} max={100} value={valores[i] || ""} placeholder="0" style={{ width: 70 }}
              onChange={(e) => { const v = [...valores]; v[i] = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))); mudar(v); }} />%
          </span>
        </label>
      ))}
      <p className={soma === 100 ? "mudo" : "ajuda"} style={{ margin: "8px 0 0", fontWeight: 700 }}>Total: {soma}%{soma === 100 ? " ✓" : soma > 100 ? ` (passou ${soma - 100})` : ` (faltam ${100 - soma})`}</p>
    </div>
  );
}

function Teste() {
  const token = useSearchParams().get("t") ?? "";
  const router = useRouter();
  const [t, setT] = useState<Aberto | null | undefined>(undefined);
  const [r, setR] = useState<Respostas | null>(null);
  const [passo, setPasso] = useState(0); // 0 = boas-vindas, 1 a 4 = partes
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    document.title = "Teste do lojista · magnética.hub";
    if (!/^[0-9a-f-]{36}$/.test(token)) { setT(null); return; }
    supabaseBrowser().rpc("lojista_abrir", { p_token: token }).then(({ data }) => {
      const a = (data as Aberto | null) ?? null;
      setT(a);
      if (a?.conteudo) setR(respostasVazias(a.conteudo));
    });
  }, [token]);

  if (t === undefined) return <div className="carregando">Carregando…</div>;
  if (t?.respondido) {
    return (
      <div className="card">
        <h2>Você já respondeu, {t.nome}</h2>
        <p className="mudo">Suas respostas já foram enviadas. <a href={`retorno/?t=${token}`}>Ver o seu retrato</a></p>
      </div>
    );
  }
  if (!t || !t.conteudo || !r) {
    return (
      <div className="card">
        <h2>Este link não abre</h2>
        <p className="mudo">O link foi trocado ou ainda não está pronto. Peça um link novo para quem te enviou.</p>
      </div>
    );
  }

  const c = t.conteudo;
  const socio = t.papel === "socio";
  const A = r.A;
  // Quantas perguntas obrigatórias ainda faltam em cada parte.
  const pendentes = [
    A.escolhas.filter((x) => !x).length + (somaTempo(A.tempo_real) !== 100 ? 1 : 0) + (somaTempo(A.tempo_ideal) !== 100 ? 1 : 0)
      + (socio ? A.dinheiro.filter((x) => x < 0).length : 0) + A.afirmacoes.filter((x) => !x).length,
    r.B.situacoes.filter((x) => !x).length,
    c.C.itens.filter((it, i) => it.tipo !== "texto" && Number(r.C.itens[i]) < 0).length,
    r.D.notas.filter((x) => !x).length,
  ];
  const ajustar = (f: (x: Respostas) => void) => setR((o) => { const n = structuredClone(o!); f(n); return n; });

  async function enviar() {
    setErro(""); setEnviando(true);
    const resultado = pontuar(c, r!, t!.papel);
    const { data, error } = await supabaseBrowser().rpc("lojista_responder", { p_token: token, p_respostas: r, p_resultado: resultado });
    setEnviando(false);
    if (error || !data) setErro("Não deu para enviar. Confira a internet e tente de novo.");
    else router.push(`/lojista/retorno/?t=${token}`);
  }

  if (passo === 0) {
    return (
      <div className="card">
        <h1 style={{ margin: "0 0 6px" }}>Oi, {t.nome}!</h1>
        <p>Este teste ajuda a gente a entender como você conduz a {t.loja} e como podemos te apoiar melhor. Leva uns 25 minutos e dá para fazer no celular. No fim, você recebe o seu retrato.</p>
        <p className="mudo">{c.aviso}</p>
        <button className="btn p" type="button" onClick={() => setPasso(1)}>Começar</button>
      </div>
    );
  }

  return (
    <>
      <div className="linha mb" style={{ gap: 6 }}>
        {PARTES.map((p, i) => <span key={p} className={`selo ${i + 1 < passo ? "feito" : i + 1 === passo ? "andamento" : "espera"}`}>{i + 1}</span>)}
        <b style={{ marginLeft: 6 }}>{PARTES[passo - 1]}</b>
      </div>

      {passo === 1 && (
        <>
          {A.escolhas.map((_, i) => (
            <div key={i} className="card mb">
              <b>{i + 1}. {c.A.escolhas[i].situacao}</b>
              {(["a", "b"] as const).map((k) => (
                <label key={k} className="marcar"><input type="radio" name={`esc${i}`} checked={A.escolhas[i] === k} onChange={() => ajustar((x) => { x.A.escolhas[i] = k; })} /><span>{c.A.escolhas[i][k]}</span></label>
              ))}
            </div>
          ))}
          <Tempo titulo={c.A.tempo.pergunta_real} itens={c.A.tempo.itens} valores={A.tempo_real} mudar={(v) => ajustar((x) => { x.A.tempo_real = v; })} />
          <Tempo titulo={c.A.tempo.pergunta_ideal} itens={c.A.tempo.itens} valores={A.tempo_ideal} mudar={(v) => ajustar((x) => { x.A.tempo_ideal = v; })} />
          <div className="card mb">
            <b>{c.A.numeros.pergunta}</b>
            {[...c.A.numeros.resultado, ...c.A.numeros.imagem].map((n, i) => (
              <label key={n} className="marcar"><input type="checkbox" checked={A.numeros[i]} onChange={(e) => ajustar((x) => { x.A.numeros[i] = e.target.checked; })} /><span>{n}</span></label>
            ))}
          </div>
          {socio && (
            <div className="card mb">
              <b>{c.A.dinheiro.pergunta}</b>
              {c.A.dinheiro.frentes.map((f, i) => (
                <div key={f} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                  <div>{f}</div>
                  <select value={A.dinheiro[i]} onChange={(e) => ajustar((x) => { x.A.dinheiro[i] = Number(e.target.value); })}>
                    <option value={-1} disabled>Escolha</option>
                    {c.A.dinheiro.faixas.map((fx, j) => <option key={fx} value={j}>{fx}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <div className="card mb">
            <b>Quanto você concorda?</b>
            {c.A.afirmacoes.map((a, i) => (
              <div key={a.texto} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                <div>{a.texto}</div>
                <Escala nome={a.texto} valor={A.afirmacoes[i]} mudar={(n) => ajustar((x) => { x.A.afirmacoes[i] = n; })} />
              </div>
            ))}
          </div>
          {c.A.abertas.map((q, i) => (
            <div key={q} className="card mb">
              <label className="rotulo" style={{ marginTop: 0 }}>{q} <span className="mudo">(opcional)</span></label>
              <textarea rows={3} maxLength={1500} value={A.abertas[i]} onChange={(e) => ajustar((x) => { x.A.abertas[i] = e.target.value; })} />
            </div>
          ))}
        </>
      )}

      {passo === 2 && c.B.situacoes.map((s, i) => (
        <div key={s.situacao} className="card mb">
          <b>{i + 1}. {s.situacao}</b>
          {(["E", "S", "C", "A"] as Conduz[]).map((l) => (
            <label key={l} className="marcar"><input type="radio" name={`sit${i}`} checked={r.B.situacoes[i] === l} onChange={() => ajustar((x) => { x.B.situacoes[i] = l; })} /><span>{s.opcoes[l]}</span></label>
          ))}
        </div>
      ))}

      {passo === 3 && (
        <>
          {c.C.itens.map((it, i) => (
            <div key={it.texto} className="card mb">
              <b>{it.texto}</b>
              {it.tipo === "likert" && <Escala nome={it.texto} valor={Number(r.C.itens[i]) + 1 > 0 ? Number(r.C.itens[i]) : 0} mudar={(n) => ajustar((x) => { x.C.itens[i] = n; })} />}
              {it.tipo === "escolha" && it.opcoes?.map((o, j) => (
                <label key={o} className="marcar"><input type="radio" name={`c${i}`} checked={Number(r.C.itens[i]) === j} onChange={() => ajustar((x) => { x.C.itens[i] = j; })} /><span>{o}</span></label>
              ))}
              {it.tipo === "texto" && <textarea rows={3} maxLength={1500} style={{ marginTop: 8 }} placeholder="Opcional" value={String(r.C.itens[i] ?? "")} onChange={(e) => ajustar((x) => { x.C.itens[i] = e.target.value; })} />}
            </div>
          ))}
        </>
      )}

      {passo === 4 && (
        <>
          <div className="card mb">
            <b>Como você se vê em cada habilidade hoje?</b>
            <p className="ajuda" style={{ margin: "4px 0 0" }}>1 é &quot;preciso muito desenvolver&quot; e 5 é &quot;faço muito bem&quot;.</p>
            {c.D.habilidades.map((h, i) => (
              <div key={h.nome} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                <div>{h.nome}</div>
                <div className="chips" style={{ marginTop: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" className={`chip${r.D.notas[i] === n ? " escolhido" : ""}`} aria-pressed={r.D.notas[i] === n} onClick={() => ajustar((x) => { x.D.notas[i] = n; })}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {c.D.abertas.map((q, i) => (
            <div key={q} className="card mb">
              <label className="rotulo" style={{ marginTop: 0 }}>{q} <span className="mudo">(opcional)</span></label>
              <textarea rows={3} maxLength={1500} value={r.D.abertas[i]} onChange={(e) => ajustar((x) => { x.D.abertas[i] = e.target.value; })} />
            </div>
          ))}
        </>
      )}

      {erro && <div className="aviso mb">{erro}</div>}
      <div className="linha" style={{ gap: 10 }}>
        <button className="btn s" type="button" onClick={() => { setPasso(passo - 1); window.scrollTo(0, 0); }}>Voltar</button>
        {passo < 4 ? (
          <button className="btn p" type="button" disabled={pendentes[passo - 1] > 0} onClick={() => { setPasso(passo + 1); window.scrollTo(0, 0); }}>
            {pendentes[passo - 1] ? `Faltam ${pendentes[passo - 1]}` : "Continuar"}
          </button>
        ) : (
          <button className="btn p" type="button" disabled={pendentes[3] > 0 || enviando} onClick={enviar}>
            {pendentes[3] ? `Faltam ${pendentes[3]}` : enviando ? "Enviando…" : "Enviar minhas respostas"}
          </button>
        )}
      </div>
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
          <span className="mudo" style={{ marginLeft: "auto", fontSize: 13 }}>Teste do lojista</span>
        </div>
        <Suspense fallback={<div className="carregando">Carregando…</div>}><Teste /></Suspense>
      </div>
    </div>
  );
}
