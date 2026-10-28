"use client";

// Site (loja virtual): números do mês, régua de recompra, atendimento e checklist da operação.
import { hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

export type SiteMes = { portal_id: string; mes: string; faturamento: number; pedidos: number; visitas: number; clientes_novos: number; meta: number; obs: string };
export type ClienteSite = { id: string; portal_id: string; nome: string; telefone: string; ultima_compra: string | null; aniversario: string | null; etapa: string; ultimo_contato: string | null; obs: string };
export type Atendimento = { id: string; portal_id: string; dia: string; canal: string; cliente: string; assunto: string; responsavel: string; prazo: string | null; status: string; resolvido_em: string | null; obs: string };
export type ItemOperacao = { id: string; portal_id: string; item: string; frequencia: string; responsavel: string; feito_em: string | null; ordem: number };

const sb = () => supabaseBrowser();
async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}
const dias = (d: string | null) => (d ? Math.round((Date.parse(hoje()) - Date.parse(d)) / 86_400_000) : null);

// ───── Números do mês ─────
export async function buscarMeses(portalId: string) {
  const { data } = await sb().from("site_mes").select("*").eq("portal_id", portalId).order("mes", { ascending: false }).limit(24);
  return (data ?? []) as SiteMes[];
}
export const salvarMes = (portalId: string, d: Omit<SiteMes, "portal_id">) =>
  ok(sb().from("site_mes").upsert({ ...d, portal_id: portalId, updated_at: new Date().toISOString() }, { onConflict: "portal_id,mes" }));
export const excluirMes = (portalId: string, mes: string) => ok(sb().from("site_mes").delete().eq("portal_id", portalId).eq("mes", mes));

// ───── Régua de recompra ─────
// Cada passo vale numa janela de dias depois da última compra. Aniversário: no mês do aniversário.
export const REGUA = [
  { id: "pos", nome: "Pós-venda", de: 3, ate: 10, msg: "Oi, {nome}! Sua compra chegou certinha? Quero saber se você gostou e se serviu bem." },
  { id: "30", nome: "30 dias", de: 30, ate: 44, msg: "Oi, {nome}! Chegaram peças novas que combinam com o que você levou. Quer que eu te mande as fotos?" },
  { id: "60", nome: "60 dias", de: 60, ate: 74, msg: "Oi, {nome}! Separei umas novidades pensando em você. Posso te mostrar?" },
  { id: "90", nome: "90 dias", de: 90, ate: 120, msg: "Oi, {nome}! Faz um tempinho que você não passa por aqui. Tenho uma condição especial para você voltar." },
] as const;
export const MSG_ANIVERSARIO = "Feliz aniversário, {nome}! Preparamos um presente para você usar no seu mês. Quer saber qual é?";

// etapa guarda os passos já feitos desde a última compra, separados por vírgula (ex.: "pos,30,aniv-2026").
const feitos = (c: ClienteSite) => c.etapa.split(",").filter(Boolean);

/** O passo da régua em que o cliente está hoje (ou null se não tem nada a fazer). */
export function passoDe(c: ClienteSite) {
  const d = dias(c.ultima_compra);
  if (d === null) return null;
  const p = REGUA.find((r) => d >= r.de && d <= r.ate);
  if (!p || feitos(c).includes(p.id)) return null;
  return p;
}
export const fazAniversarioEsteMes = (c: ClienteSite) =>
  !!c.aniversario && c.aniversario.slice(5, 7) === hoje().slice(5, 7) && !feitos(c).includes(`aniv-${hoje().slice(0, 4)}`);
export const diasDesdeCompra = (c: ClienteSite) => dias(c.ultima_compra);

export async function buscarClientesSite(portalId: string) {
  const { data } = await sb().from("site_clientes").select("*").eq("portal_id", portalId).order("ultima_compra", { ascending: false, nullsFirst: false }).limit(5000);
  return (data ?? []) as ClienteSite[];
}
export const salvarClienteSite = (portalId: string, id: string | null, d: Partial<ClienteSite>) =>
  ok(id ? sb().from("site_clientes").update(d).eq("id", id) : sb().from("site_clientes").insert({ ...d, portal_id: portalId }));
export const excluirClienteSite = (id: string) => ok(sb().from("site_clientes").delete().eq("id", id));
/** Marca o passo da régua como feito hoje. */
export const marcarPasso = (c: ClienteSite, passo: string) =>
  ok(sb().from("site_clientes").update({ etapa: [...feitos(c), passo].join(","), ultimo_contato: hoje() }).eq("id", c.id));

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
/** Lê o CSV de clientes do site (nome, telefone, última compra, aniversário). */
export function lerClientesSite(texto: string) {
  const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (linhas.length < 2) return [];
  const sep = (linhas[0].match(/;/g)?.length ?? 0) > (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const partir = (l: string) => {
    const out: string[] = []; let atual = ""; let aspas = false;
    for (const ch of l) { if (ch === '"') aspas = !aspas; else if (ch === sep && !aspas) { out.push(atual); atual = ""; } else atual += ch; }
    out.push(atual); return out.map((x) => x.trim());
  };
  const cab = partir(linhas[0]).map(sem);
  const achar = (re: RegExp) => cab.findIndex((h) => re.test(h));
  const iNome = achar(/^(nome|cliente)/), iTel = achar(/(telefone|whatsapp|celular|fone)/), iUlt = achar(/(ultim|data)/), iAniv = achar(/(aniver|nascimento)/);
  const data = (t = "") => {
    const m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
  };
  return linhas.slice(1).map(partir).map((v) => ({
    nome: (v[iNome] ?? "").slice(0, 120), telefone: iTel >= 0 ? (v[iTel] ?? "").slice(0, 30) : "",
    ultima_compra: iUlt >= 0 ? data(v[iUlt]) : null, aniversario: iAniv >= 0 ? data(v[iAniv]) : null,
  })).filter((c) => iNome >= 0 && c.nome.trim());
}
export async function importarClientesSite(portalId: string, novos: Partial<ClienteSite>[], atuais: ClienteSite[]) {
  const chave = (c: Partial<ClienteSite>) => c.telefone?.replace(/\D/g, "").slice(-9) || sem(c.nome ?? "");
  const porChave = new Map(atuais.map((c) => [chave(c), c]));
  const inserir: Partial<ClienteSite>[] = [];
  let atualizados = 0;
  for (const n of novos) {
    const ja = porChave.get(chave(n));
    if (ja) {
      // Compra nova zera a régua.
      const campos: Partial<ClienteSite> = Object.fromEntries(Object.entries(n).filter(([, v]) => v));
      if (n.ultima_compra && n.ultima_compra !== ja.ultima_compra) campos.etapa = "";
      await salvarClienteSite(portalId, ja.id, campos); atualizados++;
    } else inserir.push({ ...n, portal_id: portalId });
  }
  for (let i = 0; i < inserir.length; i += 500) await ok(sb().from("site_clientes").insert(inserir.slice(i, i + 500)));
  return { novos: inserir.length, atualizados };
}

// ───── Atendimento ─────
export async function buscarAtendimentos(portalId: string) {
  const desde = new Date(Date.parse(hoje()) - 60 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await sb().from("site_atendimentos").select("*").eq("portal_id", portalId).or(`status.eq.aberto,dia.gte.${desde}`).order("dia", { ascending: false });
  return (data ?? []) as Atendimento[];
}
export const salvarAtendimento = (portalId: string, id: string | null, d: Partial<Atendimento>) =>
  ok(id ? sb().from("site_atendimentos").update(d).eq("id", id) : sb().from("site_atendimentos").insert({ ...d, portal_id: portalId }));
export const excluirAtendimento = (id: string) => ok(sb().from("site_atendimentos").delete().eq("id", id));
export const atrasado = (a: Atendimento) => a.status === "aberto" && !!a.prazo && a.prazo < hoje();

// ───── Operação ─────
export const FREQUENCIAS: Record<string, { nome: string; dias: number }> = {
  diaria: { nome: "Todo dia", dias: 1 }, semanal: { nome: "Toda semana", dias: 7 }, mensal: { nome: "Todo mês", dias: 30 },
};
/** Checklist sugerido para começar (a loja edita, exclui e cria os seus). */
export const OPERACAO_PADRAO: [string, string][] = [
  ["Responder as mensagens e comentários do site", "diaria"],
  ["Separar e despachar os pedidos do dia", "diaria"],
  ["Conferir pedidos parados no pagamento ou no envio", "diaria"],
  ["Subir as novidades com foto, medida e preço", "semanal"],
  ["Tirar do ar o que esgotou no estoque", "semanal"],
  ["Mandar a régua de recompra (pós-venda, 30, 60, 90 dias)", "semanal"],
  ["Conferir trocas e devoluções abertas", "semanal"],
  ["Lançar os números do mês no painel do site", "mensal"],
  ["Planejar as campanhas e o calendário do próximo mês", "mensal"],
];
export const vencido = (i: ItemOperacao) => !i.feito_em || (dias(i.feito_em) ?? 0) >= (FREQUENCIAS[i.frequencia]?.dias ?? 7);
export async function buscarOperacao(portalId: string) {
  const { data } = await sb().from("site_operacao").select("*").eq("portal_id", portalId).order("ordem").order("created_at");
  return (data ?? []) as ItemOperacao[];
}
export const salvarItem = (portalId: string, id: string | null, d: Partial<ItemOperacao>) =>
  ok(id ? sb().from("site_operacao").update(d).eq("id", id) : sb().from("site_operacao").insert({ ...d, portal_id: portalId }));
export const excluirItem = (id: string) => ok(sb().from("site_operacao").delete().eq("id", id));
export const criarPadrao = (portalId: string) =>
  ok(sb().from("site_operacao").insert(OPERACAO_PADRAO.map(([item, frequencia], ordem) => ({ portal_id: portalId, item, frequencia, ordem }))));
