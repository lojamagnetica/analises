"use client";

// Indique uma loja: a indicação vira lead no Comercial (origem Indicação); a loja acompanha só nome e situação.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Indicacao = { id: string; nome: string; loja: string | null; whatsapp: string | null; instagram: string | null; situacao: string; criada_em: string };

const CHAVE_PREMIO = "indique_premio";
const sb = () => supabaseBrowser();

export async function buscarIndique(portalId: string) {
  const [{ data, error }, { data: premio }] = await Promise.all([
    sb().rpc("minhas_indicacoes", { p_portal: portalId }),
    sb().from("hub_config").select("valor").eq("chave", CHAVE_PREMIO).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  return { indicacoes: (data ?? []) as Indicacao[], premio: String((premio?.valor as { texto?: string } | undefined)?.texto ?? "").trim() };
}

export async function indicarLoja(portalId: string, f: FormData) {
  const t = (k: string) => String(f.get(k) ?? "").trim();
  if (!f.get("sabe")) throw new Error("Marque que a pessoa sabe que você vai indicar.");
  const { error } = await sb().rpc("indicar_loja", {
    p_nome: t("nome"), p_loja: t("loja"), p_whatsapp: t("whatsapp"), p_instagram: t("instagram"), p_cidade: t("cidade"), p_motivo: t("motivo"), p_portal: portalId,
  });
  if (error) throw new Error(error.message);
}

/** Enquanto está como Recebida, a loja pode corrigir os dados ou retirar a indicação. */
export async function editarIndicacao(portalId: string, id: string, f: FormData) {
  const t = (k: string) => String(f.get(k) ?? "").trim();
  const { error } = await sb().rpc("editar_indicacao", { p_id: id, p_nome: t("nome"), p_loja: t("loja"), p_whatsapp: t("whatsapp"), p_instagram: t("instagram"), p_portal: portalId });
  if (error) throw new Error(error.message);
}

export async function retirarIndicacao(portalId: string, id: string) {
  const { error } = await sb().rpc("retirar_indicacao", { p_id: id, p_portal: portalId });
  if (error) throw new Error(error.message);
}

/** Equipe: o texto do prêmio (vazio = a página não mostra prêmio). */
export async function salvarPremio(texto: string) {
  const { error } = await sb().from("hub_config").upsert({ chave: CHAVE_PREMIO, valor: { texto: texto.trim().slice(0, 600) }, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Mensagem para a lojista mandar antes de indicar. */
export const mensagemIndicacao = (nome: string) =>
  `Oi${nome ? `, ${nome}` : ""}! Tudo bem? 😊

Estou fazendo a mentoria da Loja Magnética para organizar e fazer a minha loja vender mais, e lembrei de você.

Posso passar o seu contato para a equipe te chamar e explicar como funciona? É só uma conversa, sem compromisso.`;

export const SELO_SITUACAO: Record<string, string> = { "Recebida": "espera", "Em conversa": "andamento", "Entrou ✅": "feito", "Não fechou": "alerta" };
