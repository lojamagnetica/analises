import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from "@/lib/config";

let cliente: SupabaseClient | null = null;

/** Cliente único do navegador. A sessão fica guardada no próprio navegador. */
export function supabaseBrowser() {
  if (!cliente) {
    cliente = createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" },
    });
  }
  return cliente;
}

/** Mensagem de erro de uma função do Supabase (o corpo traz { erro }). */
export async function erroDaFuncao(error: unknown) {
  const contexto = (error as { context?: unknown })?.context;
  const corpo = contexto instanceof Response ? await contexto.json().catch(() => null) : null;
  return (corpo as { erro?: string } | null)?.erro ?? (error as Error)?.message ?? "Erro desconhecido";
}
