"use client";

import { useEffect, useRef, useState } from "react";

// Story de boas-vindas (1080x1920) com o crachá da magnética, desenhado no navegador.
const C = { noite: "#0B1A3A", ferrugem: "#BC4914", ambar: "#E08A3C", off: "#F5F0EA", areia: "#E6DCD0", cinza: "#C9BFB4" };
const FONTES = "https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,300;0,400;0,600;0,800;1,800&family=Outfit:wght@400&display=swap";

function ima(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cor: string) {
  ctx.save();
  ctx.translate(x - s / 2, y - s / 2);
  ctx.scale(s / 100, s / 100);
  ctx.strokeStyle = cor;
  ctx.lineWidth = 14;
  ctx.stroke(new Path2D("M47 26 H38 A24 24 0 0 0 38 74 H47"));
  ctx.stroke(new Path2D("M53 26 H62 A24 24 0 0 1 62 74 H53"));
  ctx.restore();
}

function espaco(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

function quebra(ctx: CanvasRenderingContext2D, texto: string, max: number) {
  const linhas: string[] = [];
  let l = "";
  for (const p of texto.trim().split(/\s+/)) {
    const t = l ? `${l} ${p}` : p;
    if (ctx.measureText(t).width > max && l) { linhas.push(l); l = p; } else l = t;
  }
  if (l) linhas.push(l);
  return linhas.slice(0, 3);
}

function desenhar(ctx: CanvasRenderingContext2D, nome: string, turma: string, rotulo: string, foto: HTMLImageElement | null) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  espaco(ctx, 0);
  ctx.textAlign = "left";
  ctx.fillStyle = C.areia;
  ctx.fillRect(0, 0, 1080, 1920);

  // Fita com o padrão de ímãs e a presilha
  ctx.fillStyle = C.ferrugem;
  ctx.fillRect(492, 0, 96, 580);
  for (let i = 0; i < 9; i++) ima(ctx, 540, 81 + i * 64, 62, C.off);
  ctx.fillStyle = "#8E827B";
  ctx.beginPath(); ctx.roundRect(518, 572, 44, 58, 8); ctx.fill();

  // Crachá levemente inclinado
  ctx.save();
  ctx.translate(540, 1010);
  ctx.rotate((-3 * Math.PI) / 180);
  ctx.translate(-290, -390);
  ctx.shadowColor = "rgba(11,26,58,.28)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
  ctx.fillStyle = C.noite;
  ctx.beginPath(); ctx.roundRect(0, 0, 580, 780, 36); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = C.areia;
  ctx.beginPath(); ctx.roundRect(235, 26, 110, 20, 10); ctx.fill();
  ima(ctx, 104, 132, 96, C.off);
  ctx.fillStyle = C.off; ctx.font = "400 62px Outfit, sans-serif"; ctx.textBaseline = "middle";
  espaco(ctx, -2); ctx.fillText("magnética", 168, 132); espaco(ctx, 0);

  // Foto recortada em círculo
  const cx = 171, cy = 345;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, 111, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#2A3757"; ctx.fillRect(cx - 115, cy - 115, 230, 230);
  if (foto) {
    const s = Math.max(222 / foto.width, 222 / foto.height);
    ctx.drawImage(foto, cx - (foto.width * s) / 2, cy - (foto.height * s) / 2, foto.width * s, foto.height * s);
  } else {
    ctx.fillStyle = C.cinza;
    ctx.beginPath(); ctx.arc(cx, cy - 28, 38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + 95, 72, Math.PI, 0); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = C.ambar; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(cx, cy, 111, 0, Math.PI * 2); ctx.stroke();

  // Textos do crachá
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.ambar; ctx.font = "600 22px Archivo, sans-serif";
  espaco(ctx, 7); ctx.fillText(rotulo, 56, 520); espaco(ctx, -1);
  ctx.fillStyle = C.off; ctx.font = "800 58px Archivo, sans-serif";
  const linhas = quebra(ctx, nome || " ", 468);
  linhas.forEach((l, i) => ctx.fillText(l, 56, 590 + i * 60));
  const extra = Math.max(0, linhas.length - 2) * 30;
  espaco(ctx, 0); ctx.fillStyle = C.cinza; ctx.font = "400 28px Archivo, sans-serif";
  ctx.fillText("Método Loja Magnética", 56, 690 + extra);
  ctx.fillText(turma, 56, 728 + extra);
  ctx.restore();

  // Chamada embaixo
  ctx.textAlign = "center"; ctx.fillStyle = "#5C534D"; ctx.font = "400 26px Archivo, sans-serif";
  espaco(ctx, 8); ctx.fillText(`NOVA ${rotulo} NA CASA`, 540, 1500); espaco(ctx, -2);
  ctx.textAlign = "left"; ctx.fillStyle = C.noite;
  ctx.font = "800 84px Archivo, sans-serif"; const wa = ctx.measureText("Boas-vindas").width;
  ctx.font = "300 84px Archivo, sans-serif"; const wb = ctx.measureText(" à").width;
  const x0 = 540 - (wa + wb) / 2;
  ctx.font = "800 84px Archivo, sans-serif"; ctx.fillText("Boas-vindas", x0, 1600);
  ctx.font = "300 84px Archivo, sans-serif"; ctx.fillText(" à", x0 + wa, 1600);
  ctx.textAlign = "center"; ctx.fillStyle = C.ferrugem; ctx.font = "italic 800 84px Archivo, sans-serif";
  ctx.fillText("magnética.", 540, 1690);
  espaco(ctx, 0); ctx.fillStyle = "#3D3632"; ctx.font = "400 30px Archivo, sans-serif";
  ctx.fillText("Atrair. Vender. Repetir.", 540, 1800);
  ctx.fillStyle = C.noite; ctx.font = "800 30px Archivo, sans-serif";
  ctx.fillText("Começa hoje.", 540, 1842);
  ctx.textAlign = "left";
}

function arquivo(nome: string) {
  const base = (nome || "mentorada").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `boas-vindas-${base || "mentorada"}.png`;
}

export function GeradorCracha() {
  const tela = useRef<HTMLCanvasElement>(null);
  const [nome, setNome] = useState("");
  const [turma, setTurma] = useState("");
  const [rotulo, setRotulo] = useState("MENTORADA");
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [fontes, setFontes] = useState(false);

  useEffect(() => {
    if (!document.querySelector(`link[href="${FONTES}"]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = FONTES;
      document.head.appendChild(l);
    }
    const pesos = ["400 62px Outfit", "800 58px Archivo", "300 84px Archivo", "italic 800 84px Archivo", "600 22px Archivo", "400 28px Archivo"];
    Promise.all(pesos.map((f) => document.fonts.load(f).catch(() => null))).then(() => setFontes(true));
  }, []);

  useEffect(() => {
    const ctx = tela.current?.getContext("2d");
    if (ctx) desenhar(ctx, nome || "Nome da Mentorada", turma || "Turma [mês] · 2026", rotulo, foto);
  }, [nome, turma, rotulo, foto, fontes]);

  function escolherFoto(f: File | undefined) {
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => setFoto(im);
    im.src = url;
  }

  function baixar() {
    tela.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = arquivo(nome);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  return (
    <div className="grade g2" style={{ alignItems: "start" }}>
      <div>
        <label className="rotulo" htmlFor="cracha-nome">Nome da mentorada</label>
        <input id="cracha-nome" type="text" maxLength={40} placeholder="Nome e sobrenome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <label className="rotulo" htmlFor="cracha-turma">Turma</label>
        <input id="cracha-turma" type="text" maxLength={40} placeholder="Turma Novembro · 2026" value={turma} onChange={(e) => setTurma(e.target.value)} />
        <label className="rotulo" htmlFor="cracha-rotulo">Como chamar no crachá</label>
        <select id="cracha-rotulo" value={rotulo} onChange={(e) => setRotulo(e.target.value)}>
          <option value="MENTORADA">Mentorada</option>
          <option value="MENTORADO">Mentorado</option>
        </select>
        <label className="rotulo" htmlFor="cracha-foto">Foto</label>
        <input id="cracha-foto" type="file" accept="image/*" onChange={(e) => escolherFoto(e.target.files?.[0])} />
        <div className="ajuda">Foto de rosto, de preferência quadrada. Ela é recortada em círculo.</div>
        <div className="linha mt">
          <button className="btn p" type="button" onClick={baixar}>Baixar story em PNG</button>
        </div>
      </div>
      <canvas ref={tela} width={1080} height={1920} aria-label="Prévia do story de boas-vindas" style={{ width: "100%", maxWidth: 360, height: "auto", borderRadius: 16, border: "1px solid var(--line)" }} />
    </div>
  );
}
