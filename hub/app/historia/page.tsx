"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import {
  EX_VALOR, PERGUNTAS, VALORES, abrirRascunho, chaveGuardada, guardarChave, salvarRascunho, subirFoto,
  type Rascunho, type Respostas, type Valor,
} from "@/lib/historia";

// A história da loja pelo link único do grupo, sem login. Uma pergunta por tela; salva a cada passo.
const PASSOS = ["inicio", ...PERGUNTAS.slice(0, 7).map((p) => p.id), "valores", "futuro", "fotos", "fim"] as const;
type Passo = (typeof PASSOS)[number];
const vazio: Rascunho = { loja: "", nome: "", whatsapp: "", respostas: {}, fotos: [], enviado: false };
const EX = { color: "var(--muted)", fontSize: 13.5, fontStyle: "italic", margin: "6px 0 10px" } as const;

function Formulario() {
  const doLink = useSearchParams().get("t") ?? "";
  const [token, setToken] = useState<string | null>(null);
  const [r, setR] = useState<Rascunho | null>(null);
  const [i, setI] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [previas, setPrevias] = useState<Record<string, string>>({});
  const [subindo, setSubindo] = useState(0);
  const [outro, setOutro] = useState("");
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    document.title = "A história da sua loja · magnética.hub";
    const t = /^[0-9a-f-]{36}$/.test(doLink) ? doLink : chaveGuardada();
    if (!/^[0-9a-f-]{36}$/.test(t)) { setR(vazio); return; }
    abrirRascunho(t).then((x) => {
      if (x) { setToken(t); guardarChave(t); setR({ ...vazio, ...x, respostas: x.respostas ?? {}, fotos: x.fotos ?? [] }); }
      else setR(vazio);
    });
  }, [doLink]);

  if (!r) return <div className="carregando">Carregando…</div>;
  const passo: Passo = PASSOS[i];
  const resp = (x: Partial<Respostas>) => setR({ ...r, respostas: { ...r.respostas, ...x } });
  const valores = r.respostas.valores ?? [];

  /** Salva o que já tem; na primeira vez cria a chave do link. */
  const salvar = async (enviar = false, novo: Rascunho = r) => {
    setErro(""); setSalvando(true);
    try {
      const t = await salvarRascunho(token, novo, enviar);
      setToken(t); guardarChave(t); return t;
    } catch (e) { setErro((e as Error).message); return null; } finally { setSalvando(false); }
  };
  const ir = async (n: number) => { if (await salvar()) { setI(n); window.scrollTo(0, 0); } };

  if (pronto) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40 }}>💛</div>
        <h2 style={{ margin: "8px 0" }}>Obrigada{r.nome.trim() ? `, ${r.nome.trim().split(" ")[0]}` : ""}!</h2>
        <p className="mudo" style={{ margin: 0 }}>A história da {r.loja || "sua loja"} chegou para a Camilla. Se lembrar de mais alguma coisa ou quiser trocar uma foto, é só abrir este mesmo link de novo neste celular.</p>
      </div>
    );
  }

  const barra = (
    <div className="mb" style={{ display: "flex", gap: 4 }} aria-label={`Passo ${i + 1} de ${PASSOS.length}`}>
      {PASSOS.map((_, k) => <div key={k} style={{ flex: 1, height: 5, borderRadius: 3, background: k <= i ? "var(--red)" : "var(--line)" }} />)}
    </div>
  );
  const botoes = (podeIr: boolean, ultimo?: React.ReactNode) => (
    <>
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha entre mt" style={{ gap: 8 }}>
        {i > 0 ? <button type="button" className="btn s" disabled={salvando} onClick={() => ir(i - 1)}>Voltar</button> : <span />}
        {ultimo ?? <button type="button" className="btn p" disabled={!podeIr || salvando} onClick={() => ir(i + 1)}>{salvando ? "Salvando…" : "Continuar"}</button>}
      </div>
    </>
  );

  if (passo === "inicio") {
    const ok = r.loja.trim().length > 1 && r.nome.trim().length > 1;
    return (
      <>
        {barra}
        <div className="card">
          <h1 style={{ margin: "0 0 8px" }}>A história da sua loja</h1>
          <p style={{ marginTop: 0 }}>A sua loja tem uma história incrível, e ela vira ferramenta de trabalho:</p>
          <ul style={{ marginTop: 0, paddingLeft: 20 }}>
            <li>no Instagram: a bio, o destaque &quot;Nossa história&quot; e vídeos que criam conexão com a cliente;</li>
            <li>na equipe: é com ela que cada pessoa nova conhece a loja no primeiro dia;</li>
            <li>nos materiais que você vai receber nos próximos dias, que são montados a partir dela.</li>
          </ul>
          <p className="mudo" style={{ marginTop: 0 }}>São 9 perguntas e um espaço para fotos. Leva uns 20 minutos. Escreva do seu jeito, como se estivesse contando para alguém de confiança. Tudo fica salvo: dá para parar e continuar depois neste mesmo celular.</p>
          <label className="ajuda" style={{ display: "block" }}>Nome da loja<input type="text" value={r.loja} onChange={(e) => setR({ ...r, loja: e.target.value })} autoComplete="organization" /></label>
          <label className="ajuda" style={{ display: "block" }}>Seu nome<input type="text" value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} autoComplete="name" /></label>
          <label className="ajuda" style={{ display: "block" }}>Seu WhatsApp<input type="text" inputMode="tel" value={r.whatsapp} onChange={(e) => setR({ ...r, whatsapp: e.target.value })} autoComplete="tel" placeholder="(00) 00000-0000" /></label>
          {botoes(ok, <button type="button" className="btn p" disabled={!ok || salvando} onClick={() => ir(1)}>{salvando ? "Salvando…" : "Começar"}</button>)}
        </div>
      </>
    );
  }

  if (passo === "valores") {
    const marcado = (n: string) => valores.some((v) => v.nome === n);
    const trocar = (n: string) => resp({ valores: marcado(n) ? valores.filter((v) => v.nome !== n) : valores.length >= 5 ? valores : [...valores, { nome: n, como: "" }] });
    const como = (n: string, t: string) => resp({ valores: valores.map((v) => (v.nome === n ? { ...v, como: t } : v)) });
    const extras = valores.filter((v) => !VALORES.includes(v.nome)).map((v) => v.nome);
    return (
      <>
        {barra}
        <div className="card">
          <small className="mudo">Pergunta 8 de 9</small>
          <h2 style={{ margin: "4px 0" }}>Os valores da loja</h2>
          <p className="mudo" style={{ margin: 0 }}>Escolha de 3 a 5 e diga como cada um aparece no dia a dia.</p>
          <p style={EX}>Ex.: {EX_VALOR}</p>
          <div className="chips mb">
            {[...VALORES, ...extras].map((n) => (
              <button key={n} type="button" className={`chip${marcado(n) ? " escolhido" : ""}`} aria-pressed={marcado(n)} onClick={() => trocar(n)}>{marcado(n) ? "✓ " : ""}{n}</button>
            ))}
          </div>
          {valores.length < 5 && (
            <div className="linha mb" style={{ gap: 8 }}>
              <input type="text" placeholder="Outro valor" value={outro} onChange={(e) => setOutro(e.target.value)} style={{ flex: 1, margin: 0 }} />
              <button type="button" className="btn s peq" disabled={!outro.trim() || marcado(outro.trim())} onClick={() => { trocar(outro.trim()); setOutro(""); }}>Incluir</button>
            </div>
          )}
          {valores.map((v: Valor) => (
            <label key={v.nome} className="ajuda" style={{ display: "block" }}><b>{v.nome}</b>: como aparece no dia a dia?
              <textarea rows={2} value={v.como} onChange={(e) => como(v.nome, e.target.value)} />
            </label>
          ))}
          {botoes(valores.length >= 1)}
        </div>
      </>
    );
  }

  if (passo === "fotos") {
    const mudarFoto = (c: string, x: { ano?: string; legenda?: string }) => setR({ ...r, fotos: r.fotos.map((f) => (f.caminho === c ? { ...f, ...x } : f)) });
    return (
      <>
        {barra}
        <div className="card">
          <h2 style={{ margin: "0 0 4px" }}>Fotos da sua história</h2>
          <p className="mudo" style={{ margin: 0 }}>O começo, a primeira fachada, as mudanças, a equipe, momentos especiais. Em cada uma, coloque o ano e uma frase. Até 20 fotos.</p>
          <p style={EX}>Ex.: 2012: a primeira salinha, ainda sem placa.</p>
          <p className="ajuda" style={{ marginTop: 0 }}>Suba só fotos que você tem autorização para usar (principalmente se aparecem outras pessoas).</p>
          {r.fotos.map((f) => (
            <div key={f.caminho} className="linha mb" style={{ gap: 10, alignItems: "flex-start", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              {previas[f.caminho]
                ? <img src={previas[f.caminho]} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
                : <div style={{ width: 72, height: 72, borderRadius: 10, background: "var(--soft)", display: "grid", placeItems: "center", flexShrink: 0 }}>📷</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <input type="text" inputMode="numeric" placeholder="Ano (ex.: 2012)" value={f.ano} onChange={(e) => mudarFoto(f.caminho, { ano: e.target.value.slice(0, 10) })} style={{ marginTop: 0 }} />
                <input type="text" placeholder="Uma frase sobre a foto" value={f.legenda} onChange={(e) => mudarFoto(f.caminho, { legenda: e.target.value.slice(0, 200) })} />
                <button type="button" className="link-loja" style={{ color: "var(--red)", fontSize: 13 }} onClick={() => {
                  if (confirm("Tirar esta foto da sua história?")) { const novo = { ...r, fotos: r.fotos.filter((x) => x.caminho !== f.caminho) }; setR(novo); salvar(false, novo); }
                }}>Tirar foto</button>
              </div>
            </div>
          ))}
          {r.fotos.length < 20 && (
            <label className="btn s" style={{ cursor: "pointer", display: "inline-block" }}>
              {subindo ? `Subindo ${subindo} foto${subindo > 1 ? "s" : ""}…` : "+ Escolher fotos"}
              <input type="file" accept="image/*" multiple hidden disabled={!!subindo} onChange={async (e) => {
                const lista = [...(e.target.files ?? [])].slice(0, 20 - r.fotos.length);
                e.target.value = "";
                const t = token ?? (await salvar());
                if (!t || !lista.length) return;
                setSubindo(lista.length); setErro("");
                const novas = [...r.fotos];
                const pv = { ...previas };
                for (const f of lista) {
                  try { const c = await subirFoto(t, f); novas.push({ caminho: c, ano: "", legenda: "" }); pv[c] = URL.createObjectURL(f); }
                  catch (x) { setErro((x as Error).message); }
                  setSubindo((n) => n - 1);
                }
                const novo = { ...r, fotos: novas };
                setPrevias(pv); setR(novo); salvar(false, novo);
              }} />
            </label>
          )}
          {botoes(!subindo)}
        </div>
      </>
    );
  }

  if (passo === "fim") {
    const respondidas = PERGUNTAS.filter((p) => r.respostas[p.id]?.trim()).length + (valores.length ? 1 : 0);
    return (
      <>
        {barra}
        <div className="card">
          <h2 style={{ margin: "0 0 6px" }}>Tudo pronto?</h2>
          <p style={{ marginTop: 0 }}>Você respondeu {respondidas} de 9 perguntas e subiu {r.fotos.length} foto{r.fotos.length === 1 ? "" : "s"}.</p>
          {respondidas < 9 && <p className="mudo">Pode enviar assim mesmo. Se quiser completar, é só voltar.</p>}
          {botoes(true, <button type="button" className="btn p" disabled={salvando} onClick={async () => { if (await salvar(true)) setPronto(true); }}>{salvando ? "Enviando…" : "Enviar minha história"}</button>)}
        </div>
      </>
    );
  }

  const p = PERGUNTAS.find((x) => x.id === passo)!;
  const n = passo === "futuro" ? 9 : PERGUNTAS.indexOf(p) + 1;
  return (
    <>
      {barra}
      <div className="card">
        <small className="mudo">Pergunta {n} de 9</small>
        <h2 style={{ margin: "4px 0" }}>{p.pergunta}</h2>
        {p.sub && <p className="mudo" style={{ margin: 0 }}>{p.sub}</p>}
        <p style={EX}>Ex.: {p.ex}</p>
        <textarea rows={7} value={r.respostas[p.id] ?? ""} onChange={(e) => resp({ [p.id]: e.target.value })} placeholder="Escreva aqui do seu jeito…" />
        {botoes(true)}
      </div>
    </>
  );
}

export default function Pagina() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px max(16px, env(safe-area-inset-left, 0px)) 48px" }}>
        <div className="linha mb" style={{ gap: 10 }}>
          <div className="logo"><Simbolo /></div>
          <b className="marca-nome" style={{ fontSize: 20 }}>magnética<span>.hub</span></b>
        </div>
        <Suspense fallback={<div className="carregando">Carregando…</div>}><Formulario /></Suspense>
      </div>
    </div>
  );
}
