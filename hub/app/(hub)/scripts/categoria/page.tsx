"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { preencher, trechos, variaveisDaLoja } from "@/lib/scripts";

function Categoria() {
  const id = useSearchParams().get("id") ?? "";
  const { portal, pers } = usePortal();
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: cat }, { data: lista }] = await Promise.all([
      sb.from("script_categorias").select("*").eq("id", id).maybeSingle(),
      sb.from("scripts").select("*").eq("categoria", id).order("ordem"),
    ]);
    return { cat, lista: lista ?? [] };
  }, [id]);
  if (!dados) return <Carregando />;
  const { cat, lista } = dados;
  if (!cat) return <div className="card">Categoria não encontrada.</div>;
  const vars = variaveisDaLoja(pers.get(2)?.respostas, portal.loja);

  return (
    <>
      <Titulo voltar={{ href: "/scripts", rotulo: "Todos os scripts" }} titulo={cat.titulo} sub="Em verde, o que já veio da sua Personalização. Em vermelho, o que você completa na hora." />
      {lista.map((s) => (
        <div key={s.id} className="card card-borda script mb" style={{ ["--c" as string]: cat.cor }}>
          <h3>{s.titulo}</h3>
          {s.quando && <p className="mudo" style={{ fontSize: 13.5 }}>Quando usar: {s.quando}</p>}
          <pre>
            {trechos(s.texto, vars).map((t, i) =>
              t.variavel ? <span key={i} className={`var ${t.preenchida ? "ok" : ""}`}>{t.texto}</span> : <span key={i}>{t.texto}</span>,
            )}
          </pre>
          <div className="linha"><Copiar texto={preencher(s.texto, vars)} /></div>
        </div>
      ))}
      {lista.length === 0 && <div className="card mudo">Nenhum script nesta categoria ainda.</div>}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Categoria /></Suspense>;
}
