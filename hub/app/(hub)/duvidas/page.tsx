"use client";

import { useRef, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataHora } from "@/lib/formato";
import { duvidaEnviar } from "@/lib/acoes";

export default function Duvidas() {
  const { portal, userId } = usePortal();
  const form = useRef<HTMLFormElement>(null);
  const [enviada, setEnviada] = useState(false);
  const { dados, recarregar } = useDados(
    async () => (await supabaseBrowser().from("duvidas").select("*").eq("portal_id", portal.id).order("created_at", { ascending: false })).data ?? [],
    [portal.id],
  );
  if (!dados) return <Carregando />;

  return (
    <>
      <Titulo titulo="Dúvidas entre os encontros" aba="Dúvidas" sub="A Camilla responde às 10h e às 16h, de segunda a sexta. Prazo de até 12 horas úteis." />
      {enviada && <div className="aviso ok mb">Dúvida enviada. A resposta aparece aqui.</div>}
      <form ref={form} className="card mb" action={async (f) => { await duvidaEnviar(portal.id, userId, f); form.current?.reset(); setEnviada(true); recarregar(); }}>
        <textarea name="pergunta" required placeholder="Escreva sua dúvida…" />
        <div className="linha mt"><button className="btn p" type="submit">Enviar para a Camilla</button></div>
      </form>
      {dados.map((d) => (
        <div key={d.id} className="card card-borda mb" style={{ ["--c" as string]: d.resposta ? "var(--green)" : "var(--orange)" }}>
          <div className="linha entre">
            <small className="mudo" style={{ textTransform: "capitalize" }}>{dataHora(d.created_at)}</small>
            <span className={`selo ${d.resposta ? "feito" : "alerta"}`}>{d.resposta ? "respondida" : "aguardando"}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}><b>{d.pergunta}</b></p>
          {d.resposta && <p style={{ whiteSpace: "pre-wrap", margin: 0 }}><b>Camilla:</b> {d.resposta}</p>}
        </div>
      ))}
    </>
  );
}
