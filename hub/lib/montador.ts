// Montador de carrossel: a loja sobe a foto feita com IA e o montador põe a tipografia da campanha.
// A identidade de cada coleção (logo, cores, textos) vem do banco (loja_montadores), nunca do código.
import { BASE } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Formato = "dupla" | "look" | "capa" | "story" | "frase" | "etiqueta";

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

  const foto = (f: Foto, X: number, Y: number, W: number, H: number, multiplicar = false) => {
    x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip();
    if (!multiplicar) { x.fillStyle = c.apoio; x.fillRect(X, Y, W, H); }
    if (f.img) {
      const s = Math.max(W / f.img.width, H / f.img.height) * (f.zoom / 100);
      const iw = f.img.width * s, ih = f.img.height * s;
      if (multiplicar) x.globalCompositeOperation = "multiply";
      x.drawImage(f.img, X + (W - iw) / 2, Y + (H - ih) * (f.altura / 100), iw, ih);
      x.globalCompositeOperation = "source-over";
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
