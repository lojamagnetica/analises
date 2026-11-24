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
export function aplicar(doc: Document, m: Modelo, v: Valores) {
  for (const c of m.campos) {
    const val = v[c.chave] ?? c.valor ?? "";
    doc.querySelectorAll<HTMLElement>(`[data-campo="${c.chave}"]`).forEach((el) => {
      if (c.tipo === "foto") {
        if (!val) return;
        if (el.tagName === "IMG") (el as HTMLImageElement).src = val;
        else el.style.backgroundImage = `url("${val}")`;
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
}

/** Monta o modelo num iframe (fora da tela ou de prévia), aplica os valores e espera as letras. */
export async function montarNoFrame(frame: HTMLIFrameElement, html: string, m: Modelo, v: Valores) {
  await new Promise<void>((ok) => {
    frame.onload = () => ok();
    frame.srcdoc = html;
  });
  const doc = frame.contentDocument!;
  aplicar(doc, m, v);
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
