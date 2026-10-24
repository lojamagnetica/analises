"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { ETAPAS_JORNADA, SITUACOES, contratoAtual, corTermometro } from "@/lib/carteira";
import { PERIODOS, buscarGestao, numeros, precisaAtencao, resumoPorLoja, type Periodo } from "@/lib/gestao-clientes";
import { dataHora, dia, diasAte, diasDesde, haQuanto, moeda } from "@/lib/formato";

const ordemTermometro: Record<string, number> = { Vermelho: 0, Amarelo: 1, Verde: 2 };

export default function GestaoDeClientes() {
  const hub = useEquipe();
  const { dados } = useDados(buscarGestao, []);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [situacao, setSituacao] = useState("ativas");
  const [plano, setPlano] = useState("");
  const [busca, setBusca] = useState("");
  const [soAtencao, setSoAtencao] = useState(false);
  const [ordem, setOrdem] = useState<"loja" | "fim" | "termometro">("loja");
  if (!dados) return <Carregando />;

  const nomePlano = (id: string | null | undefined) => dados.planos.find((p) => p.id === id)?.nome;
  const pessoa = (id: string | null | undefined) => dados.equipe.find((p) => p.id === id)?.nome?.split(" ")[0];
  const termo = busca.trim().toLowerCase();
  const resumo = resumoPorLoja(dados);
  const n = numeros(dados, periodo);

  const linhas = dados.lojas
    .map((l) => ({ ...l, f: l.fichas, c: contratoAtual(l), r: resumo.get(l.id) }))
    .filter((l) => {
      const s = l.f?.situacao ?? "Em andamento";
      if (situacao === "ativas" && s === "Finalizada") return false;
      if (situacao !== "ativas" && situacao !== "todas" && s !== situacao) return false;
      if (plano && (l.f?.plano_id ?? l.c?.plano_id) !== plano) return false;
      if (termo && !`${l.loja} ${l.responsavel ?? ""}`.toLowerCase().includes(termo)) return false;
      if (soAtencao && !precisaAtencao(l, l.r?.acesso)) return false;
      return true;
    })
    .sort((a, b) => {
      if (ordem === "fim") return (a.c?.fim ?? "9999").localeCompare(b.c?.fim ?? "9999");
      if (ordem === "termometro") return (ordemTermometro[a.f?.termometro ?? ""] ?? 3) - (ordemTermometro[b.f?.termometro ?? ""] ?? 3);
      return a.loja.localeCompare(b.loja);
    });

  const cartoes: [string, string, string][] = [
    [String(n.clientesNovas), "clientes novas no período", "var(--red)"],
    [moeda(n.valor), "valor contratado no período", "var(--green)"],
    [n.ticket === null ? "—" : moeda(n.ticket), "ticket médio", "var(--blue)"],
    [String(n.reunioes), "reuniões no período", "var(--purple)"],
    [String(n.proximas7), "reuniões nos próximos 7 dias", "var(--blue)"],
    [String(n.ativas), "clientes ativas agora", "var(--green)"],
    [String(n.vencendo), "contratos vencendo em 60 dias", "var(--orange)"],
    [String(n.atencao), `precisam de atenção (${n.vermelhos} no vermelho)`, "var(--red)"],
  ];

  return (
    <>
      <Titulo titulo="Gestão de Clientes" sub="Os números do período, a ficha de cada loja e quem precisa de atenção. Só a equipe vê." />

      <div className="chips mb">
        {PERIODOS.map((p) => <button key={p.id} type="button" className={`chip${periodo === p.id ? " escolhido" : ""}`} onClick={() => setPeriodo(p.id)}>{p.rotulo}</button>)}
      </div>
      <div className="grade g4 mb">
        {cartoes.map(([valor, rotulo, cor]) => (
          <div key={rotulo} className="card card-borda kpi" style={{ ["--c" as string]: cor }}><b>{valor}</b><small>{rotulo}</small></div>
        ))}
      </div>
      <p className="ajuda mb">Os três primeiros e as reuniões seguem o período escolhido; o resto é a situação de agora. O valor vem dos contratos, não do dinheiro que entrou.</p>

      <div className="card mb">
        <div className="grade g4" style={{ gap: 12 }}>
          <div>
            <label className="rotulo">Situação</label>
            <select value={situacao} onChange={(e) => setSituacao(e.target.value)}>
              <option value="ativas">Ativas (sem finalizadas)</option>
              {SITUACOES.map((s) => <option key={s}>{s}</option>)}
              <option value="todas">Todas</option>
            </select>
          </div>
          <div>
            <label className="rotulo">Plano</label>
            <select value={plano} onChange={(e) => setPlano(e.target.value)}>
              <option value="">Todos</option>
              {dados.planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo">Ordenar por</label>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)}>
              <option value="loja">Nome da loja</option>
              <option value="fim">Fim do contrato</option>
              <option value="termometro">Termômetro</option>
            </select>
          </div>
          <div><label className="rotulo">Buscar</label><input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Loja ou responsável" /></div>
        </div>
        <div className="chips mt">
          <button type="button" className={`chip${soAtencao ? " escolhido" : ""}`} onClick={() => setSoAtencao(!soAtencao)}>Só quem precisa de atenção</button>
        </div>
      </div>

      <div className="linha entre mb">
        <span className="mudo">{linhas.length} {linhas.length === 1 ? "loja" : "lojas"}</span>
        <Link className="btn p" href="/equipe/portais/novo">+ Nova cliente</Link>
      </div>

      <div className="card tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Loja</th><th>Plano</th><th>Situação</th><th>Etapa</th><th>Termômetro</th><th>Placar</th><th>Fim do contrato</th><th>Próxima reunião</th><th>Último acesso</th><th>CS</th><th /></tr></thead>
          <tbody>
            {linhas.length === 0 && <tr><td colSpan={11} className="mudo">Nenhuma loja com esses filtros.</td></tr>}
            {linhas.map((l) => {
              const faltam = diasAte(l.c?.fim);
              const parado = !!l.r?.acesso && diasDesde(l.r.acesso) >= 14;
              return (
                <tr key={l.id}>
                  <td><b>{l.loja}</b><div className="mudo" style={{ fontSize: 12.5 }}>{l.responsavel ?? l.tipo}</div></td>
                  <td>{nomePlano(l.f?.plano_id ?? l.c?.plano_id) ?? <span className="mudo">{l.f?.programa_notion ?? "—"}</span>}</td>
                  <td>{l.f?.situacao ?? "—"}</td>
                  <td>{l.f?.etapa ? `${l.f.etapa} · ${ETAPAS_JORNADA[l.f.etapa]}` : <span className="mudo">—</span>}</td>
                  <td>{l.f?.termometro ? <span className={`selo ${corTermometro(l.f.termometro)}`}>{l.f.termometro}</span> : <span className="mudo">—</span>}</td>
                  <td>{l.f?.fundamentos.length ?? 0}/16</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {dia(l.c?.fim)}
                    {faltam >= 0 && faltam <= 60 && <div><span className="selo alerta">em {faltam} dias</span></div>}
                    {faltam < 0 && l.c?.status === "Ativo" && <div><span className="selo erro">venceu</span></div>}
                  </td>
                  <td style={{ whiteSpace: "nowrap", textTransform: "capitalize" }}>{l.r?.proxima ? dataHora(l.r.proxima) : <span className="mudo">—</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{l.r?.acesso ? <>{haQuanto(l.r.acesso)}{parado && <div><span className="selo espera">parada</span></div>}</> : <span className="mudo">nunca</span>}</td>
                  <td>{pessoa(l.f?.responsavel_cs) ?? <span className="mudo">—</span>}</td>
                  <td>
                    <div className="linha" style={{ flexWrap: "nowrap" }}>
                      <Link className="btn p peq" href={`/equipe/portal?id=${l.id}#ficha`}>Ficha</Link>
                      <button className="btn s peq" type="button" onClick={() => hub.abrirPortal(l.id)}>Portal</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
