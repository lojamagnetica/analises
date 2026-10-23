// O agente de Análise do Perfil: a equipe dá o @ (e, se quiser, prints do perfil) e o agente coleta o Instagram,
// analisa com o Claude seguindo a memória do método (tabela metodo, chave 'analise_agente') e salva a análise
// preenchida como rascunho em loja_analise_perfil. O trabalho roda em segundo plano; o Hub acompanha pelo campo agente.
// Só atende a equipe. Precisa do segredo ANTHROPIC_API_KEY nas Edge Functions do Supabase.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHAVE = Deno.env.get("ANTHROPIC_API_KEY");
const MODELO = "claude-opus-5-5";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Imagem = { media_type: string; data: string };
type Post = { tipo: string; data: string; legenda: string; curtidas: number | null; comentarios: number | null; views: number | null; descricao: string | null; capa: string | null };
type Coleta = { fonte: string; nome?: string; bio?: string; categoria?: string; link?: string; links?: string[]; seguidores?: number; posts_total?: number; destaques?: number; posts: Post[]; texto_link?: string };

const UA_CELULAR = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function buscar(url: string, headers: Record<string, string>, ms = 12000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { headers, signal: c.signal }); } finally { clearTimeout(t); }
}

const dataDe = (ts: unknown) => (ts ? new Date(Number(ts) * 1000).toISOString().slice(0, 10) : "");
// deno-lint-ignore no-explicit-any
function postDe(n: any): Post {
  const tipo = n.product_type === "clips" || n.is_video ? "Reels" : n.__typename === "GraphSidecar" ? "Carrossel" : "Foto";
  return {
    tipo, data: dataDe(n.taken_at_timestamp),
    legenda: String(n.edge_media_to_caption?.edges?.[0]?.node?.text ?? "").slice(0, 700),
    curtidas: n.edge_liked_by?.count ?? n.edge_media_preview_like?.count ?? null,
    comentarios: n.edge_media_to_comment?.count ?? null,
    views: n.video_view_count ?? null, descricao: n.accessibility_caption ?? null, capa: n.display_url ?? n.thumbnail_src ?? null,
  };
}

/** Coleta o que o Instagram libera sem login. Primeiro o perfil completo; se o Instagram recusar, a página de incorporação. */
async function coletar(usuario: string): Promise<Coleta> {
  try {
    const r = await buscar(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${usuario}`, { "x-ig-app-id": "936619743392459", "User-Agent": UA_CELULAR });
    if (r.ok) {
      const u = (await r.json())?.data?.user;
      if (u?.is_private) throw new Error("O perfil é privado.");
      if (u) {
        return {
          fonte: "perfil completo", nome: u.full_name, bio: u.biography, categoria: u.category_name ?? u.business_category_name ?? undefined,
          link: u.external_url ?? undefined, links: (u.bio_links ?? []).map((l: { url?: string; title?: string }) => `${l.title ?? ""} ${l.url ?? ""}`.trim()),
          seguidores: u.edge_followed_by?.count, posts_total: u.edge_owner_to_timeline_media?.count, destaques: u.highlight_reel_count,
          // deno-lint-ignore no-explicit-any
          posts: (u.edge_owner_to_timeline_media?.edges ?? []).map((e: any) => postDe(e.node)),
        };
      }
    }
  } catch (e) { if ((e as Error).message.includes("privado")) throw e; }
  // Plano B: a página de incorporação do perfil traz os 6 posts mais recentes.
  try {
    const r = await buscar(`https://www.instagram.com/${usuario}/embed/`, { "User-Agent": UA_PC });
    const html = await r.text();
    const bruto = html.match(/"contextJSON":"(.*?[^\\])"[,}]/)?.[1];
    if (bruto) {
      const ctx = JSON.parse(JSON.parse(`"${bruto}"`).replace(/\\u0000/g, ""))?.context;
      return {
        fonte: "incorporação (6 posts, sem bio nem visualizações)", nome: ctx.full_name, seguidores: ctx.followers_count, posts_total: ctx.posts_count,
        // deno-lint-ignore no-explicit-any
        posts: (ctx.graphql_media ?? []).map((m: any) => postDe(m.shortcode_media)),
      };
    }
  } catch { /* segue sem coleta */ }
  return { fonte: "nada (o Instagram não respondeu)", posts: [] };
}

/** O texto do link da bio: o que aparece e em que ordem. */
async function lerLink(url: string) {
  try {
    const r = await buscar(url, { "User-Agent": UA_CELULAR }, 8000);
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
  } catch { return undefined; }
}

async function capa(url: string): Promise<Imagem | null> {
  try {
    const r = await buscar(url, { "User-Agent": UA_PC }, 8000);
    if (!r.ok) return null;
    const b = new Uint8Array(await r.arrayBuffer());
    if (b.length > 3_500_000) return null;
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return { media_type: r.headers.get("content-type")?.split(";")[0] || "image/jpeg", data: btoa(s) };
  } catch { return null; }
}

const texto = { type: "string" } as const;
const lista = (items: object) => ({ type: "array", items });
const objeto = (props: Record<string, object>) => ({ type: "object", properties: props, required: Object.keys(props), additionalProperties: false });
const ESQUEMA = objeto({
  nicho: texto, cidade: texto, lede: texto,
  numeros: objeto({ destaques_de: texto, destaques_para: texto, frequencia: texto, meta_views: texto }),
  correcoes: lista(objeto({ titulo: texto, texto, prazo: { type: "string", enum: ["Fazer agora", "Esta semana"] } })),
  bio: texto, destaques: lista(texto),
  reels: lista(objeto({ nome: texto, views: { type: "integer" }, rosto: { type: "boolean" } })),
  conclusao: texto,
  posts: lista(objeto({ titulo: texto, views: texto, acerto: { type: "boolean" }, errado: texto, certo: texto })),
  pare: lista(texto), comece: lista(texto),
  estrategia: lista(objeto({ emoji: texto, titulo: texto, texto })),
  roteiros: lista(objeto({
    id: texto, nome: texto, formato: texto, objetivo: { type: "string", enum: ["Atrair", "Conectar", "Vender"] }, quando: texto,
    linhas: lista(objeto({ rotulo: texto, fala: texto, nota: texto })),
  })),
  workflow: lista(objeto({ titulo: texto, texto })),
  ganchos: lista(texto),
  ideias: lista(objeto({ formato: texto, objetivo: { type: "string", enum: ["Atrair", "Conectar", "Vender"] }, titulo: texto, texto })),
  ctas: lista(objeto({ situacao: texto, fala: texto, porque: texto })),
  ferramentas: lista(texto),
  cronograma: lista(objeto({ quando: texto, titulo: texto, texto })),
  pendencias: lista(texto),
  roteiro_video: texto,
});

async function analisar(admin: SupabaseClient, portalId: string, usuario: string, prints: Imagem[], observacoes: string) {
  const marcar = (agente: Record<string, unknown>) =>
    admin.from("loja_analise_perfil").update({ agente: { instagram: `@${usuario}`, ...agente }, updated_at: new Date().toISOString() }).eq("portal_id", portalId);
  const inicio = new Date().toISOString();
  try {
    const coleta = await coletar(usuario);
    if (coleta.link) coleta.texto_link = await lerLink(coleta.link);
    const capas = (await Promise.all(coleta.posts.slice(0, 12).map((p) => (p.capa ? capa(p.capa) : Promise.resolve(null)))));
    if (!coleta.posts.length && !prints.length) throw new Error("O Instagram não liberou os dados deste perfil agora. Anexe os prints (topo do perfil, aba Reels e link da bio) e rode de novo.");
    await marcar({ estado: "analisando", inicio, fonte: coleta.fonte });

    const [{ data: mem }, { data: portal }] = await Promise.all([
      admin.from("metodo").select("dados").eq("chave", "analise_agente").single(),
      admin.from("portais").select("loja, responsavel").eq("id", portalId).single(),
    ]);
    const memoria = mem?.dados as { instrucoes: string; exemplo: unknown };
    const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [];
    coleta.posts.forEach((p, i) => {
      const { capa: _c, ...semCapa } = p;
      conteudo.push({ type: "text", text: `Post ${i + 1}: ${JSON.stringify(semCapa)}` });
      const img = capas[i];
      if (img) conteudo.push({ type: "image", source: { type: "base64", media_type: img.media_type as "image/jpeg", data: img.data } });
    });
    prints.slice(0, 8).forEach((img, i) => {
      conteudo.push({ type: "text", text: `Print ${i + 1} anexado pela equipe:` });
      conteudo.push({ type: "image", source: { type: "base64", media_type: img.media_type as "image/jpeg", data: img.data } });
    });
    const { posts: _p, ...perfil } = coleta;
    conteudo.push({
      type: "text",
      text: [
        `Loja: ${portal?.loja ?? ""} (responsável: ${portal?.responsavel ?? "—"}). Instagram: @${usuario}.`,
        `Dados do perfil coletados (fonte: ${coleta.fonte}): ${JSON.stringify(perfil)}`,
        observacoes ? `Observações da equipe: ${observacoes}` : "",
        `Exemplo validado pela Mila (Versatilità), para o padrão de tom, profundidade e formato: ${JSON.stringify(memoria.exemplo)}`,
        "Faça a Análise do Perfil desta loja seguindo as instruções. Responda só com o JSON pedido.",
      ].filter(Boolean).join("\n\n"),
    });

    const client = new Anthropic({ apiKey: CHAVE });
    const resposta = await client.beta.messages.stream({
      model: MODELO, max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      // @ts-ignore: fallbacks "default" ainda pode não estar no tipo do SDK
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema: ESQUEMA } },
      system: memoria.instrucoes,
      messages: [{ role: "user", content: conteudo }],
    }).finalMessage();
    if (resposta.stop_reason === "refusal") throw new Error("O Claude recusou esta análise. Tente de novo com os prints.");
    const bloco = resposta.content.find((b) => b.type === "text");
    if (!bloco || bloco.type !== "text") throw new Error("O Claude não devolveu a análise.");
    const { pendencias, roteiro_video, ...analise } = JSON.parse(bloco.text);

    await admin.from("loja_analise_perfil").update({
      dados: { ...analise, instagram: `@${usuario}`, data: inicio.slice(0, 10), video_url: "" },
      agente: { instagram: `@${usuario}`, estado: "pronta", inicio, fim: new Date().toISOString(), fonte: coleta.fonte, pendencias, roteiro_video },
      updated_at: new Date().toISOString(),
    }).eq("portal_id", portalId);
  } catch (e) {
    await marcar({ estado: "erro", inicio, fim: new Date().toISOString(), msg: (e as Error).message.slice(0, 500) });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  const corpo = await req.json().catch(() => ({}));
  // Diagnóstico sem login: diz só se a chave do Claude está cadastrada (nunca o valor).
  if (corpo?.diagnostico === true) return json({ chave_claude: !!CHAVE });

  const usuarioSb = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: equipe } = await usuarioSb.rpc("is_equipe");
  if (equipe !== true) return json({ erro: "Só a equipe pode rodar o agente de análise." }, 403);
  if (!CHAVE) return json({ erro: "Falta ligar o Claude: cadastre o segredo ANTHROPIC_API_KEY nas Edge Functions do Supabase." }, 400);

  const { portal_id, instagram, prints, observacoes } = corpo;
  const usuario = String(instagram ?? "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/^@/, "").replace(/[/?#].*$/, "").toLowerCase();
  if (!portal_id || !/^[a-z0-9._]{1,30}$/.test(usuario)) return json({ erro: "Informe o portal e um @ válido." }, 400);
  const imagens: Imagem[] = Array.isArray(prints) ? prints.filter((p) => p?.data && /^image\/(png|jpeg|webp|gif)$/.test(p?.media_type)).slice(0, 8) : [];

  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: atual } = await admin.from("loja_analise_perfil").select("agente").eq("portal_id", portal_id).maybeSingle();
  const estado = (atual?.agente as { estado?: string; inicio?: string } | null) ?? {};
  if ((estado.estado === "coletando" || estado.estado === "analisando") && Date.now() - Date.parse(estado.inicio ?? "0") < 10 * 60_000) {
    return json({ erro: "O agente já está analisando esta loja. Aguarde terminar." }, 409);
  }
  const agente = { estado: "coletando", instagram: `@${usuario}`, inicio: new Date().toISOString() };
  if (atual) await admin.from("loja_analise_perfil").update({ agente, updated_at: new Date().toISOString() }).eq("portal_id", portal_id);
  else await admin.from("loja_analise_perfil").insert({ portal_id, agente });

  // @ts-ignore: EdgeRuntime existe nas Edge Functions do Supabase
  EdgeRuntime.waitUntil(analisar(admin, portal_id, usuario, imagens, String(observacoes ?? "").slice(0, 2000)));
  return json({ ok: true, estado: "coletando" }, 202);
});
