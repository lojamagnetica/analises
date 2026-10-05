import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { contextoEquipe } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { dataHora, diasDesde, haQuanto } from "@/lib/formato";
import { abrirPortal } from "../acoes";

export const metadata = { title: "Painel da equipe" };

export default async function Painel() {
  await contextoEquipe();
  const supabase = await supabaseServer();
  const agora = new Date();
  const semana = new Date(agora.getTime() + 7 * 86_400_000).toISOString();

  const [{ data: portais }, { data: plano }, { data: reunioes }, { data: perfis }, { data: duvidas }, { data: passos }] = await Promise.all([
    supabase.from("portais").select("id, loja, tipo, passo_atual, ativo").order("loja"),
    supabase.from("plano_itens").select("portal_id, feito"),
    supabase.from("reunioes").select("portal_id, data, titulo").gte("data", agora.toISOString()).order("data"),
    supabase.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
    supabase.from("duvidas").select("portal_id").is("resposta", null),
    supabase.from("jornada_passos").select("numero, titulo"),
  ]);

  const linhas = (portais ?? []).map((p) => {
    const itens = (plano ?? []).filter((i) => i.portal_id === p.id);
    const pct = itens.length ? Math.round((itens.filter((i) => i.feito).length / itens.length) * 100) : 0;
    const prox = (reunioes ?? []).find((r) => r.portal_id === p.id);
    const acessos = (perfis ?? []).filter((x) => x.portal_id === p.id && x.ultimo_acesso).map((x) => x.ultimo_acesso as string).sort().reverse();
    const pendentes = (duvidas ?? []).filter((d) => d.portal_id === p.id).length;
    return { ...p, pct, prox, acesso: acessos[0] ?? null, pendentes };
  });
  const ativos = linhas.filter((l) => l.ativo);
  const parados = ativos.filter((l) => diasDesde(l.acesso) >= 7).length;
  const naSemana = (reunioes ?? []).filter((r) => r.data <= semana).length;
  const passo = (n: number) => passos?.find((x) => x.numero === n)?.titulo ?? n;

  return (
    <>
      <Titulo titulo="Painel da equipe" sub="Todos os portais em uma tela: em que passo cada loja está e quem precisa de atenção." />
      <div className="grade g4 mb">
        {[
          [ativos.length, "portais ativos", "var(--red)"],
          [naSemana, "reuniões nos próximos 7 dias", "var(--purple)"],
          [(duvidas ?? []).length, "dúvidas pendentes", "var(--orange)"],
          [parados, "portais sem acesso há 7+ dias", "var(--blue)"],
        ].map(([n, r, c]) => (
          <div key={r as string} className="card card-borda kpi" style={{ ["--c" as string]: c as string }}><b>{n}</b><small>{r}</small></div>
        ))}
      </div>
      <div className="linha mb"><Link className="btn p" href="/equipe/portais/novo">+ Novo portal</Link></div>
      <div className="card tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Loja</th><th>Passo</th><th>Plano de Ação</th><th>Próxima reunião</th><th>Último acesso</th><th>Dúvidas</th><th /></tr></thead>
          <tbody>
            {linhas.length === 0 && <tr><td colSpan={7} className="mudo">Nenhum portal ainda. Crie o primeiro.</td></tr>}
            {linhas.map((l) => (
              <tr key={l.id} style={{ opacity: l.ativo ? 1 : 0.5 }}>
                <td><b>{l.loja}</b><div className="mudo" style={{ fontSize: 12.5 }}>{l.tipo}{!l.ativo && " · inativo"}</div></td>
                <td>{l.passo_atual}. {passo(l.passo_atual)}</td>
                <td style={{ minWidth: 130 }}><div className="barra"><i style={{ width: `${l.pct}%` }} /></div><small className="mudo">{l.pct}%</small></td>
                <td style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{l.prox ? dataHora(l.prox.data) : <span className="mudo">sem data</span>}</td>
                <td>{diasDesde(l.acesso) >= 7 ? <span className="selo erro">{haQuanto(l.acesso)}</span> : haQuanto(l.acesso)}</td>
                <td>{l.pendentes ? <span className="selo alerta">{l.pendentes}</span> : <span className="mudo">—</span>}</td>
                <td>
                  <div className="linha" style={{ flexWrap: "nowrap" }}>
                    <form action={abrirPortal.bind(null, l.id)}><button className="btn p peq" type="submit">Abrir portal</button></form>
                    <Link className="btn s peq" href={`/equipe/portais/${l.id}`}>Editar</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
