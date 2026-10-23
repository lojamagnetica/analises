"use client";

import Link from "next/link";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Scripts() {
  const { portal, pers } = usePortal();
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: cats }, { data: scripts }] = await Promise.all([
      sb.from("script_categorias").select("*").order("ordem"),
      sb.from("scripts").select("categoria"),
    ]);
    return { cats: cats ?? [], scripts: scripts ?? [] };
  }, []);
  if (!dados) return <Carregando />;
  const tom = pers.get(2)?.respostas?.tom;
  const qtd = (id: string) => dados.scripts.filter((s) => s.categoria === id).length;

  return (
    <>
      <Titulo
        titulo="Scripts de venda"
        sub={<>Mensagens prontas para a {portal.loja}{typeof tom === "string" && tom ? `, no seu tom de voz (${tom.toLowerCase()})` : ""}. Os dados da loja entram sozinhos.</>}
      />
      <div className="grade g3">
        {dados.cats.map((c) => (
          <Link key={c.id} href={`/scripts/categoria?id=${c.id}`} className="cat" style={{ ["--c" as string]: c.cor }}>
            <span className="quadrado"><Icone nome={c.icone} /></span>
            <b>{c.titulo}</b>
            <small>{qtd(c.id)} script{qtd(c.id) === 1 ? "" : "s"} · abrir →</small>
          </Link>
        ))}
      </div>
    </>
  );
}
