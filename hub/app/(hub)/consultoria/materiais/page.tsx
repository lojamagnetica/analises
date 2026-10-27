"use client";

import Link from "next/link";
import { RascunhoComoLoja } from "@/components/RascunhoComoLoja";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia } from "@/lib/formato";
import { buscarMateriais } from "@/lib/materiais";
import { buscarConsultoria } from "@/lib/consultoria";

/** A pasta de materiais da consultoria: tudo o que foi entregue, separado por mês. */
export default function Materiais() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(async () => {
    const [materiais, c] = await Promise.all([buscarMateriais(portal.id), buscarConsultoria(portal.id)]);
    return { materiais, meses: c.dados?.meses ?? [] };
  }, [portal.id]);
  if (!dados) return <Carregando />;
  const visiveis = dados.materiais.filter((m) => equipe || m.liberado);
  // Os meses do plano primeiro, na ordem; depois o que não tem mês.
  const ordem = [...dados.meses.map((m) => m.mes), ""];
  const nomeMes = (mes: string) => dados.meses.find((m) => m.mes === mes)?.nome ?? "Outros materiais";

  return (
    <>
      <Titulo titulo="Materiais" sub="Tudo o que a consultoria entregou para a sua loja, num lugar só: planos, análises e planilhas." />
      {equipe && <Link href="/consultoria/materiais/ver?id=novo" className="btn p peq mb" style={{ display: "inline-block" }}>+ material</Link>}
      <RascunhoComoLoja />
      {!visiveis.length && <div className="card mudo">Os materiais aparecem aqui assim que forem entregues.</div>}
      {ordem.map((mes) => {
        const doMes = visiveis.filter((m) => (m.mes ?? "") === mes || (mes === "" && m.mes && !dados.meses.some((x) => x.mes === m.mes)));
        if (!doMes.length) return null;
        return (
          <div key={mes || "outros"} className="mb">
            <div className="secao">{nomeMes(mes)}</div>
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {doMes.map((m) => (
                <Link key={m.id} href={`/consultoria/materiais/ver?id=${m.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="linha entre" style={{ alignItems: "flex-start", gap: 8 }}>
                    <b style={{ fontSize: 15 }}>📄 {m.titulo}</b>
                    {equipe && !m.liberado && <span className="selo espera">rascunho</span>}
                  </div>
                  <small className="mudo">{m.arquivo ? "Com planilha ou arquivo anexo · " : ""}atualizado em {dia(m.updated_at.slice(0, 10))}</small>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
