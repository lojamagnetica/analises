// O agente do storytelling: lê a história que a lojista contou (respostas e legendas das fotos) e monta a versão
// para a equipe e a cultura da loja, sem alterar os fatos, na linguagem da cliente. Fica como rascunho (narrativa)
// até a Camilla aprovar em Minha empresa › Histórias. Só a equipe chama. Precisa da chave do Claude.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

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
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const INSTRUCOES = `Você escreve a "Nossa história" de uma loja de moda para a equipe (pessoas novas) e para a cultura da loja.
Regras:
- NUNCA invente nem mude fatos (datas, lugares, motivos, nomes). Só organize, corrija o português e dê ritmo.
- Não acrescente frases de conclusão ou interpretação que a dona não disse (ex.: "cada loja nasceu perto de clientes que já conheciam a gente").
- Voz: a dona contando, em primeira pessoa nos capítulos da origem; "nós" nos capítulos da cultura. Tom acolhedor e profissional.
  Quando a dona fala dela mesma ("meu sonho", "como eu atenderia"), mantenha o "eu"; nunca troque por "a dona".
- Linguagem da cliente: palavras simples do dia a dia. Nada de termos rebuscados (ex.: "refino", "composição") no título e nos textos seus. Frases que a dona escreveu como lema podem entrar entre aspas, como lema dela.
- Respeite a fé e a identidade da dona: mantenha o que ela contou, sem tirar nem exagerar.
- O que NÃO é para a equipe fica de fora: dificuldades financeiras atuais, desabafos, problemas internos ("precisamos melhorar..."). Dificuldade já superada entra como lição.
- Capítulos, nesta ordem, só os que tiverem conteúdo: Como tudo começou; Por que [o nome]; Por que existimos; Para quem; O jeito [da loja]; Nossos valores, na prática (um por linha: "Valor: comportamento"); Uma conquista (algo concreto; use as legendas das fotos se ajudar); Para onde vamos.
- "esperamos": uma frase do que a loja espera de quem chega, ligada aos valores e ao jeito de atender.
- "pendencias": o que falta para a história ficar completa (fotos sem legenda ou ano, conquista sem fato concreto) e o que você deixou de fora e por quê.
- Título: "[Nome da loja] · [frase curta em linguagem comum]". "assinatura": uma frase curta da essência da loja.`;

const ESQUEMA = {
  type: "object", additionalProperties: false, required: ["titulo", "assinatura", "capitulos", "esperamos", "pendencias"],
  properties: {
    titulo: { type: "string" }, assinatura: { type: "string" }, esperamos: { type: "string" },
    capitulos: { type: "array", items: { type: "object", additionalProperties: false, required: ["titulo", "texto"], properties: { titulo: { type: "string" }, texto: { type: "string" } } } },
    pendencias: { type: "array", items: { type: "string" } },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);
  const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: equipe } = await usuario.rpc("is_equipe");
  if (equipe !== true) return json({ erro: "Só a equipe pode montar o storytelling." }, 403);
  if (!CHAVE) return json({ erro: "O agente ainda não está ligado: falta a chave do Claude no Supabase. Enquanto isso, monte ou ajuste o texto à mão aqui mesmo." }, 412);

  const { id } = await req.json().catch(() => ({}));
  const admin = createClient(URL, SERVICO, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: h } = await admin.from("loja_historia").select("loja, nome, respostas, fotos, narrativa_aprovada").eq("id", String(id ?? "")).maybeSingle();
  if (!h) return json({ erro: "História não encontrada." }, 404);
  // Montar de novo tira o aprovado do ar: só quem aprova pode.
  if (h.narrativa_aprovada) {
    const { data: aprova } = await usuario.rpc("pode_aprovar");
    if (aprova !== true) return json({ erro: "O storytelling já está aprovado. Para montar de novo, peça à Camilla para voltar para rascunho." }, 403);
  }

  try {
    const client = new Anthropic({ apiKey: CHAVE });
    const r = await client.beta.messages.stream({
      model: MODELO, max_tokens: 6000,
      betas: ["server-side-fallback-2026-07-01"],
      // @ts-ignore: fallbacks "default" ainda pode não estar no tipo do SDK
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA } },
      system: INSTRUCOES,
      messages: [{ role: "user", content: [
        `Loja: ${h.loja}. Dona: ${h.nome}.`,
        `Respostas da dona (do jeito que ela escreveu): ${JSON.stringify(h.respostas)}`,
        `Fotos (ano e legenda): ${JSON.stringify(((h.fotos ?? []) as { ano: string; legenda: string }[]).map((f) => ({ ano: f.ano, legenda: f.legenda })))}`,
        "Monte a Nossa história. Responda só com o JSON pedido.",
      ].join("\n\n") }],
    }).finalMessage();
    const bloco = r.content.find((b) => b.type === "text");
    if (!bloco || bloco.type !== "text") throw new Error("O agente não devolveu o texto.");
    const narrativa = JSON.parse(bloco.text);
    await admin.from("loja_historia").update({ narrativa, narrativa_aprovada: false, narrativa_pronta: false, updated_at: new Date().toISOString() }).eq("id", id);
    return json({ ok: true, narrativa });
  } catch (e) {
    return json({ erro: (e as Error).message }, 500);
  }
});
