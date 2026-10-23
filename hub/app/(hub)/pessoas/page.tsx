"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { CamposPessoa } from "@/components/CamposPessoa";
import { PERFIS, buscarPessoas, pessoaSalvar, principal } from "@/lib/pessoas";

const ROTINA = [
  ["Todo dia", "Abertura: a meta do dia e o foco de cada um", "10 min", null],
  ["Todo dia", "Fechamento: quanto cada pessoa vendeu", "5 min", null],
  ["Toda semana", "Reunião de números: o que funcionou, o que travou", "20 a 30 min", "/pessoas/reuniao-semanal"],
  ["A cada 15 dias", "Conversa individual com cada pessoa (revisa a Ficha de desenvolvimento)", "15 min", "/pessoas/desenvolvimento"],
  ["Todo mês", "Fechamento do mês e metas individuais", "45 min", "/pessoas/reuniao-mensal"],
] as const;

export default function MinhaEquipe() {
  const { portal } = usePortal();
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(false);
  const { dados, recarregar } = useDados(() => buscarPessoas(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const ativos = dados.pessoas.filter((p) => p.ativo);
  const semPerfil = ativos.filter((p) => !p.perfil).length;

  return (
    <>
      <Titulo titulo="Minha equipe" sub="Liderar é fazer o time fazer: Combinar → Ensinar → Acompanhar → Dar retorno. E repete. Toda semana." />

      <div className="grade g4 mb">
        {([
          ["/pessoas/retorno", "Dar retorno", "Cobrar e reconhecer com roteiro pronto", "var(--red)"],
          ["/pessoas/reuniao-semanal", "Reunião semanal", "Os números de cada um e o foco da semana", "var(--orange)"],
          ["/pessoas/reuniao-mensal", "Reunião do mês", "Fechamento e metas individuais", "var(--purple)"],
          ["/pessoas/desenvolvimento", "Desenvolvimento", "Uma habilidade por mês, por pessoa", "var(--blue)"],
        ] as const).map(([href, t, s, c]) => (
          <Link key={href} href={href} className="card card-borda" style={{ ["--c" as string]: c, textDecoration: "none", color: "inherit" }}>
            <b style={{ color: "var(--ink)" }}>{t}</b><div className="mudo" style={{ fontSize: 13.5 }}>{s}</div>
          </Link>
        ))}
      </div>

      <div className="linha entre mb">
        <div className="secao" style={{ margin: 0 }}>A equipe · {ativos.length} {ativos.length === 1 ? "pessoa" : "pessoas"}</div>
        <button className="btn p" type="button" onClick={() => setAberto(!aberto)}>+ Adicionar pessoa</button>
      </div>
      {aberto && (
        <form className="card mb" action={async (f) => {
          setErro("");
          try { await pessoaSalvar(portal.id, null, f); setAberto(false); recarregar(); } catch (e) { setErro((e as Error).message); }
        }}>
          <CamposPessoa />
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt"><button className="btn p" type="submit">Salvar</button></div>
        </form>
      )}
      {semPerfil > 0 && <div className="aviso mb">{semPerfil === 1 ? "1 pessoa ainda não tem" : `${semPerfil} pessoas ainda não têm`} o perfil. Faça o teste com cada uma: são 12 perguntas de loja.</div>}

      {ativos.length === 0 ? (
        <div className="card">
          <h2>Comece cadastrando quem trabalha com você</h2>
          <p className="mudo">Depois, faça o teste de perfil de cada pessoa. O Hub mostra como agir com cada perfil e ajusta os roteiros de retorno.</p>
        </div>
      ) : (
        <div className="grade g3">
          {ativos.map((p) => {
            const pr = principal(p.perfil);
            const ret = dados.retornos.filter((r) => r.pessoa_id === p.id);
            const reconhec = ret.filter((r) => r.tipo === "Reconhecer").length, cobr = ret.length - reconhec;
            const ficha = dados.fichas.find((f) => f.pessoa_id === p.id && f.status === "Em andamento");
            return (
              <Link key={p.id} href={`/pessoas/pessoa?id=${p.id}`} className="card card-borda" style={{ ["--c" as string]: pr ? PERFIS[pr.letra].cor : "var(--line)", textDecoration: "none", color: "inherit" }}>
                <div className="linha entre">
                  <b style={{ color: "var(--ink)", fontSize: 16 }}>{p.nome}</b>
                  {pr ? <span className="selo espera">{pr.letra}{pr.segunda ?? ""} · {PERFIS[pr.letra].nome}</span> : <span className="selo alerta">fazer o teste</span>}
                </div>
                <div className="mudo" style={{ fontSize: 13.5 }}>{p.funcao ?? "—"}{p.motor ? ` · motor: ${p.motor}` : ""}</div>
                <div style={{ fontSize: 13.5, marginTop: 8 }}>
                  Retornos: {reconhec} reconhecimento{reconhec === 1 ? "" : "s"} · {cobr} cobrança{cobr === 1 ? "" : "s"}
                  {cobr > 0 && reconhec < cobr * 3 && <div className="mudo">Para cada correção, procure três reconhecimentos verdadeiros.</div>}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 6 }}>{ficha ? <>Habilidade do mês: <b>{ficha.competencia}</b> ({ficha.estagio})</> : <span className="mudo">Sem habilidade do mês</span>}</div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="secao">A rotina do líder</div>
      <div className="card tabela-wrap">
        <table className="tabela">
          <tbody>
            {ROTINA.map(([q, o, t, href]) => (
              <tr key={o}><td style={{ whiteSpace: "nowrap" }}><b>{q}</b></td><td>{href ? <Link href={href}>{o}</Link> : o}</td><td className="mudo" style={{ whiteSpace: "nowrap" }}>{t}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="ajuda">Para começar: abertura diária e reunião semanal. O que não é acompanhado, o time entende que não é importante.</p>
      </div>
    </>
  );
}
