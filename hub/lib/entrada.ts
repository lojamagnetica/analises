// A entrada da loja no Hub segue a jornada:
// 1) primeiro acesso: Início, Comece aqui, 7 passos, Reuniões, Curso, Fale com a Camilla e a Análise do Instagram;
// 2) depois do vídeo: o que alimenta o Diagnóstico (Dados da loja, Estoque e relatórios, Minha equipe e perfis);
// 3) com o Diagnóstico liberado pela equipe: Diagnóstico, Plano de Ação, Gestão de pessoas e o resto.
import { supabaseBrowser } from "@/lib/supabase/client";
import { diasUteisDepois } from "@/lib/jornada";

export type Requisito = "video" | "diagnostico";
export type Entrada = {
  video: boolean;       // assistiu ao vídeo de boas-vindas
  loja: boolean;        // terminou todas as etapas de Dados da loja
  equipe: boolean;      // cadastrou pelo menos uma pessoa da equipe
  diagnostico: boolean; // a equipe liberou o Diagnóstico
  livre: boolean;       // a equipe liberou tudo para esta loja
  videoEm: string | null;
  dadosEm: string | null; // quando a loja terminou de mandar tudo
  pessoas: number;
};
export type VideoBoasVindas = { url: string; segundos: number };

/** Páginas que nunca travam. */
const SEMPRE = ["/inicio", "/comece", "/conta", "/sem-portal", "/jornada", "/reunioes", "/cursos", "/duvidas", "/assistente", "/consultoria"];
/** Só a página exata (as subpáginas seguem as regras). */
const SEMPRE_EXATA = ["/conteudo"];
/** Do mais específico para o mais geral: a primeira regra que casa decide. O que não está aqui espera o Diagnóstico. */
const REGRAS: [string, Requisito][] = [
  ["/personalizacao", "video"],
  ["/pessoas/retorno", "diagnostico"], ["/pessoas/reuniao-semanal", "diagnostico"], ["/pessoas/reuniao-mensal", "diagnostico"],
  ["/pessoas/desenvolvimento", "diagnostico"], ["/pessoas/gincanas", "diagnostico"],
  ["/pessoas", "video"],
];

const casa = (caminho: string, base: string) => caminho === base || caminho.startsWith(base + "/");

/** O que a página precisa para abrir (null = abre sempre). */
export function requisito(caminho: string): Requisito | null {
  if (SEMPRE.some((b) => casa(caminho, b)) || SEMPRE_EXATA.includes(caminho)) return null;
  return REGRAS.find(([b]) => casa(caminho, b))?.[1] ?? "diagnostico";
}

/** A página pode abrir? Equipe e lojas liberadas pela equipe veem tudo. */
export function liberado(req: Requisito | null, e: Entrada) {
  if (!req || e.livre) return true;
  if (req === "video") return e.video;
  return e.video && e.diagnostico;
}

/** A loja já mandou tudo o que o Diagnóstico precisa. */
export const dadosCompletos = (e: Entrada) => e.video && e.loja && e.equipe;

/** Até quando o Diagnóstico fica pronto: 5 dias úteis depois que a loja mandou tudo. */
export const PRAZO_DIAGNOSTICO = 5;
export const prazoDiagnostico = (dadosEm: string) =>
  diasUteisDepois(new Date(dadosEm).toLocaleDateString("sv-SE", { timeZone: "America/Recife" }), PRAZO_DIAGNOSTICO);

export const NOME_REQUISITO: Record<Requisito, string> = {
  video: "assistir ao vídeo de boas-vindas",
  diagnostico: "receber o seu Diagnóstico",
};

const chaveVideo = (portalId: string) => `lm_video_visto_${portalId}`;
/** No "Ver 100% como a loja", a equipe passa pelo vídeo só naquela aba, sem marcar nada na conta da loja. */
export function videoVistoNaAba(portalId: string) {
  try { return sessionStorage.getItem(chaveVideo(portalId)) === "1"; } catch { return false; }
}

export async function buscarEntrada(portalId: string, etapasFeitas: boolean, comoLoja: boolean): Promise<Entrada> {
  const sb = supabaseBrowser();
  const [{ data: e }, { count }, { count: diag }] = await Promise.all([
    sb.from("portal_entrada").select("video_visto_em, livre, dados_enviados_em").eq("portal_id", portalId).maybeSingle(),
    sb.from("loja_equipe").select("id", { count: "exact", head: true }).eq("portal_id", portalId).eq("ativo", true),
    sb.from("loja_diagnostico").select("loja", { count: "exact", head: true }).eq("portal_id", portalId).eq("status", "liberada"),
  ]);
  const pessoas = count ?? 0;
  return {
    video: !!e?.video_visto_em || (comoLoja && videoVistoNaAba(portalId)),
    loja: etapasFeitas,
    equipe: pessoas > 0,
    diagnostico: (diag ?? 0) > 0,
    livre: !!e?.livre,
    videoEm: e?.video_visto_em ?? null,
    dadosEm: e?.dados_enviados_em ?? null,
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

/** A loja terminou de mandar tudo: começa a contar o prazo do Diagnóstico. Na visão "como a loja", não marca nada. */
export async function marcarDadosEnviados() {
  await supabaseBrowser().rpc("marcar_dados_enviados");
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
