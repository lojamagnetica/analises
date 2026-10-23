import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from "@/lib/config";

/** Cliente com a sessão de quem está logado. Respeita as regras de segurança (RLS). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_CHAVE_PUBLICA,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o proxy renova a sessão.
          }
        },
      },
    },
  );
}
