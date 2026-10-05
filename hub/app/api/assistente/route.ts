import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { contexto } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { METODO, contextoDoPortal } from "@/lib/assistente";

export const maxDuration = 300;

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const ctx = await contexto();
  if (!ctx.portal) return new Response("Nenhum portal aberto.", { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return new Response("O Assistente ainda não foi configurado (falta a chave da API).", { status: 503 });

  const { mensagem } = (await request.json().catch(() => ({}))) as { mensagem?: string };
  const texto = (mensagem ?? "").trim().slice(0, 8000);
  if (!texto) return new Response("Mensagem vazia.", { status: 400 });

  const supabase = await supabaseServer();
  const portal = ctx.portal;
  await supabase.from("chat_mensagens").insert({ portal_id: portal.id, autor: ctx.userId, papel: "user", conteudo: texto });

  const [{ data: historico }, dadosPortal] = await Promise.all([
    supabase.from("chat_mensagens").select("papel, conteudo").eq("portal_id", portal.id).order("created_at", { ascending: false }).limit(40),
    contextoDoPortal(supabase, portal),
  ]);

  // Mais antigas primeiro, começando por uma mensagem do usuário e sem dois papéis iguais seguidos.
  const messages: BetaMessageParam[] = [];
  for (const m of (historico ?? []).reverse()) {
    const role = m.papel as "user" | "assistant";
    if (!messages.length && role !== "user") continue;
    const anterior = messages[messages.length - 1];
    if (anterior?.role === role) anterior.content = `${anterior.content}\n\n${m.conteudo}`;
    else messages.push({ role, content: m.conteudo });
  }

  const codificador = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      let resposta = "";
      const enviar = (t: string) => { resposta += t; controller.enqueue(codificador.encode(t)); };
      try {
        const stream = anthropic.beta.messages.stream({
          model: "claude-opus-5-5",
          max_tokens: 16000,
          output_config: { effort: "medium" },
          // Se o modelo recusar por política, a API tenta outro modelo na mesma chamada.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          // Cache automático do prefixo (instruções + dados do portal + conversa).
          cache_control: { type: "ephemeral" },
          system: [
            { type: "text", text: METODO },
            { type: "text", text: dadosPortal },
          ],
          messages,
        });
        for await (const evento of stream) {
          if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") enviar(evento.delta.text);
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") enviar("\n\n(Não consigo ajudar com esse pedido. Tente reformular ou leve para a reunião com a Camilla.)");
        if (final.stop_reason === "max_tokens") enviar("\n\n(A resposta ficou longa demais e foi cortada. Peça para eu continuar.)");
      } catch (erro) {
        console.error("assistente", erro);
        const msg = erro instanceof Anthropic.RateLimitError
          ? "Muita gente usando o Assistente agora. Tente de novo em um minuto."
          : erro instanceof Anthropic.AuthenticationError
            ? "A chave da API do Assistente está inválida. Avise a equipe."
            : "O Assistente teve um problema agora. Tente de novo em instantes.";
        enviar(resposta ? `\n\n(${msg})` : msg);
      } finally {
        if (resposta.trim()) {
          await supabase.from("chat_mensagens").insert({ portal_id: portal.id, autor: null, papel: "assistant", conteudo: resposta });
        }
        controller.close();
      }
    },
  });

  return new Response(corpo, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
