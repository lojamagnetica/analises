import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { contextoEquipe } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { dataHora } from "@/lib/formato";
import { sincronizarAgora } from "../acoes";

export const metadata = { title: "Reuniões" };

export default async function ReunioesEquipe({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  await contextoEquipe();
  const supabase = await supabaseServer();
  const desde = new Date(Date.now() - 86_400_000).toISOString();
  const { data } = await supabase.from("reunioes").select("id, titulo, data, selecionar, portal_id, portais(loja)").gte("data", desde).order("data").limit(100);
  const loja = (p: unknown) => (Array.isArray(p) ? p[0]?.loja : (p as { loja?: string } | null)?.loja) ?? "";

  return (
    <>
      <Titulo titulo="Reuniões" sub="Puxadas do Google Agenda todo dia às 07h05. Eventos roxos (leads do comercial) ficam de fora." />
      <form action={sincronizarAgora} className="linha mb">
        <button className="btn p" type="submit">Sincronizar agora</button>
        <span className="mudo">Para incluir uma loja, coloque o nome dela (ou um apelido do portal) no título do evento.</span>
      </form>
      {msg && <div className="aviso ok mb">{msg}</div>}
      <div className="card tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Quando</th><th>Loja</th><th>Tema</th><th>Status</th><th /></tr></thead>
          <tbody>
            {(data ?? []).length === 0 && <tr><td colSpan={5} className="mudo">Nenhuma reunião próxima.</td></tr>}
            {(data ?? []).map((r) => (
              <tr key={r.id}>
                <td style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{dataHora(r.data)}</td>
                <td><b>{loja(r.portais)}</b></td>
                <td>{r.titulo}</td>
                <td><span className={`selo ${r.selecionar === "Realizado" ? "feito" : r.selecionar === "Adiado" ? "espera" : "alerta"}`}>{r.selecionar}</span></td>
                <td><Link className="btn s peq" href={`/equipe/portais/${r.portal_id}#reunioes`}>Editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
