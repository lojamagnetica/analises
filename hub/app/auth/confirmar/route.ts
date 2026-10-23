import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// Recebe o clique do botão em /auth/confirm e troca o link por uma sessão.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const tipo = String(form.get("type") ?? "") as EmailOtpType;
  const code = String(form.get("code") ?? "");
  const proximo = String(form.get("next") ?? "");
  const destino = proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/";

  const supabase = await supabaseServer();
  const { error } = tokenHash && tipo
    ? await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("sem token") };

  const ir = (caminho: string) => NextResponse.redirect(new URL(caminho, request.url), 303);
  if (error) return ir("/login?erro=link");
  // Quem chega por convite ou recuperação cria a senha antes de entrar.
  return ir(tipo === "invite" || tipo === "recovery" ? "/conta?senha=1" : destino);
}
