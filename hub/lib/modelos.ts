"use client";

// Modelos de card da campanha: a arte é um HTML pronto (cores, logo e letras travados) e a loja
// só troca os campos marcados com data-campo. O HTML fica no Storage; a imagem sai pelo html2canvas.
import { supabaseBrowser } from "@/lib/supabase/client";

const sb = () => supabaseBrowser();
const BALDE = "relatorios";

export type TipoCampo = "texto" | "linhas" | "foto";
export type Campo = { chave: string; rotulo: string; tipo: TipoCampo; valor: string };
export type Modelo = {
  id: string; portal_id: string; nome: string; grupo: string; largura: number; altura: number;
  arquivo: string; campos: Campo[]; ordem: number;
};
export type Valores = Record<string, string>;

export async function listarModelos(portalId: string): Promise<Modelo[]> {
  const { data, error } = await sb().from("loja_modelos").select("*").eq("portal_id", portalId).order("grupo").order("ordem");
  if (error) throw new Error(error.message);
  return (data ?? []) as Modelo[];
}

export async function lerModelo(id: string): Promise<Modelo | null> {
  const { data } = await sb().from("loja_modelos").select("*").eq("id", id).maybeSingle();
  return (data as Modelo) ?? null;
}

const cacheHtml = new Map<string, string>();
export async function htmlDoModelo(m: Modelo): Promise<string> {
  const c = cacheHtml.get(m.arquivo); if (c) return c;
  const { data } = await sb().storage.from(BALDE).createSignedUrl(m.arquivo, 3600);
  if (!data?.signedUrl) throw new Error("Não consegui abrir o modelo.");
  const t = await (await fetch(data.signedUrl)).text();
  cacheHtml.set(m.arquivo, t);
  return t;
}

/** Lê o bloco <script type="application/json" id="modelo"> do HTML: nome, tamanho e campos. */
export function lerDefinicao(html: string): { nome: string; grupo: string; largura: number; altura: number; ordem: number; campos: Campo[] } {
  const m = html.match(/<script[^>]*id=["']modelo["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) throw new Error("Este arquivo não tem a definição do modelo.");
  const d = JSON.parse(m[1]);
  return { nome: d.nome ?? "Modelo", grupo: d.grupo ?? "", largura: d.largura ?? 1080, altura: d.altura ?? 1350, ordem: d.ordem ?? 0, campos: d.campos ?? [] };
}

/** A equipe sobe um modelo novo (.html com a definição dentro). */
export async function subirModelo(portalId: string, arquivo: File): Promise<Modelo> {
  const html = await arquivo.text();
  const d = lerDefinicao(html);
  const limpo = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-60);
  const path = `${portalId}/modelos/${Date.now()}__${limpo}`;
  const { error } = await sb().storage.from(BALDE).upload(path, new Blob([html], { type: "text/html" }), { upsert: false, contentType: "text/html" });
  if (error) throw new Error("Não deu para subir o modelo.");
  const { data, error: e2 } = await sb().from("loja_modelos")
    .insert({ portal_id: portalId, nome: d.nome, grupo: d.grupo, largura: d.largura, altura: d.altura, ordem: d.ordem, campos: d.campos, arquivo: path })
    .select("*").single();
  if (e2) { await sb().storage.from(BALDE).remove([path]); throw new Error(e2.message); }
  return data as Modelo;
}

export async function apagarModelo(m: Modelo) {
  const { error } = await sb().from("loja_modelos").delete().eq("id", m.id);
  if (error) throw new Error(error.message);
  await sb().storage.from(BALDE).remove([m.arquivo]).catch(() => null);
}

export const valoresPadrao = (m: Modelo): Valores => Object.fromEntries(m.campos.map((c) => [c.chave, c.valor ?? ""]));

/** Põe os valores nos elementos com data-campo, dentro do documento do modelo. */
/** Ajuste da foto (posição e zoom), guardado no valor "<campo>__ajuste" como "x,y,zoom" (x e y de 0 a 100; zoom 1 a 3). */
export const chaveAjuste = (campo: string) => `${campo}__ajuste`;
export function lerAjuste(v: Valores, campo: string): { x: number; y: number; z: number } | null {
  const n = (v[chaveAjuste(campo)] ?? "").split(",").map(Number);
  return n.length === 3 && n.every((x) => Number.isFinite(x)) ? { x: n[0], y: n[1], z: n[2] } : null;
}
/** Posição original da foto no modelo (em %), para o ajuste começar de onde a arte já estava. */
export function posicaoDoModelo(doc: Document, campo: string): { x: number; y: number } {
  const el = doc.querySelector<HTMLElement>(`[data-campo="${campo}"]`);
  const pos = el ? (el.dataset.pos0 ?? getComputedStyle(el).backgroundPosition) : "";
  const pct = (t: string | undefined, pad: number) => { if (!t) return pad; if (t === "left" || t === "top") return 0; if (t === "right" || t === "bottom") return 100; if (t === "center") return 50; const n = parseFloat(t); return t.endsWith("%") && Number.isFinite(n) ? n : pad; };
  const [a, b] = pos.split(/\s+/);
  return { x: pct(a, 50), y: pct(b, 50) };
}

/** Valor que marca "não usar" (a foto ou o detalhe some do card). */
export const SEM = "__sem__";
/** Os traços e enfeites que acompanham um campo: data-se="campo" ou a linha fina (.ln) colada nele. */
function acompanhantes(doc: Document, el: HTMLElement, chave: string): HTMLElement[] {
  const l = Array.from(doc.querySelectorAll<HTMLElement>(`[data-se="${chave}"]`));
  const prox = el.nextElementSibling as HTMLElement | null;
  if (prox?.classList.contains("ln")) l.push(prox);
  const ant = el.previousElementSibling as HTMLElement | null;
  if (ant?.classList.contains("ln") && !(ant.previousElementSibling as HTMLElement | null)?.dataset.campo) l.push(ant);
  return l;
}

export function aplicar(doc: Document, m: Modelo, v: Valores): Promise<void> {
  const esperas: Promise<void>[] = [];
  for (const c of m.campos) {
    const bruto = v[c.chave] ?? c.valor ?? "";
    const sem = bruto === SEM;
    const val = sem ? "" : bruto;
    doc.querySelectorAll<HTMLElement>(`[data-campo="${c.chave}"]`).forEach((el) => {
      // Campo de texto vazio ou foto "não usar": some junto com o traço que aponta para ele.
      const some = sem || (c.tipo !== "foto" && !val.trim());
      el.style.display = sem ? "none" : "";
      acompanhantes(doc, el, c.chave).forEach((a) => { a.style.display = some ? "none" : ""; });
      if (c.tipo === "foto") {
        if (el.tagName === "IMG") { if (val) (el as HTMLImageElement).src = val; return; }
        // Sem foto (ou foto tirada): volta ao fundo do próprio modelo.
        if (!val) { el.style.backgroundImage = ""; el.style.backgroundPosition = ""; el.style.backgroundSize = ""; return; }
        el.style.backgroundImage = `url("${val}")`;
        // Guarda como a arte posicionava a foto, antes de qualquer ajuste.
        const cs = getComputedStyle(el);
        el.dataset.pos0 ??= cs.backgroundPosition;
        el.dataset.tam0 ??= cs.backgroundSize;
        const aj = lerAjuste(v, c.chave);
        if (!aj) { el.style.backgroundPosition = el.dataset.pos0; el.style.backgroundSize = el.dataset.tam0; return; }
        el.style.backgroundPosition = `${aj.x}% ${aj.y}%`;
        esperas.push(new Promise<void>((ok) => {
          const img = new Image();
          img.onload = () => {
            const W = el.clientWidth, H = el.clientHeight;
            const base = el.dataset.tam0 === "contain" ? Math.min(W / img.width, H / img.height) : Math.max(W / img.width, H / img.height);
            const k = base * aj.z;
            el.style.backgroundSize = `${Math.round(img.width * k)}px ${Math.round(img.height * k)}px`;
            ok();
          };
          img.onerror = () => ok();
          img.src = val;
        }));
      } else if (c.tipo === "linhas") {
        el.replaceChildren(...val.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const li = doc.createElement("li"); li.textContent = l; return li; }));
      } else {
        // Quebra de linha vira <br>; *palavra* vira itálico (o destaque das artes).
        el.replaceChildren();
        val.split("\n").forEach((l, i) => {
          if (i) el.appendChild(doc.createElement("br"));
          l.split(/(\*[^*]+\*)/).forEach((p) => {
            if (/^\*[^*]+\*$/.test(p)) { const it = doc.createElement("i"); it.textContent = p.slice(1, -1); el.appendChild(it); }
            else if (p) el.appendChild(doc.createTextNode(p));
          });
        });
      }
    });
  }
  return Promise.all(esperas).then(() => undefined);
}

/** Monta o modelo num iframe (fora da tela ou de prévia), aplica os valores e espera as letras. */
export async function montarNoFrame(frame: HTMLIFrameElement, html: string, m: Modelo, v: Valores) {
  await new Promise<void>((ok) => {
    frame.onload = () => ok();
    frame.srcdoc = html;
  });
  const doc = frame.contentDocument!;
  await aplicar(doc, m, v);
  await doc.fonts?.ready;
  await Promise.all(Array.from(doc.images).map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  return doc;
}

/** Gera o PNG do card com os valores. */
export async function gerarImagem(m: Modelo, v: Valores): Promise<Blob> {
  const html = await htmlDoModelo(m);
  const frame = document.createElement("iframe");
  frame.style.cssText = `position:fixed;left:-${m.largura + 200}px;top:0;width:${m.largura}px;height:${m.altura}px;border:0;`;
  document.body.appendChild(frame);
  try {
    const doc = await montarNoFrame(frame, html, m, v);
    const alvo = (doc.body.firstElementChild as HTMLElement) ?? doc.body;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(alvo, { width: m.largura, height: m.altura, windowWidth: m.largura, windowHeight: m.altura, scale: 1, backgroundColor: null, useCORS: true, logging: false });
    return await new Promise<Blob>((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Não consegui gerar a imagem."))), "image/png"));
  } finally {
    frame.remove();
  }
}

export function lerFoto(f: File): Promise<string> {
  return new Promise((ok, falha) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      // Reduz para no máximo 1600 px, para o card não ficar pesado.
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("Não consegui abrir a foto.")); };
    img.src = url;
  });
}

export const nomeArquivo = (m: Modelo) => `${m.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").toLowerCase()}.png`;
