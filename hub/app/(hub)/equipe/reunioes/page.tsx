"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataHora } from "@/lib/formato";

const loja = (p: unknown) => (Array.isArray(p) ? p[0]?.loja : (p as { loja?: string } | null)?.loja) ?? "";

export default function ReunioesEquipe() {
  useEquipe();
  const { dados } = useDados(async () => {
    const desde = new Date(Date.now() - 86_400_000).toISOString();
    return (await supabaseBrowser().from("reunioes").select("id, titulo, data, selecionar, portal_id, portais(loja)").gte("data", desde).order("data").limit(100)).data ?? [];
  }, []);
  if (!dados) return <Carregando />;

  return (
    <>
      <Titulo titulo="Reuniões" sub="Próximas reuniões de todos os portais. Para marcar uma reunião, abra o portal da loja em Editar → Reuniões." />
      <div className="card tabela-wrap">
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
