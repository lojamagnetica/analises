"use client";

// Ações de uma pendência (combinado ou lembrete), iguais em todo lugar do Hub:
// Resolver (vai direto para onde se resolve), Feito, Adiar, WhatsApp, Passar para a Claudia, Abrir a loja.
import { supabaseBrowser } from "@/lib/supabase/client";
import { somarDias } from "@/lib/agenda";
import { hoje } from "@/lib/formato";

const sb = () => supabaseBrowser();

export type Pendencia = {
  id: string;
  origem: "combinado" | "lembrete";
  texto: string;
  link?: string | null;
  portalId: string | null;
  whatsapp?: string | null;
};

/** Para onde o "Resolver" leva. `portal` = abrir o portal da loja já na página certa. */
export type Destino = { rotulo: string; href?: string; externo?: boolean; portal?: { id: string; rota: string } };

const URL_NO_TEXTO = /https?:\/\/[^\s)"'>]+/i;

/** Regras, da mais específica para a mais geral. O texto vem sem acento e em minúsculas. */
const REGRAS: { teste: RegExp; rotulo: string; rota: (p: string) => Omit<Destino, "rotulo"> }[] = [
  { teste: /caixa|lancamento|lancar (as )?vendas/, rotulo: "Abrir o caixa", rota: (p) => ({ portal: { id: p, rota: "/gestao/caixa" } }) },
  { teste: /analise do instagram|analise de perfil|analise da semana|leitura da semana/, rotulo: "Abrir a análise", rota: (p) => ({ href: `/equipe/analise?p=${p}` }) },
  { teste: /diagnostico/, rotulo: "Abrir a jornada", rota: (p) => ({ href: `/equipe/loja?id=${p}&aba=jornada` }) },
  { teste: /gamificacao|missao|missoes/, rotulo: "Abrir as missões", rota: (p) => ({ portal: { id: p, rota: "/clientes/missoes" } }) },
  { teste: /pos-venda|pos venda|clientes|lista dos|top 10|aniversari/, rotulo: "Abrir os clientes", rota: (p) => ({ portal: { id: p, rota: "/clientes" } }) },
  { teste: /roteiro|stories|video|criativo|campanha|post|conteudo|reels|carrossel/, rotulo: "Abrir o conteúdo", rota: (p) => ({ portal: { id: p, rota: "/conteudo" } }) },
  { teste: /planejamento|plano do mes|plano de acao|meta do mes|meta de/, rotulo: "Abrir o plano", rota: (p) => ({ portal: { id: p, rota: "/plano" } }) },
  { teste: /acesso|cadastr|login|senha|portal/, rotulo: "Abrir acesso e dados", rota: (p) => ({ href: `/equipe/loja?id=${p}&aba=acesso` }) },
  { teste: /reuniao|ata|encontro/, rotulo: "Abrir reuniões", rota: (p) => ({ href: `/equipe/loja?id=${p}&aba=reunioes` }) },
  { teste: /cronograma|entregas|relatorio/, rotulo: "Abrir reuniões e planos", rota: (p) => ({ href: `/equipe/loja?id=${p}&aba=reunioes` }) },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function destinoDe(p: Pick<Pendencia, "texto" | "link" | "portalId">): Destino | null {
  const link = p.link?.trim();
  if (link) {
    if (!link.startsWith("/")) return { rotulo: "Resolver", href: link, externo: true };
    // Página do portal da loja (ex.: /consultoria/materiais/ver?id=…): abre o portal dela já nessa página.
    if (p.portalId && !/^\/(equipe|empresa)(\/|$)/.test(link)) return { rotulo: "Resolver", portal: { id: p.portalId, rota: link } };
    return { rotulo: "Resolver", href: link };
  }
  const url = p.texto.match(URL_NO_TEXTO)?.[0];
  if (url) return { rotulo: "Abrir o link", href: url, externo: true };
  const t = semAcento(p.texto);
  if (p.portalId) {
    const r = REGRAS.find((x) => x.teste.test(t));
    if (r) return { rotulo: r.rotulo, ...r.rota(p.portalId) };
    return { rotulo: "Abrir a loja", href: `/equipe/loja?id=${p.portalId}&aba=conversas` };
  }
  if (/roteiro|post|reels|carrossel|conteudo|video|grav/.test(t)) return { rotulo: "Abrir o conteúdo", href: "/empresa/conteudo" };
  return null;
}

export async function marcarFeito(p: Pendencia, feito = true) {
  const r = p.origem === "combinado"
    ? await sb().rpc("combinado_marcar", { p_id: p.id, p_feito: feito })
    : await sb().from("equipe_lembretes").update({ feito }).eq("id", p.id);
  if (r.error) throw new Error(r.error.message);
}

/** Muda o prazo (combinado) ou o dia (lembrete) sem perder a pendência. */
export async function adiar(p: Pendencia, dia: string) {
  const r = p.origem === "combinado"
    ? await sb().from("loja_combinados").update({ prazo: dia }).eq("id", p.id)
    : await sb().from("equipe_lembretes").update({ quando: dia }).eq("id", p.id);
  if (r.error) throw new Error(r.error.message);
}
export const amanha = () => somarDias(hoje(), 1);
export const proximaSemana = () => somarDias(hoje(), 7);

/** Passa para a Claudia: o combinado muda de dono; o lembrete vai para a lista dela. */
export async function passarParaClaudia(p: Pendencia, meuId: string) {
  if (p.origem === "combinado") {
    const { error } = await sb().from("loja_combinados").update({ quem: "claudia" }).eq("id", p.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { data } = await sb().from("perfis").select("id").eq("conversas_equipe", true).neq("id", meuId).limit(1);
  const cs = (data ?? [])[0] as { id: string } | undefined;
  if (!cs) throw new Error("Não achei a CS para passar o lembrete.");
  const { error } = await sb().from("equipe_lembretes").update({ responsavel: cs.id }).eq("id", p.id);
  if (error) throw new Error(error.message);
}

export function mensagemCobranca(texto: string) {
  return `Oi! Tudo bem? Passando para lembrar do nosso combinado: ${texto.replace(URL_NO_TEXTO, "").trim()}. Consegue me dar um retorno hoje?`;
}
