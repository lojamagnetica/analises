"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { erroDaFuncao, supabaseBrowser } from "@/lib/supabase/client";

export function PrimeiroAcesso() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setErro("Use uma senha com pelo menos 8 caracteres.");
    setEnviando(true);
    setErro("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.functions.invoke("primeiro-acesso", { body: { email, senha } });
    if (error) {
      setEnviando(false);
      return setErro(await erroDaFuncao(error));
    }
    const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (erroLogin) {
      setEnviando(false);
      return setErro("Conta criada. Entre pela tela de login.");
    }
    router.replace("/equipe");
  }

  return (
    <form className="card" onSubmit={criar}>
      <h1>Primeiro acesso</h1>
      <p className="mudo">Use o seu e-mail e escolha uma senha.</p>
      <label className="rotulo" htmlFor="email">E-mail</label>
      <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="rotulo" htmlFor="senha">Senha (mínimo 8 caracteres)</label>
      <input id="senha" type="password" required autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt"><button className="btn p" disabled={enviando} type="submit">{enviando ? "Criando…" : "Criar minha conta"}</button></div>
    </form>
  );
}
