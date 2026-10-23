"use client";

// Links de convite e de acesso chegam aqui. O link só é usado quando a pessoa clica no botão:
// assim a prévia do WhatsApp (ou o antivírus do e-mail) não gasta o link antes dela.
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Simbolo } from "@/components/Simbolo";

function Confirmar() {
  const router = useRouter();
  const sp = useSearchParams();
  const tipo = sp.get("type") as EmailOtpType | null;
  const convite = tipo === "invite" || tipo === "recovery";
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar() {
    setEntrando(true);
    const sb = supabaseBrowser();
    const tokenHash = sp.get("token_hash");
    const code = sp.get("code");
    const { error } = tokenHash && tipo
      ? await sb.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
      : code
        ? await sb.auth.exchangeCodeForSession(code)
        : { error: new Error("sem token") };
    if (error) {
      setEntrando(false);
      return setErro("Este link expirou ou já foi usado. Peça um novo para a equipe magnética.");
    }
    const proximo = sp.get("next");
    router.replace(convite ? "/conta?senha=1" : proximo?.startsWith("/") && !proximo.startsWith("//") ? proximo : "/");
  }

  return (
    <div className="login-form" style={{ minHeight: "100vh" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="logo" style={{ margin: "0 auto 14px" }}><Simbolo /></div>
        <h1>{convite ? "O Hub da sua loja está pronto 🥂" : "Entrar no Hub"}</h1>
        <p className="mudo">{convite ? "Clique abaixo e crie a sua senha." : "Clique abaixo para entrar."}</p>
        {erro && <div className="aviso mb">{erro}</div>}
        <button className="btn p" type="button" onClick={entrar} disabled={entrando} style={{ width: "100%" }}>
          {entrando ? "Entrando…" : convite ? "Criar minha senha" : "Entrar"}
        </button>
      </div>
    </div>
  );
}

export default function Pagina() {
  return <Suspense><Confirmar /></Suspense>;
}
