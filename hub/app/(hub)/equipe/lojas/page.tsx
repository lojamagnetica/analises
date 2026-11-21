"use client";

// Minhas lojas: todas as clientes numa lista só, em tabela ou em quadro por etapa, com os filtros no lugar das telas separadas.
import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Termometro } from "@/components/Termometro";
import { Carregando, useDados } from "@/lib/hub";
import { dataHora, haQuanto } from "@/lib/formato";
import { ETAPAS } from "@/lib/jornada";
import { buscarMinhasLojas, type LinhaLoja } from "@/lib/minhas-lojas";

const FILTROS = [
  { id: "todas", rotulo: "Todas", f: () => true },
  { id: "atencao", rotulo: "Precisam de atenção", f: (l: LinhaLoja) => l.graves > 0 || l.atrasoJornada },
  { id: "acompanhadas", rotulo: "No acompanhamento", f: (l: LinhaLoja) => l.acompanhada },
  { id: "caminho", rotulo: "A caminho da Claudia", f: (l: LinhaLoja) => !l.acompanhada },
  { id: "incompletas", rotulo: "Com a Claudia, mas incompletas", f: (l: LinhaLoja) => l.acompanhada && !!l.pronta && l.pronta.feitos < l.pronta.total },
  { id: "semacesso", rotulo: "Sem acesso ao Hub", f: (l: LinhaLoja) => !l.temAcesso },
  { id: "semconversa", rotulo: "Sem conversa há 7 dias", f: (l: LinhaLoja) => l.acompanhada && (!l.ultimaConversa || Date.now() - Date.parse(l.ultimaConversa) > 7 * 86_400_000) },
] as const;
const nomeEtapa = (n: number) => (n < 0 ? "Sem etapa" : `${n} · ${ETAPAS.find((e) => e.n === n)?.nome ?? ""}`);

function Situacao({ l }: { l: LinhaLoja }) {
  if (l.graves) return <span className="selo erro">{l.graves} {l.graves === 1 ? "urgente" : "urgentes"}</span>;
  if (l.atrasoJornada) return <span className="selo alerta">jornada atrasada</span>;
  if (l.alertas) return <span className="selo andamento">{l.alertas} em atenção</span>;
  return <span className="selo feito">em dia</span>;
}

export default function MinhasLojas() {
  const { dados } = useDados(() => buscarMinhasLojas(), []);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("todas");
  const [modo, setModo] = useState<"tabela" | "quadro">("tabela");
  const [busca, setBusca] = useState("");
  const [verEx, setVerEx] = useState(false);
  if (!dados) return <Carregando />;
  const f = FILTROS.find((x) => x.id === filtro)!.f;
  const lista = dados.lojas.filter((l) => f(l) && (l.loja + " " + (l.responsavel ?? "")).toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => b.graves - a.graves || Number(b.atrasoJornada) - Number(a.atrasoJornada) || a.loja.localeCompare(b.loja));
  const etapas = [...new Set(lista.map((l) => l.etapa))].sort((a, b) => a - b);

  return (
    <>
      <Titulo titulo="Minhas lojas" sub="Todas as clientes numa lista só. Toque no nome para abrir a ficha da loja." />
      <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
        <input type="search" placeholder="Buscar loja ou responsável" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ maxWidth: 300 }} />
        <div className="chips">
          <button type="button" className={`chip${modo === "tabela" ? " escolhido" : ""}`} onClick={() => setModo("tabela")}>Tabela</button>
          <button type="button" className={`chip${modo === "quadro" ? " escolhido" : ""}`} onClick={() => setModo("quadro")}>Quadro por etapa</button>
        </div>
      </div>
      <div className="chips mb">
        {FILTROS.map((x) => <button key={x.id} type="button" className={`chip${filtro === x.id ? " escolhido" : ""}`} onClick={() => setFiltro(x.id)}>{x.rotulo} · {dados.lojas.filter(x.f).length}</button>)}
      </div>

      {modo === "tabela" ? (
        <div className="card" style={{ overflowX: "auto", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ textAlign: "left" }}>
              {["Loja", "Situação", "Etapa", "Termômetro", "Última conversa", "Entrou no Hub", "Pronta para a Claudia", "Caixa da semana", "Próxima reunião"].map((h) => <th key={h} style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 12px" }}><Link href={`/equipe/loja?id=${l.id}`} style={{ fontWeight: 700, color: "inherit" }}>{l.loja}</Link>{l.responsavel && <div><small className="mudo">{l.responsavel}</small></div>}</td>
                  <td style={{ padding: "8px 12px" }}><Situacao l={l} /></td>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{nomeEtapa(l.etapa)}{l.dia != null && <div><small className="mudo">dia {l.dia}</small></div>}</td>
                  <td style={{ padding: "8px 12px" }}><Termometro valor={l.termometro} /></td>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{l.ultimaConversa ? haQuanto(l.ultimaConversa) : <span className="mudo">nunca</span>}</td>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{!l.temAcesso ? <span className="mudo">sem acesso</span> : l.ultimoAcesso ? haQuanto(l.ultimoAcesso) : <span className="mudo">nunca entrou</span>}</td>
                  <td style={{ padding: "8px 12px", minWidth: 170 }}>{l.pronta && <><span className={`selo ${l.pronta.feitos === l.pronta.total ? "feito" : l.acompanhada ? "alerta" : "espera"}`}>{l.pronta.feitos} de {l.pronta.total}</span>{l.pronta.falta.length > 0 && <div><small className="mudo">Falta: {l.pronta.falta.join(" · ")}</small></div>}</>}</td>
                  <td style={{ padding: "8px 12px" }}>{l.caixaSemana ? `${l.caixaSemana} ${l.caixaSemana === 1 ? "dia" : "dias"}` : <span className="mudo">—</span>}</td>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{l.proxima ? dataHora(l.proxima) : <span className="mudo">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!lista.length && <p className="mudo" style={{ padding: 12 }}>Nenhuma loja neste filtro.</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(240px, 1fr)", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {etapas.map((e) => (
            <div key={e} style={{ background: "var(--soft)", borderRadius: 14, padding: 10 }}>
              <b style={{ display: "block", marginBottom: 8 }}>{nomeEtapa(e)} · {lista.filter((l) => l.etapa === e).length}</b>
              <div style={{ display: "grid", gap: 8 }}>
                {lista.filter((l) => l.etapa === e).map((l) => (
                  <Link key={l.id} href={`/equipe/loja?id=${l.id}`} className="card" style={{ padding: 10, textDecoration: "none", color: "inherit" }}>
                    <div className="linha entre" style={{ gap: 6 }}><b>{l.loja}</b><Termometro valor={l.termometro} /></div>
                    <div className="mt"><Situacao l={l} /></div>
                    {l.proximoPasso && <small className="mudo" style={{ display: "block", marginTop: 4 }}>Próximo: {l.proximoPasso}</small>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt"><button type="button" className="link-loja" onClick={() => setVerEx(!verEx)}>{verEx ? "Esconder" : "Ver"} as ex-mentoradas · {dados.ex.length}</button></p>
      {verEx && <div className="card">{dados.ex.map((l) => <div key={l.id} style={{ padding: "4px 0" }}><Link href={`/equipe/loja?id=${l.id}`}>{l.loja}</Link></div>)}</div>}
      <p className="ajuda mt">Para mudar a fase, o status ou a etapa de várias lojas de uma vez: <Link href="/equipe">Painel dos portais</Link> · <Link href="/equipe/central">Jornada (checklist das etapas)</Link> · <Link href="/empresa/carteira">Contratos e números (Gestão de Clientes)</Link>.</p>
    </>
  );
}
