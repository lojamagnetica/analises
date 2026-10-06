import Link from "next/link";
import { notFound } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { contextoPortal, personalizacao } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { preencher, trechos, variaveisDaLoja } from "@/lib/scripts";
import { Copiar } from "./Copiar";

export default async function Categoria({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  const [{ data: cat }, { data: lista }, pers] = await Promise.all([
    supabase.from("script_categorias").select("*").eq("id", categoria).maybeSingle(),
    supabase.from("scripts").select("*").eq("categoria", categoria).order("ordem"),
    personalizacao(portal.id),
  ]);
  if (!cat) notFound();
  const vars = variaveisDaLoja(pers.get(2)?.respostas, portal.loja);

  return (
    <>
      <Titulo
        voltar={{ href: "/scripts", rotulo: "Todos os scripts" }}
        titulo={cat.titulo}
        sub="Em verde, o que já veio da sua Personalização. Em vermelho, o que você completa na hora."
      />
      {(lista ?? []).map((s) => (
        <div key={s.id} className="card card-borda script mb" style={{ ["--c" as string]: cat.cor }}>
          <h3>{s.titulo}</h3>
          {s.quando && <p className="mudo" style={{ fontSize: 13.5 }}>Quando usar: {s.quando}</p>}
          <pre>
            {trechos(s.texto, vars).map((t, i) =>
              t.variavel ? <span key={i} className={`var ${t.preenchida ? "ok" : ""}`}>{t.texto}</span> : <span key={i}>{t.texto}</span>,
            )}
          </pre>
          <div className="linha">
            <Copiar texto={preencher(s.texto, vars)} />
            <Link className="btn s peq" href={`/assistente?pedir=${encodeURIComponent(`Adapte o script "${s.titulo}" para esta cliente: `)}`}>
              Adaptar com o Assistente
            </Link>
          </div>
        </div>
      ))}
      {(lista ?? []).length === 0 && <div className="card mudo">Nenhum script nesta categoria ainda.</div>}
    </>
  );
}
