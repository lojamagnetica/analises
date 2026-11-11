"use client";

import Link from "next/link";
import { EncontroEditar } from "@/components/EncontroEditar";
import { Carregando, useDados } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataHora } from "@/lib/formato";

const loja = (p: unknown) => (Array.isArray(p) ? p[0]?.loja : (p as { loja?: string } | null)?.loja) ?? "";

/** As próximas reuniões de todos os portais (usada na Agenda e na página antiga de Reuniões). */
export function ReunioesDasLojas() {
  const { dados } = useDados(async () => {
    const desde = new Date(Date.now() - 86_400_000).toISOString();
    return (await supabaseBrowser().from("reunioes").select("id, titulo, data, selecionar, portal_id, portais(loja)").gte("data", desde).order("data").limit(100)).data ?? [];
  }, []);
  if (!dados) return <Carregando />;
  return (
    <>
      <EncontroEditar />
      <div className="card tabela-wrap mb">
        <table className="tabela">
          <thead><tr><th>Quando</th><th>Loja</th><th>Tema</th><th>Status</th><th /></tr></thead>
          <tbody>
            {dados.length === 0 && <tr><td colSpan={5} className="mudo">Nenhuma reunião próxima.</td></tr>}
            {dados.map((r) => (
              <tr key={r.id}>
                <td style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{dataHora(r.data)}</td>
                <td><b>{loja(r.portais)}</b></td>
                <td>{r.titulo}</td>
                <td><span className={`selo ${r.selecionar === "Realizado" ? "feito" : r.selecionar === "Adiado" ? "espera" : "alerta"}`}>{r.selecionar}</span></td>
                <td><Link className="btn s peq" href={`/equipe/portal?id=${r.portal_id}#reunioes`}>Editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
