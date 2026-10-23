import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

/**
 * Cliente com a chave de serviço: ignora as regras de segurança.
 * Use só no servidor e só depois de conferir que quem pediu é da equipe
 * (ou na rota de sincronização protegida por CRON_SECRET).
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("Esta função precisa da chave de serviço do Supabase (SUPABASE_SERVICE_ROLE_KEY), que ainda não foi configurada.");
  return createClient(SUPABASE_URL, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
