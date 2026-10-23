"use client";

// Todas as alterações do Hub. Rodam no navegador com a sessão de quem está logado:
// as regras do banco (RLS) garantem que cada mentorado só mexe no próprio portal
// e que só a equipe faz o que é da equipe.
import { supabaseBrowser, erroDaFuncao } from "@/lib/supabase/client";
import { BASE } from "@/lib/config";
import { BLOCOS_PLANEJE, ETAPAS, type Respostas } from "@/lib/conteudo";
import { localParaIso } from "@/lib/formato";

const sb = () => supabaseBrowser();
const txt = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);
const apelidos = (s: string) => s.split(",").map((a) => a.trim()).filter(Boolean);
const agora = () => new Date().toISOString();

// ───── Mentorado ─────

export async function salvarEtapa(portalId: string, numero: number, form: FormData) {
  const etapa = ETAPAS.find((e) => e.numero === numero);
  if (!etapa) return;
  const respostas: Respostas = {};
  for (const c of etapa.campos) {
    respostas[c.id] = c.tipo === "multi" ? form.getAll(c.id).map(String) : txt(form, c.id);
  }
  await sb().from("personalizacao").upsert({ portal_id: portalId, etapa: numero, respostas, concluida: true, updated_at: agora() });
}

export async function marcarPlano(id: string, feito: boolean) {
  await sb().from("plano_itens").update({ feito, feito_em: feito ? agora() : null }).eq("id", id);
}

export async function salvarPlaneje(portalId: string, mes: number, bloco: string, texto: string) {
  if (mes < 0 || mes > 11 || !BLOCOS_PLANEJE.includes(bloco)) return;
  await sb().from("planeje").upsert({ portal_id: portalId, mes, bloco, texto: texto.slice(0, 8000), updated_at: agora() });
}

export async function kanbanCriar(portalId: string, titulo: string) {
  const t = titulo.trim().slice(0, 300);
  if (t) await sb().from("kanban_cards").insert({ portal_id: portalId, titulo: t, coluna: 0 });
}
export async function kanbanMover(id: string, coluna: number) {
  await sb().from("kanban_cards").update({ coluna: Math.max(0, Math.min(4, coluna)) }).eq("id", id);
}
export async function kanbanApagar(id: string) {
  await sb().from("kanban_cards").delete().eq("id", id);
}

export async function notaCriar(portalId: string, autor: string, form: FormData) {
  const titulo = txt(form, "titulo", 200) || "Sem título";
  const conteudo = txt(form, "conteudo", 20000);
  if (!conteudo && titulo === "Sem título") return;
  await sb().from("notas").insert({ portal_id: portalId, autor, titulo, conteudo });
}
export async function notaApagar(id: string) {
  await sb().from("notas").delete().eq("id", id);
}

export async function duvidaEnviar(portalId: string, autor: string, form: FormData) {
  const pergunta = txt(form, "pergunta");
  if (pergunta) await sb().from("duvidas").insert({ portal_id: portalId, autor, pergunta });
}

export async function limparChat(portalId: string) {
  await sb().from("chat_mensagens").delete().eq("portal_id", portalId);
}

export async function salvarNome(form: FormData) {
  const nome = txt(form, "nome", 120);
  if (nome) await sb().rpc("salvar_meu_nome", { novo: nome });
}

// ───── Equipe ─────

/**
 * Link de acesso de uso único, sem depender de e-mail: convite para conta nova, link de entrada
 * para quem já tem. Quem gera é a função "acesso" do Supabase, que confere se quem pediu é da equipe
 * e, com portalId, já liga a pessoa ao portal.
 */
export async function gerarLink(email: string, nome: string, portalId?: string) {
  const { data, error } = await sb().functions.invoke("acesso", { body: { email, nome, portal_id: portalId ?? null } });
  if (error) throw new Error(await erroDaFuncao(error));
  const { hash, tipo } = data as { hash: string; tipo: "invite" | "email" };
  return `${location.origin}${BASE}/auth/confirm/?token_hash=${hash}&type=${tipo}`;
}

async function linkOuAviso(email: string, nome: string, portalId: string) {
  try {
    return { link: await gerarLink(email, nome, portalId) };
  } catch (e) {
    return { aviso: `Não foi possível criar o acesso de ${email}: ${(e as Error).message}` };
  }
}

export async function criarPortal(form: FormData) {
  const loja = txt(form, "loja", 200);
  if (!loja) throw new Error("Preencha o nome da loja.");
  const email = txt(form, "email", 200).toLowerCase();
  const responsavel = txt(form, "responsavel", 200);
  const { data: portal, error } = await sb()
    .from("portais")
    .insert({
      loja,
      responsavel: responsavel || null,
      email: email || null,
      whatsapp: txt(form, "whatsapp", 60) || null,
      tipo: txt(form, "tipo", 40) || "Mentoria",
      inicio: txt(form, "inicio", 10) || null,
      meet_url: txt(form, "meet_url", 500) || null,
      apelidos: apelidos(txt(form, "apelidos", 500)),
    })
    .select("id")
    .single();
  if (error || !portal) throw new Error(error?.message ?? "Erro ao criar o portal");

  // O Plano de Ação começa a partir do modelo da Biblioteca; a equipe ajusta depois.
  const { data: modelo } = await sb().from("plano_modelo").select("mes, ordem, texto").order("mes").order("ordem");
  if (modelo?.length) await sb().from("plano_itens").insert(modelo.map((m) => ({ ...m, portal_id: portal.id })));

  const acesso: { link?: string; aviso?: string } = email ? await linkOuAviso(email, responsavel, portal.id) : {};
  return { id: portal.id as string, ...acesso };
}

export async function atualizarPortal(id: string, form: FormData) {
  await sb().from("portais").update({
    loja: txt(form, "loja", 200),
    responsavel: txt(form, "responsavel", 200) || null,
    email: txt(form, "email", 200) || null,
    whatsapp: txt(form, "whatsapp", 60) || null,
    tipo: txt(form, "tipo", 40) || "Mentoria",
    inicio: txt(form, "inicio", 10) || null,
    passo_atual: Math.min(7, Math.max(1, Number(form.get("passo_atual")) || 1)),
    meet_url: txt(form, "meet_url", 500) || null,
    apelidos: apelidos(txt(form, "apelidos", 500)),
    ativo: form.get("ativo") === "on",
  }).eq("id", id);
}

export async function convidarPessoa(portalId: string, form: FormData): Promise<{ link?: string; aviso?: string }> {
  const email = txt(form, "email", 200).toLowerCase();
  if (!email) return {};
  return linkOuAviso(email, txt(form, "nome", 200), portalId);
}

export async function desligarPessoa(portalId: string, userId: string) {
  await sb().from("perfis").update({ portal_id: null }).eq("id", userId).eq("portal_id", portalId);
}

export async function planoAdicionar(portalId: string, form: FormData) {
  const texto = txt(form, "texto", 500);
  if (texto) await sb().from("plano_itens").insert({ portal_id: portalId, mes: Number(form.get("mes")) || 1, ordem: 99, texto });
}
export async function planoApagar(id: string) {
  await sb().from("plano_itens").delete().eq("id", id);
}

export async function reuniaoSalvar(portalId: string, id: string | null, form: FormData) {
  const quando = txt(form, "data", 20);
  const dados = {
    titulo: txt(form, "titulo", 300) || "Reunião individual",
    selecionar: txt(form, "selecionar", 20) || "Pendente",
    status: txt(form, "status", 20) || "Não iniciada",
    gravacao_url: txt(form, "gravacao_url", 1000) || null,
    ata: txt(form, "ata", 20000) || null,
    ...(quando ? { data: localParaIso(quando) } : {}),
  };
  if (id) await sb().from("reunioes").update(dados).eq("id", id);
  else if (quando) await sb().from("reunioes").insert({ ...dados, portal_id: portalId });
}
export async function reuniaoApagar(id: string) {
  await sb().from("reunioes").delete().eq("id", id);
}

export async function responderDuvida(id: string, userId: string, form: FormData) {
  const resposta = txt(form, "resposta", 8000);
  if (resposta) await sb().from("duvidas").update({ resposta, respondida_por: userId, respondida_em: agora() }).eq("id", id);
}

// ───── Biblioteca ─────

export async function scriptSalvar(id: string | null, form: FormData) {
  const dados = {
    categoria: txt(form, "categoria", 60),
    titulo: txt(form, "titulo", 200),
    quando: txt(form, "quando", 500),
    texto: txt(form, "texto", 8000),
    ordem: Number(form.get("ordem")) || 0,
  };
  if (!dados.categoria || !dados.titulo || !dados.texto) return;
  if (id) await sb().from("scripts").update(dados).eq("id", id);
  else await sb().from("scripts").insert(dados);
}
export async function scriptApagar(id: string) {
  await sb().from("scripts").delete().eq("id", id);
}

export async function aulaSalvar(id: string | null, form: FormData) {
  const dados = {
    modulo: txt(form, "modulo", 200),
    titulo: txt(form, "titulo", 200),
    descricao: txt(form, "descricao", 2000),
    video_url: txt(form, "video_url", 1000) || null,
    ordem: Number(form.get("ordem")) || 0,
  };
  if (!dados.modulo || !dados.titulo) return;
  if (id) await sb().from("aulas").update(dados).eq("id", id);
  else await sb().from("aulas").insert(dados);
}
export async function aulaApagar(id: string) {
  await sb().from("aulas").delete().eq("id", id);
}

export async function passoSalvar(numero: number, form: FormData) {
  await sb().from("jornada_passos").update({
    titulo: txt(form, "titulo", 200),
    descricao: txt(form, "descricao", 500),
    conteudo: txt(form, "conteudo", 30000),
  }).eq("numero", numero);
}

export async function modeloAdicionar(form: FormData) {
  const texto = txt(form, "texto", 500);
  if (texto) await sb().from("plano_modelo").insert({ mes: Number(form.get("mes")) || 1, ordem: 99, texto });
}
export async function modeloApagar(id: string) {
  await sb().from("plano_modelo").delete().eq("id", id);
}
