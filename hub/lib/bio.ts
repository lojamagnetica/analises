"use client";

// Link da Bio: uma página por loja com WhatsApp, Ação do mês, como chegar e links.
// A loja edita no Hub; o público vê em /bio?l=<slug> só depois de publicada.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { linkWhatsapp } from "@/lib/leads";

export type TipoBloco = "whatsapp" | "destaque" | "acao" | "local" | "link" | "texto" | "faq";
export type Bloco = {
  id: string; tipo: TipoBloco; titulo?: string; url?: string; numero?: string; mensagem?: string;
  endereco?: string; horario?: string; texto?: string; pergunta?: string; resposta?: string;
};
export type PerfilBio = { nome: string; arroba: string; frase: string; foto: string | null };
export type FormatoBotao = "redondo" | "suave" | "reto";
export type AparenciaBio = { modelo: string; botao: FormatoBotao };
export type AcaoBio = { titulo: string; resumo: string | null; oferta: string | null; fim: string } | null;
export type PaginaBio = {
  id?: string; portal_id: string; slug: string; perfil: PerfilBio; blocos: Bloco[]; aparencia: AparenciaBio; publicada: boolean; publicada_em?: string | null;
};
/** O que a página pública recebe. */
export type BioPublica = Pick<PaginaBio, "slug" | "perfil" | "blocos" | "aparencia"> & { acao: AcaoBio };

export type Modelo = { id: string; nome: string; fundo: string; texto: string; suave: string; botao: string; botaoTexto: string; principal: string; principalTexto: string };
export const MODELOS: Modelo[] = [
  { id: "areia", nome: "Areia", fundo: "#F4EEE6", texto: "#2B2522", suave: "#7A6F66", botao: "#FFFFFF", botaoTexto: "#2B2522", principal: "#B7400E", principalTexto: "#FFFFFF" },
  { id: "noite", nome: "Noite", fundo: "#141210", texto: "#F7F2EC", suave: "#A8A098", botao: "#24211E", botaoTexto: "#F7F2EC", principal: "#D9622C", principalTexto: "#FFFFFF" },
  { id: "terracota", nome: "Terracota", fundo: "#B7400E", texto: "#FFF6EF", suave: "#F6D3BF", botao: "#FFF6EF", botaoTexto: "#7A2A08", principal: "#141210", principalTexto: "#FFFFFF" },
  { id: "rose", nome: "Rosé", fundo: "#F7E3E1", texto: "#4A2A2A", suave: "#8E6764", botao: "#FFFFFF", botaoTexto: "#4A2A2A", principal: "#9E4A4A", principalTexto: "#FFFFFF" },
  { id: "oliva", nome: "Oliva", fundo: "#E6E7D9", texto: "#2E3322", suave: "#6B7158", botao: "#FFFFFF", botaoTexto: "#2E3322", principal: "#4F5A2E", principalTexto: "#FFFFFF" },
  { id: "branco", nome: "Branco", fundo: "#FFFFFF", texto: "#141210", suave: "#7D7670", botao: "#F3F0EC", botaoTexto: "#141210", principal: "#141210", principalTexto: "#FFFFFF" },
];
export const FORMATOS: { id: FormatoBotao; nome: string; raio: string }[] = [
  { id: "redondo", nome: "Redondo", raio: "999px" },
  { id: "suave", nome: "Cantos suaves", raio: "14px" },
  { id: "reto", nome: "Reto", raio: "4px" },
];
export const modeloDe = (id: string | undefined) => MODELOS.find((m) => m.id === id) ?? MODELOS[0];
export const raioDe = (f: FormatoBotao | undefined) => FORMATOS.find((x) => x.id === f)?.raio ?? FORMATOS[0].raio;

export const NOME_BLOCO: Record<TipoBloco, string> = {
  whatsapp: "WhatsApp com mensagem pronta", destaque: "Botão destaque", acao: "Ação do mês (automática)",
  local: "Como chegar e horário", link: "Link", texto: "Texto", faq: "Pergunta frequente",
};

const sb = () => supabaseBrowser();
const novoId = () => Math.random().toString(36).slice(2, 10);

/** Endereço da página: só letras minúsculas, números e hífen. */
export const slugDe = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "minha-loja";

/** Só links http(s): o que a loja digita vira botão numa página pública. */
export function linkSeguro(url: string | undefined) {
  const u = (url ?? "").trim();
  if (!u) return null;
  const comProtocolo = /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`;
  try { const x = new URL(comProtocolo); return x.protocol === "https:" || x.protocol === "http:" ? x.toString() : null; } catch { return null; }
}

export function linkDoBloco(b: Bloco, acao: AcaoBio = null) {
  if (b.tipo === "whatsapp" || b.tipo === "acao") {
    const base = linkWhatsapp(b.numero ?? "");
    if (!base) return null;
    const msg = b.tipo === "acao" ? (b.mensagem || (acao ? `Oi! Vi a ${acao.titulo} no Instagram e quero aproveitar.` : "")) : b.mensagem;
    return msg ? `${base}?text=${encodeURIComponent(msg)}` : base;
  }
  if (b.tipo === "local") return b.endereco?.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.endereco.trim())}` : null;
  if (b.tipo === "destaque" || b.tipo === "link") return linkSeguro(b.url);
  return null;
}

export function blocoNovo(tipo: TipoBloco, whatsapp: string): Bloco {
  const id = novoId();
  switch (tipo) {
    case "whatsapp": return { id, tipo, titulo: "Fale com a gente no WhatsApp", numero: whatsapp, mensagem: "Oi! Vim pelo Instagram e quero saber mais." };
    case "destaque": return { id, tipo, titulo: "Veja as novidades", url: "" };
    case "acao": return { id, tipo, titulo: "", numero: whatsapp, mensagem: "" };
    case "local": return { id, tipo, titulo: "Como chegar", endereco: "", horario: "Seg a sex, das 9h às 18h · Sáb, das 9h às 13h" };
    case "link": return { id, tipo, titulo: "Meu link", url: "" };
    case "texto": return { id, tipo, texto: "" };
    case "faq": return { id, tipo, pergunta: "Vocês entregam?", resposta: "" };
  }
}

/** A página nova já nasce com o principal: WhatsApp, Ação do mês e como chegar. */
export function paginaInicial(portalId: string, d: { loja: string; instagram: string; whatsapp: string; cidade: string; foto: string | null }): PaginaBio {
  const arroba = d.instagram.replace(/^.*instagram\.com\//i, "").replace(/[@/\s]/g, "");
  return {
    portal_id: portalId, slug: slugDe(arroba || d.loja), publicada: false,
    perfil: { nome: d.loja, arroba, frase: d.cidade ? `Moda com atendimento de verdade em ${d.cidade}.` : "Moda com atendimento de verdade.", foto: d.foto },
    blocos: [blocoNovo("whatsapp", d.whatsapp), blocoNovo("acao", d.whatsapp), blocoNovo("local", d.whatsapp)],
    aparencia: { modelo: MODELOS[0].id, botao: "redondo" },
  };
}

export async function buscarBio(portalId: string) {
  const sbc = sb();
  const [{ data: pagina }, acao] = await Promise.all([
    sbc.from("bio_paginas").select("*").eq("portal_id", portalId).maybeSingle(),
    acaoAtiva(portalId),
  ]);
  const p = (pagina ?? null) as PaginaBio | null;
  const { data: cliques } = p?.id ? await sbc.from("bio_cliques").select("bloco, total").eq("pagina_id", p.id) : { data: [] };
  return { pagina: p, acao, cliques: Object.fromEntries((cliques ?? []).map((c) => [c.bloco as string, Number(c.total) || 0])) as Record<string, number> };
}

/** A ação que a loja ativou em Vendas › Ações do Mês e que está valendo hoje (a mesma regra do bio_publica). */
export async function acaoAtiva(portalId: string): Promise<AcaoBio> {
  const { data: la } = await sb().from("loja_acoes").select("acao_id, concluida").eq("portal_id", portalId);
  const ids = (la ?? []).filter((x) => !x.concluida).map((x) => x.acao_id as string);
  if (!ids.length) return null;
  const h = hoje();
  const { data } = await sb().from("acoes").select("titulo, resumo, oferta, inicio, fim, venda_inicio, data_acao, publicada").in("id", ids);
  const a = (data ?? []).filter((x) => x.publicada && x.inicio <= h && x.fim >= h)
    .sort((x, y) => String(x.venda_inicio ?? x.data_acao).localeCompare(String(y.venda_inicio ?? y.data_acao)))[0];
  return a ? { titulo: a.titulo, resumo: a.resumo, oferta: a.oferta, fim: a.fim } : null;
}

export async function salvarBio(p: PaginaBio) {
  const slug = slugDe(p.slug);
  if (slug.length < 3) throw new Error("O endereço precisa ter pelo menos 3 letras.");
  const dados = { portal_id: p.portal_id, slug, perfil: p.perfil, blocos: p.blocos, aparencia: p.aparencia, publicada: p.publicada, publicada_em: p.publicada ? (p.publicada_em ?? new Date().toISOString()) : null, updated_at: new Date().toISOString() };
  const { data, error } = p.id
    ? await sb().from("bio_paginas").update(dados).eq("id", p.id).select("*").maybeSingle()
    : await sb().from("bio_paginas").insert(dados).select("*").maybeSingle();
  if (error) throw new Error(/duplicate|unique|23505/i.test(`${error.code} ${error.message}`) ? "Esse endereço já está em uso por outra loja. Escolha outro." : error.message);
  return data as PaginaBio;
}

export async function apagarBio(id: string) {
  const { error } = await sb().from("bio_paginas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Cliques do Link da Bio, para Conteúdo › Resultados. */
export async function cliquesDaBio(portalId: string) {
  const { data: p } = await sb().from("bio_paginas").select("id, blocos, publicada, slug").eq("portal_id", portalId).maybeSingle();
  if (!p) return null;
  const { data } = await sb().from("bio_cliques").select("bloco, total").eq("pagina_id", p.id);
  const blocos = (p.blocos ?? []) as Bloco[];
  const porBloco = (data ?? []).map((c) => ({ bloco: blocos.find((b) => b.id === c.bloco), total: Number(c.total) || 0 })).filter((x) => x.bloco).sort((a, b) => b.total - a.total);
  return { publicada: !!p.publicada, slug: p.slug as string, total: porBloco.reduce((s, x) => s + x.total, 0), porBloco };
}

export const rotuloDoBloco = (b: Bloco, acao: AcaoBio = null) =>
  b.tipo === "acao" ? (b.titulo || acao?.titulo || "Ação do mês") : b.tipo === "faq" ? (b.pergunta || "Pergunta") : b.tipo === "texto" ? (b.texto?.slice(0, 40) || "Texto") : (b.titulo || NOME_BLOCO[b.tipo]);

/** Página pública: lê a página publicada e registra cliques (sem login). */
export async function bioPublica(slug: string) {
  const { data, error } = await sb().rpc("bio_publica", { p_slug: slug });
  if (error) throw new Error(error.message);
  return (data ?? null) as BioPublica | null;
}
export const registrarClique = (slug: string, bloco: string) => { sb().rpc("bio_clique", { p_slug: slug, p_bloco: bloco }).then(() => undefined); };

/** Foto quadrada pequena (256 px, JPEG), guardada dentro da própria página. */
export async function fotoPequena(arquivo: File) {
  const img = await createImageBitmap(arquivo).catch(() => { throw new Error("Não deu para abrir essa imagem. Use uma foto em JPG ou PNG."); });
  const lado = Math.min(img.width, img.height);
  const tela = document.createElement("canvas");
  tela.width = tela.height = 256;
  tela.getContext("2d")!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
  return tela.toDataURL("image/jpeg", 0.85);
}
