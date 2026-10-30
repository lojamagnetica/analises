"use client";

// Webinar (Hub da empresa, só a equipe): criativos, funis com um link por parceiro e os leads com a origem.
// O link do parceiro passa pelo Hub (/w?p=apelido), conta o clique e manda para o formulário do Respondi com
// utm_source=apelido. Os leads entram pelo CSV exportado do Respondi; a origem vem da coluna utm_source.
import { supabaseBrowser } from "@/lib/supabase/client";
import { normalizar } from "@/lib/agenda-regras";
import { lerArquivo, lerCsv } from "@/lib/iscas";

export type Config = { formulario: string; titulo: string; data: string };
export type Parceiro = { id: string; nome: string; apelido: string; contato: string; obs: string; ativo: boolean; created_at: string };
export type Lead = { id: string; chave: string; origem: string; nome: string | null; whatsapp: string | null; email: string | null; instagram: string | null; respondido_em: string | null; extras: Record<string, string>; importado_em: string };
export type Criativo = { id: string; titulo: string; tipo: string; arquivo: string | null; link: string | null; obs: string; created_at: string };

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

export const linkParceiro = (apelido: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/analises/portal/w/?p=${apelido}`;
export const apelidoDe = (nome: string) => normalizar(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// ----- Configuração (o formulário do Respondi) -----
export async function buscarConfig(): Promise<Config> {
  const { data } = await sb().from("hub_config").select("valor").eq("chave", "webinar").maybeSingle();
  return { formulario: "", titulo: "Webinar", data: "", ...((data?.valor ?? {}) as Partial<Config>) };
}
export const salvarConfig = (c: Config) => ok(sb().from("hub_config").upsert({ chave: "webinar", valor: c, updated_at: new Date().toISOString() }));

// ----- Parceiros e cliques -----
export async function buscarParceiros() {
  const { data } = await sb().from("webinar_parceiros").select("*").order("created_at");
  return (data ?? []) as Parceiro[];
}
export const salvarParceiro = (p: Partial<Parceiro> & { nome: string; apelido: string }) =>
  ok(p.id ? sb().from("webinar_parceiros").update({ nome: p.nome, apelido: p.apelido, contato: p.contato ?? "", obs: p.obs ?? "", ativo: p.ativo ?? true }).eq("id", p.id)
    : sb().from("webinar_parceiros").insert({ nome: p.nome, apelido: p.apelido, contato: p.contato ?? "", obs: p.obs ?? "" }));
export const excluirParceiro = (id: string) => ok(sb().from("webinar_parceiros").delete().eq("id", id));
export async function contarCliques() {
  const { data } = await sb().from("webinar_cliques").select("apelido").limit(50000);
  const m = new Map<string, number>();
  for (const c of (data ?? []) as { apelido: string }[]) m.set(c.apelido, (m.get(c.apelido) ?? 0) + 1);
  return m;
}

// ----- Leads -----
export async function buscarLeads() {
  const { data } = await sb().from("webinar_leads").select("*").order("respondido_em", { ascending: false, nullsFirst: false }).limit(5000);
  return (data ?? []) as Lead[];
}
export const excluirLead = (id: string) => ok(sb().from("webinar_leads").delete().eq("id", id));
export const mudarOrigem = (id: string, origem: string) => ok(sb().from("webinar_leads").update({ origem }).eq("id", id));

type Coluna = "nome" | "whatsapp" | "email" | "instagram" | "data" | "origem" | "extra";
function colunaDe(titulo: string): Coluna {
  const t = normalizar(titulo);
  if (/utm_source|utm source|origem|parceir|source/.test(t)) return "origem";
  if (/telefone|whatsapp|celular|\bfone\b/.test(t)) return "whatsapp";
  if (/e-?mail/.test(t)) return "email";
  if (/instagram|\binsta\b/.test(t)) return "instagram";
  if (/^nome|nome completo|seu nome/.test(t)) return "nome";
  if (/^data|respondid|submitted|timestamp|criado em|created|enviado em/.test(t)) return "data";
  return "extra";
}
function dataDe(v: string) {
  const s = v.trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/);
  if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T${br[4] ?? "12"}:${br[5] ?? "00"}:00-03:00`).toISOString();
  const d = Date.parse(s);
  return Number.isFinite(d) ? new Date(d).toISOString() : null;
}

/** Lê o CSV do Respondi. A origem vem da coluna utm_source; sem ela, vale a origem escolhida para o arquivo todo. */
export async function lerLeads(arq: File, origemPadrao: string) {
  const linhas = lerCsv(await lerArquivo(arq));
  if (linhas.length < 2) throw new Error("O arquivo não tem respostas. Exporte de novo no Respondi, em Respostas, Exportar.");
  const [cab, ...corpo] = linhas;
  const tipos = cab.map(colunaDe);
  const temOrigem = tipos.includes("origem");
  const leads = corpo.map((l) => {
    const x: Omit<Lead, "id" | "importado_em"> = { chave: "", origem: origemPadrao || "direto", nome: null, whatsapp: null, email: null, instagram: null, respondido_em: null, extras: {} };
    l.forEach((v, i) => {
      const val = (v ?? "").trim(); if (!val) return;
      const t = tipos[i];
      if (t === "origem") x.origem = normalizar(val).replace(/[^a-z0-9-]+/g, "-") || x.origem;
      else if (t === "data") x.respondido_em = dataDe(val);
      else if (t === "extra") x.extras[cab[i]] = val;
      else if (!x[t]) x[t] = val;
    });
    const fone = (x.whatsapp ?? "").replace(/\D/g, "");
    x.chave = fone.length >= 8 ? `f:${fone.slice(-11)}` : x.email ? `e:${x.email.toLowerCase()}` : `n:${normalizar(x.nome ?? "")}|${x.respondido_em ?? ""}`;
    return x;
  }).filter((x) => x.nome || x.whatsapp || x.email);
  return { leads, temOrigem };
}
export async function importarLeads(leads: Omit<Lead, "id" | "importado_em">[]) {
  for (let i = 0; i < leads.length; i += 500) await ok(sb().from("webinar_leads").upsert(leads.slice(i, i + 500), { onConflict: "chave" }));
}

// ----- Criativos (pasta) -----
export async function buscarCriativos() {
  const { data } = await sb().from("webinar_criativos").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Criativo[];
}
export async function subirCriativo(f: File, titulo: string) {
  const limpo = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-");
  const caminho = `criativos/${Date.now()}-${limpo}`;
  await ok(sb().storage.from("webinar").upload(caminho, f, { upsert: false, contentType: f.type || undefined }));
  await ok(sb().from("webinar_criativos").insert({ titulo: titulo || f.name, tipo: f.type.split("/")[0] || "arquivo", arquivo: caminho }));
}
export const salvarCriativoLink = (titulo: string, link: string) => ok(sb().from("webinar_criativos").insert({ titulo, tipo: "link", link }));
export const renomearCriativo = (id: string, titulo: string, obs: string) => ok(sb().from("webinar_criativos").update({ titulo, obs }).eq("id", id));
export async function excluirCriativo(c: Criativo) {
  if (c.arquivo) await sb().storage.from("webinar").remove([c.arquivo]);
  await ok(sb().from("webinar_criativos").delete().eq("id", c.id));
}
export async function linkCriativo(c: Criativo, baixar = false) {
  if (c.link) return c.link;
  const { data } = await sb().storage.from("webinar").createSignedUrl(c.arquivo ?? "", 3600, baixar ? { download: true } : undefined);
  return data?.signedUrl ?? "";
}
