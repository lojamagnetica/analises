import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from "@/lib/config";

export function supabaseBrowser() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_CHAVE_PUBLICA,
  );
}
