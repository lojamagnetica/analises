"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { BASE } from "@/lib/config";
import type { Slide } from "@/lib/conteudo-casa";

// Carrossel tweet: o modelo validado do perfil (kit "template-tweet" do Sistema CCC).
// Medidas do post real, base 360x450, exporta a 3x = 1080x1350. Não mexer nas medidas.
const CSS = `
.tweet-deck{--bg:#faf8f5;--fg:#0f1419;--muted:#536471;--nao:#d93025;--sim:#1a7f37;--tf:"Helvetica Neue",Helvetica,Arial,"Liberation Sans",sans-serif;
  display:flex;flex-wrap:wrap;gap:22px;justify-content:center;background:#e9e6e1;border-radius:14px;padding:20px 12px}
.tweet-deck *{box-sizing:border-box;margin:0;padding:0}
.tweet-deck .cartao{display:flex;flex-direction:column;align-items:center;gap:8px}
.tweet-deck .acoes{font:12px var(--tf);color:#555;display:flex;gap:10px;align-items:center}
.tweet-deck .acoes button{font:600 12px var(--tf);border:1px solid #bbb;background:#fff;border-radius:999px;padding:4px 10px;cursor:pointer}
.tweet-deck .slide{position:relative;width:360px;height:450px;background:var(--bg);overflow:hidden;font-family:var(--tf);color:var(--fg);-webkit-font-smoothing:antialiased;box-shadow:0 6px 24px rgba(0,0,0,.12)}
.tweet-deck .tw{position:absolute;left:32px;right:32px;top:153px;bottom:30px}
.tweet-deck .cab{display:flex;align-items:center;gap:8px}
.tweet-deck .av{width:28px;height:28px;border-radius:50%;object-fit:cover;filter:grayscale(1);flex:0 0 28px;background:#d8d4ce}
.tweet-deck .id{display:flex;flex-direction:column;line-height:1.15}
.tweet-deck .nome{font-size:14px;font-weight:700;color:var(--fg);display:flex;align-items:center;gap:3px}
.tweet-deck .nome svg{width:13px;height:13px;flex:0 0 13px}
.tweet-deck .arroba{font-size:12px;color:var(--muted)}
.tweet-deck .corpo{margin-top:18px;outline:none}
.tweet-deck .hook{font-size:19px;font-weight:400;line-height:1.34;color:var(--fg)}
.tweet-deck .hook + .hook{margin-top:12px}
.tweet-deck .hook b{font-weight:700}
.tweet-deck .tit{font-size:19px;font-weight:700;line-height:1.3;color:var(--fg)}
.tweet-deck .exp{font-size:17px;font-weight:400;line-height:1.38;color:var(--muted);margin-top:20px}
.tweet-deck .par p{position:relative;padding-left:24px;font-size:17px;line-height:1.36}
.tweet-deck .par p::before{position:absolute;left:0;top:1px;width:17px;height:17px;border-radius:50%;color:#fff;font:700 11px/17px var(--tf);text-align:center}
.tweet-deck .par .nao{color:var(--muted)}
.tweet-deck .par .nao::before{content:"✕";background:var(--nao)}
.tweet-deck .par .sim{color:var(--fg);font-weight:700;margin-top:12px}
.tweet-deck .par .sim::before{content:"✓";background:var(--sim)}
.tweet-deck .par + .par{margin-top:20px}
.tweet-deck .estourou{outline:3px solid #d93025;outline-offset:2px}
`;

const SELO = (
  <svg viewBox="0 0 24 24" aria-label="verificado">
    <path fill="#1d9bf0" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" />
    <path fill="#fff" d="M9.99 16.5l-3.6-3.6 1.41-1.42 2.19 2.19 5.25-5.24 1.41 1.41z" />
  </svg>
);

/** **negrito** vira <b>, como no CTA com a palavra-chave. */
function comNegrito(t: string) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
}

type Html2Canvas = (el: HTMLElement, o: Record<string, unknown>) => Promise<HTMLCanvasElement>;
function carregarHtml2canvas(): Promise<Html2Canvas> {
  const w = window as unknown as { html2canvas?: Html2Canvas };
  if (w.html2canvas) return Promise.resolve(w.html2canvas);
  return new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = `${BASE}/vendor/html2canvas.min.js`;
    s.onload = () => (w.html2canvas ? ok(w.html2canvas) : erro(new Error("html2canvas")));
    s.onerror = () => erro(new Error("Não deu para carregar o gerador de imagem."));
    document.head.appendChild(s);
  });
}

export function CarrosselTweet({ slides, nome, arroba, avatar, arquivo }: { slides: Slide[]; nome: string; arroba: string; avatar: string; arquivo: string }) {
  const deck = useRef<HTMLDivElement>(null);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState("");

  // Contorno vermelho quando o texto passa do limite do slide: corte o texto, não diminua a fonte.
  const checar = () => deck.current?.querySelectorAll<HTMLElement>(".slide").forEach((s) => {
    const tw = s.querySelector<HTMLElement>(".tw")!, c = s.querySelector<HTMLElement>(".corpo")!;
    s.classList.toggle("estourou", c.offsetTop + c.scrollHeight > tw.clientHeight + 1);
  });
  useEffect(() => { checar(); const t = setTimeout(checar, 300); return () => clearTimeout(t); });

  async function baixar(i: number) {
    const s = deck.current?.querySelectorAll<HTMLElement>(".slide")[i];
    if (!s) return;
    const h2c = await carregarHtml2canvas();
    const estava = s.classList.contains("estourou");
    s.classList.remove("estourou");
    (document.activeElement as HTMLElement | null)?.blur();
    const cv = await h2c(s, { scale: 3, backgroundColor: "#faf8f5", useCORS: true, logging: false });
    if (estava) s.classList.add("estourou");
    const a = document.createElement("a");
    a.download = `${arquivo}-slide-${i + 1}.png`;
    a.href = cv.toDataURL("image/png");
    a.click();
  }

  async function baixarTodos() {
    setBaixando(true); setErro("");
    try { for (let i = 0; i < slides.length; i++) { await baixar(i); await new Promise((r) => setTimeout(r, 400)); } }
    catch (e) { setErro((e as Error).message); }
    setBaixando(false);
  }

  const cab = (
    <div className="cab">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="av" src={`${BASE}${avatar}`} alt="" />
      <div className="id"><div className="nome">{nome}{SELO}</div><div className="arroba">{arroba}</div></div>
    </div>
  );

  return (
    <div>
      <style>{CSS}</style>
      <div className="linha mb">
        <button type="button" className="btn p" disabled={baixando || !slides.length} onClick={baixarTodos}>{baixando ? "Baixando…" : `Baixar os ${slides.length} slides (PNG 1080×1350)`}</button>
        <span className="ajuda" style={{ margin: 0 }}>Clique no texto do slide para um ajuste rápido antes de baixar. Contorno vermelho: o texto passou do limite, corte o texto.</span>
      </div>
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="tweet-deck" ref={deck} onInput={checar}>
        {slides.map((s, i) => (
          <div className="cartao" key={i + JSON.stringify(s)}>
            <section className="slide">
              <div className="tw">
                {cab}
                <div className="corpo" contentEditable suppressContentEditableWarning>
                  {s.tipo === "hook" && s.texto.split(/\n{2,}/).map((p, j) => <p className="hook" key={j}>{comNegrito(p)}</p>)}
                  {s.tipo === "pratica" && <><p className="tit">{s.titulo}</p><p className="exp">{comNegrito(s.texto)}</p></>}
                  {s.tipo === "par" && s.pares.map((p, j) => <div className="par" key={j}><p className="nao">{p.nao}</p><p className="sim">{p.sim}</p></div>)}
                </div>
              </div>
            </section>
            <div className="acoes"><span>Slide {i + 1}</span><button type="button" onClick={() => baixar(i).catch((e) => setErro(e.message))}>Baixar PNG</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
