"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { CamposPessoa } from "@/components/CamposPessoa";
import { buscarMetodo, buscarPessoas, pessoaSalvar, principal } from "@/lib/pessoas";


export default function MinhaEquipe() {
  const { portal } = usePortal();
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(false);
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarPessoas(portal.id)), m: await buscarMetodo() }), [portal.id]);
  if (!dados) return <Carregando />;
  const { m } = dados;
  const PERFIS = m.perfis;
  const ativos = dados.pessoas.filter((p) => p.ativo);
  const semPerfil = ativos.filter((p) => !p.perfil).length;

  return (
    <>
      <Titulo titulo="Minha equipe" sub={m.textos.equipe_sub} />

      <div className="grade g3 mb">
        {([
          ["/pessoas/retorno", "Dar retorno", "Cobrar e reconhecer com roteiro pronto", "var(--red)"],
          ["/pessoas/reuniao-semanal", "Reunião semanal", "Os números de cada um e o foco da semana", "var(--orange)"],
          ["/pessoas/reuniao-mensal", "Reunião do mês", "Fechamento e metas individuais", "var(--purple)"],
          ["/pessoas/desenvolvimento", "Desenvolvimento", "Uma habilidade por mês, por pessoa", "var(--blue)"],
          ["/pessoas/gincanas", "Gincanas", "Escolha o que trabalhar e a gincana certa", "var(--green)"],
          ["/acoes", "Ações do Mês", "A ação validada do mês, pronta para a loja", "var(--red)"],
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
          <CamposPessoa m={m} />
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt"><button className="btn p" type="submit">Salvar</button></div>
        </form>
      )}
      {semPerfil > 0 && <div className="aviso mb">{semPerfil === 1 ? "1 pessoa ainda não tem" : `${semPerfil} pessoas ainda não têm`} o perfil. Mande o teste para cada uma pelo link: são 24 situações de loja.</div>}

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
                  {cobr > 0 && reconhec < cobr * 3 && <div className="mudo">{m.textos.proporcao}</div>}
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
            {m.rotina.map((r) => (
              <tr key={r.oque}><td style={{ whiteSpace: "nowrap" }}><b>{r.quando}</b></td><td>{r.link ? <Link href={r.link}>{r.oque}</Link> : r.oque}</td><td className="mudo" style={{ whiteSpace: "nowrap" }}>{r.tempo}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="ajuda">{m.textos.equipe_rotina_nota}</p>
      </div>
    </>
  );
}
