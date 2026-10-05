"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function Senha({ destaque }: { destaque: boolean }) {
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  return (
    <form
      className="card card-borda"
      style={{ ["--c" as string]: destaque ? "var(--red)" : "var(--line)" }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (senha.length < 8) return setMsg({ ok: false, texto: "Use pelo menos 8 caracteres." });
        const { error } = await supabaseBrowser().auth.updateUser({ password: senha });
        setMsg(error ? { ok: false, texto: "Não deu certo. Tente de novo." } : { ok: true, texto: "Senha salva." });
        if (!error) setSenha("");
      }}
    >
      <h3>{destaque ? "Crie sua senha" : "Trocar senha"}</h3>
      <input type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Nova senha (mínimo 8 caracteres)" />
      {msg && <div className={`aviso mt ${msg.ok ? "ok" : ""}`}>{msg.texto}</div>}
      <div className="linha mt"><button className="btn p" type="submit">Salvar senha</button></div>
    </form>
  );
}
