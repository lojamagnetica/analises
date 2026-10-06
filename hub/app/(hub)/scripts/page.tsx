import Link from "next/link";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { contextoPortal, personalizacao } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Scripts de venda" };

export default async function Scripts() {
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  const [{ data: cats }, { data: scripts }, pers] = await Promise.all([
    supabase.from("script_categorias").select("*").order("ordem"),
    supabase.from("scripts").select("categoria"),
    personalizacao(portal.id),
  ]);
  const tom = pers.get(2)?.respostas?.tom;
  const qtd = (id: string) => (scripts ?? []).filter((s) => s.categoria === id).length;

  return (
    <>
      <Titulo
        titulo="Scripts de venda"
        sub={<>Mensagens prontas para a {portal.loja}{typeof tom === "string" && tom ? `, no seu tom de voz (${tom.toLowerCase()})` : ""}. Os dados da loja entram sozinhos.</>}
      />
      <div className="grade g3">
        {(cats ?? []).map((c) => (
          <Link key={c.id} href={`/scripts/${c.id}`} className="cat" style={{ ["--c" as string]: c.cor }}>
            <span className="quadrado"><Icone nome={c.icone} /></span>
            <b>{c.titulo}</b>
            <small>{qtd(c.id)} script{qtd(c.id) === 1 ? "" : "s"} · abrir →</small>
          </Link>
        ))}
        <Link href="/assistente?pedir=Crie%20um%20script%20novo%20para%20" className="cat novo">+ Novo script com o Assistente</Link>
      </div>
    </>
  );
}
