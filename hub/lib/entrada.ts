// A entrada da loja no Hub: primeiro o vídeo de boas-vindas, depois os dados da loja e a equipe.
// A loja vê tudo o que existe, mas cada área só abre quando a etapa que ela depende foi feita.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Requisito = "video" | "loja" | "equipe";
export type Entrada = {
  video: boolean;       // assistiu ao vídeo de boas-vindas
  loja: boolean;        // terminou todas as etapas de Dados da loja
  equipe: boolean;      // cadastrou pelo menos uma pessoa da equipe
  livre: boolean;       // a equipe liberou tudo para esta loja
  videoEm: string | null;
  pessoas: number;
};
export type VideoBoasVindas = { url: string; segundos: number };

/** Páginas que nunca travam. */
const SEMPRE = ["/inicio", "/comece", "/conta", "/sem-portal", "/jornada", "/plano", "/reunioes", "/notas", "/cursos", "/duvidas", "/assistente", "/consultoria"];
/** Do mais específico para o mais geral: a primeira regra que casa decide. */
const REGRAS: [string, Requisito][] = [
  ["/pessoas/retorno", "equipe"], ["/pessoas/reuniao-semanal", "equipe"], ["/pessoas/reuniao-mensal", "equipe"],
  ["/pessoas/desenvolvimento", "equipe"], ["/pessoas/gincanas", "equipe"],
  ["/painel", "loja"], ["/gestao", "loja"], ["/metas", "loja"], ["/estoque", "loja"],
  ["/acoes", "loja"], ["/scripts", "loja"], ["/clientes", "loja"],
];

const casa = (caminho: string, base: string) => caminho === base || caminho.startsWith(base + "/");

/** O que a página precisa para abrir (null = abre sempre). */
export function requisito(caminho: string): Requisito | null {
  if (SEMPRE.some((b) => casa(caminho, b))) return null;
  return REGRAS.find(([b]) => casa(caminho, b))?.[1] ?? "video";
}

/** A página pode abrir? Equipe e lojas liberadas pela equipe veem tudo. */
export function liberado(req: Requisito | null, e: Entrada) {
  if (!req || e.livre) return true;
  if (req === "video") return e.video;
  if (req === "loja") return e.video && e.loja;
  return e.video && e.equipe;
}

export const NOME_REQUISITO: Record<Requisito, string> = {
  video: "assistir ao vídeo de boas-vindas",
  loja: "terminar os Dados da loja",
  equipe: "cadastrar a sua equipe",
};

const chaveVideo = (portalId: string) => `lm_video_visto_${portalId}`;
/** No "Ver 100% como a loja", a equipe passa pelo vídeo só naquela aba, sem marcar nada na conta da loja. */
export function videoVistoNaAba(portalId: string) {
  try { return sessionStorage.getItem(chaveVideo(portalId)) === "1"; } catch { return false; }
}

export async function buscarEntrada(portalId: string, etapasFeitas: boolean, comoLoja: boolean): Promise<Entrada> {
  const sb = supabaseBrowser();
  const [{ data: e }, { count }] = await Promise.all([
    sb.from("portal_entrada").select("video_visto_em, livre").eq("portal_id", portalId).maybeSingle(),
    sb.from("loja_equipe").select("id", { count: "exact", head: true }).eq("portal_id", portalId).eq("ativo", true),
  ]);
  const pessoas = count ?? 0;
  return {
    video: !!e?.video_visto_em || (comoLoja && videoVistoNaAba(portalId)),
    loja: etapasFeitas,
    equipe: pessoas > 0,
    livre: !!e?.livre,
    videoEm: e?.video_visto_em ?? null,
    pessoas,
  };
}

/** A loja assistiu ao vídeo. Na visão "como a loja", vale só para a aba da equipe. */
export async function marcarVideoVisto(portalId: string, comoLoja: boolean) {
  if (comoLoja) {
    try { sessionStorage.setItem(chaveVideo(portalId), "1"); } catch { /* sem armazenamento */ }
    return;
  }
  await supabaseBrowser().rpc("marcar_video_visto");
}

export async function buscarVideo(): Promise<VideoBoasVindas | null> {
  const { data } = await supabaseBrowser().from("hub_config").select("valor").eq("chave", "video_boas_vindas").maybeSingle();
  const v = data?.valor as Partial<VideoBoasVindas> | undefined;
  return v?.url ? { url: v.url, segundos: Number(v.segundos) || 120 } : null;
}

export async function salvarVideo(url: string, segundos: number) {
  const { error } = await supabaseBrowser().from("hub_config").upsert({
    chave: "video_boas_vindas", valor: { url: url.trim(), segundos: Math.max(10, Math.round(segundos) || 120) }, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Equipe: libera (ou volta a travar) todas as áreas desta loja, mesmo sem as etapas. */
export async function liberarTudo(portalId: string, livre: boolean) {
  const { error } = await supabaseBrowser().from("portal_entrada").upsert({ portal_id: portalId, livre, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export const idYoutube = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? null;
