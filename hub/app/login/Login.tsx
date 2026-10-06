"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function Login({ erroInicial }: { erroInicial?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(erroInicial ? { ok: false, texto: erroInicial } : null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) return setMsg({ ok: false, texto: "E-mail ou senha incorretos." });
    router.replace("/");
    router.refresh();
  }

  async function receberLink() {
    if (!email) return setMsg({ ok: false, texto: "Digite o seu e-mail primeiro." });
    setEnviando(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/confirm?next=/conta` },
    });
    setEnviando(false);
    setMsg(
      error
        ? { ok: false, texto: "Não encontramos esse e-mail. Fale com a equipe Loja Magnética." }
        : { ok: true, texto: "Enviamos um link de acesso para o seu e-mail." },
    );
  }

  return (
    <form className="card" onSubmit={entrar}>
      <h1>Entrar</h1>
      <p className="mudo">Use o e-mail que você recebeu no convite.</p>
      <label className="rotulo" htmlFor="email">E-mail</label>
      <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="rotulo" htmlFor="senha">Senha</label>
      <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      {msg && <div className={`aviso mt ${msg.ok ? "ok" : ""}`}>{msg.texto}</div>}
      <div className="linha mt">
        <button className="btn p" disabled={enviando || !senha} type="submit">Entrar</button>
        <button className="btn s" disabled={enviando} type="button" onClick={receberLink}>
          Primeiro acesso ou esqueci a senha
        </button>
      </div>
    </form>
  );
}
