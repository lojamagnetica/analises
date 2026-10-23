// Conteúdo da casa: planejamento do @magnetica.hub e do perfil da Camilla (só a equipe).
import { supabaseBrowser } from "@/lib/supabase/client";

export type Perfil = "magnetica" | "camilla";
export type StatusCasa = "Ideia" | "Planejado" | "Roteiro pronto" | "Gravado ou arte pronta" | "Postado";

export type PostCasa = {
  id: string;
  perfil: Perfil;
  data: string | null;
  horario: string | null;
  formato: string;
  funcao: string | null;
  editoria: string | null;
  titulo: string;
  gancho: string;
  angulo: string;
  palavra_chave: string | null;
  conteudo: string;
  legenda: string;
  comentario_fixado: string | null;
  status: StatusCasa;
  alcance: number | null;
  envios: number | null;
  notion_url: string | null;
};

export const PERFIS: Record<Perfil, { nome: string; arroba: string; titulo: string; avatar: string; editorias: string[] }> = {
  magnetica: {
    nome: "magnética",
    arroba: "@magnetica.hub",
    titulo: "Empresa · @magnetica.hub",
    avatar: "/conteudo/avatar-magnetica.jpg",
    editorias: ["Método", "Bastidores da casa", "Quem ensina", "Prova e transformação", "Turmas e eventos"],
  },
  camilla: {
    nome: "Camilla Ribeiro",
    arroba: "@camillaribeiromentora",
    titulo: "Meu perfil · @camillaribeiromentora",
    avatar: "/conteudo/avatar-camilla.jpg",
    editorias: ["Prática de balcão", "Gestão do dono", "Data e contexto", "Prova e transformação"],
  },
};

export const STATUS_CASA: StatusCasa[] = ["Ideia", "Planejado", "Roteiro pronto", "Gravado ou arte pronta", "Postado"];
export const FORMATOS_CASA = ["Carrossel tweet", "Split-screen", "Reel no carro", "Reel 35s", "Post de frase", "Stories"];
export const FUNCOES = ["Atrair", "Educar mentalidade", "Gerar desejo", "Gerar lead", "Conectar", "Reativar"];
export const HORARIOS = ["06h", "08h", "12h", "18h", "19h"];

export const ehCarrossel = (formato: string) => /carrossel/i.test(formato);

const sb = () => supabaseBrowser();

export async function listarPosts(perfil: Perfil) {
  const { data, error } = await sb().from("conteudo_casa").select("*").eq("perfil", perfil).order("data", { nullsFirst: false }).order("horario");
  if (error) throw new Error(error.message);
  return (data ?? []) as PostCasa[];
}

export async function lerPost(id: string) {
  const { data, error } = await sb().from("conteudo_casa").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as PostCasa | null;
}

export async function criarPost(p: Partial<PostCasa> & { perfil: Perfil }) {
  const { data, error } = await sb().from("conteudo_casa").insert(p).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function salvarPost(id: string, p: Partial<PostCasa>) {
  const { error } = await sb().from("conteudo_casa").update({ ...p, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function apagarPost(id: string) {
  const { error } = await sb().from("conteudo_casa").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Métrica-norte: envios por alcance, em %. */
export function taxaEnvio(p: Pick<PostCasa, "alcance" | "envios">) {
  return p.alcance && p.envios != null ? (p.envios / p.alcance) * 100 : null;
}

// ───── Carrossel tweet (modelo validado do perfil) ─────

export type Slide =
  | { tipo: "hook"; texto: string }
  | { tipo: "pratica"; titulo: string; texto: string }
  | { tipo: "par"; pares: { nao: string; sim: string }[] };

/**
 * Lê os slides do material escrito no padrão do Sistema CCC:
 * "**Slide 1 (gancho):** texto" · "**Slide 2 · Prática 1: título.**" + explicação · "❌ … ✅ …".
 */
export function lerSlides(md: string): Slide[] {
  const corpo = md.replace(/\r/g, "").split(/\n## (?!Slides)/)[0];
  const marcas = [...corpo.matchAll(/\*\*Slide\s+\d+([^*]*)\*\*/g)];
  return marcas.map((m, i) => {
    const fim = i + 1 < marcas.length ? marcas[i + 1].index! : corpo.length;
    const cab = m[1].trim();
    const resto = corpo.slice(m.index! + m[0].length, fim).replace(/^\s*:?\s*/, "").trim();
    const pratica = cab.match(/(Prática\s+\d+\s*:\s*.+?)\.?\s*:?$/i);
    if (pratica) return { tipo: "pratica", titulo: pratica[1].trim(), texto: resto };
    const linhas = resto.split("\n").map((l) => l.trim()).filter(Boolean);
    const pares = linhas.filter((l) => l.includes("❌") && l.includes("✅"));
    if (pares.length) {
      return {
        tipo: "par",
        pares: pares.map((l) => {
          const [a, b] = l.split("✅");
          return { nao: a.replace("❌", "").replace(/[·|]\s*$/, "").trim(), sim: b.trim() };
        }),
      };
    }
    return { tipo: "hook", texto: resto };
  });
}
