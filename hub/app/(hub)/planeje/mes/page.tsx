"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BLOCOS_PLANEJE, MESES } from "@/lib/conteudo";
import { Bloco } from "./Bloco";

function Mes() {
  const mes = Number(useSearchParams().get("m"));
  const { portal } = usePortal();
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: blocos }, { data: datas }] = await Promise.all([
      sb.from("planeje").select("bloco, texto").eq("portal_id", portal.id).eq("mes", mes),
      sb.from("datas_comerciais").select("dia, titulo").eq("mes", mes).order("dia", { nullsFirst: true }),
    ]);
    return { blocos: blocos ?? [], datas: datas ?? [] };
  }, [portal.id, mes]);
  if (!Number.isInteger(mes) || mes < 0 || mes > 11) return <div className="card">Mês não encontrado.</div>;
  if (!dados) return <Carregando />;
  const texto = (b: string) => dados.blocos.find((x) => x.bloco === b)?.texto ?? "";

  return (
    <>
      <Titulo voltar={{ href: "/planeje", rotulo: "Todos os meses" }} titulo={`🗓️ ${MESES[mes]}`} aba={MESES[mes]} sub="Tudo salva sozinho enquanto você escreve." />
      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--green)" }}>
        <h3>Datas comerciais do mês</h3>
        <div className="chips">
          {dados.datas.map((d) => <span key={d.titulo} className="chip">{d.dia ? `${d.dia}/${mes + 1} · ` : ""}{d.titulo}</span>)}
        </div>
      </div>
      <div className="grade g2">
        {BLOCOS_PLANEJE.map((b) => <Bloco key={b} portalId={portal.id} mes={mes} bloco={b} inicial={texto(b)} />)}
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Mes /></Suspense>;
}
