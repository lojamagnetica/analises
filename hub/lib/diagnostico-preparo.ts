"use client";

// A preparação do Diagnóstico com o agente (só a Camilla): material, Raio-X, escolha do gargalo, perguntas para a CS,
// solução e roteiro, e por fim o Diagnóstico da loja no Hub. A CS vê só as perguntas liberadas e cola as respostas.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Parada = "raiox" | "perguntas" | "solucao" | "hub";
export type Raiox = {
  resumo: string;
  pilares: { pilar: string; nota: number; justificativa: string; bem: string; fraco: string }[];
  numeros: { rotulo: string; valor: string; fonte: string }[];
  inconsistencias: string[];
  gargalo: { pilar: string; tema: string; porque: string; alternativa: string };
  alavanca: { tipo: string; porque: string };
  faltando: { item: string; para_que: string }[];
};
export type Solucao = {
  frase: string;
  resultado1: { pilar: string; numeros: string; hoje: string; meta: string };
  solucao: { titulo: string; texto: string; decisoes: string[] };
  roteiro: { tempo: string; bloco: string; falas: string }[];
  missoes: { tipo: "correcao" | "aceleracao"; titulo: string; passos: string[]; responsavel: string; prazo: string }[];
  filtro: { pergunta: string; resposta: string }[];
  amanha: string;
  estacionamento: { tema: string; quando: string; porque: string }[];
  pdf: { notas: { pilar: string; nota: number }[]; frase: string; resultado: string; missoes: string[] };
  faltando: string[];
};
export type Escolha = { gargalo: string; alavanca: string; obs: string };
export type Agente = { parada?: Parada; estado?: "trabalhando" | "pronto" | "erro"; inicio?: string; fim?: string; msg?: string; avisos?: string[]; lote?: string };
export type Preparo = {
  portal_id: string; transcricoes: { comercial?: string; onboarding?: string; outras?: string };
  raiox: Raiox | null; escolha: Escolha | null; perguntas: string[]; perguntas_liberadas: boolean; respostas: string;
  solucao: Solucao | null; hub: Record<string, unknown> | null; ajustes: Partial<Record<Parada, string>>; agente: Agente; updated_at: string;
};
export type Arquivo = { nome: string; tamanho: number; em: string };

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

export async function buscarPreparo(portalId: string): Promise<Preparo | null> {
  const { data } = await sb().from("diagnostico_preparo").select("*").eq("portal_id", portalId).maybeSingle();
  return (data as Preparo | null) ?? null;
}
export async function salvarPreparo(portalId: string, x: Partial<Preparo>) {
  await ok(sb().from("diagnostico_preparo").upsert({ portal_id: portalId, ...x, updated_at: new Date().toISOString() }, { onConflict: "portal_id" }));
}
/** Aplica a versão do agente no Diagnóstico da loja (só enquanto ele não está liberado). */
export async function aplicarHub(portalId: string, dados: Record<string, unknown>) {
  const { data: atual } = await sb().from("loja_diagnostico").select("status, dados").eq("portal_id", portalId).eq("loja", "").maybeSingle();
  if (atual?.status === "liberada") throw new Error("O Diagnóstico desta loja está liberado. Volte ele para rascunho na página do Diagnóstico antes de aplicar.");
  // A pesquisa do segmento não vem do agente: fica a que já estava.
  const mercado = (atual?.dados as { mercado?: unknown } | null)?.mercado;
  await ok(sb().from("loja_diagnostico").upsert({ portal_id: portalId, loja: "", dados: mercado ? { ...dados, mercado } : dados, updated_at: new Date().toISOString() }, { onConflict: "portal_id,loja" }));
}
export async function excluirPreparo(portalId: string) {
  await ok(sb().from("diagnostico_preparo").delete().eq("portal_id", portalId));
}

/** Pede uma parada ao agente (roda em segundo plano; a tela acompanha pelo campo agente). */
export async function rodarParada(portalId: string, parada: Parada) {
  const { data, error } = await sb().functions.invoke("diagnostico-agente", { body: { portal_id: portalId, parada } });
  if (error) {
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error((corpo as { erro?: string } | null)?.erro ?? "Não deu para chamar o agente agora. Tente de novo.");
  }
  return data;
}
/** Pergunta ao agente se o lote da parada já terminou (e guarda a resposta quando terminou). */
export async function conferirParada(portalId: string) {
  await sb().functions.invoke("diagnostico-agente", { body: { portal_id: portalId, conferir: true } });
}

// Os relatórios da loja ficam no mesmo lugar que a loja usa para subir (relatorios/<portal>/).
export async function listarArquivos(portalId: string): Promise<Arquivo[]> {
  const { data } = await sb().storage.from("relatorios").list(portalId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  return (data ?? []).filter((f) => f.id).map((f) => ({ nome: f.name, tamanho: Number(f.metadata?.size ?? 0), em: f.created_at ?? "" }));
}
export async function subirArquivo(portalId: string, f: File) {
  const limpo = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-");
  await ok(sb().storage.from("relatorios").upload(`${portalId}/${Date.now()}-${limpo}`, f, { upsert: false, contentType: f.type || undefined }));
}
/** Copia para cá os documentos da pasta interna da loja no Drive (a pasta precisa estar compartilhada com o Hub). */
export async function importarDrive(portalId: string) {
  const { data, error } = await sb().functions.invoke("drive-importar", { body: { portal_id: portalId } });
  if (error) {
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error((corpo as { erro?: string } | null)?.erro ?? "Não deu para ler o Drive agora. Tente de novo.");
  }
  return data as { importados: string[]; pulados: string[] };
}
export const apagarArquivo =(portalId: string, nome: string) => ok(sb().storage.from("relatorios").remove([`${portalId}/${nome}`]));
export async function linkArquivo(portalId: string, nome: string) {
  const { data } = await sb().storage.from("relatorios").createSignedUrl(`${portalId}/${nome}`, 600);
  return data?.signedUrl ?? "";
}

// Para a CS: as perguntas liberadas e as respostas da loja.
export async function perguntasParaCS(portalId: string) {
  const { data } = await sb().rpc("diagnostico_perguntas", { p_portal: portalId });
  return (data as { perguntas: string[]; respostas: string; gargalo: string | null } | null) ?? null;
}
export const responderPerguntas = (portalId: string, respostas: string) => ok(sb().rpc("diagnostico_responder", { p_portal: portalId, p_respostas: respostas }));
