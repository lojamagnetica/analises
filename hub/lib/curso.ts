"use client";

// O Curso Loja Magnética: 16 fundamentos, cada um com aulas, ferramenta, missão de 7 dias e prova.
// Regra de ouro: só avança quando entrega a prova. O que já funciona (nota 2 no Raio-X) não trava a trilha.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Modulo = { id: string; ordem: number; titulo: string; promessa: string | null; pilar: string | null };
export type Fundamento = {
  codigo: string; modulo_id: string; ordem: number; titulo: string; rotulo: string;
  promessa: string | null; missao: string; prova: string; efeito: string | null;
};
export type Aula = {
  id: string; codigo: string; modulo_id: string; fundamento: string | null; ordem: number;
  titulo: string; duracao: number | null; topicos: string[]; video_url: string | null;
};
export type Ferramenta = { id: string; modulo_id: string; fundamento: string | null; ordem: number; nome: string; formato: string; url: string | null };
export type Estado = "entregue" | "ja-funciona" | "atual" | "liberado" | "bloqueado";

export const PILARES: Record<string, string> = { "01": "Gestão Analítica", "02": "Gestão de Pessoas", "03": "Processos Comerciais", "04": "Marketing e Conteúdo" };
export const NOTAS = [
  { nota: 0, rotulo: "Não existe", ajuda: "a loja não faz" },
  { nota: 1, rotulo: "Às vezes", ajuda: "existe, mas não roda sempre" },
  { nota: 2, rotulo: "Funciona", ajuda: "roda toda semana" },
];
export const pilarDe = (codigo: string) => codigo.slice(0, 2);
export const nomeAula = (a: Pick<Aula, "codigo" | "titulo">) => (/^\d/.test(a.codigo) ? `Aula ${a.codigo} · ${a.titulo}` : a.titulo);

export async function buscarCurso(portalId: string | null) {
  const sb = supabaseBrowser();
  const vazio = Promise.resolve({ data: [] as Record<string, unknown>[] });
  const [m, f, a, fe, r, p] = await Promise.all([
    sb.from("curso_modulos").select("*").order("ordem"),
    sb.from("curso_fundamentos").select("*").order("ordem"),
    sb.from("curso_aulas").select("*").order("ordem"),
    sb.from("curso_ferramentas").select("*").order("ordem"),
    portalId ? sb.from("curso_raiox").select("codigo, nota").eq("portal_id", portalId) : vazio,
    portalId ? sb.from("curso_progresso").select("tipo, item, feito_em").eq("portal_id", portalId) : vazio,
  ]);
  return {
    modulos: (m.data ?? []) as Modulo[],
    fundamentos: (f.data ?? []) as Fundamento[],
    aulas: (a.data ?? []) as Aula[],
    ferramentas: (fe.data ?? []) as Ferramenta[],
    notas: new Map((r.data ?? []).map((x) => [x.codigo as string, x.nota as number])),
    provas: new Map((p.data ?? []).filter((x) => x.tipo === "prova").map((x) => [x.item as string, x.feito_em as string])),
    assistidas: new Set((p.data ?? []).filter((x) => x.tipo === "aula").map((x) => x.item as string)),
  };
}
export type Curso = Awaited<ReturnType<typeof buscarCurso>>;

/** Estado de cada fundamento na trilha. A equipe vê tudo liberado para conferir o conteúdo. */
export function trilha(c: Curso, equipe = false) {
  const atual = c.fundamentos.find((f) => !c.provas.has(f.codigo) && c.notas.get(f.codigo) !== 2) ?? null;
  const estado = new Map<string, Estado>();
  for (const f of c.fundamentos) {
    if (c.provas.has(f.codigo)) estado.set(f.codigo, "entregue");
    else if (c.notas.get(f.codigo) === 2) estado.set(f.codigo, "ja-funciona");
    else if (f.codigo === atual?.codigo) estado.set(f.codigo, "atual");
    else estado.set(f.codigo, equipe ? "liberado" : "bloqueado");
  }
  const placar = c.provas.size;
  const porPilar = Object.keys(PILARES).map((p) => ({
    pilar: p, nome: PILARES[p],
    feitos: c.fundamentos.filter((f) => pilarDe(f.codigo) === p && c.provas.has(f.codigo)).length,
    total: c.fundamentos.filter((f) => pilarDe(f.codigo) === p).length,
  }));
  return { estado, atual, placar, porPilar, raioxFeito: c.notas.size >= c.fundamentos.length && c.fundamentos.length > 0 };
}

export const ROTULO_ESTADO: Record<Estado, { texto: string; classe: string }> = {
  entregue: { texto: "prova entregue", classe: "feito" },
  "ja-funciona": { texto: "já funciona", classe: "feito" },
  atual: { texto: "você está aqui", classe: "andamento" },
  liberado: { texto: "liberado", classe: "espera" },
  bloqueado: { texto: "🔒 depois da prova anterior", classe: "espera" },
};

export function embedVideo(url: string) {
  const yt = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  return null;
}

// ───── Ações da loja ─────

const sb = () => supabaseBrowser();

export async function marcarAula(portalId: string, codigo: string, vista: boolean) {
  const { error } = vista
    ? await sb().from("curso_progresso").upsert({ portal_id: portalId, tipo: "aula", item: codigo })
    : await sb().from("curso_progresso").delete().match({ portal_id: portalId, tipo: "aula", item: codigo });
  if (error) throw new Error(error.message);
}

export async function marcarProva(portalId: string, codigo: string, entregue: boolean) {
  const { error } = entregue
    ? await sb().from("curso_progresso").upsert({ portal_id: portalId, tipo: "prova", item: codigo })
    : await sb().from("curso_progresso").delete().match({ portal_id: portalId, tipo: "prova", item: codigo });
  if (error) throw new Error(error.message);
}

export async function salvarNota(portalId: string, codigo: string, nota: number) {
  const { error } = await sb().from("curso_raiox").upsert({ portal_id: portalId, codigo, nota, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// ───── Equipe: vídeos e materiais ─────

export async function aulaVideo(id: string, form: FormData) {
  const url = String(form.get("video_url") ?? "").trim().slice(0, 1000);
  const titulo = String(form.get("titulo") ?? "").trim().slice(0, 200);
  const { error } = await sb().from("curso_aulas").update({ video_url: url || null, ...(titulo ? { titulo } : {}) }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function ferramentaLink(id: string, form: FormData) {
  const url = String(form.get("url") ?? "").trim().slice(0, 1000);
  const { error } = await sb().from("curso_ferramentas").update({ url: url || null }).eq("id", id);
  if (error) throw new Error(error.message);
}
