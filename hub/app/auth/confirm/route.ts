import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// Links de convite, de acesso por e-mail e de recuperação de senha chegam aqui.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const proximo = url.searchParams.get("next");
  const destino = proximo?.startsWith("/") && !proximo.startsWith("//") ? proximo : "/";

  const supabase = await supabaseServer();
  const { error } = tokenHash && tipo
    ? await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("sem token") };

  if (error) return NextResponse.redirect(new URL("/login?erro=link", url));
  // Quem chega por convite ou recuperação define a senha antes de entrar.
  const precisaSenha = tipo === "invite" || tipo === "recovery";
  return NextResponse.redirect(new URL(precisaSenha ? "/conta?senha=1" : destino, url));
}
