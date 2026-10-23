"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataHora, diasDesde, haQuanto } from "@/lib/formato";

export default function Painel() {
  const hub = useEquipe();
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const agora = new Date().toISOString();
    const [{ data: portais }, { data: plano }, { data: reunioes }, { data: perfis }, { data: duvidas }, { data: passos }] = await Promise.all([
      sb.from("portais").select("id, loja, tipo, passo_atual, ativo").order("loja"),
      sb.from("plano_itens").select("portal_id, feito"),
      sb.from("reunioes").select("portal_id, data, titulo").gte("data", agora).order("data"),
      sb.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
      sb.from("duvidas").select("portal_id").is("resposta", null),
      sb.from("jornada_passos").select("numero, titulo"),
    ]);
    return { portais: portais ?? [], plano: plano ?? [], reunioes: reunioes ?? [], perfis: perfis ?? [], duvidas: duvidas ?? [], passos: passos ?? [] };
  }, []);
  if (!dados) return <Carregando />;

  const semana = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const linhas = dados.portais.map((p) => {
    const itens = dados.plano.filter((i) => i.portal_id === p.id);
    const pct = itens.length ? Math.round((itens.filter((i) => i.feito).length / itens.length) * 100) : 0;
    const prox = dados.reunioes.find((r) => r.portal_id === p.id);
    const acessos = dados.perfis.filter((x) => x.portal_id === p.id && x.ultimo_acesso).map((x) => x.ultimo_acesso as string).sort().reverse();
    const pendentes = dados.duvidas.filter((d) => d.portal_id === p.id).length;
    return { ...p, pct, prox, acesso: acessos[0] ?? null, pendentes };
  });
  const ativos = linhas.filter((l) => l.ativo);
  const parados = ativos.filter((l) => diasDesde(l.acesso) >= 7).length;
  const naSemana = dados.reunioes.filter((r) => r.data <= semana).length;
  const passo = (n: number) => dados.passos.find((x) => x.numero === n)?.titulo ?? n;

  return (
    <>
      <Titulo titulo="Painel da equipe" sub="Todos os portais em uma tela: em que passo cada loja está e quem precisa de atenção." />
      <div className="grade g4 mb">
        {([
          [ativos.length, "portais ativos", "var(--red)"],
          [naSemana, "reuniões nos próximos 7 dias", "var(--purple)"],
          [dados.duvidas.length, "dúvidas pendentes", "var(--orange)"],
          [parados, "portais sem acesso há 7+ dias", "var(--blue)"],
        ] as const).map(([n, r, c]) => (
          <div key={r} className="card card-borda kpi" style={{ ["--c" as string]: c }}><b>{n}</b><small>{r}</small></div>
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
                    <button className="btn p peq" type="button" onClick={() => hub.abrirPortal(l.id)}>Abrir portal</button>
                    <Link className="btn s peq" href={`/equipe/portal?id=${l.id}`}>Editar</Link>
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
