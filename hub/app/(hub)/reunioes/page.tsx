import { Titulo } from "@/components/Titulo";
import { contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { dataHora } from "@/lib/formato";

export const metadata = { title: "Reuniões" };

const SELO: Record<string, string> = { Realizado: "feito", Pendente: "alerta", Adiado: "espera" };

export default async function Reunioes() {
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("reunioes").select("*").eq("portal_id", portal.id).order("data", { ascending: false });

  return (
    <>
      <Titulo titulo="Reuniões individuais" sub="As reuniões aparecem aqui sozinhas assim que são marcadas na agenda. Depois do encontro, a gravação fica disponível." />
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
                <td><b>{r.titulo}</b>{r.ata && <div className="mudo" style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{r.ata}</div>}</td>
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
