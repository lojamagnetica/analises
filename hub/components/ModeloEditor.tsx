"use client";

// Editor de um modelo de card: os campos à esquerda, a prévia ao vivo à direita.
// A arte (cores, logo, letras) não muda; só os textos e a foto.
import { useEffect, useRef, useState } from "react";
import { aplicar, chaveAjuste, gerarImagem, htmlDoModelo, lerAjuste, lerFoto, montarNoFrame, nomeArquivo, posicaoDoModelo, valoresPadrao, type Modelo, type Valores } from "@/lib/modelos";

type Props = {
  modelo: Modelo;
  inicial?: Valores;
  /** Botão principal. Recebe o PNG e os valores (ex.: salvar no post). Sem ele, o botão é "Baixar". */
  aoSalvar?: (png: Blob, valores: Valores) => Promise<void>;
  rotuloSalvar?: string;
  aoFechar?: () => void;
};

export function ModeloEditor({ modelo, inicial, aoSalvar, rotuloSalvar = "Salvar no post", aoFechar }: Props) {
  const [v, setV] = useState<Valores>({ ...valoresPadrao(modelo), ...(inicial ?? {}) });
  const [html, setHtml] = useState("");
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.3);
  const montado = useRef(false);

  useEffect(() => { htmlDoModelo(modelo).then(setHtml).catch((e) => setMsg((e as Error).message)); }, [modelo]);
  useEffect(() => {
    if (!html || !frame.current) return;
    montado.current = false;
    montarNoFrame(frame.current, html, modelo, v).then(() => { montado.current = true; });
  }, [html]); // eslint-disable-line react-hooks/exhaustive-deps
  // Atualiza a prévia a cada letra, sem recarregar o modelo.
  useEffect(() => {
    const d = frame.current?.contentDocument;
    if (montado.current && d) aplicar(d, modelo, v);
  }, [v, modelo]);
  useEffect(() => {
    const ajustar = () => { const w = caixa.current?.clientWidth ?? 320; setEscala(Math.min(w, 420) / modelo.largura); };
    ajustar(); window.addEventListener("resize", ajustar); return () => window.removeEventListener("resize", ajustar);
  }, [modelo.largura]);

  const mudar = (k: string, val: string) => setV((x) => ({ ...x, [k]: val }));
  // Ajustar a foto: mexer para os lados, para cima e para baixo e dar zoom, a partir de onde a arte já deixava.
  const ajuste = (campo: string) => {
    const a = lerAjuste(v, campo);
    if (a) return a;
    const d = frame.current?.contentDocument;
    const p = d ? posicaoDoModelo(d, campo) : { x: 50, y: 50 };
    return { ...p, z: 1 };
  };
  const ajustar = (campo: string, parte: "x" | "y" | "z", n: number) => {
    const a = { ...ajuste(campo), [parte]: n };
    mudar(chaveAjuste(campo), `${a.x},${a.y},${a.z}`);
  };
  const gerar = async () => gerarImagem(modelo, v);
  const salvar = async () => {
    setOcupado(true); setMsg("Gerando a imagem…");
    try {
      const png = await gerar();
      if (aoSalvar) { await aoSalvar(png, v); setMsg("Salvo."); }
      else {
        const a = document.createElement("a"); a.href = URL.createObjectURL(png); a.download = nomeArquivo(modelo); a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000); setMsg("");
      }
    } catch (e) { setMsg((e as Error).message); }
    setOcupado(false);
  };
  const compartilhar = async () => {
    setOcupado(true);
    try {
      const png = await gerar();
      const f = new File([png], nomeArquivo(modelo), { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [f] })) await nav.share({ files: [f] });
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(png); a.download = f.name; a.click(); }
    } catch (e) { if ((e as Error).name !== "AbortError") setMsg((e as Error).message); }
    setOcupado(false);
  };

  return (
    <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 12 }}>
        {modelo.campos.map((c) => (
          <div key={c.chave} style={{ display: "grid", gap: 4 }}>
            <b style={{ fontSize: 13.5 }}>{c.rotulo}</b>
            {c.tipo === "foto" ? (
              <>
                <label className="card" style={{ display: "block", cursor: "pointer", textAlign: "center", padding: 12, borderStyle: v[c.chave] ? "solid" : "dashed" }}>
                  <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setV((x) => { const y = { ...x, [c.chave]: "" }; delete y[chaveAjuste(c.chave)]; return y; }); if (f) mudar(c.chave, await lerFoto(f)); e.target.value = ""; }} />
                  {v[c.chave] ? "✓ Foto escolhida · toque para trocar" : "Toque para escolher a foto"}
                </label>
                {v[c.chave] && (
                  <div style={{ display: "grid", gap: 2, fontSize: 13, padding: "2px 4px" }}>
                    <span className="linha entre"><span>Zoom</span>
                      <span className="linha" style={{ gap: 12 }}>
                        <button type="button" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontSize: 12.5, textDecoration: "underline" }} onClick={() => setV((x) => { const y = { ...x }; delete y[chaveAjuste(c.chave)]; return y; })}>Voltar ao original</button>
                        <button type="button" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontSize: 12.5, textDecoration: "underline", color: "var(--red, #b42318)" }} onClick={() => { if (confirm("Tirar esta foto do card?")) setV((x) => { const y = { ...x, [c.chave]: "" }; delete y[chaveAjuste(c.chave)]; return y; }); }}>Tirar a foto</button>
                      </span>
                    </span>
                    <input type="range" min={1} max={3} step={0.02} value={ajuste(c.chave).z} onChange={(e) => ajustar(c.chave, "z", Number(e.target.value))} />
                    <span>Esquerda ↔ direita</span>
                    <input type="range" min={0} max={100} step={1} value={ajuste(c.chave).x} onChange={(e) => ajustar(c.chave, "x", Number(e.target.value))} />
                    <span>Cima ↕ baixo</span>
                    <input type="range" min={0} max={100} step={1} value={ajuste(c.chave).y} onChange={(e) => ajustar(c.chave, "y", Number(e.target.value))} />
                  </div>
                )}
              </>
            ) : (
              <textarea value={v[c.chave] ?? ""} rows={c.tipo === "linhas" ? 4 : Math.min(4, Math.max(1, (v[c.chave] ?? "").split("\n").length))}
                onChange={(e) => mudar(c.chave, e.target.value)} style={{ width: "100%", font: "inherit", fontSize: 15, padding: 10, borderRadius: 10, border: "1px solid var(--linha, #e5e0d8)", resize: "vertical" }} />
            )}
            {c.tipo === "linhas" && <small className="mudo">Um item por linha.</small>}
          </div>
        ))}
        <small className="mudo">As cores, a logo e as letras ficam iguais às da campanha. Para destacar uma palavra em itálico, escreva entre asteriscos: *você*.</small>
      </div>
      <div ref={caixa} style={{ display: "grid", gap: 10, justifyItems: "center" }}>
        <div style={{ width: modelo.largura * escala, height: modelo.altura * escala, overflow: "hidden", borderRadius: 4, boxShadow: "0 10px 28px rgba(20,18,16,.16)", background: "#eee" }}>
          <iframe ref={frame} title={`Prévia: ${modelo.nome}`} style={{ width: modelo.largura, height: modelo.altura, border: 0, transform: `scale(${escala})`, transformOrigin: "0 0", pointerEvents: "none" }} />
        </div>
        {msg && <div className="aviso" style={{ width: "100%" }}>{msg}</div>}
        <div className="linha" style={{ gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn p" disabled={ocupado || !html} onClick={salvar}>{aoSalvar ? rotuloSalvar : "Baixar imagem"}</button>
          {!aoSalvar && <button type="button" className="btn s" disabled={ocupado || !html} onClick={compartilhar}>Salvar no celular</button>}
          <button type="button" className="btn s" disabled={ocupado} onClick={() => setV({ ...valoresPadrao(modelo), ...(inicial ?? {}) })}>{inicial ? "Desfazer as mudanças" : "Voltar ao texto do modelo"}</button>
          {aoFechar && <button type="button" className="btn s" onClick={aoFechar}>Fechar</button>}
        </div>
      </div>
    </div>
  );
}
