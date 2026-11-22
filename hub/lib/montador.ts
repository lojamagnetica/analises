// Montador de carrossel: a loja sobe a foto feita com IA e o montador põe a tipografia da campanha.
// A identidade de cada coleção (logo, cores, textos) vem do banco (loja_montadores), nunca do código.
import { BASE } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Formato = "dupla" | "look" | "capa" | "story" | "frase" | "etiqueta" | "foto" | "cena" | "preco"
  | "numero" | "quiz" | "manchete" | "lista" | "comparar" | "roteiro"
  | "chamada" | "passos" | "post" | "meme" | "tendencia" | "destaque" | "tweet";

export type Identidade = {
  cores?: { fundo?: string; apoio?: string; destaque?: string; texto?: string };
  logo_svg_path?: string;
  logo_viewbox?: [number, number, number, number];
  linha_de_cima?: { dupla?: string; outros?: string; capa?: string };
  frase?: string;
  rodape?: string;
  semanas?: { rotulo: string; titulo: string }[];
  chamada?: string;
  precos_exemplo?: string;
  fotos?: string[];
  prompts?: { nome: string; texto: string }[];
  cenarios?: string;
  aviso?: string;
  perfil?: { nome?: string; arroba?: string; assinatura?: string };
};

export type Montador = { id: string; portal_id: string; colecao: string; liberado: boolean; identidade: Identidade };

export type SlideModelo = { tipo: Formato; kic: string; tit: string; pre: string; dica?: string };
export type ModeloMes = {
  id: string; mes: string; segmento: string; ordem: number; nome: string; descricao: string | null;
  referencia_url: string | null; referencia_perfil: string | null; referencia_data: string | null;
  curtidas: number | null; comentarios: number | null; slides: SlideModelo[]; liberado: boolean;
};

export async function buscarMontador(portalId: string, equipe: boolean) {
  const sb = supabaseBrowser();
  let q = sb.from("loja_montadores").select("id, portal_id, colecao, liberado, identidade").eq("portal_id", portalId).eq("ativo", true).order("created_at", { ascending: false }).limit(1);
  if (!equipe) q = q.eq("liberado", true);
  const { data } = await q;
  return (data?.[0] as Montador | undefined) ?? null;
}

/** Os modelos do mês do segmento da loja (o mês atual e, se não houver, o mais recente). */
export async function buscarModelos(segmento: string | null, equipe: boolean) {
  const sb = supabaseBrowser();
  let q = sb.from("modelos_mes").select("*").order("mes", { ascending: false }).order("ordem");
  if (!equipe) q = q.eq("liberado", true);
  const { data } = await q;
  const todos = (data ?? []) as ModeloMes[];
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const seg = segmento ? norm(segmento) : "";
  const doSeg = seg ? todos.filter((m) => norm(m.segmento) === seg || seg.includes(norm(m.segmento)) || norm(m.segmento).includes(seg)) : [];
  const lista = doSeg.length ? doSeg : todos;
  const mes = lista[0]?.mes;
  return lista.filter((m) => m.mes === mes);
}

let fontesProntas: Promise<void> | null = null;
/** Carrega as fontes da campanha uma vez (ficam em public/fontes). */
export function carregarFontes() {
  if (fontesProntas) return fontesProntas;
  const f = (familia: string, arquivo: string, estilo: string, peso: string) =>
    new FontFace(familia, `url(${BASE}/fontes/${arquivo})`, { style: estilo, weight: peso }).load().then((x) => { document.fonts.add(x); });
  fontesProntas = Promise.all([
    f("MontCG", "cormorant-300-italico.woff2", "italic", "300"),
    f("MontCG", "cormorant-500-italico.woff2", "italic", "500"),
    f("MontMS", "montserrat-400.woff2", "normal", "400"),
    f("MontMS", "montserrat-600.woff2", "normal", "600"),
  ]).then(() => undefined).catch(() => undefined);
  return fontesProntas;
}

export type Foto = { img: HTMLImageElement | null; zoom: number; altura: number };
export type Dados = { kic: string; tit: string; pre: string; cta: string; f1: Foto; f2: Foto };

const CORES = { fundo: "#F7F2EA", apoio: "#E8DCCB", destaque: "#A8743F", texto: "#3A2A20" };

export function tamanho(formato: Formato) {
  return formato === "story" ? { w: 1080, h: 1920 } : { w: 1080, h: 1350 };
}

/** Desenha um slide no canvas. Tudo em pixels de 1080 de largura. */
export function desenhar(cv: HTMLCanvasElement, formato: Formato, d: Dados, id: Identidade) {
  const { w, h } = tamanho(formato);
  cv.width = w; cv.height = h;
  const x = cv.getContext("2d");
  if (!x) return;
  const c = { ...CORES, ...(id.cores ?? {}) };
  const logoPath = id.logo_svg_path ? new Path2D(id.logo_svg_path) : null;
  const vb = id.logo_viewbox ?? [0, 0, 1000, 600];

  const foto = (f: Foto, X: number, Y: number, W: number, H: number, multiplicar = false, pb = false) => {
    x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip();
    if (!multiplicar) { x.fillStyle = c.apoio; x.fillRect(X, Y, W, H); }
    if (f.img) {
      const s = Math.max(W / f.img.width, H / f.img.height) * (f.zoom / 100);
      const iw = f.img.width * s, ih = f.img.height * s;
      if (multiplicar) x.globalCompositeOperation = "multiply";
      if (pb) x.filter = "grayscale(1) contrast(1.05)";
      x.drawImage(f.img, X + (W - iw) / 2, Y + (H - ih) * (f.altura / 100), iw, ih);
      x.globalCompositeOperation = "source-over"; x.filter = "none";
    } else {
      x.fillStyle = "#b8a78e"; x.font = "400 26px MontMS, Arial"; x.textAlign = "center"; x.fillText("suba a foto", X + W / 2, Y + H / 2);
    }
    x.restore();
  };
  const logo = (cx: number, cy: number, largura: number) => {
    if (!logoPath) return;
    const s = largura / vb[2];
    x.save(); x.translate(cx - largura / 2 - vb[0] * s, cy - (vb[3] * s) / 2 - vb[1] * s); x.scale(s, s); x.fillStyle = c.texto; x.fill(logoPath); x.restore();
  };
  const espacado = (t: string, px: number, cx: number, y: number, cor: string, peso = 400) => {
    x.font = `${peso} ${px}px MontMS, Arial`; x.fillStyle = cor; x.textAlign = "left";
    const sp = px * 0.3, ch = [...(t || "").toUpperCase()];
    const largura = ch.reduce((a, l) => a + x.measureText(l).width + sp, -sp);
    let p = cx - largura / 2;
    ch.forEach((l) => { x.fillText(l, p, y); p += x.measureText(l).width + sp; });
  };
  const titulo = (t: string, px: number, cx: number, y: number, max: number, peso = 300) => {
    x.font = `italic ${peso} ${px}px MontCG, Georgia, serif`; x.fillStyle = c.texto; x.textAlign = "center";
    const linhas: string[] = []; let l = "";
    (t || "").split(" ").forEach((p) => { const tt = l ? `${l} ${p}` : p; if (x.measureText(tt).width > max && l) { linhas.push(l); l = p; } else l = tt; });
    linhas.push(l);
    linhas.forEach((ln, k) => x.fillText(ln, cx, y + k * px * 1.08));
    return linhas.length;
  };

  // Texto corrido centralizado, quebrando em linhas.
  const corrido = (t: string, px: number, cx: number, y: number, max: number, cor: string, peso = 400) => {
    x.font = `${peso} ${px}px MontMS, Arial`; x.fillStyle = cor; x.textAlign = "center";
    const linhas: string[] = []; let l = "";
    (t || "").split(" ").forEach((p) => { const tt = l ? `${l} ${p}` : p; if (x.measureText(tt).width > max && l) { linhas.push(l); l = p; } else l = tt; });
    linhas.push(l);
    linhas.forEach((ln, k) => x.fillText(ln, cx, y + k * px * 1.45));
    return linhas.length;
  };
  x.fillStyle = c.fundo; x.fillRect(0, 0, w, h);
  if (formato === "dupla") {
    espacado(d.kic, 22, 540, 96, c.destaque, 600);
    const n = titulo(d.tit, 70, 540, 178, 900);
    const top = n > 1 ? 300 : 236, H = 1350 - top - 230;
    foto(d.f1, 60, top, 470, H); foto(d.f2, 550, top, 470, H);
    x.fillStyle = c.destaque; x.fillRect(470, top + H + 40, 140, 1);
    espacado(d.pre, 21, 540, top + H + 88, c.texto); logo(540, 1350 - 78, 150);
  }
  if (formato === "look") {
    foto(d.f1, 60, 60, 960, 930);
    espacado(d.kic, 20, 540, 1050, c.destaque, 600); titulo(d.tit, 62, 540, 1122, 940);
    espacado(d.pre, 19, 540, 1196, c.texto); logo(540, 1350 - 70, 130);
  }
  if (formato === "capa") {
    espacado(d.kic, 22, 540, 96, c.destaque, 600);
    const partes = (d.tit || "").split(",");
    const l1 = partes.length > 1 ? `${partes[0]},` : "";
    const l2 = partes.length > 1 ? partes.slice(1).join(",").trim() : d.tit;
    if (l1) { x.font = "italic 300 72px MontCG, Georgia, serif"; x.fillStyle = c.texto; x.textAlign = "center"; x.fillText(l1, 540, 182); }
    const n2 = titulo(l2, l1 ? 128 : 96, 540, l1 ? 300 : 210, 960);
    const top = l1 ? 360 : 260 + (n2 - 1) * 100;
    foto(d.f1, 60, top, 960, 1350 - top - 200, true);
    x.fillStyle = c.destaque; x.fillRect(470, 1350 - 150, 140, 1);
    espacado(d.pre || id.rodape || "", 19, 540, 1350 - 92, c.texto);
  }
  if (formato === "frase") {
    // Slide só de texto: a virada do carrossel.
    const n = titulo(d.tit, 84, 540, 520, 900);
    corrido(d.pre, 30, 540, 520 + n * 92 + 40, 820, c.destaque);
    espacado(d.kic, 20, 540, 1350 - 120, c.destaque, 600);
    logo(540, 1350 - 70, 110);
  }
  if (formato === "etiqueta") {
    // Uma etiqueta desenhada com a frase dentro e a explicação embaixo.
    x.save(); x.translate(540, 470); x.rotate(-0.12);
    const W = 760, H = 420, r = 36, bico = 150;
    const forma = () => {
      x.beginPath();
      x.moveTo(-W / 2 + bico, -H / 2);
      x.lineTo(W / 2 - r, -H / 2); x.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + r);
      x.lineTo(W / 2, H / 2 - r); x.quadraticCurveTo(W / 2, H / 2, W / 2 - r, H / 2);
      x.lineTo(-W / 2 + bico, H / 2); x.lineTo(-W / 2, 0); x.closePath();
    };
    x.translate(18, 18); forma(); x.fillStyle = c.apoio; x.fill(); x.translate(-18, -18);
    forma(); x.fillStyle = c.fundo; x.fill(); x.lineWidth = 7; x.strokeStyle = c.texto; x.stroke();
    x.beginPath(); x.arc(-W / 2 + 90, 0, 26, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(-W / 2 + 90, -26); x.bezierCurveTo(-W / 2 + 40, -260, -W / 2 - 160, -200, -W / 2 - 60, -330); x.lineWidth = 6; x.stroke();
    x.restore();
    x.save(); x.translate(560, 470); x.rotate(-0.12);
    x.font = "italic 300 56px MontCG, Georgia, serif"; x.fillStyle = c.texto; x.textAlign = "center";
    const ls: string[] = []; let l = "";
    (`“${d.tit}”`).split(" ").forEach((p) => { const tt = l ? `${l} ${p}` : p; if (x.measureText(tt).width > 520 && l) { ls.push(l); l = p; } else l = tt; });
    ls.push(l);
    ls.forEach((ln, k) => x.fillText(ln, 40, (k - (ls.length - 1) / 2) * 62 + 18));
    x.restore();
    espacado(d.kic, 26, 540, 860, c.destaque, 600);
    corrido(d.pre, 32, 540, 930, 900, c.texto);
    logo(540, 1350 - 70, 110);
  }
  if (formato === "foto") {
    // Foto cheia, limpa, só uma faixa fina embaixo (estilo "os mais pedidos").
    foto(d.f1, 0, 0, 1080, 1350);
    const g = x.createLinearGradient(0, 1050, 0, 1350); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.45)");
    x.fillStyle = g; x.fillRect(0, 1050, 1080, 300);
    x.save(); x.textAlign = "left"; x.fillStyle = "#fff";
    x.font = "600 22px MontMS, Arial"; x.fillText((d.kic || "").toUpperCase(), 64, 1232);
    x.font = "400 30px MontMS, Arial"; x.fillText(d.pre || "", 64, 1282); x.restore();
  }
  if (formato === "cena") {
    // A peça no cenário, com o nome do encontro numa etiqueta clara no alto.
    foto(d.f1, 0, 0, 1080, 1350);
    x.save(); x.font = "600 22px MontMS, Arial";
    const t = (d.kic || "").toUpperCase(); const sp = 22 * 0.3;
    const largura = [...t].reduce((a, l) => a + x.measureText(l).width + sp, -sp) + 64;
    x.fillStyle = c.fundo; x.beginPath(); x.roundRect(540 - largura / 2, 64, largura, 58, 29); x.fill(); x.restore();
    espacado(d.kic, 22, 540, 101, c.destaque, 600);
    if (d.tit) {
      x.save(); x.fillStyle = "rgba(247,242,234,.92)"; x.fillRect(0, 1350 - 190, 1080, 190); x.restore();
      titulo(d.tit, 52, 540, 1350 - 112, 940);
      espacado(d.pre, 19, 540, 1350 - 48, c.texto);
    }
  }
  if (formato === "preco") {
    // Flat lay com a etiqueta de preço desenhada no canto.
    foto(d.f1, 0, 0, 1080, 1350);
    espacado(d.kic, 22, 540, 92, c.texto, 600);
    x.save(); x.translate(800, 1090); x.rotate(-0.18);
    const W = 360, H = 170;
    x.beginPath(); x.moveTo(-W / 2 + 60, -H / 2); x.lineTo(W / 2, -H / 2); x.lineTo(W / 2, H / 2); x.lineTo(-W / 2 + 60, H / 2); x.lineTo(-W / 2, 0); x.closePath();
    x.fillStyle = c.fundo; x.fill(); x.lineWidth = 4; x.strokeStyle = c.texto; x.stroke();
    x.beginPath(); x.arc(-W / 2 + 40, 0, 12, 0, Math.PI * 2); x.stroke();
    x.textAlign = "center"; x.fillStyle = c.texto;
    x.font = "italic 300 40px MontCG, Georgia, serif"; x.fillText(d.tit || "", 30, -8);
    x.font = "600 22px MontMS, Arial"; x.fillStyle = c.destaque; x.fillText((d.pre || "").toUpperCase(), 30, 40);
    x.restore();
  }
  // Itens separados por "|" (opções do quiz, manchetes, rótulos das fotos, paradas do roteiro).
  const itens = (t: string) => (t || "").split("|").map((v) => v.trim()).filter(Boolean);
  const pilula = (t: string, cx: number, cy: number, px: number, fundo: string, cor: string) => {
    x.save(); x.font = `600 ${px}px MontMS, Arial`;
    const tt = t.toUpperCase(), sp = px * 0.22;
    const larg = [...tt].reduce((a, l) => a + x.measureText(l).width + sp, -sp) + px * 2.4;
    x.fillStyle = fundo; x.beginPath(); x.roundRect(cx - larg / 2, cy - px * 1.25, larg, px * 2.5, px * 1.25); x.fill(); x.restore();
    espacado(tt, px, cx, cy + px * 0.36, cor, 600);
  };
  if (formato === "numero") {
    // Ranking: número grande sobre a foto cheia, nome e preço embaixo.
    foto(d.f1, 0, 0, 1080, 1350);
    const [num, ...resto] = (d.kic || "").split("·").map((v) => v.trim());
    x.save(); x.fillStyle = c.fundo; x.fillRect(0, 0, 330, 300); x.restore();
    x.font = "italic 300 190px MontCG, Georgia, serif"; x.fillStyle = c.destaque; x.textAlign = "center";
    x.fillText(num || "", 165, 215, 290);
    x.save(); x.fillStyle = "rgba(247,242,234,.94)"; x.fillRect(0, 1350 - 170, 1080, 170); x.restore();
    if (resto.length) espacado(resto.join(" · "), 22, 540, 1350 - 104, c.texto, 600);
    titulo(d.tit || d.pre, 46, 540, 1350 - 46, 940, 500);
  }
  if (formato === "quiz") {
    // Pergunta em cima, foto no meio, opções em botões embaixo.
    espacado(d.kic, 22, 540, 92, c.destaque, 600);
    const n = titulo(d.tit, 64, 540, 172, 940);
    const top = 172 + n * 70, ops = itens(d.pre), base = 1350 - 90 - ops.length * 0;
    foto(d.f1, 90, top, 900, 1350 - top - 250);
    const letras = ["A", "B", "C", "D"];
    const lg = ops.length ? 900 / ops.length : 900;
    ops.slice(0, 4).forEach((o, i) => {
      const cx = 90 + lg * i + lg / 2;
      x.save(); x.fillStyle = c.apoio; x.beginPath(); x.roundRect(cx - lg / 2 + 10, base - 120, lg - 20, 96, 48); x.fill(); x.restore();
      x.font = "600 30px MontMS, Arial"; x.fillStyle = c.texto; x.textAlign = "center";
      x.fillText(`${letras[i]}  ${o}`, cx, base - 60, lg - 50);
    });
  }
  if (formato === "manchete") {
    // Capa de revista: nome no alto, foto cheia, manchetes do lado.
    foto(d.f1, 0, 0, 1080, 1350);
    const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, "rgba(0,0,0,.35)"); g.addColorStop(.35, "rgba(0,0,0,0)"); g.addColorStop(.7, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.5)");
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
    espacado(d.kic, 70, 540, 150, "#fff", 600);
    x.fillStyle = "#fff"; x.fillRect(64, 190, 952, 2);
    x.save(); x.textAlign = "left"; x.fillStyle = "#fff"; x.shadowColor = "rgba(0,0,0,.55)"; x.shadowBlur = 14;
    itens(d.pre).slice(0, 4).forEach((m, i) => {
      x.font = "600 20px MontMS, Arial"; x.fillText(`0${i + 1}`, 64, 300 + i * 120);
      x.font = "italic 500 40px MontCG, Georgia, serif"; x.fillText(m, 64, 350 + i * 120, 560);
    });
    x.restore();
    x.save(); x.font = "italic 300 84px MontCG, Georgia, serif"; x.fillStyle = "#fff"; x.textAlign = "left";
    const ls: string[] = []; let l = "";
    (d.tit || "").split(" ").forEach((p) => { const tt = l ? `${l} ${p}` : p; if (x.measureText(tt).width > 940 && l) { ls.push(l); l = p; } else l = tt; });
    ls.push(l); ls.forEach((ln, k) => x.fillText(ln, 64, 1350 - 80 - (ls.length - 1 - k) * 90));
    x.restore();
  }
  if (formato === "lista") {
    // Item de guia: foto no alto, número grande, título e explicação.
    foto(d.f1, 60, 60, 960, 820);
    const [num, ...resto] = (d.kic || "").split("·").map((v) => v.trim());
    x.font = "italic 300 150px MontCG, Georgia, serif"; x.fillStyle = c.destaque; x.textAlign = "left";
    x.fillText(num || "", 60, 1040, 300);
    x.save(); x.textAlign = "left"; x.font = "600 22px MontMS, Arial"; x.fillStyle = c.destaque;
    x.fillText(resto.join(" · ").toUpperCase(), 330, 960, 690);
    x.font = "italic 300 56px MontCG, Georgia, serif"; x.fillStyle = c.texto; x.fillText(d.tit || "", 330, 1030, 690);
    x.font = "400 28px MontMS, Arial"; x.fillText(d.pre || "", 330, 1085, 690); x.restore();
    x.fillStyle = c.destaque; x.fillRect(60, 1150, 960, 1);
    logo(540, 1350 - 80, 120);
  }
  if (formato === "comparar") {
    // Duas fotos lado a lado com um rótulo em cada (antes e depois, este ou este).
    const [r1, r2] = itens(d.pre);
    espacado(d.kic, 22, 540, 92, c.destaque, 600);
    foto(d.f1, 40, 140, 490, 1000); foto(d.f2, 550, 140, 490, 1000);
    if (r1) pilula(r1, 285, 1080, 22, c.fundo, c.texto);
    if (r2) pilula(r2, 795, 1080, 22, c.texto, c.fundo);
    titulo(d.tit, 56, 540, 1240, 960);
    logo(540, 1350 - 46, 100);
  }
  if (formato === "roteiro") {
    // Foto de um lado, o roteiro (paradas, fases, dias) numerado do outro.
    foto(d.f1, 0, 0, 560, 1350);
    x.save(); x.textAlign = "left";
    x.font = "600 22px MontMS, Arial"; x.fillStyle = c.destaque; x.fillText((d.kic || "").toUpperCase(), 620, 170, 420);
    x.font = "italic 300 60px MontCG, Georgia, serif"; x.fillStyle = c.texto;
    const ls: string[] = []; let l = "";
    (d.tit || "").split(" ").forEach((p) => { const tt = l ? `${l} ${p}` : p; if (x.measureText(tt).width > 410 && l) { ls.push(l); l = p; } else l = tt; });
    ls.push(l); ls.forEach((ln, k) => x.fillText(ln, 620, 250 + k * 66));
    const y0 = 250 + ls.length * 66 + 60, ps = itens(d.pre).slice(0, 5);
    x.strokeStyle = c.destaque; x.lineWidth = 2;
    if (ps.length > 1) { x.beginPath(); x.moveTo(642, y0); x.lineTo(642, y0 + (ps.length - 1) * 150); x.stroke(); }
    ps.forEach((p, i) => {
      const y = y0 + i * 150;
      x.fillStyle = c.fundo; x.beginPath(); x.arc(642, y, 22, 0, Math.PI * 2); x.fill(); x.stroke();
      x.font = "600 20px MontMS, Arial"; x.fillStyle = c.destaque; x.textAlign = "center"; x.fillText(String(i + 1), 642, y + 7);
      x.textAlign = "left"; x.font = "400 30px MontMS, Arial"; x.fillStyle = c.texto; x.fillText(p, 690, y + 10, 360);
    });
    x.restore();
    logo(800, 1350 - 80, 120);
  }
  // Texto com palavras fortes: o que está entre *asteriscos* sai em negrito e na cor de destaque.
  const rico = (t: string, px: number, X: number, Y: number, max: number, cor: string, forte: string, alinhar: "left" | "center" = "left", lh = 1.22, pintar = true) => {
    const pal: { p: string; f: boolean }[] = [];
    let f = false;
    (t || "").split(/(\*)/).forEach((pedaco) => {
      if (pedaco === "*") { f = !f; return; }
      // pontuação logo depois do negrito fica grudada na palavra anterior
      pedaco.split(" ").forEach((w, k) => { if (!w) return; if (k === 0 && /^[.,!?;:…]/.test(w) && pal.length && !pedaco.startsWith(" ")) { pal[pal.length - 1].p += w; return; } pal.push({ p: w, f }); });
    });
    const fonte = (b: boolean) => `${b ? 600 : 400} ${px}px MontMS, Arial`;
    const med = (w: { p: string; f: boolean }) => { x.font = fonte(w.f); return x.measureText(w.p).width; };
    x.font = fonte(false); const esp = x.measureText(" ").width;
    const linhas: { p: string; f: boolean }[][] = [[]]; let larg = 0;
    pal.forEach((w) => { const m = med(w); if (larg + m > max && linhas[linhas.length - 1].length) { linhas.push([]); larg = 0; } linhas[linhas.length - 1].push(w); larg += m + esp; });
    if (!pintar) return linhas.length;
    linhas.forEach((ln, k) => {
      const total = ln.reduce((a, w) => a + med(w) + esp, -esp);
      let px0 = alinhar === "center" ? X - total / 2 : X;
      ln.forEach((w) => { x.font = fonte(w.f); x.fillStyle = w.f ? forte : cor; x.textAlign = "left"; x.fillText(w.p, px0, Y + k * px * lh); px0 += med(w) + esp; });
    });
    return linhas.length;
  };
  const moldura = (X: number, Y: number, W: number, H: number, cor: string) => { x.save(); x.strokeStyle = cor; x.lineWidth = 3; x.strokeRect(X, Y, W, H); x.restore(); };
  if (formato === "chamada") {
    // Foto em preto e branco cheia, frase de cima pequena e a chamada grande embaixo (estilo campanha).
    foto(d.f1, 0, 0, 1080, 1350, false, true);
    const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, "rgba(0,0,0,.45)"); g.addColorStop(.3, "rgba(0,0,0,0)"); g.addColorStop(.55, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.7)");
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
    rico(d.kic, 38, 80, 170, 560, "rgba(255,255,255,.88)", c.destaque);
    const n = rico(d.tit, 76, 540, 0, 920, "#fff", c.apoio, "center", 1.22, false);
    const y = 1350 - 150 - (n - 1) * 76 * 1.22;
    rico(d.tit, 76, 540, y, 920, "#fff", c.apoio, "center");
    if (d.pre) rico(d.pre, 26, 540, 1350 - 70, 920, "rgba(255,255,255,.85)", "#fff", "center");
  }
  if (formato === "passos") {
    // Etiquetas penduradas com o passo a passo (como participar, como funciona).
    x.fillStyle = c.apoio; x.fillRect(0, 0, 1080, 1350);
    const tag = (X: number, Y: number, W: number, H: number, rot: number, cor: string) => {
      x.save(); x.translate(X, Y); x.rotate(rot);
      x.strokeStyle = c.texto; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -Y); x.lineTo(0, 10); x.stroke();
      x.fillStyle = cor; x.beginPath(); x.roundRect(-W / 2, 0, W, H, 26); x.fill();
      x.fillStyle = c.apoio; x.beginPath(); x.arc(0, 46, 16, 0, Math.PI * 2); x.fill(); x.strokeStyle = c.texto; x.stroke();
      x.restore();
    };
    tag(760, 250, 420, 900, 0.03, "rgba(255,255,255,.35)");
    tag(470, 180, 700, 1080, -0.015, c.fundo);
    x.save(); x.translate(470, 180); x.rotate(-0.015);
    let pk = 44; x.font = `600 ${pk}px MontMS, Arial`;
    while (x.measureText(d.kic || "").width > 560 && pk > 26) { pk -= 2; x.font = `600 ${pk}px MontMS, Arial`; }
    const tw = x.measureText(d.kic || "").width;
    moldura(-300, 120, tw + 50, 80, c.destaque);
    x.fillStyle = c.destaque; x.textAlign = "left"; x.fillText(d.kic || "", -275, 160 + pk * 0.36);
    let y = 300;
    itens(d.pre).slice(0, 4).forEach((p) => {
      x.fillStyle = c.destaque; x.font = "600 40px MontMS, Arial"; x.fillText("✦", -300, y + 4);
      const n = rico(p, 40, -240, y, 520, c.texto, c.destaque, "left", 1.3);
      y += n * 40 * 1.3 + 60;
    });
    x.restore();
    if (d.tit) rico(d.tit, 30, 540, 1350 - 60, 960, c.texto, c.destaque, "center");
  }
  if (formato === "post") {
    // Cartão de post (estilo tweet) com a foto embaixo: humor do dia a dia da cliente.
    x.fillStyle = c.apoio; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = c.fundo; x.beginPath(); x.roundRect(80, 200, 920, 1010, 36); x.fill();
    x.fillStyle = "#FFFFFF"; x.beginPath(); x.arc(190, 320, 64, 0, Math.PI * 2); x.fill(); x.lineWidth = 2; x.strokeStyle = "rgba(0,0,0,.12)"; x.stroke();
    if (logoPath) { x.save(); x.beginPath(); x.arc(190, 320, 64, 0, Math.PI * 2); x.clip(); const s2 = 100 / vb[2]; x.translate(190 - 50 - vb[0] * s2, 320 - (vb[3] * s2) / 2 - vb[1] * s2); x.scale(s2, s2); x.fillStyle = "#151515"; x.fill(logoPath); x.restore(); }
    const [nome, arroba] = (d.kic || "").split("·").map((v) => v.trim());
    x.textAlign = "left"; x.font = "600 36px MontMS, Arial"; x.fillStyle = c.destaque; x.fillText(nome || "", 280, 312);
    x.font = "400 26px MontMS, Arial"; x.fillStyle = c.texto; x.fillText(arroba || "", 280, 352);
    const n = rico(d.tit, 38, 140, 470, 800, c.destaque, c.texto, "left", 1.32);
    const top = 470 + n * 50 + 20;
    foto(d.f1, 140, top, 800, 1150 - top);
    if (d.pre) { x.font = "italic 500 30px MontCG, Georgia, serif"; x.fillStyle = c.texto; x.textAlign = "center"; x.fillText(d.pre, 540, 1290); }
  }
  if (formato === "meme") {
    // Cartão com rótulo (expectativa, realidade) e a foto com legenda de filme.
    x.fillStyle = c.apoio; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = c.fundo; x.beginPath(); x.roundRect(90, 260, 900, 960, 36); x.fill();
    x.textAlign = "left"; x.font = "400 40px MontMS, Arial"; x.fillStyle = c.destaque; x.fillText(d.kic || "", 150, 360);
    foto(d.f1, 150, 410, 780, 740);
    if (d.pre) {
      x.font = "italic 500 40px MontCG, Georgia, serif"; x.textAlign = "center"; x.lineWidth = 6; x.strokeStyle = "rgba(0,0,0,.6)"; x.strokeText(d.pre, 540, 1110); x.fillStyle = "#F4E27A"; x.fillText(d.pre, 540, 1110);
    }
    if (d.tit) rico(d.tit, 32, 540, 170, 900, c.texto, c.destaque, "center");
    logo(540, 1350 - 66, 110);
  }
  if (formato === "tendencia") {
    // Duas fotos desencontradas, título numa caixa por cima e a explicação embaixo.
    x.fillStyle = c.texto; x.fillRect(0, 0, 1080, 1350);
    foto(d.f1, 50, 120, 470, 940); foto(d.f2, 560, 60, 470, 800);
    espacado(d.kic, 20, 290, 96, c.fundo, 600);
    x.font = "600 54px MontMS, Arial";
    const ls: string[] = []; let l = "";
    (d.tit || "").split(" ").forEach((p) => { const tt = l ? `${l} ${p}` : p; if (x.measureText(tt).width > 560 && l) { ls.push(l); l = p; } else l = tt; });
    ls.push(l);
    const bh = ls.length * 64 + 50;
    x.fillStyle = c.destaque; x.fillRect(250, 760, 640, bh);
    x.fillStyle = c.fundo; x.textAlign = "center"; ls.forEach((ln, k) => x.fillText(ln, 570, 760 + 72 + k * 64));
    rico(d.pre, 30, 600, 760 + bh + 80, 420, c.fundo, c.apoio, "left", 1.35);
  }
  if (formato === "destaque") {
    // Foto em preto e branco, pergunta em cima e um valor circulado à mão.
    foto(d.f1, 0, 0, 1080, 1350, false, true);
    x.fillStyle = "rgba(0,0,0,.3)"; x.fillRect(0, 0, 1080, 1350);
    rico(d.kic, 52, 120, 200, 840, "#fff", "#fff", "left", 1.2);
    if (d.tit) {
      x.font = "600 92px MontMS, Arial"; const tw = x.measureText(d.tit).width;
      x.save(); x.fillStyle = "rgba(255,255,255,.92)"; x.beginPath(); x.roundRect(540 - tw / 2 - 40, 640, tw + 80, 140, 20); x.fill(); x.restore();
      x.fillStyle = c.texto; x.textAlign = "center"; x.fillText(d.tit, 540, 742);
      x.save(); x.strokeStyle = c.destaque; x.lineWidth = 7; x.beginPath(); x.ellipse(540, 712, tw / 2 + 90, 115, -0.06, 0.15, Math.PI * 2 - 0.1); x.stroke(); x.restore();
    }
    if (d.pre) rico(d.pre, 32, 540, 1350 - 110, 900, "#fff", c.apoio, "center");
  }
  if (formato === "tweet") {
    // Frase da semana no formato de post (tweet): logo, nome e @ da loja, a frase com o começo em negrito.
    const [nome0, arroba0] = (d.kic || "").split("·").map((v) => v.trim());
    const nome = nome0 || id.perfil?.nome || "", arroba = arroba0 || id.perfil?.arroba || "";
    const cx = 150, cy = 330, r = 62;
    // a bolinha repete a foto do perfil: fundo branco e a logo escura
    x.fillStyle = "#FFFFFF"; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.lineWidth = 2; x.strokeStyle = "rgba(0,0,0,.12)"; x.stroke();
    if (logoPath) { x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip(); const lw = r * 1.55, s2 = lw / vb[2]; x.translate(cx - lw / 2 - vb[0] * s2, cy - (vb[3] * s2) / 2 - vb[1] * s2); x.scale(s2, s2); x.fillStyle = "#151515"; x.fill(logoPath); x.restore(); }
    x.textAlign = "left"; x.font = "600 38px MontMS, Arial"; x.fillStyle = c.texto; x.fillText(nome, 240, 322);
    const nw = x.measureText(nome).width;
    if (nome) { x.fillStyle = c.destaque; x.beginPath(); x.arc(240 + nw + 30, 309, 17, 0, Math.PI * 2); x.fill();
      x.strokeStyle = "#fff"; x.lineWidth = 4; x.beginPath(); x.moveTo(240 + nw + 22, 309); x.lineTo(240 + nw + 28, 316); x.lineTo(240 + nw + 39, 302); x.stroke(); }
    x.font = "400 30px MontMS, Arial"; x.fillStyle = "#8a7a6a"; x.fillText(arroba, 240, 364);
    const n = rico(d.tit, 62, 90, 0, 900, c.texto, c.texto, "left", 1.25, false);
    const y = Math.max(500, 760 - (n * 62 * 1.25) / 2);
    rico(d.tit, 62, 90, y, 900, c.texto, c.texto, "left", 1.25);
    x.fillStyle = c.texto; x.globalAlpha = .35; x.fillRect(90, 1350 - 130, 900, 2); x.globalAlpha = 1;
    espacado(d.pre || id.perfil?.assinatura || id.perfil?.nome || "", 18, 540, 1350 - 80, c.texto);
  }
  if (formato === "story") {
    foto(d.f1, 0, 0, 1080, 1440);
    x.fillStyle = c.fundo; x.fillRect(0, 1440, 1080, 480);
    espacado(d.kic, 22, 540, 1520, c.destaque, 600);
    const n = titulo(d.tit, 66, 540, 1596, 940), y2 = 1596 + (n - 1) * 72;
    espacado(d.pre, 20, 540, y2 + 70, c.texto);
    x.font = "italic 500 34px MontCG, Georgia, serif"; x.fillStyle = c.destaque; x.textAlign = "center"; x.fillText(d.cta, 540, y2 + 132);
    logo(540, 1920 - 70, 120);
  }
}

export function lerImagem(arquivo: File) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = String(r.result); };
    r.onerror = rej;
    r.readAsDataURL(arquivo);
  });
}

export function baixarCanvas(cv: HTMLCanvasElement, nome: string) {
  return new Promise<void>((res) => cv.toBlob((b) => {
    if (!b) return res();
    const a = document.createElement("a"); a.download = nome; a.href = URL.createObjectURL(b); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); res();
  }, "image/png"));
}

export function compartilharCanvas(cv: HTMLCanvasElement, nome: string) {
  return new Promise<void>((res) => cv.toBlob(async (b) => {
    if (!b) return res();
    const f = new File([b], nome, { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] });
      else await baixarCanvas(cv, nome);
    } catch { /* cancelado */ }
    res();
  }, "image/png"));
}
