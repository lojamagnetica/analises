"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataCurta, dataHora, diasDesde, haQuanto, hoje } from "@/lib/formato";
import { buscarEncontro, proximoEncontro } from "@/lib/encontro";
import { NOME_PLANO, proximaPeloPlano } from "@/lib/reunioes-plano";

export default function Painel() {
  const hub = useEquipe();
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const agora = new Date().toISOString();
    const [{ data: portais }, { data: plano }, { data: reunioes }, { data: perfis }, { data: duvidas }, { data: passos }, { data: todas }, { data: contratos }, grupo] = await Promise.all([
      sb.from("portais").select("id, loja, tipo, passo_atual, ativo, acesso_liberado, entrega, prioridade").order("loja"),
      sb.from("plano_itens").select("portal_id, feito"),
      sb.from("reunioes").select("portal_id, data, titulo, selecionar").gte("data", agora).order("data"),
      sb.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
      sb.from("solicitacoes").select("portal_id").in("status", ["Recebida", "Em andamento"]),
      sb.from("jornada_passos").select("numero, titulo"),
      // Para a previsão pelo plano: todas as reuniões (feitas e marcadas) e o contrato de cada loja.
      sb.from("reunioes").select("portal_id, data, titulo, selecionar"),
      sb.from("contratos").select("portal_id, plano_id, inicio, status").order("inicio", { ascending: false }),
      buscarEncontro().catch(() => null),
    ]);
    return { portais: portais ?? [], plano: plano ?? [], reunioes: (reunioes ?? []).filter((r) => r.selecionar !== "Adiado"), perfis: perfis ?? [], duvidas: duvidas ?? [], passos: passos ?? [], todas: todas ?? [], contratos: contratos ?? [], grupo };
  }, []);
  if (!dados) return <Carregando />;
  const mudar = async (id: string, campos: Record<string, unknown>) => {
    const { error } = await supabaseBrowser().from("portais").update(campos).eq("id", id);
    if (error) alert(error.message); else recarregar();
  };

  const semana = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const linhas = dados.portais.map((p) => {
    const itens = dados.plano.filter((i) => i.portal_id === p.id);
    const pct = itens.length ? Math.round((itens.filter((i) => i.feito).length / itens.length) * 100) : 0;
    const prox = dados.reunioes.find((r) => r.portal_id === p.id);
    const acessos = dados.perfis.filter((x) => x.portal_id === p.id && x.ultimo_acesso).map((x) => x.ultimo_acesso as string).sort().reverse();
    const pendentes = dados.duvidas.filter((d) => d.portal_id === p.id).length;
    // A próxima reunião pelo plano (contrato mais recente da loja).
    const ct = dados.contratos.find((c) => c.portal_id === p.id && c.status === "Ativo") ?? dados.contratos.find((c) => c.portal_id === p.id);
    const peloPlano = p.tipo === "Mentoria" ? proximaPeloPlano(ct?.plano_id, ct?.inicio, dados.todas.filter((r) => r.portal_id === p.id), hoje()) : null;
    return { ...p, pct, prox, acesso: acessos[0] ?? null, pendentes, plano: ct?.plano_id ?? null, peloPlano };
  });
  // Primeiro as lojas que já têm acesso (acompanhamento), na ordem de prioridade; depois as que ainda não têm,
  // pela próxima reunião marcada (a mais perto primeiro).
  const porReuniao = (a: (typeof linhas)[number], b: (typeof linhas)[number]) =>
    (a.prox?.data ?? "9999").localeCompare(b.prox?.data ?? "9999") || a.loja.localeCompare(b.loja);
  const ativos = linhas.filter((l) => l.ativo);
  const comAcesso = ativos.filter((l) => l.acesso_liberado).sort((a, b) => (a.prioridade ?? 999) - (b.prioridade ?? 999) || porReuniao(a, b));
  const semAcesso = ativos.filter((l) => !l.acesso_liberado).sort(porReuniao);
  const parados = ativos.filter((l) => l.acesso_liberado && diasDesde(l.acesso) >= 7).length;
  const grupoProx = dados.grupo ? proximoEncontro(dados.grupo) : null;
  const naSemana = dados.reunioes.filter((r) => r.data <= semana).length;
  // Quem já encerrou a mentoria fica numa aba fechada embaixo, para não misturar com as atuais.
  const encerradas = linhas.filter((l) => !l.ativo);
  const tabela = (lista: typeof linhas, vazio: string) => (
    <div className="card tabela-wrap">
      <table className="tabela">
        <thead><tr><th>Loja</th><th>Fase</th><th>Status</th><th>Plano de Ação</th><th>Próxima reunião</th><th>Último acesso</th></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={6} className="mudo">{vazio}</td></tr>}
          {lista.map((l) => (
            <tr key={l.id}>
              <td style={{ minWidth: 190 }}>
                {/* Abrir e editar junto do nome: não precisa rolar a tabela para o lado. */}
                <button type="button" className="link-loja" style={{ fontWeight: 700, textAlign: "left", textDecoration: "none" }} title="Abrir o portal" onClick={() => hub.abrirPortal(l.id)}>{l.loja} ↗</button>
                <div className="linha" style={{ gap: 8, margin: "4px 0 2px" }}>
                  <button className="btn p peq" type="button" onClick={() => hub.abrirPortal(l.id)}>Abrir</button>
                  <Link className="btn s peq" href={`/equipe/portal?id=${l.id}`}>Editar</Link>
                </div>
                <div className="mudo" style={{ fontSize: 12.5 }}>{l.tipo}{l.pendentes ? <> · <span className="selo alerta">{l.pendentes} {l.pendentes === 1 ? "dúvida" : "dúvidas"}</span></> : null}</div>
              </td>
              <td>
                <select style={{ minWidth: 170 }} aria-label={`Fase de ${l.loja}`} value={l.acesso_liberado ? "sim" : "nao"} className={l.acesso_liberado ? "sel-feito" : ""}
                  onChange={(e) => mudar(l.id, { acesso_liberado: e.target.value === "sim" })}>
                  <option value="sim">Acompanhamento</option>
                  <option value="nao">Ainda sem acesso</option>
                </select>
              </td>
              <td>
                <select style={{ minWidth: 150 }} aria-label={`Status de ${l.loja}`} value={l.entrega ?? "preparacao"} className={l.entrega === "entregue" ? "sel-feito" : "sel-andamento"}
                  onChange={(e) => mudar(l.id, { entrega: e.target.value })}>
                  <option value="preparacao">Em preparação</option>
                  <option value="entregue">Entregue</option>
                </select>
              </td>
              <td style={{ minWidth: 130 }}><div className="barra"><i style={{ width: `${l.pct}%` }} /></div><small className="mudo">{l.pct}%</small></td>
              <td style={{ minWidth: 170 }}>
                {l.prox ? <span style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{dataHora(l.prox.data)}</span> : <span className="mudo">sem data marcada</span>}
                {l.peloPlano && (
                  <div className="mudo" style={{ fontSize: 12.5, marginTop: 2 }}>
                    Pelo plano{l.plano ? ` ${NOME_PLANO[l.plano] ?? l.plano}` : ""}:{" "}
                    {l.peloPlano === "nenhuma"
                      ? <>sem encontro individual previsto{grupoProx ? ` · grupo ${dataCurta(grupoProx.iso.slice(0, 10))}` : ""}</>
                      : <b style={{ color: l.peloPlano.data < hoje() ? "var(--red)" : undefined }}>{l.peloPlano.titulo} ~{dataCurta(l.peloPlano.data)}{l.peloPlano.data < hoje() ? " (já passou: marcar)" : ""}</b>}
                  </div>
                )}
              </td>
              <td>{l.ativo && diasDesde(l.acesso) >= 7 ? <span className="selo erro">{haQuanto(l.acesso)}</span> : haQuanto(l.acesso)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <Titulo titulo="Painel da equipe" sub="Todos os portais em uma tela: no alto as lojas que já têm acesso, na ordem de prioridade; embaixo as que ainda não têm, pela próxima reunião. Mude a fase e o status direto na tabela." />
      <div className="grade g4 mb">
        {([
          [ativos.length, "portais ativos", "var(--red)"],
          [naSemana, "reuniões nos próximos 7 dias", "var(--purple)"],
          [dados.duvidas.length, "mensagens esperando resposta", "var(--orange)"],
          [parados, "lojas que não entram há 7+ dias", "var(--blue)"],
        ] as const).map(([n, r, c]) => (
          <div key={r} className="card card-borda kpi" style={{ ["--c" as string]: c }}><b>{n}</b><small>{r}</small></div>
        ))}
      </div>
      <div className="linha mb"><Link className="btn p" href="/equipe/portais/novo">+ Novo portal</Link></div>
      <div className="secao">Lojistas com acesso · acompanhamento · {comAcesso.length}</div>
      {tabela(comAcesso, "Nenhuma loja com acesso ainda.")}
      <div className="secao">Ainda sem acesso · {semAcesso.length} <span className="mudo" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>· na ordem das próximas reuniões</span></div>
      {tabela(semAcesso, "Todas as lojas já têm acesso.")}
      {encerradas.length > 0 && (
        <details className="mt">
          <summary style={{ cursor: "pointer" }}><b>Ex-mentoradas · {encerradas.length}</b> <span className="mudo">· já encerraram a mentoria ou a consultoria</span></summary>
          <div className="mt">{tabela(encerradas, "")}</div>
        </details>
      )}
    </>
  );
}
