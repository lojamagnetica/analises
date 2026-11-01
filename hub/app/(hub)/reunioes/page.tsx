"use client";

import { Titulo } from "@/components/Titulo";
import { EncontroGrupo } from "@/components/EncontroGrupo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataHora } from "@/lib/formato";

const SELO: Record<string, string> = { Realizado: "feito", Pendente: "alerta", Adiado: "espera" };

export default function Reunioes() {
  const { portal } = usePortal();
  const { dados: data } = useDados(
    async () => (await supabaseBrowser().from("reunioes").select("*").eq("portal_id", portal.id).order("data", { ascending: false })).data ?? [],
    [portal.id],
  );
  if (!data) return <Carregando />;

  return (
    <>
      <Titulo titulo="Reuniões individuais" sub="Aqui ficam todas as suas reuniões. Depois de cada encontro, a equipe publica o resumo (o que trouxemos da análise, as correções pendentes e os direcionamentos) e o link da gravação." />
      {portal.tipo === "Mentoria" && <EncontroGrupo />}
      {portal.meet_url && (
        <div className="card mb linha entre">
          <div><b>Link fixo do Meet</b><div className="mudo">{portal.meet_url}</div></div>
          <a className="btn p" href={portal.meet_url} target="_blank" rel="noopener">Entrar na sala</a>
        </div>
      )}
      <div className="card tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Reunião</th><th>Data</th><th>Status</th><th>Gravação</th></tr></thead>
          <tbody>
            {(data ?? []).length === 0 && <tr><td colSpan={4} className="mudo">Nenhuma reunião ainda.</td></tr>}
            {(data ?? []).map((r) => (
              <tr key={r.id}>
                <td>
                  <b>{r.titulo}</b>
                  {r.ata && <details className="mt"><summary style={{ cursor: "pointer" }}>Ver o resumo</summary><div style={{ whiteSpace: "pre-wrap", fontSize: 14, marginTop: 6 }}>{r.ata}</div></details>}
                </td>
                <td style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{dataHora(r.data)}</td>
                <td><span className={`selo ${SELO[r.selecionar] ?? "espera"}`}>{r.selecionar}</span></td>
                <td>{r.gravacao_url ? <a href={r.gravacao_url} target="_blank" rel="noopener">▶ Assistir</a> : <span className="mudo">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
