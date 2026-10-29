"use client";

import { useEffect, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { preencher } from "@/lib/clientes";
import { buscarPessoas, quemVende } from "@/lib/pessoas";
import { buscarMeuDia, placar } from "@/lib/meu-dia";
import { FOCOS, buscarMissoes, excluirMissao, focoSugerido, mensagemGrupo, salvarMissao, semanaAtual, tirarPessoa, type Missao } from "@/lib/missoes";

const linkMissao = (token: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/analises/portal/missao/?t=${token}`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

/** Missão da semana de CRM: uma força de venda unificada, igual para o time todo, com o retorno de cada pessoa. */
export default function Missoes() {
  const { portal } = usePortal();
  const semana = semanaAtual();
  const { dados, recarregar } = useDados(async () => {
    const [p, ms, d] = await Promise.all([buscarPessoas(portal.id), buscarMissoes(portal.id), buscarMeuDia(portal.id).catch(() => null)]);
    return { time: quemVende(p.pessoas.filter((x) => x.ativo)), ...ms, abaixo: d ? placar(d).abaixo : null };
  }, [portal.id]);
  const [ed, setEd] = useState<{ foco: string; criterio: string; mensagem: string; meta: number; obs: string; produto: string } | null>(null);
  const [erro, setErro] = useState("");
  const daSemana = dados?.missoes.find((m) => m.semana === semana) ?? null;
  // Sem missão nesta semana: já abre o formulário com o foco sugerido pelo momento da loja.
  useEffect(() => {
    if (!dados || daSemana || ed) return;
    const s = FOCOS.find((f) => f.id === focoSugerido(dados.abaixo).foco)!;
    setEd({ foco: s.id, criterio: s.criterio, mensagem: s.mensagem, meta: 20, obs: "", produto: "" });
  }, [dados, daSemana, ed]);
  if (!dados) return <Carregando />;
  const sugestao = focoSugerido(dados.abaixo);
  const linhas = (m: Missao) => dados.pessoas.filter((p) => p.missao_id === m.id);

  return (
    <>
      <Titulo titulo="Missão da semana" sub="Uma força de venda unificada: toda semana, uma missão igual para o time todo, com o mesmo modelo de mensagem e a mesma meta por pessoa. A lista de clientes sai do sistema da loja. Cada pessoa marca pelo link dela o que mandou, quem respondeu e quem comprou, e você acompanha o retorno de cada uma." />

      {ed && (
        <div className="card mb">
          <h3 style={{ marginTop: 0 }}>{daSemana ? "Editar a missão desta semana" : `Missão da semana de ${dia(semana)}`}</h3>
          <p className="ajuda" style={{ marginTop: 0 }}>Sugestão do Hub: <b>{FOCOS.find((f) => f.id === sugestao.foco)?.nome}</b>. {sugestao.porque}</p>
          <div className="chips mb">
            {FOCOS.map((f) => <button key={f.id} type="button" className={`chip${ed.foco === f.id ? " escolhido" : ""}`} onClick={() => setEd({ ...ed, foco: f.id, criterio: f.criterio, mensagem: f.mensagem })}>{f.nome}{f.id === sugestao.foco ? " ★" : ""}</button>)}
          </div>
          {ed.mensagem.includes("{produto}") && <label className="ajuda" style={{ display: "block" }}>Qual coleção, linha ou produto<input type="text" value={ed.produto} placeholder="Ex.: a coleção de verão / os vestidos de festa" onChange={(e) => setEd({ ...ed, produto: e.target.value })} /></label>}
          <label className="ajuda" style={{ display: "block" }}>Quem chamar (o time puxa no sistema)<input type="text" value={ed.criterio} onChange={(e) => setEd({ ...ed, criterio: e.target.value })} /></label>
          <label className="ajuda" style={{ display: "block" }}>O modelo da mensagem, igual para todos ({"{nome}"} = cliente, {"{consultora}"} = quem manda)<textarea rows={3} value={ed.mensagem} onChange={(e) => setEd({ ...ed, mensagem: e.target.value })} /></label>
          <div className="grade g2" style={{ gap: "0 10px" }}>
            <label className="ajuda" style={{ display: "block" }}>Meta de mensagens por pessoa na semana<input type="number" min={1} max={200} value={ed.meta} onChange={(e) => setEd({ ...ed, meta: Math.max(1, Number(e.target.value) || 1) })} /></label>
            <label className="ajuda" style={{ display: "block" }}>Recado para o time (opcional)<input type="text" value={ed.obs} placeholder="Ex.: quem fechar mais vendas ganha folga no sábado" onChange={(e) => setEd({ ...ed, obs: e.target.value })} /></label>
          </div>
          <p className="ajuda">Como fica: “{preencher(ed.mensagem.replace(/\{produto\}/g, ed.produto || "[coleção ou linha]"), { nome: "Helena", loja: portal.loja, consultora: dados.time[0]?.nome ?? "Larissa" })}”</p>
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p" disabled={!dados.time.length} onClick={async () => {
              setErro("");
              try {
                await salvarMissao(portal.id, { semana, foco: ed.foco, criterio: ed.criterio, mensagem: ed.mensagem.replace(/\{produto\}/g, ed.produto || "as novidades"), meta: ed.meta, obs: ed.obs }, dados.time.map((p) => ({ id: p.id, nome: p.nome })));
                setEd(null); recarregar();
              } catch (e) { setErro((e as Error).message); }
            }}>{daSemana ? "Salvar" : `Lançar para o time (${dados.time.length})`}</button>
            {daSemana && <button type="button" className="btn s" onClick={() => setEd(null)}>Cancelar</button>}
          </div>
          {!dados.time.length && <div className="aviso mt">Cadastre a equipe em Minha equipe (com a função de venda) para lançar a missão.</div>}
          {erro && <div className="aviso mt">{erro}</div>}
        </div>
      )}

      {dados.missoes.map((m) => {
        const ls = linhas(m);
        const tot = ls.reduce((a, p) => ({ e: a.e + p.enviadas, r: a.r + p.respostas, v: a.v + p.vendas }), { e: 0, r: 0, v: 0 });
        const atual = m.semana === semana;
        return (
          <div key={m.id} className="card card-borda mb" style={{ ["--c" as string]: atual ? "var(--orange)" : "var(--line)" }}>
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span><b style={{ fontSize: 16 }}>{FOCOS.find((f) => f.id === m.foco)?.nome ?? m.foco}</b> <small className="mudo">· semana de {dia(m.semana)} a {dia(somarDias(m.semana, 5))}</small>
                <br /><small className="mudo">{m.criterio} · meta {m.meta} por pessoa</small></span>
              <span className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
                {atual && <a className="btn p peq" href={`https://wa.me/?text=${encodeURIComponent(mensagemGrupo(m, ls, linkMissao))}`} target="_blank" rel="noopener">Mandar no grupo do time</a>}
                {atual && <button type="button" className="btn s peq" onClick={() => setEd({ foco: m.foco, criterio: m.criterio, mensagem: m.mensagem, meta: m.meta, obs: m.obs, produto: "" })}>Editar</button>}
                <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm("Excluir esta missão e os números dela?")) { await excluirMissao(m.id); recarregar(); } }}>Excluir</button>
              </span>
            </div>
            <div className="grade g4 mt">
              <div className="kpi"><small>Mensagens</small><b style={{ fontSize: 22 }}>{tot.e} / {m.meta * ls.length}</b></div>
              <div className="kpi"><small>Responderam</small><b style={{ fontSize: 22 }}>{tot.r}</b><small className="mudo">{pct(tot.r, tot.e)} das mensagens</small></div>
              <div className="kpi"><small>Compraram</small><b style={{ fontSize: 22 }}>{tot.v}</b><small className="mudo">{pct(tot.v, tot.e)} das mensagens</small></div>
              <div className="kpi"><small>Time na meta</small><b style={{ fontSize: 22 }}>{ls.filter((p) => p.enviadas >= m.meta).length} / {ls.length}</b></div>
            </div>
            <div className="tabela-wrap mt"><table className="tabela">
              <thead><tr><th>Pessoa</th><th>Mandou</th><th>Responderam</th><th>Compraram</th><th>Retorno</th><th /></tr></thead>
              <tbody>{ls.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.pessoa_nome.split(" ")[0]}</b></td>
                  <td style={{ color: p.enviadas < m.meta ? "var(--red)" : undefined }}>{p.enviadas} / {m.meta}</td>
                  <td>{p.respostas}</td><td>{p.vendas}</td><td>{pct(p.vendas, p.enviadas)}</td>
                  <td>{atual && <span className="linha" style={{ gap: 8 }}><Copiar texto={linkMissao(p.token)} rotulo="Link" /><button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Tirar ${p.pessoa_nome.split(" ")[0]} desta missão?`)) { await tirarPessoa(p.id); recarregar(); } }}>Tirar</button></span>}</td>
                </tr>
              ))}</tbody>
            </table></div>
            {atual && <p className="ajuda" style={{ marginBottom: 0 }}>Na reunião semanal: quem bateu a meta e teve mais retorno conta para o time como fez. Quem ficou abaixo, conversa no particular (o que atrapalhou e o combinado da próxima semana).</p>}
          </div>
        );
      })}
      {!dados.missoes.length && !ed && <div className="card mudo">Nenhuma missão ainda.</div>}
    </>
  );
}
