import { Titulo } from "@/components/Titulo";
import { contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { dataCurta } from "@/lib/formato";
import { notaApagar, notaCriar } from "../acoes";

export const metadata = { title: "Notas" };

export default async function Notas() {
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("notas").select("*").eq("portal_id", portal.id).order("created_at", { ascending: false });
  return (
    <>
      <Titulo titulo="Notas" sub="Seu caderno dentro do Hub, no lugar das páginas soltas do Notion." />
      <form className="card mb" action={notaCriar}>
        <input type="text" name="titulo" placeholder="Título" />
        <textarea name="conteudo" className="mt" placeholder="Escreva sua nota…" />
        <div className="linha mt"><button className="btn p" type="submit">Salvar nota</button></div>
      </form>
      <div className="grade g3">
        {(data ?? []).map((n) => (
          <div key={n.id} className="card card-borda" style={{ ["--c" as string]: "var(--orange)" }}>
            <h3>{n.titulo}</h3>
            <small className="mudo">{dataCurta(n.created_at)}</small>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{n.conteudo}</p>
            <form action={notaApagar.bind(null, n.id)}><button className="btn s peq" type="submit">Excluir</button></form>
          </div>
        ))}
      </div>
    </>
  );
}
