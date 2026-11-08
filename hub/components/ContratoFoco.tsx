"use client";

import { useState } from "react";
import Link from "next/link";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

type Contrato = { resultado: string | null; indicador: string | null; de_acordo_em: string | null };

/** Contrato de Foco: o resultado nº 1 dos próximos 90 dias. A loja lê e dá o "de acordo"; a equipe preenche na ficha da loja. */
export function ContratoFoco() {
  const { portal, equipe } = usePortal();
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const { data } = await supabaseBrowser().rpc("contrato_foco", { p: portal.id });
    return ((data ?? []) as Contrato[])[0] ?? null;
  }, [portal.id]);
  if (dados === null && equipe) {
    return (
      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--line)" }}>
        <b>Contrato de Foco</b> <span className="mudo">· ainda sem o resultado nº 1.</span>{" "}
        <Link className="link-loja" href={`/equipe/portal?id=${portal.id}`}>Preencher na ficha da loja</Link>
      </div>
    );
  }
  if (dados === undefined) return <Carregando />;
  if (!dados?.resultado) {
    return equipe ? (
      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--line)" }}>
        <b>Contrato de Foco</b> <span className="mudo">· ainda sem o resultado nº 1.</span>{" "}
        <Link className="link-loja" href={`/equipe/portal?id=${portal.id}`}>Preencher na ficha da loja</Link>
      </div>
    ) : null;
  }
  const [inicio, hojeV, meta] = (dados.indicador ?? "").split("·").map((x) => x.trim());
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: dados.de_acordo_em ? "var(--green)" : "var(--red)" }}>
      <div className="linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
        <small className="mudo">Contrato de Foco · o resultado nº 1 dos próximos 90 dias</small>
        {dados.de_acordo_em
          ? <span className="selo feito">De acordo em {dataHora(dados.de_acordo_em)}</span>
          : <span className="selo espera">{equipe ? "Esperando o de acordo da loja" : "Falta o seu de acordo"}</span>}
      </div>
      <h3 style={{ margin: "8px 0" }}>{dados.resultado}</h3>
      {dados.indicador && (
        <div className="grade g3" style={{ gap: 10, textAlign: "center" }}>
          <div><small className="mudo">Início</small><div><b>{inicio || "—"}</b></div></div>
          <div><small className="mudo">Hoje</small><div><b>{hojeV || "—"}</b></div></div>
          <div><small className="mudo">Meta</small><div><b>{meta || "—"}</b></div></div>
        </div>
      )}
      {!dados.de_acordo_em && !equipe && (
        <div className="mt">
          <p className="mudo" style={{ margin: "0 0 8px" }}>Esse é o resultado que vamos buscar juntas nos próximos 90 dias. Ao confirmar, ele vira o norte do seu Plano de Ação.</p>
          <button type="button" className="btn p" onClick={async () => {
            setErro("");
            if (!confirm("Confirmar o seu de acordo com este Contrato de Foco?")) return;
            const { error } = await supabaseBrowser().rpc("aceitar_contrato_foco", { p: portal.id });
            if (error) setErro(error.message); else recarregar();
          }}>Estou de acordo</button>
          {erro && <div className="aviso mt">{erro}</div>}
        </div>
      )}
      {equipe && <p className="ajuda" style={{ marginBottom: 0 }}>A equipe muda o resultado e o indicador na <Link className="link-loja" href={`/equipe/portal?id=${portal.id}`}>ficha da loja</Link>. Se mudar, o de acordo é pedido de novo.</p>}
    </div>
  );
}
