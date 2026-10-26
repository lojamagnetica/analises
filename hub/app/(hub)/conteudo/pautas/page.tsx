"use client";

import Link from "next/link";
import { PautaCartao } from "@/components/PautaCartao";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { buscarMetodoConteudo, segundaDe } from "@/lib/instagram";
import { pautasDaLoja } from "@/lib/pautas";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Pautas() {
  const { portal, pers } = usePortal();
  const segmento = (pers.get(1)?.respostas?.segmento as string | undefined) ?? null;
  const { dados } = useDados(async () => {
    const [pautas, m, c] = await Promise.all([
      pautasDaLoja(segundaDe(hoje()), segmento),
      buscarMetodoConteudo().catch(() => null),
      supabaseBrowser().from("loja_conteudo").select("ajustes").eq("portal_id", portal.id).maybeSingle(),
    ]);
    const hora = (c.data?.ajustes as { hora?: string } | undefined)?.hora || m?.textos.hora_padrao || "19:00";
    return { pautas, hora };
  }, [portal.id, segmento]);
  if (!dados) return <Carregando />;
  const semana = dados.pautas[0]?.semana;

  return (
    <>
      <Titulo titulo="Pautas quentes" sub="Os assuntos do momento escolhidos pela equipe, com o jeito certo de a sua loja entrar neles." />
      {!dados.pautas.length ? (
        <div className="card" style={{ maxWidth: 640 }}>
          <h3 style={{ marginTop: 0 }}>As pautas desta semana ainda não saíram</h3>
          <p className="mudo" style={{ margin: 0 }}>Toda semana a equipe escolhe os assuntos do momento para a sua loja. Enquanto isso, monte a sua semana pela Programação.</p>
          <Link className="btn s peq mt" href="/conteudo/semana">Ir para a Programação</Link>
        </div>
      ) : (
        <>
          <p className="mudo">Semana de {dia(semana).slice(0, 5)} a {dia(somarDias(semana, 6)).slice(0, 5)}</p>
          <div className="grade g3">
            {dados.pautas.map((p) => <PautaCartao key={p.id} p={p} portalId={portal.id} hora={dados.hora} />)}
          </div>
        </>
      )}
    </>
  );
}
