"use client";

import { useState } from "react";
import Link from "next/link";
import { Carregando, useDados, useLojaFoco, usePortal } from "@/lib/hub";
import { aceitarContratoFoco, buscarContratoFoco } from "@/lib/foco";
import { dataHora } from "@/lib/formato";

/** Contrato de Foco: o resultado nº 1 dos próximos 90 dias. A loja lê e dá o "de acordo"; a equipe preenche na ficha da loja. */
export function ContratoFoco() {
  const { portal, equipe } = usePortal();
  const [erro, setErro] = useState("");
  // Portal com várias lojas: o contrato da loja em foco (sem contrato próprio, vale o geral).
  const [loja] = useLojaFoco();
  const { dados, recarregar } = useDados(() => buscarContratoFoco(portal.id, loja), [portal.id, loja]);
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
    <div className="card card-borda mb" style={{ ["--c" as string]: dados.de_acordo_em ? "var(--feito)" : "var(--red)" }}>
      <div className="linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
        <small className="mudo">Contrato de Foco{loja ? ` · ${loja}` : ""} · o resultado nº 1 dos próximos 90 dias</small>
        {dados.de_acordo_em
          ? <span className="selo feito">De acordo em {dataHora(dados.de_acordo_em)}</span>
          : <span className="selo espera">{equipe ? "Esperando o de acordo da loja" : "Falta o seu de acordo"}</span>}
      </div>
      {dados.curto && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginTop: 8 }}>{dados.curto}</div>}
      <h3 style={{ margin: "6px 0 8px" }}>{dados.resultado}</h3>
      {dados.indicador && (
        <div className="grade g3" style={{ gap: 10, textAlign: "center" }}>
          <div><small className="mudo">Início</small><div><b>{inicio || "—"}</b></div></div>
          <div><small className="mudo">Hoje</small><div><b>{hojeV || "—"}</b></div></div>
          <div><small className="mudo">Meta</small><div><b>{meta || "—"}</b></div></div>
        </div>
      )}
      {(dados.trabalhando ?? []).length > 0 && (
        <div className="mt">
          <small className="mudo">Os fundamentos que vamos trabalhar para chegar lá</small>
          <div className="chips" style={{ marginTop: 4 }}>{(dados.trabalhando ?? []).map((x) => <span key={x} className="chip">{x.replace(/^\d+\.\d+ /, "")}</span>)}</div>
        </div>
      )}
      {!dados.de_acordo_em && !equipe && (
        <div className="mt">
          <p className="mudo" style={{ margin: "0 0 8px" }}>Esse é o resultado que vamos buscar juntas nos próximos 90 dias. Ao confirmar, ele vira o norte do seu Plano de Ação.</p>
          <button type="button" className="btn p" onClick={async () => {
            setErro("");
            if (!confirm("Confirmar o seu de acordo com este Contrato de Foco?")) return;
            try { await aceitarContratoFoco(portal.id, loja); recarregar(); } catch (e) { setErro((e as Error).message); }
          }}>Estou de acordo</button>
          {erro && <div className="aviso mt">{erro}</div>}
        </div>
      )}
      {equipe && <p className="ajuda" style={{ marginBottom: 0 }}>A equipe muda o resultado e o indicador na <Link className="link-loja" href={`/equipe/portal?id=${portal.id}`}>ficha da loja</Link>. Se mudar, o de acordo é pedido de novo.</p>}
    </div>
  );
}
