"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { ModeloEditor } from "@/components/ModeloEditor";
import { apagarModelo, listarModelos, subirModelo, type Modelo } from "@/lib/modelos";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia } from "@/lib/formato";
import {
  baixarCanvas, buscarModelos, buscarMontador, carregarFontes, compartilharCanvas, desenhar, lerImagem,
  type Dados, type Formato, type Foto, type Identidade, type ModeloMes, type SlideModelo,
} from "@/lib/montador";

const FORMATOS: { id: Formato; rotulo: string }[] = [
  { id: "dupla", rotulo: "Separei pra você" },
  { id: "look", rotulo: "Look do encontro" },
  { id: "capa", rotulo: "Capa de carrossel" },
  { id: "story", rotulo: "Stories" },
  { id: "tweet", rotulo: "Frase da semana" },
  { id: "live", rotulo: "Live · convite" },
  { id: "celular", rotulo: "Moldura de celular" },
];
const fotoVazia = (altura = 10): Foto => ({ img: null, zoom: 100, altura });
type Slide = SlideModelo & { foto: Foto; foto2: Foto };
// Formatos em que o campo de baixo guarda itens separados por "|".
const COM_ITENS: Formato[] = ["quiz", "manchete", "comparar", "roteiro", "passos", "motivo"];
const DUAS_FOTOS: Formato[] = ["comparar", "tendencia"];

function Ajuste({ foto, mudar }: { foto: Foto; mudar: (f: Foto) => void }) {
  return (
    <div style={{ display: "grid", gap: 4, margin: "6px 0 2px" }}>
      <label className="linha" style={{ gap: 8, fontSize: 12.5, flexWrap: "nowrap" }}><span className="mudo" style={{ width: 46 }}>Zoom</span>
        <input type="range" min={100} max={220} value={foto.zoom} onChange={(e) => mudar({ ...foto, zoom: Number(e.target.value) })} style={{ flex: 1 }} /></label>
      <label className="linha" style={{ gap: 8, fontSize: 12.5, flexWrap: "nowrap" }}><span className="mudo" style={{ width: 46 }}>Altura</span>
        <input type="range" min={0} max={100} value={foto.altura} onChange={(e) => mudar({ ...foto, altura: Number(e.target.value) })} style={{ flex: 1 }} /></label>
    </div>
  );
}

function Subir({ rotulo, foto, mudar }: { rotulo: string; foto: Foto; mudar: (f: Foto) => void }) {
  return (
    <>
      <label className="card" style={{ display: "block", cursor: "pointer", textAlign: "center", padding: 12, borderStyle: foto.img ? "solid" : "dashed", background: foto.img ? "var(--accent-soft)" : "var(--soft)" }}>
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) mudar({ ...foto, img: await lerImagem(f) }); e.target.value = ""; }} />
        {foto.img ? `✓ ${rotulo} · trocar` : `${rotulo} · toque para subir`}
      </label>
      {foto.img && <Ajuste foto={foto} mudar={mudar} />}
    </>
  );
}

// Miniatura de um slide do modelo, para ver o carrossel inteiro de uma vez.
function Miniatura({ slide, id, cta, fontes, tick }: { slide: Slide; id: Identidade; cta: string; fontes: boolean; tick: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) desenhar(ref.current, slide.tipo, { kic: slide.kic, tit: slide.tit, pre: slide.pre, cta, f1: slide.foto, f2: slide.foto2 }, id);
  }, [slide, id, cta, fontes, tick]);
  return <canvas ref={ref} style={{ width: 84, height: "auto", display: "block", borderRadius: 4, boxShadow: "0 2px 6px rgba(20,18,16,.15)" }} />;
}

function Montar({ id, modelos }: { id: Identidade; modelos: ModeloMes[] }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [fontes, setFontes] = useState(false);
  // a imagem do canto (símbolo da campanha) chega depois: desenha de novo quando carregar
  const [tick, setTick] = useState(0);
  useEffect(() => { const f = () => setTick((t) => t + 1); window.addEventListener("montador-imagem", f); return () => window.removeEventListener("montador-imagem", f); }, []);
  const [formato, setFormato] = useState<Formato>("dupla");
  const [modelo, setModelo] = useState<ModeloMes | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [atual, setAtual] = useState(0);
  const [f1, setF1] = useState<Foto>(fotoVazia(10));
  const [f2, setF2] = useState<Foto>(fotoVazia(50));
  const semanas = id.semanas ?? [];
  const [tit, setTit] = useState(semanas[0]?.titulo ?? id.frase ?? "");
  const [kic, setKic] = useState(id.linha_de_cima?.dupla ?? "");
  const [pre, setPre] = useState(id.precos_exemplo ?? "");
  const [cta, setCta] = useState(id.chamada ?? "");

  useEffect(() => { carregarFontes().then(() => setFontes(true)); }, []);

  const slide = modelo ? slides[atual] : null;
  const formatoAtual: Formato = slide ? slide.tipo : formato;
  const dados: Dados = slide
    ? { kic: slide.kic, tit: slide.tit, pre: slide.pre, cta, f1: slide.foto, f2: slide.foto2 }
    : { kic, tit, pre, cta, f1, f2 };

  useEffect(() => { if (cv.current) desenhar(cv.current, formatoAtual, dados, id); });

  const usarModelo = (m: ModeloMes) => {
    const lista = (m.slides ?? []).map((s) => ({ ...s, foto: fotoVazia(10), foto2: fotoVazia(10) }));
    setModelo(m); setSlides(lista);
    setAtual(Math.max(0, lista.findIndex((s) => s.tipo !== "capa")));
    document.getElementById("montar")?.scrollIntoView({ behavior: "smooth" });
  };
  const mudarSlide = (n: Partial<Slide>) => setSlides(slides.map((s, i) => (i === atual ? { ...s, ...n } : s)));
  const escolherFormato = (f: Formato) => {
    setModelo(null); setFormato(f);
    setKic(f === "dupla" ? id.linha_de_cima?.dupla ?? "" : f === "capa" ? id.linha_de_cima?.capa ?? id.linha_de_cima?.outros ?? "" : id.linha_de_cima?.outros ?? "");
    if (f === "tweet") { setKic(""); setTit("*Comece com a parte forte.* E termine a frase aqui."); setPre(id.perfil?.assinatura ?? ""); return; }
    if (f === "live") { setKic("Live · quarta · à noite"); setTit("O tema da live de hoje"); setPre("O que você vai mostrar, ao vivo."); return; }
    if (f === "celular") { setKic("Uma das peças da live"); setTit("Preço só na live"); setPre("Peça única. Quem pedir primeiro na live, leva."); return; }
    if (f === "capa") { setTit(id.frase ?? tit); setPre(id.rodape ?? ""); } else if (pre === id.rodape) setPre(id.precos_exemplo ?? "");
  };
  const nome = () => `montador-${modelo ? `slide-${atual + 1}` : formato}.png`;
  const baixarTodos = async () => {
    if (!cv.current || !modelo) return;
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      desenhar(cv.current, s.tipo, { kic: s.kic, tit: s.tit, pre: s.pre, cta, f1: s.foto, f2: s.foto2 }, id);
      await baixarCanvas(cv.current, `montador-slide-${i + 1}.png`);
      await new Promise((r) => setTimeout(r, 400));
    }
    desenhar(cv.current, formatoAtual, dados, id);
  };

  return (
    <>
      {modelos.length > 0 && (
        <div className="card mb">
          <div className="linha entre"><b>Modelos do mês · {modelos[0].segmento}</b>{modelos.some((m) => !m.liberado) && <span className="selo espera">Rascunho: só a equipe vê</span>}</div>
          <p className="mudo" style={{ margin: "4px 0 12px" }}>Os formatos de carrossel que mais performaram nos últimos 30 dias. Toque em &quot;Usar no montador&quot; para abrir já no formato.</p>
          <div className="grade g3">
            {modelos.map((m) => (
              <div key={m.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 6, borderColor: modelo?.id === m.id ? "var(--accent)" : undefined }}>
                <small style={{ color: "var(--accent)", fontWeight: 700, letterSpacing: ".06em" }}>MODELO {m.ordem}</small>
                <b>{m.nome}</b>
                {m.descricao && <p style={{ margin: 0, fontSize: 14 }}>{m.descricao}</p>}
                {m.referencia_url && (
                  <small className="mudo">Referência: <a href={m.referencia_url} target="_blank" rel="noopener noreferrer">{m.referencia_perfil ?? "post"}{m.referencia_data ? ` · ${dia(m.referencia_data)}` : ""}</a>
                    {m.curtidas ? ` · ${m.curtidas.toLocaleString("pt-BR")} curtidas` : ""}{m.comentarios ? ` · ${m.comentarios} comentários` : ""}</small>
                )}
                <ol style={{ margin: "2px 0 6px", paddingLeft: 18, fontSize: 13.5 }}>{(m.slides ?? []).map((s, i) => <li key={i}>{s.dica ?? s.tit}</li>)}</ol>
                <button type="button" className="btn p peq" style={{ marginTop: "auto" }} onClick={() => usarModelo(m)}>Usar no montador</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="montar" className="card mb">
        <div className="linha entre"><b>Montar</b><span className="selo andamento">{modelo ? `Carrossel · ${modelo.nome}` : FORMATOS.find((f) => f.id === formato)?.rotulo}</span></div>
        <div className="grade g2 mt" style={{ alignItems: "start", gridTemplateColumns: "minmax(260px, 360px) 1fr" }}>
          <div>
            <small className="mudo">Formato</small>
            <div className="chips" style={{ margin: "6px 0 12px" }}>
              {FORMATOS.map((f) => (
                <button key={f.id} type="button" className={`chip ${!modelo && formato === f.id ? "escolhido" : ""}`} onClick={() => escolherFormato(f.id)}>{f.rotulo}</button>
              ))}
            </div>

            <small className="mudo">Fotos</small>
            <div style={{ margin: "6px 0 12px" }}>
              {slide ? (
                <>
                  <Subir rotulo={DUAS_FOTOS.includes(slide.tipo) ? "Foto da esquerda" : slide.tipo === "celular" ? `Foto da peça · slide ${atual + 1} (vai na tela do celular)` : slide.tipo === "live" || slide.tipo === "motivo" ? `Slide ${atual + 1} não usa foto` : `Foto do slide ${atual + 1}`} foto={slide.foto} mudar={(f) => mudarSlide({ foto: f })} />
                  {DUAS_FOTOS.includes(slide.tipo) && <div style={{ marginTop: 8 }}><Subir rotulo="Foto da direita" foto={slide.foto2} mudar={(f) => mudarSlide({ foto2: f })} /></div>}
                </>
              ) : (
                <>
                  <Subir rotulo={formato === "capa" ? "Foto da capa" : formato === "celular" ? "Foto da peça (vai na tela do celular)" : formato === "live" ? "Este formato não usa foto" : "Foto 1 · o look no corpo"} foto={f1} mudar={setF1} />
                  {formato === "dupla" && <div style={{ marginTop: 8 }}><Subir rotulo="Foto 2 · a peça" foto={f2} mudar={setF2} /></div>}
                </>
              )}
            </div>

            <small className="mudo">Textos</small>
            {semanas.length > 0 && (
              <select className="mt" style={{ width: "100%" }} defaultValue="" onChange={(e) => { if (!e.target.value) return; if (slide) mudarSlide({ tit: e.target.value }); else setTit(e.target.value); }}>
                <option value="">Escolher a semana…</option>
                {semanas.map((s) => <option key={s.rotulo} value={s.titulo}>{s.rotulo}</option>)}
                {id.frase && <option value={id.frase}>Frase da campanha</option>}
              </select>
            )}
            <label className="rotulo">{formatoAtual === "tweet" ? "Frase (o que estiver entre *asteriscos* sai em negrito)" : formatoAtual === "celular" ? "Etiqueta na tela do celular" : "Título"}</label><input type="text" value={slide ? slide.tit : tit} onChange={(e) => (slide ? mudarSlide({ tit: e.target.value }) : setTit(e.target.value))} />
            <label className="rotulo">{formatoAtual === "tweet" ? "Nome · @perfil (em branco usa o da loja)" : formatoAtual === "celular" ? "Frase em cima do celular" : formatoAtual === "live" || formatoAtual === "motivo" ? "Linha ao vivo (dia e horário)" : "Linha de cima"}</label><input type="text" value={slide ? slide.kic : kic} onChange={(e) => (slide ? mudarSlide({ kic: e.target.value }) : setKic(e.target.value))} />
            <label className="rotulo">{formatoAtual === "capa" ? "Rodapé" : formatoAtual === "motivo" ? "Itens (separe com | ; a chamada final começa com →)" : COM_ITENS.includes(formatoAtual) ? "Itens (separe com | )" : formatoAtual === "celular" ? "Recado embaixo do celular" : formatoAtual === "live" ? "Texto de apoio" : "Peças e preços"}</label><input type="text" value={slide ? slide.pre : pre} onChange={(e) => (slide ? mudarSlide({ pre: e.target.value }) : setPre(e.target.value))} />
            {formatoAtual === "story" && <><label className="rotulo">Chamada</label><input type="text" value={cta} onChange={(e) => setCta(e.target.value)} /></>}
            {id.aviso && <div className="ajuda mt">{id.aviso}</div>}
          </div>

          <div style={{ background: "var(--soft)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {modelo && (
              <div style={{ width: "100%" }}>
                <small className="mudo">Os slides do carrossel · toque em um para montar</small>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "6px 2px 4px" }}>
                  {slides.map((s, i) => (
                    <button key={i} type="button" aria-label={`Slide ${i + 1}`} onClick={() => setAtual(i)}
                      style={{ flex: "0 0 auto", padding: 0, border: `2px solid ${i === atual ? "var(--accent)" : "transparent"}`, borderRadius: 6, background: "none", cursor: "pointer", position: "relative" }}>
                      <Miniatura slide={s} id={id} cta={cta} fontes={fontes} tick={tick} />
                      <span style={{ position: "absolute", top: 3, left: 5, fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>{i + 1}{s.foto.img ? " ✓" : ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!fontes && <small className="mudo">Carregando as letras…</small>}
            <canvas ref={cv} aria-label="Imagem montada" width={1080} height={1350} style={{ width: "100%", maxWidth: 420, height: "auto", boxShadow: "0 10px 28px rgba(20,18,16,.16)", borderRadius: 2 }} />
            <div className="linha" style={{ gap: 8, justifyContent: "center" }}>
              <button type="button" className="btn p" onClick={() => cv.current && baixarCanvas(cv.current, nome())}>Baixar imagem</button>
              {modelo && <button type="button" className="btn s" onClick={baixarTodos}>Baixar todos os slides</button>}
              <button type="button" className="btn s" onClick={() => cv.current && compartilharCanvas(cv.current, nome())}>Compartilhar</button>
            </div>
          </div>
        </div>
      </div>

      {(id.fotos?.length || id.prompts?.length) ? (
        <div className="card mb">
          <b>Como fazer</b>
          {id.fotos && id.fotos.length > 0 && (
            <details className="mt" open><summary>As fotos que você tira</summary><ol style={{ paddingLeft: 18 }}>{id.fotos.map((f) => <li key={f}>{f}</li>)}</ol></details>
          )}
          {(id.prompts ?? []).map((p) => (
            <details key={p.nome} className="mt"><summary>{p.nome}</summary>
              <div className="linha entre mt"><small className="mudo">Cole no Gemini junto com as fotos</small><Copiar texto={p.texto} rotulo="Copiar prompt" /></div>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, background: "var(--soft)", padding: 12, borderRadius: 12 }}>{p.texto}</pre>
            </details>
          ))}
          {id.cenarios && <p className="mudo mt" style={{ fontSize: 13.5 }}><b>Cenários da semana:</b> {id.cenarios}</p>}
        </div>
      ) : null}
    </>
  );
}

/** Modelos da campanha: os cards de série (lives, convites) prontos para trocar o texto e baixar. */
function ModelosDaCampanha({ portalId, equipe }: { portalId: string; equipe: boolean }) {
  const [lista, setLista] = useState<Modelo[] | null>(null);
  const [aberto, setAberto] = useState<Modelo | null>(null);
  const [msg, setMsg] = useState("");
  const carregar = () => listarModelos(portalId).then(setLista).catch((e) => setMsg((e as Error).message));
  useEffect(() => { carregar(); }, [portalId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lista || (!lista.length && !equipe)) return null;
  const grupos = Array.from(new Set(lista.map((m) => m.grupo || "Modelos")));
  const subir = async (f?: File) => {
    if (!f) return; setMsg("Subindo o modelo…");
    try { await subirModelo(portalId, f); setMsg(""); carregar(); } catch (e) { setMsg((e as Error).message); }
  };
  const apagar = async (m: Modelo) => {
    if (!confirm(`Excluir o modelo "${m.nome}"? Os cards que já estão nos posts continuam lá, mas não dá mais para editar.`)) return;
    try { await apagarModelo(m); if (aberto?.id === m.id) setAberto(null); carregar(); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <div className="card mb">
      <h2 style={{ margin: 0 }}>Modelos da campanha</h2>
      <p className="mudo" style={{ fontSize: 14, margin: "4px 0 10px" }}>Os cards da sua série, prontos: escolha um, troque o texto (e a foto, quando tiver) e baixe. As cores, a logo e as letras ficam as da campanha.</p>
      {msg && <div className="aviso">{msg}</div>}
      {grupos.map((g) => (
        <div key={g} className="mt">
          <small className="mudo" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>{g}</small>
          <div className="chips mt">
            {lista.filter((m) => (m.grupo || "Modelos") === g).map((m) => (
              <span key={m.id} className="linha" style={{ gap: 4 }}>
                <button type="button" className={`chip${aberto?.id === m.id ? " escolhido" : ""}`} onClick={() => setAberto(aberto?.id === m.id ? null : m)}>{m.nome}</button>
                {equipe && <button type="button" className="link-loja" style={{ fontSize: 12 }} onClick={() => apagar(m)} aria-label={`Excluir ${m.nome}`}>excluir</button>}
              </span>
            ))}
          </div>
        </div>
      ))}
      {aberto && <div className="mt"><ModeloEditor key={aberto.id} modelo={aberto} aoFechar={() => setAberto(null)} /></div>}
      {equipe && (
        <label className="btn s peq mt" style={{ display: "inline-block", cursor: "pointer" }}>
          Subir modelo (.html)
          <input type="file" accept=".html,text/html" hidden onChange={(e) => { subir(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      )}
    </div>
  );
}

export default function MontadorColecao() {
  const { portal, pers, equipe } = usePortal();
  const segmento = (pers.get(1)?.respostas?.segmento as string | undefined) ?? null;
  const { dados } = useDados(async () => {
    const [mont, modelos] = await Promise.all([buscarMontador(portal.id, equipe), buscarModelos(segmento, equipe)]);
    return { mont, modelos };
  }, [portal.id, equipe, segmento]);
  if (!dados) return <Carregando />;
  const { mont, modelos } = dados;

  return (
    <>
      <Titulo titulo={mont ? `Montador de carrossel · ${mont.colecao}` : "Montador de carrossel"} sub="Suba a foto que você fez com IA e baixe a imagem pronta, com as letras e as cores da sua campanha." />
      <ModelosDaCampanha portalId={portal.id} equipe={equipe} />
      {!mont ? (
        <div className="card">
          <p style={{ margin: 0 }}>Quando a próxima campanha estiver pronta, o montador da sua coleção aparece aqui.</p>
          <p className="mudo" style={{ margin: "6px 0 0" }}>Enquanto isso, a <Link href="/conteudo/semana">programação da semana</Link> continua com os seus posts.</p>
        </div>
      ) : (
        <>
          {equipe && !mont.liberado && <div className="aviso mb">Rascunho: a loja ainda não vê o montador. Libere quando revisar.</div>}
          <Montar id={mont.identidade} modelos={modelos} />
        </>
      )}
    </>
  );
}
