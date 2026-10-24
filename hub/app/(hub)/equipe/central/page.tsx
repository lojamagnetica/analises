"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora, moeda } from "@/lib/formato";
import { ETAPAS, buscarJornada, receberPassagem, situacao, type ClienteJornada } from "@/lib/jornada";
import { corTermometro } from "@/lib/carteira";

const NOME_PLANO: Record<string, string> = { premium: "Premium", gold: "Gold", start: "Start", "consultoria-3m": "Consultoria", "consultoria-6m": "Consultoria", "pro-12": "PRO 12", "grupo-6m": "Grupo 6M" };

function Card({ c }: { c: ClienteJornada }) {
  const s = situacao(c);
  return (
    <Link href={`/equipe/central/cliente?id=${c.id}`} className={`card jornada-card ${s.alerta ? "atrasada" : ""}`}>
      <div className="linha entre" style={{ gap: 6 }}>
        <b style={{ minWidth: 0, overflowWrap: "anywhere" }}>{c.loja}</b>
        {c.termometro && <span className={`selo ${corTermometro(c.termometro)}`}>{c.termometro}</span>}
      </div>
      <small className="mudo">{c.plano ? NOME_PLANO[c.plano] ?? c.plano : c.tipo}{c.dia != null ? ` · dia ${c.dia}` : ""}</small>
      {s.proximo && <small style={{ display: "block", marginTop: 6 }}>Próximo: {s.proximo.texto}</small>}
      {s.atrasos.length > 0 && <small style={{ display: "block", marginTop: 4, color: "var(--red)", fontWeight: 600 }}>{s.atrasos.length} {s.atrasos.length === 1 ? "item atrasado" : "itens atrasados"}</small>}
      {!s.atrasos.length && s.foraDaJanela && <small style={{ display: "block", marginTop: 4, color: "var(--orange)", fontWeight: 600 }}>Passou do prazo da etapa</small>}
    </Link>
  );
}

// O quadro da CS: uma coluna por etapa da jornada, um card por cliente com o dia de mentoria e o alerta de prazo.
export default function Central() {
  const { nome } = useEquipe();
  const [soAlerta, setSoAlerta] = useState(false);
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(() => buscarJornada(), []);
  if (!dados) return <Carregando />;

  const novas = dados.filter((c) => c.passagem && !c.passagem.recebida_em);
  const lista = dados.filter((c) => !soAlerta || situacao(c).alerta);
  const semEtapa = lista.filter((c) => c.etapa < 0);
  const colunas = ETAPAS.filter((e) => e.n >= 1 && e.n <= 7);
  const alertas = dados.filter((c) => situacao(c).alerta).length;

  return (
    <>
      <Titulo titulo="Central do Cliente" sub="A jornada de cada cliente, da passagem do Comercial ao encerramento. Cada card mostra o dia de mentoria, o próximo passo e o que está atrasado." />
      <div className="grade g3 mb">
        <div className="card card-borda kpi" style={{ ["--c" as string]: novas.length ? "var(--orange)" : "var(--green)" }}><b>{novas.length}</b><small>passagens para receber</small></div>
        <div className="card card-borda kpi" style={{ ["--c" as string]: alertas ? "var(--red)" : "var(--green)" }}><b>{alertas}</b><small>clientes com algo atrasado</small></div>
        <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--purple)" }}><b>{dados.length}</b><small>clientes ativas</small></div>
      </div>
      {erro && <div className="aviso mb">{erro}</div>}

      {novas.length > 0 && (
        <>
          <div className="secao">Passagens do Comercial para receber</div>
          {novas.map((c) => {
            const p = c.passagem!;
            return (
              <div key={c.id} className="card card-borda mb" style={{ ["--c" as string]: "var(--orange)" }}>
                <div className="linha entre">
                  <div><b>{c.loja}</b> <small className="mudo">· {c.plano ? NOME_PLANO[c.plano] ?? c.plano : ""}{p.valor ? ` · ${moeda(Number(p.valor))}` : ""} · vendido por {p.vendido_por ?? "—"} · {dataHora(p.created_at)}</small></div>
                  <div className="linha" style={{ gap: 8 }}>
                    <Link className="btn s peq" href={`/equipe/central/cliente?id=${c.id}`}>Ver a passagem</Link>
                    <button type="button" className="btn p peq" onClick={async () => { setErro(""); try { await receberPassagem(c.id, nome); recarregar(); } catch (e) { setErro((e as Error).message); } }}>Receber</button>
                  </div>
                </div>
                {p.resultado_90 && <p style={{ margin: "8px 0 0" }}><small className="mudo">Em 90 dias, resolver: </small>{p.resultado_90}</p>}
              </div>
            );
          })}
        </>
      )}

      <div className="linha entre mb" style={{ marginTop: 20 }}>
        <div className="secao" style={{ margin: 0 }}>Jornada das clientes</div>
        <label className="marcar" style={{ margin: 0 }}><input type="checkbox" checked={soAlerta} onChange={(e) => setSoAlerta(e.target.checked)} /> Só quem tem algo atrasado</label>
      </div>
      <div className="quadro">
        {semEtapa.length > 0 && (
          <div className="coluna">
            <div className="coluna-topo"><b>Sem etapa marcada</b><small className="mudo">{semEtapa.length}</small></div>
            <p className="ajuda" style={{ margin: "0 0 8px" }}>Clientes que já estavam na casa. Abra e marque a etapa.</p>
            {semEtapa.map((c) => <Card key={c.id} c={c} />)}
          </div>
        )}
        {colunas.map((e) => {
          const cs = lista.filter((c) => c.etapa === e.n);
          return (
            <div key={e.n} className="coluna">
              <div className="coluna-topo"><b>{e.n} · {e.nome}</b><small className="mudo">{cs.length}</small></div>
              <p className="ajuda" style={{ margin: "0 0 8px" }}>{e.quem} · dia {e.janela[0]} a {e.janela[1]}</p>
              {cs.map((c) => <Card key={c.id} c={c} />)}
            </div>
          );
        })}
      </div>
    </>
  );
}
