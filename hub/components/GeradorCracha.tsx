"use client";

import { useEffect, useRef, useState } from "react";

// Story de boas-vindas (1080x1920) com o crachá da magnética, desenhado no navegador.
// A estética é a mesma em todos os planos; muda a cor do cartão, a fita e o rótulo.
const C = { noite: "#0B1A3A", ferrugem: "#BC4914", ambar: "#E08A3C", off: "#F5F0EA", areia: "#E6DCD0" };
const FONTES = "https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,300;0,400;0,600;0,800;1,800&family=Outfit:wght@400&display=swap";

type Plano = {
  nome: string; rotulo: string; produto: string; consultoria?: boolean;
  cartao: string; texto: string; info: string; destaque: string; fotoFundo: string; fita: string; imaFita: string;
};

export const PLANOS: Record<string, Plano> = {
  premium: { nome: "Premium", rotulo: "MENTORIA PREMIUM", produto: "Método Loja Magnética", cartao: C.noite, texto: C.off, info: "#C9BFB4", destaque: C.ambar, fotoFundo: "#2A3757", fita: C.ferrugem, imaFita: C.off },
  gold: { nome: "Gold", rotulo: "MENTORIA GOLD", produto: "Método Loja Magnética", cartao: "#141210", texto: C.off, info: "#B9AFA6", destaque: C.ambar, fotoFundo: "#2B2622", fita: C.ambar, imaFita: "#141210" },
  start: { nome: "Start", rotulo: "MENTORIA START", produto: "Método Loja Magnética", cartao: C.ferrugem, texto: "#FFFFFF", info: "#F6D9C8", destaque: C.off, fotoFundo: "#9E3C10", fita: C.noite, imaFita: C.off },
  consultoria: { nome: "Consultoria", rotulo: "CONSULTORIA", produto: "Consultoria Loja Magnética", consultoria: true, cartao: C.off, texto: C.noite, info: "#5C534D", destaque: C.ferrugem, fotoFundo: "#E2D8CC", fita: C.noite, imaFita: C.off },
};

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

function desenhar(ctx: CanvasRenderingContext2D, p: Plano, nome: string, linha2: string, topo: string, foto: HTMLImageElement | null) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  espaco(ctx, 0);
  ctx.textAlign = "left";
  ctx.fillStyle = C.areia;
  ctx.fillRect(0, 0, 1080, 1920);

  // Fita com o padrão de ímãs e a presilha
  ctx.fillStyle = p.fita;
  ctx.fillRect(492, 0, 96, 580);
  for (let i = 0; i < 9; i++) ima(ctx, 540, 81 + i * 64, 62, p.imaFita);
  ctx.fillStyle = "#8E827B";
  ctx.beginPath(); ctx.roundRect(518, 572, 44, 58, 8); ctx.fill();

  // Crachá levemente inclinado
  ctx.save();
  ctx.translate(540, 1010);
  ctx.rotate((-3 * Math.PI) / 180);
  ctx.translate(-290, -390);
  ctx.shadowColor = "rgba(11,26,58,.28)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
  ctx.fillStyle = p.cartao;
  ctx.beginPath(); ctx.roundRect(0, 0, 580, 780, 36); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = C.areia;
  ctx.beginPath(); ctx.roundRect(235, 26, 110, 20, 10); ctx.fill();
  ima(ctx, 104, 132, 96, p.texto);
  ctx.fillStyle = p.texto; ctx.font = "400 62px Outfit, sans-serif"; ctx.textBaseline = "middle";
  espaco(ctx, -2); ctx.fillText("magnética", 168, 132); espaco(ctx, 0);

  // Foto recortada em círculo
  const cx = 171, cy = 345;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, 111, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = p.fotoFundo; ctx.fillRect(cx - 115, cy - 115, 230, 230);
  if (foto) {
    const s = Math.max(222 / foto.width, 222 / foto.height);
    ctx.drawImage(foto, cx - (foto.width * s) / 2, cy - (foto.height * s) / 2, foto.width * s, foto.height * s);
  } else {
    ctx.globalAlpha = 0.6; ctx.fillStyle = p.texto;
    ctx.beginPath(); ctx.arc(cx, cy - 28, 38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + 95, 72, Math.PI, 0); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.strokeStyle = p.destaque; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(cx, cy, 111, 0, Math.PI * 2); ctx.stroke();

  // Textos do crachá
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.destaque; ctx.font = "600 22px Archivo, sans-serif";
  espaco(ctx, 7); ctx.fillText(p.rotulo, 56, 520); espaco(ctx, -1);
  ctx.fillStyle = p.texto; ctx.font = "800 58px Archivo, sans-serif";
  const linhas = quebra(ctx, nome || " ", 468);
  linhas.forEach((l, i) => ctx.fillText(l, 56, 590 + i * 60));
  const extra = Math.max(0, linhas.length - 2) * 30;
  espaco(ctx, 0); ctx.fillStyle = p.info; ctx.font = "400 28px Archivo, sans-serif";
  ctx.fillText(p.produto, 56, 690 + extra);
  ctx.fillText(linha2, 56, 728 + extra);
  ctx.restore();

  // Chamada embaixo
  ctx.textAlign = "center"; ctx.fillStyle = "#5C534D"; ctx.font = "400 26px Archivo, sans-serif";
  espaco(ctx, 8); ctx.fillText(topo, 540, 1500); espaco(ctx, -2);
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

function arquivo(plano: string, nome: string) {
  const base = (nome || "mentorada").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `boas-vindas-${plano}-${base || "mentorada"}.png`;
}

export function GeradorCracha() {
  const tela = useRef<HTMLCanvasElement>(null);
  const [plano, setPlano] = useState("premium");
  const [nome, setNome] = useState("");
  const [linha2, setLinha2] = useState("");
  const [genero, setGenero] = useState("MENTORADA");
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [fontes, setFontes] = useState(false);
  const p = PLANOS[plano];

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
    if (!ctx) return;
    const padraoNome = p.consultoria ? "Nome do Cliente" : genero === "MENTORADO" ? "Nome do Mentorado" : "Nome da Mentorada";
    const padraoLinha2 = p.consultoria ? "Nome da loja · 2026" : "Turma [mês] · 2026";
    const topo = p.consultoria ? "NOVA LOJA NA CASA" : genero === "MENTORADO" ? "NOVO MENTORADO NA CASA" : "NOVA MENTORADA NA CASA";
    desenhar(ctx, p, nome || padraoNome, linha2 || padraoLinha2, topo, foto);
  }, [p, nome, linha2, genero, foto, fontes]);

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
      a.download = arquivo(plano, nome);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  return (
    <div className="grade g2" style={{ alignItems: "start" }}>
      <div>
        <label className="rotulo" htmlFor="cracha-plano">Plano</label>
        <select id="cracha-plano" value={plano} onChange={(e) => setPlano(e.target.value)}>
          {Object.entries(PLANOS).map(([id, pl]) => <option key={id} value={id}>{pl.nome}</option>)}
        </select>
        <label className="rotulo" htmlFor="cracha-nome">{p.consultoria ? "Nome do cliente" : "Nome da mentorada"}</label>
        <input id="cracha-nome" type="text" maxLength={40} placeholder="Nome e sobrenome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <label className="rotulo" htmlFor="cracha-linha2">{p.consultoria ? "Nome da loja" : "Turma"}</label>
        <input id="cracha-linha2" type="text" maxLength={40} placeholder={p.consultoria ? "Nome da loja · 2026" : "Turma Novembro · 2026"} value={linha2} onChange={(e) => setLinha2(e.target.value)} />
        {!p.consultoria && (
          <>
            <label className="rotulo" htmlFor="cracha-genero">Texto de cima</label>
            <select id="cracha-genero" value={genero} onChange={(e) => setGenero(e.target.value)}>
              <option value="MENTORADA">Nova mentorada na casa</option>
              <option value="MENTORADO">Novo mentorado na casa</option>
            </select>
          </>
        )}
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
