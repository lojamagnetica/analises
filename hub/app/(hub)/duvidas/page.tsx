import { Titulo } from "@/components/Titulo";
import { contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { dataHora } from "@/lib/formato";
import { duvidaEnviar } from "../acoes";

export const metadata = { title: "Dúvidas" };

export default async function Duvidas({ searchParams }: { searchParams: Promise<{ enviada?: string }> }) {
  const { enviada } = await searchParams;
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("duvidas").select("*").eq("portal_id", portal.id).order("created_at", { ascending: false });

  return (
    <>
      <Titulo titulo="Dúvidas entre os encontros" sub="A Camilla responde às 10h e às 16h, de segunda a sexta. Prazo de até 12 horas úteis." />
      {enviada && <div className="aviso ok mb">Dúvida enviada. A resposta aparece aqui.</div>}
      <form className="card mb" action={duvidaEnviar}>
        <textarea name="pergunta" required placeholder="Escreva sua dúvida…" />
        <div className="linha mt"><button className="btn p" type="submit">Enviar para a Camilla</button></div>
      </form>
      {(data ?? []).map((d) => (
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
