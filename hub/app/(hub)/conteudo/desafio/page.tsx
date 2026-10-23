"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Trancado } from "@/components/Trancado";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, diasAte, hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { variaveisDaLoja } from "@/lib/scripts";
import { carregarConteudo, conteudoSalvar, ctaDe, ganchoDe, postsCriar, roteirosDaLoja, textoDoRoteiro, type LojaConteudo } from "@/lib/instagram";

export default function Desafio() {
  const { portal, pers, comoLoja } = usePortal();
  const [estado, setEstado] = useState<LojaConteudo["desafio"] | null>(null);
  const [aviso, setAviso] = useState("");
  const { dados, recarregar } = useDados(() => carregarConteudo(portal.id, comoLoja), [portal.id, comoLoja]);
  if (!dados) return <Carregando />;
  const { m, a, conteudo, posts } = dados;
  const d = m.desafio;
  if (!a || !d) return <Trancado titulo="Desafio Loja Viral" texto={m.textos.trancado} />;

  const ds = estado ?? conteudo.desafio ?? {};
  const feitas = ds.feitas ?? [];
  const salvar = async (n: LojaConteudo["desafio"]) => { setEstado(n); await conteudoSalvar({ ...conteudo, desafio: n }); };
  const hojeN = ds.inicio ? Math.min(21, Math.max(1, 1 - diasAte(ds.inicio))) : 0;
  const completo = (n: number) => d.missoes[n - 1].tarefas.every((_, i) => feitas.includes(`d${n}-${i}`));
  const completos = d.missoes.filter((x) => completo(x.dia)).length;
  const roteiros = roteirosDaLoja(m, a);
  const vars = variaveisDaLoja(pers.get(2)?.respostas, portal.loja);

  /** Coloca os 7 dias de uma semana do desafio na programação: o reel da missão + o post complementar. */
  const programarSemana = async (semana: number) => {
    const novos = d.missoes.filter((x) => Math.ceil(x.dia / 7) === semana).flatMap((x) => {
      const data = somarDias(ds.inicio!, x.dia - 1);
      if (data < hoje() || posts.some((p) => p.data === data && p.origem === "desafio")) return [];
      const r = roteiros.find((y) => y.id === x.roteiro) ?? roteiros[0];
      const rc = roteiros.find((y) => y.id === m.complementar[(x.dia - 1) % m.complementar.length]) ?? r;
      const base = { portal_id: portal.id, legenda: "", status: "Ideia" as const, origem: "desafio", data };
      return [
        { ...base, hora: conteudo.ajustes.hora || m.textos.hora_padrao, formato: "Reels", objetivo: r.objetivo, modelo: r.id, tema: `Desafio · dia ${x.dia} · ${r.nome}`, gancho: ganchoDe(r, vars), roteiro: textoDoRoteiro(r, vars), cta: ctaDe(r, vars) },
        { ...base, hora: "12:00", formato: rc.formato, objetivo: rc.objetivo, modelo: rc.id, tema: `Desafio · dia ${x.dia} · post complementar`, gancho: ganchoDe(rc, vars), roteiro: textoDoRoteiro(rc, vars), cta: ctaDe(rc, vars) },
      ];
    });
    if (!novos.length) { setAviso("Essa semana do desafio já está na programação."); return; }
    await postsCriar(novos); setAviso(`${novos.length} posts da semana ${semana} do desafio na sua programação.`); recarregar();
  };

  return (
    <>
      <Titulo titulo={`🔥 ${d.nome}`} sub={d.sub} />
      {aviso && <div className="aviso ok mb">{aviso}</div>}

      <div className="card mb card-borda" style={{ ["--c" as string]: "var(--accent)" }}>
        {!ds.inicio ? (
          <>
            <h2 style={{ marginTop: 0 }}>{m.textos.desafio_sub}</h2>
            <ul style={{ paddingLeft: 18 }}>{d.regras.map((r) => <li key={r}>{r}</li>)}</ul>
            <div className="linha" style={{ gap: 8 }}>
              <button type="button" className="btn p" onClick={() => salvar({ inicio: hoje(), feitas: [] })}>Começar hoje</button>
              <button type="button" className="btn s" onClick={() => salvar({ inicio: somarDias(hoje(), 1), feitas: [] })}>Começar amanhã</button>
            </div>
          </>
        ) : (
          <>
            <div className="linha entre">
              <div><b style={{ fontSize: 18 }}>{diasAte(ds.inicio) > 0 ? `Começa em ${dia(ds.inicio)}` : `Dia ${hojeN} de 21`}</b><div className="mudo">Começou em {dia(ds.inicio)} · termina em {dia(somarDias(ds.inicio, 20))}</div></div>
              <span className={`selo ${completos === 21 ? "feito" : "andamento"}`}>{completos}/21 dias cumpridos</span>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: "var(--soft)", marginTop: 10 }}><div style={{ height: 10, borderRadius: 99, width: `${(completos / 21) * 100}%`, background: "var(--grad)" }} /></div>
            {completos === 21 && <div className="aviso ok mt">🏅 {m.textos.selo}</div>}
            <div className="linha mt" style={{ gap: 8 }}>
              {[1, 2, 3].map((s) => <button key={s} type="button" className="btn s peq" disabled={somarDias(ds.inicio!, s * 7 - 1) < hoje()} onClick={() => programarSemana(s)}>📅 Semana {s} na programação</button>)}
              <button type="button" className="btn s peq" onClick={() => { if (confirm("Recomeçar o desafio do zero?")) salvar({}); }}>Recomeçar</button>
            </div>
          </>
        )}
      </div>

      <div className="grade g3 mb">
        {d.semanas.map((s) => (
          <div key={s.n} className="card" style={{ outline: ds.inicio && Math.ceil(hojeN / 7) === s.n ? "2px solid var(--accent)" : undefined }}>
            <small className="mudo">Semana {s.n} · dias {s.n * 7 - 6} a {s.n * 7}</small>
            <h3 style={{ margin: "4px 0" }}>{s.nome}</h3>
            <p style={{ margin: 0 }}>{s.foco}</p>
            <div className="chips mt">{s.formatos.map((f) => <span key={f} className="chip">{f}</span>)}</div>
            <p className="ajuda">Meta: {s.meta}</p>
          </div>
        ))}
      </div>

      {ds.inicio && (
        <>
          <div className="secao">As missões</div>
          <div className="grade g3">
            {d.missoes.map((x) => {
              const data = somarDias(ds.inicio!, x.dia - 1);
              const atual = x.dia === hojeN && diasAte(ds.inicio!) <= 0;
              return (
                <div key={x.dia} className="card" style={{ outline: atual ? "2px solid var(--accent)" : undefined, opacity: completo(x.dia) ? 0.7 : 1 }}>
                  <div className="linha entre"><small className="mudo">Dia {x.dia} · {dia(data).slice(0, 5)}</small>{completo(x.dia) ? <span className="selo feito">feito</span> : atual ? <span className="selo andamento">hoje</span> : null}</div>
                  <b style={{ display: "block", margin: "4px 0" }}>{x.titulo}</b>
                  {x.tarefas.map((t, i) => {
                    const k = `d${x.dia}-${i}`;
                    return <label key={k} className="marcar"><input type="checkbox" checked={feitas.includes(k)} onChange={() => salvar({ ...ds, feitas: feitas.includes(k) ? feitas.filter((y) => y !== k) : [...feitas, k] })} /><span>{t}</span></label>;
                  })}
                  {x.dica && <p className="ajuda">{x.dica}</p>}
                  {x.roteiro && <Link className="btn s peq mt" href={`/conteudo/roteiro?m=${x.roteiro}`}>Criar o roteiro do dia</Link>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="secao">A rotina viral</div>
      <div className="card mb">
        <div className="tabela-wrap"><table className="tabela"><tbody>{m.rotina.map((r) => <tr key={r.oque}><td style={{ whiteSpace: "nowrap" }}><b>{r.quando}</b></td><td><b>{r.oque}</b></td><td>{r.detalhe}</td></tr>)}</tbody></table></div>
        <div className="aviso ok mt">{m.caminho}</div>
      </div>

      <div className="secao">Método Loja Viral</div>
      <div className="grade g2 mb">{m.fundamentos.map((f) => <div key={f.titulo} className="card"><b>{f.titulo}</b><p>{f.texto}</p><p className="ajuda">Na prática, na sua loja: {f.pratica}</p></div>)}</div>
      <div className="card">
        {m.codigos.map((c) => (
          <details key={c.n} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer" }}><b>{String(c.n).padStart(2, "0")} · {c.titulo}</b></summary>
            <p>{c.principio}</p>
            <p className="ajuda">Na prática, na sua loja: {c.pratica}</p>
          </details>
        ))}
      </div>
    </>
  );
}
