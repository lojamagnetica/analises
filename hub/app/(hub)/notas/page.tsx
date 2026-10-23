"use client";

import { useRef } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataCurta } from "@/lib/formato";
import { notaApagar, notaCriar } from "@/lib/acoes";

export default function Notas() {
  const { portal, userId } = usePortal();
  const form = useRef<HTMLFormElement>(null);
  const { dados, recarregar } = useDados(
    async () => (await supabaseBrowser().from("notas").select("*").eq("portal_id", portal.id).order("created_at", { ascending: false })).data ?? [],
    [portal.id],
  );
  if (!dados) return <Carregando />;
  return (
    <>
      <Titulo titulo="Notas" sub="Seu caderno dentro do Hub, no lugar das páginas soltas do Notion." />
      <form ref={form} className="card mb" action={async (f) => { await notaCriar(portal.id, userId, f); form.current?.reset(); recarregar(); }}>
        <input type="text" name="titulo" placeholder="Título" />
        <textarea name="conteudo" className="mt" placeholder="Escreva sua nota…" />
        <div className="linha mt"><button className="btn p" type="submit">Salvar nota</button></div>
      </form>
      <div className="grade g3">
        {dados.map((n) => (
          <div key={n.id} className="card card-borda" style={{ ["--c" as string]: "var(--orange)" }}>
            <h3>{n.titulo}</h3>
            <small className="mudo">{dataCurta(n.created_at)}</small>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{n.conteudo}</p>
            <button className="btn s peq" type="button" onClick={async () => { await notaApagar(n.id); recarregar(); }}>Excluir</button>
          </div>
        ))}
      </div>
    </>
  );
}
