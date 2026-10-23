"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { ETAPAS_JORNADA, SITUACOES, buscarCarteira, contratoAtual, corTermometro } from "@/lib/carteira";
import { dia, diasAte } from "@/lib/formato";

const ordemTermometro: Record<string, number> = { Vermelho: 0, Amarelo: 1, Verde: 2 };

export default function Carteira() {
  const hub = useEquipe();
  const { dados } = useDados(buscarCarteira, []);
  const [situacao, setSituacao] = useState("ativas");
  const [plano, setPlano] = useState("");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"loja" | "fim" | "termometro">("loja");
  if (!dados) return <Carregando />;

  const nomePlano = (id: string | null | undefined) => dados.planos.find((p) => p.id === id)?.nome;
  const pessoa = (id: string | null | undefined) => dados.equipe.find((p) => p.id === id)?.nome?.split(" ")[0];
  const termo = busca.trim().toLowerCase();

  const linhas = dados.lojas
    .map((l) => ({ ...l, f: l.fichas, c: contratoAtual(l) }))
    .filter((l) => {
      const s = l.f?.situacao ?? "Em andamento";
      if (situacao === "ativas" && s === "Finalizada") return false;
      if (situacao !== "ativas" && situacao !== "todas" && s !== situacao) return false;
      if (plano && (l.f?.plano_id ?? l.c?.plano_id) !== plano) return false;
      if (termo && !`${l.loja} ${l.responsavel ?? ""}`.toLowerCase().includes(termo)) return false;
      return true;
    })
    .sort((a, b) => {
      if (ordem === "fim") return (a.c?.fim ?? "9999").localeCompare(b.c?.fim ?? "9999");
      if (ordem === "termometro") return (ordemTermometro[a.f?.termometro ?? ""] ?? 3) - (ordemTermometro[b.f?.termometro ?? ""] ?? 3);
      return a.loja.localeCompare(b.loja);
    });

  return (
    <>
      <Titulo titulo="Carteira" sub="A ficha única de cada loja: plano, contrato, etapa e termômetro. Só a equipe vê." />
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
      </div>

      <div className="linha entre mb">
        <span className="mudo">{linhas.length} {linhas.length === 1 ? "loja" : "lojas"}</span>
        <Link className="btn p" href="/equipe/portais/novo">+ Nova cliente</Link>
      </div>

      <div className="card tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Loja</th><th>Plano</th><th>Situação</th><th>Etapa</th><th>Termômetro</th><th>Fim do contrato</th><th>CS</th><th /></tr></thead>
          <tbody>
            {linhas.length === 0 && <tr><td colSpan={8} className="mudo">Nenhuma loja com esses filtros.</td></tr>}
            {linhas.map((l) => {
              const faltam = diasAte(l.c?.fim);
              return (
                <tr key={l.id}>
                  <td><b>{l.loja}</b><div className="mudo" style={{ fontSize: 12.5 }}>{l.responsavel ?? l.tipo}</div></td>
                  <td>{nomePlano(l.f?.plano_id ?? l.c?.plano_id) ?? <span className="mudo">{l.f?.programa_notion ?? "—"}</span>}</td>
                  <td>{l.f?.situacao ?? "—"}</td>
                  <td>{l.f?.etapa ? `${l.f.etapa} · ${ETAPAS_JORNADA[l.f.etapa]}` : <span className="mudo">—</span>}</td>
                  <td>{l.f?.termometro ? <span className={`selo ${corTermometro(l.f.termometro)}`}>{l.f.termometro}</span> : <span className="mudo">—</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {dia(l.c?.fim)}
                    {faltam >= 0 && faltam <= 60 && <div><span className="selo alerta">em {faltam} dias</span></div>}
                    {faltam < 0 && l.c?.status === "Ativo" && <div><span className="selo erro">venceu</span></div>}
                  </td>
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
