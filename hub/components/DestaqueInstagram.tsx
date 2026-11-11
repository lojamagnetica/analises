"use client";

import { useEffect, useRef, useState } from "react";
import { urlFotoMarca } from "@/lib/marcas";

// Imagem do destaque absoluto do mês para postar no Instagram (1080x1350), no estilo do crachá de boas-vindas.
// Sem valor de prêmio: só o título, o nome, a loja, o mês e o troféu.
const C = { noite: "#0B1A3A", ferrugem: "#BC4914", ambar: "#E08A3C", off: "#F5F0EA", areia: "#E6DCD0" };
const FONTES = "https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,300;0,400;0,600;0,800;1,800&family=Outfit:wght@400&display=swap";
const MESES = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

type Pessoa = { id: string; nome: string; loja: string | null; foto: string | null };

function ima(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cor: string) {
  ctx.save(); ctx.translate(x - s / 2, y - s / 2); ctx.scale(s / 100, s / 100);
  ctx.strokeStyle = cor; ctx.lineWidth = 14;
  ctx.stroke(new Path2D("M47 26 H38 A24 24 0 0 0 38 74 H47"));
  ctx.stroke(new Path2D("M53 26 H62 A24 24 0 0 1 62 74 H53"));
  ctx.restore();
}
const espaco = (ctx: CanvasRenderingContext2D, px: number) => { if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`; };

function desenhar(ctx: CanvasRenderingContext2D, nome: string, loja: string, mesAno: string, foto: HTMLImageElement | null) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); espaco(ctx, 0); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.areia; ctx.fillRect(0, 0, 1080, 1350);
  // fita com os ímãs e a presilha
  ctx.fillStyle = C.ferrugem; ctx.fillRect(492, 0, 96, 330);
  for (let i = 0; i < 5; i++) ima(ctx, 540, 50 + i * 62, 60, C.off);
  ctx.fillStyle = "#8E827B"; ctx.beginPath(); ctx.roundRect(518, 322, 44, 58, 8); ctx.fill();
  // cartão levemente inclinado
  ctx.save(); ctx.translate(540, 810); ctx.rotate((-2 * Math.PI) / 180); ctx.translate(-390, -480);
  ctx.shadowColor = "rgba(11,26,58,.3)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 28;
  ctx.fillStyle = C.noite; ctx.beginPath(); ctx.roundRect(0, 0, 780, 960, 44); ctx.fill(); ctx.shadowColor = "transparent";
  ctx.fillStyle = C.areia; ctx.beginPath(); ctx.roundRect(335, 28, 110, 20, 10); ctx.fill();
  ima(ctx, 100, 104, 84, C.off);
  ctx.fillStyle = C.off; ctx.font = "400 56px Outfit, sans-serif"; ctx.textBaseline = "middle"; espaco(ctx, -2); ctx.fillText("magnética", 150, 106); espaco(ctx, 0); ctx.textBaseline = "alphabetic";
  // foto grande em círculo
  const cx = 390, cy = 340, r = 165;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#2A3757"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (foto) { const s = Math.max((r * 2) / foto.width, (r * 2) / foto.height); ctx.drawImage(foto, cx - (foto.width * s) / 2, cy - (foto.height * s) / 2, foto.width * s, foto.height * s); }
  else { ctx.fillStyle = C.ambar; ctx.font = "800 180px Archivo, sans-serif"; ctx.textAlign = "center"; ctx.fillText((nome[0] ?? "?").toUpperCase(), cx, cy + 62); ctx.textAlign = "left"; }
  ctx.restore();
  ctx.strokeStyle = C.ambar; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  // textos
  ctx.textAlign = "center";
  ctx.fillStyle = C.ambar; ctx.font = "800 34px Archivo, sans-serif"; espaco(ctx, 10); ctx.fillText("DESTAQUE ABSOLUTO", 390 + 5, 576);
  espaco(ctx, -1); ctx.fillStyle = C.off; ctx.font = "800 96px Archivo, sans-serif";
  let tam = 96; while (ctx.measureText(nome).width > 700 && tam > 48) { tam -= 4; ctx.font = `800 ${tam}px Archivo, sans-serif`; }
  ctx.fillText(nome, 390, 672);
  espaco(ctx, 0); ctx.fillStyle = "#C9BFB4"; ctx.font = "400 44px Archivo, sans-serif"; ctx.fillText(loja, 390, 736);
  ctx.fillStyle = C.ambar; ctx.font = "600 34px Archivo, sans-serif"; espaco(ctx, 8); ctx.fillText(mesAno, 390 + 4, 792); espaco(ctx, 0);
  ctx.font = "110px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; ctx.fillStyle = C.off; ctx.fillText("🏆", 390, 912);
  ctx.restore();
}

/** Escolhe a pessoa e o mês, vê a prévia e baixa o PNG para postar no Instagram. */
export function DestaqueInstagram({ pessoas, sugerida }: { pessoas: Pessoa[]; sugerida?: string }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const hojeData = new Date();
  const [pessoaId, setPessoaId] = useState(sugerida ?? pessoas[0]?.id ?? "");
  const [mes, setMes] = useState(String(hojeData.getMonth() + 1).padStart(2, "0"));
  const [ano, setAno] = useState(String(hojeData.getFullYear()));
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [fontes, setFontes] = useState(false);
  const p = pessoas.find((x) => x.id === pessoaId) ?? null;

  useEffect(() => {
    if (!document.querySelector(`link[href="${FONTES}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONTES; document.head.appendChild(l); }
    Promise.all(["400 56px Outfit", "800 96px Archivo", "400 44px Archivo", "600 34px Archivo"].map((f) => document.fonts.load(f).catch(() => null))).then(() => setFontes(true));
  }, []);
  useEffect(() => {
    setFoto(null);
    if (!p?.foto) return;
    const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => setFoto(im); im.src = urlFotoMarca(p.foto);
  }, [p?.foto]);
  useEffect(() => {
    const ctx = tela.current?.getContext("2d"); if (!ctx) return;
    desenhar(ctx, p?.nome ?? "Nome", p?.loja ?? "Pitanga", `${MESES[Number(mes) - 1]} ${ano}`, foto);
  }, [p, mes, ano, foto, fontes]);

  const baixar = () => tela.current?.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(b);
    a.download = `destaque-absoluto-${(p?.nome ?? "pessoa").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${ano}-${mes}.png`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");

  return (
    <div className="grade g2" style={{ alignItems: "start" }}>
      <div>
        <label className="ajuda" style={{ display: "block" }}>Quem foi o destaque
          <select value={pessoaId} onChange={(e) => setPessoaId(e.target.value)}>{pessoas.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.loja ? ` · ${x.loja}` : ""}</option>)}</select>
        </label>
        <div className="linha" style={{ gap: 10 }}>
          <label className="ajuda">Mês<select value={mes} onChange={(e) => setMes(e.target.value)} style={{ width: "auto" }}>{MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}</select></label>
          <label className="ajuda">Ano<input type="number" value={ano} onChange={(e) => setAno(e.target.value)} style={{ width: 90 }} /></label>
        </div>
        <p className="ajuda">A imagem sai sem o valor do prêmio. A foto é a que está no cadastro da pessoa (suba acima). Tamanho 1080 x 1350, o melhor para o feed.</p>
        <button className="btn p" type="button" onClick={baixar} disabled={!p}>Baixar imagem para o Instagram</button>
      </div>
      <canvas ref={tela} width={1080} height={1350} aria-label="Prévia da imagem do destaque absoluto" style={{ width: "100%", maxWidth: 360, height: "auto", borderRadius: 16, border: "1px solid var(--line)" }} />
    </div>
  );
}
