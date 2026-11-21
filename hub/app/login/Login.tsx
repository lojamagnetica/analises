"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BASE } from "@/lib/config";

export function Login({ erroInicial }: { erroInicial?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(erroInicial ? { ok: false, texto: erroInicial } : null);
  const [enviando, setEnviando] = useState(false);
  // O endereço que a equipe manda já traz o e-mail (?email=): a pessoa só digita a senha.
  useEffect(() => {
    try { const e = new URLSearchParams(location.search).get("email"); if (e) setEmail(e); } catch { /* sem endereço */ }
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) return setMsg({ ok: false, texto: "E-mail ou senha incorretos." });
    // Quem veio do app das Conversas volta para ele, não para o Hub.
    let volta = "/";
    try { const v = localStorage.getItem("lm_depois_login"); if (v && v.startsWith("/") && !v.startsWith("//")) volta = v; localStorage.removeItem("lm_depois_login"); } catch { /* sem armazenamento */ }
    router.replace(volta);
  }

  async function receberLink() {
    if (!email) return setMsg({ ok: false, texto: "Digite o seu e-mail primeiro." });
    setEnviando(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}${BASE}/auth/confirm/?next=/conta` },
    });
    setEnviando(false);
    setMsg(
      error
        ? { ok: false, texto: "Não encontramos esse e-mail. Fale com a equipe magnética." }
        : { ok: true, texto: "Enviamos um link de acesso para o seu e-mail." },
    );
  }

  return (
    <form className="card" onSubmit={entrar}>
      <h1>Entrar</h1>
      <p className="mudo">Digite o seu e-mail e a senha que a equipe Magnética mandou no WhatsApp.</p>
      <label className="rotulo" htmlFor="email">E-mail</label>
      <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="rotulo" htmlFor="senha">Senha</label>
      <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      {msg && <div className={`aviso mt ${msg.ok ? "ok" : ""}`}>{msg.texto}</div>}
      <div className="linha mt">
        <button className="btn p" disabled={enviando || !senha} type="submit">Entrar</button>
      </div>
      <p className="mudo" style={{ fontSize: 14, marginTop: 14 }}>
        Esqueceu a senha ou é o seu primeiro acesso? Chame a equipe Magnética no WhatsApp: a gente te manda uma senha nova na hora.
      </p>
      <button className="link-loja" disabled={enviando} type="button" onClick={receberLink} style={{ fontSize: 13 }}>
        Prefiro receber um link no meu e-mail
      </button>
    </form>
  );
}
