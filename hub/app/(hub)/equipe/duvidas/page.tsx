"use client";

import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataHora } from "@/lib/formato";
import { responderDuvida } from "@/lib/acoes";

const loja = (p: unknown) => (Array.isArray(p) ? p[0]?.loja : (p as { loja?: string } | null)?.loja) ?? "";

export default function DuvidasEquipe() {
  const { userId } = useEquipe();
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: pendentes }, { data: respondidas }] = await Promise.all([
      sb.from("duvidas").select("id, pergunta, created_at, portais(loja)").is("resposta", null).order("created_at"),
      sb.from("duvidas").select("id, pergunta, resposta, respondida_em, portais(loja)").not("resposta", "is", null).order("respondida_em", { ascending: false }).limit(15),
    ]);
    return { pendentes: pendentes ?? [], respondidas: respondidas ?? [] };
  }, []);
  if (!dados) return <Carregando />;

  return (
    <>
      <Titulo titulo="Dúvidas pendentes" sub="Responder às 10h e às 16h. Tudo em uma caixa só." />
      {dados.pendentes.length === 0 && <div className="aviso ok mb">Nenhuma dúvida pendente. 🎉</div>}
      {dados.pendentes.map((d) => (
        <form key={d.id} className="card card-borda mb" style={{ ["--c" as string]: "var(--orange)" }} action={async (f) => { await responderDuvida(d.id, userId, f); recarregar(); }}>
          <div className="linha entre"><b>{loja(d.portais)}</b><small className="mudo" style={{ textTransform: "capitalize" }}>{dataHora(d.created_at)}</small></div>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{d.pergunta}</p>
          <textarea name="resposta" required placeholder="Sua resposta…" />
          <div className="linha mt"><button className="btn p peq" type="submit">Responder</button></div>
        </form>
      ))}
      {dados.respondidas.length > 0 && (
        <>
          <div className="secao">Respondidas recentemente</div>
          {dados.respondidas.map((d) => (
            <div key={d.id} className="card mb">
              <b>{loja(d.portais)}</b> · <span className="mudo">{d.pergunta}</span>
              <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0" }}>{d.resposta}</p>
            </div>
          ))}
        </>
      )}
    </>
  );
}
