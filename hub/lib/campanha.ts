"use client";

// Campanha da loja (datas grandes): a "casa" da campanha no Hub.
// A equipe monta e libera; a loja vê a liberada, segue o "Antes" e as semanas, e marca o que fez.
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import type { Post } from "@/lib/instagram";

export type PassoCampanha = { id: string; titulo: string; texto?: string; ate?: string; botao?: string; link?: string };
export type DiaCampanha = { destaque?: string; itens?: PassoCampanha[] };
export type Aba = "antes" | "semanas" | "resultado";
export type Campanha = {
  id: string; portal_id: string; nome: string; chamada: string;
  preparo_desde: string; inicio: string; fim: string; aprovada_em: string | null; livro: string | null;
  antes: PassoCampanha[]; dias: Record<string, DiaCampanha>; feitos: Record<string, string>;
  abas: Aba[]; status: "rascunho" | "liberada";
  visual?: Visual; foto?: string | null;
};
export type Cores = { fundo?: string; texto?: string; cor?: string; foto?: string };
export type Visual = Cores & { fases?: (Cores & { desde: string })[] };

/** As cores da campanha hoje: a fase que já começou (ex.: depois do Natal, o dourado) vale sobre a base. */
export function coresDeHoje(c: Campanha, dia = hoje()): (Required<Omit<Cores, "foto">> & { foto: string | null }) | null {
  const v = c.visual;
  if (!v?.fundo) return null;
  const fase = [...(v.fases ?? [])].filter((f) => f.desde <= dia).sort((a, b) => a.desde.localeCompare(b.desde)).pop();
  // foto: a capa da campanha naquela fase (ex.: presentes até o dia 24, o brinde depois). Sem capa, a loja põe a dela.
  return { fundo: fase?.fundo ?? v.fundo, texto: fase?.texto ?? v.texto ?? "#141210", cor: fase?.cor ?? v.cor ?? "#7A1E2A", foto: fase?.foto ?? v.foto ?? null };
}

/** A loja põe (ou troca) a foto da campanha. */
export async function subirFotoCampanha(c: Campanha, arquivo: File) {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha uma foto.");
  if (arquivo.size > 25 * 1024 * 1024) throw new Error("A foto passa de 25 MB.");
  const limpo = arquivo.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "_").slice(-60);
  const path = `${c.portal_id}/campanha/${c.id}/${Date.now()}__${limpo}`;
  const { error } = await sb().storage.from("relatorios").upload(path, arquivo, { upsert: false, contentType: arquivo.type });
  if (error) throw new Error("Não deu para subir a foto. Confira a internet e tente de novo.");
  const { error: e2 } = await sb().rpc("campanha_foto", { p_id: c.id, p_foto: path });
  if (e2) throw new Error(e2.message);
  if (c.foto) await sb().storage.from("relatorios").remove([c.foto]).catch(() => null);
  return path;
}
export async function tirarFotoCampanha(c: Campanha) {
  const { error } = await sb().rpc("campanha_foto", { p_id: c.id, p_foto: "" });
  if (error) throw new Error(error.message);
  if (c.foto) await sb().storage.from("relatorios").remove([c.foto]).catch(() => null);
}
export async function urlFotoCampanha(path: string) {
  const { data } = await sb().storage.from("relatorios").createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}

const sb = () => supabaseBrowser();
const DIA = 86_400_000;
const ms = (d: string) => new Date(`${d}T12:00:00Z`).getTime();

/** A campanha valendo hoje (do preparo até o fim). A equipe também vê o rascunho. */
export async function buscarCampanhaAtiva(portalId: string, dia = hoje()): Promise<Campanha | null> {
  const { data } = await sb().from("loja_campanhas").select("*").eq("portal_id", portalId)
    .lte("preparo_desde", dia).gte("fim", dia).order("inicio").limit(1);
  return ((data ?? [])[0] as Campanha | undefined) ?? null;
}

export async function buscarCampanha(id: string): Promise<Campanha | null> {
  const { data } = await sb().from("loja_campanhas").select("*").eq("id", id).maybeSingle();
  return (data as Campanha | null) ?? null;
}

/** Marca ou desmarca um passo. Devolve os "feitos" atualizados. */
export async function marcarCampanha(id: string, chave: string, feito: boolean): Promise<Record<string, string>> {
  const { data, error } = await sb().rpc("campanha_marcar", { p_id: id, p_chave: chave, p_feito: feito });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, string>;
}

/** Semana da campanha (1, 2, …) e o total. Antes do início: semana 0 (preparo). */
export function semanaDaCampanha(c: Campanha, dia = hoje()) {
  const total = Math.max(1, Math.ceil((ms(c.fim) - ms(c.inicio) + DIA) / (7 * DIA)));
  const atual = ms(dia) < ms(c.inicio) ? 0 : Math.min(total, Math.floor((ms(dia) - ms(c.inicio)) / (7 * DIA)) + 1);
  const ini = new Date(ms(c.inicio) + Math.max(0, atual - 1) * 7 * DIA).toISOString().slice(0, 10);
  const fimSem = [new Date(ms(ini) + 6 * DIA).toISOString().slice(0, 10), c.fim].sort()[0]; // a última semana acaba no fim da campanha
  return { atual, total, ini, fim: fimSem, pct: atual ? Math.round((atual / total) * 100) : 0 };
}

export const antesFeitos = (c: Campanha) => c.antes.filter((p) => c.feitos[p.id]).length;

export type ItemHoje = { chave: string; titulo: string; texto?: string; botao: string; link: string; feito: boolean; post?: boolean };

/** O que a loja faz hoje na campanha: os itens do dia, os posts do dia e o "Antes" que ainda falta. */
export function itensDeHoje(c: Campanha, posts: Pick<Post, "id" | "data" | "tema" | "formato" | "status" | "fazer" | "imagens">[], dia = hoje()): ItemHoje[] {
  const doDia = (c.dias[dia]?.itens ?? []).map((p) => ({
    chave: `${dia}:${p.id}`, titulo: p.titulo, texto: p.texto, botao: p.botao || "Ver", link: p.link || "/campanha", feito: !!c.feitos[`${dia}:${p.id}`],
  }));
  const dePost = posts.filter((p) => p.data === dia).map((p) => {
    const temArquivo = (p.imagens?.length ?? 0) > 0;
    const passo = (p.fazer ?? "").split("\n").map((l) => l.trim()).filter(Boolean)[0];
    return {
      chave: `post:${p.id}`, titulo: `Postar: ${limparTema(p.tema)}`, post: true,
      texto: passo ? passo : temArquivo ? "Pronto. É só salvar no celular e postar." : `${p.formato} · veja o roteiro e a legenda`,
      botao: "Fazer", link: `/conteudo/post?id=${p.id}`, feito: p.status === "Publicado",
    };
  });
  // Na semana do preparo (e na semana 1), o que falta do Antes também entra no dia.
  const sem = semanaDaCampanha(c, dia).atual;
  const doAntes = sem <= 1 ? c.antes.filter((p) => !c.feitos[p.id]).slice(0, 3).map((p) => ({
    chave: p.id, titulo: p.titulo, texto: p.ate ? `Até ${p.ate}` : p.texto, botao: "Ver", link: "/campanha", feito: false,
  })) : [];
  return [...doDia, ...dePost, ...doAntes];
}

/** Tira o prefixo da campanha do tema do post ("ENCONTROS · Abertura · … · Look Traz #1" → "Look Traz #1"). */
export function limparTema(tema: string) {
  const partes = tema.split(" · ").map((x) => x.trim()).filter(Boolean);
  return partes.length > 2 ? partes.slice(-1)[0] : tema;
}

/** Posts de um dia (para o "Hoje na campanha"). */
export async function buscarPostsDoDia(portalId: string, dia = hoje()) {
  const { data } = await sb().from("loja_posts").select("id, data, tema, formato, status, fazer, imagens").eq("portal_id", portalId).eq("data", dia).order("hora");
  return (data ?? []) as Pick<Post, "id" | "data" | "tema" | "formato" | "status" | "fazer" | "imagens">[];
}
