"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia } from "@/lib/formato";
import { buscarPessoas } from "@/lib/pessoas";
import { ETAPAS_CONTRATACAO, buscarContratacao, novoOnboarding, salvarVaga, totalItensOnb } from "@/lib/contratacao";

/** Contratação: as 7 etapas, as vagas e quem está no onboarding. */
export default function Contratacao() {
  const { portal } = usePortal();
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [titulo, setTitulo] = useState("");
  const [pessoaOnb, setPessoaOnb] = useState("");
  const { dados } = useDados(async () => ({ ...(await buscarContratacao(portal.id)), equipe: (await buscarPessoas(portal.id)).pessoas.filter((p) => p.ativo) }), [portal.id]);
  if (!dados) return <Carregando />;
  const abertas = dados.vagas.filter((v) => v.situacao === "aberta");
  const fechadas = dados.vagas.filter((v) => v.situacao !== "aberta");
  const nomeDe = (id: string) => dados.equipe.find((p) => p.id === id)?.nome ?? "Pessoa";
  const semOnb = dados.equipe.filter((p) => !dados.onboardings.some((o) => o.pessoa_id === p.id));

  const abrir = async () => {
    setErro("");
    try { const id = await salvarVaga(portal.id, null, { titulo: titulo.trim(), situacao: "aberta" }); router.push(`/pessoas/contratacao/vaga?id=${id}`); }
    catch (e) { setErro((e as Error).message); }
  };
  const cartaoVaga = (v: (typeof dados.vagas)[number]) => {
    const cs = dados.candidatos.filter((c) => c.vaga_id === v.id);
    return (
      <Link key={v.id} href={`/pessoas/contratacao/vaga?id=${v.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="linha entre" style={{ gap: 8 }}><b style={{ fontSize: 16 }}>{v.titulo}</b>{v.situacao !== "aberta" && <span className="selo espera">{v.situacao === "fechada" ? "fechada" : "pausada"}</span>}</div>
        <small className="mudo">{cs.length} candidato{cs.length === 1 ? "" : "s"} · {cs.filter((c) => c.teste).length} com teste · aberta em {dia(v.created_at)}</small>
      </Link>
    );
  };

  return (
    <>
      <Titulo titulo="Contratação" sub="Do que o seu time precisa até o primeiro mês de quem entrou: cada etapa com as ferramentas prontas." />

      <details className="card mb">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Como funciona: as 7 etapas</summary>
        <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
          {ETAPAS_CONTRATACAO.map((e) => <li key={e.n} style={{ marginBottom: 6 }}><b>{e.titulo}:</b> {e.sub}</li>)}
        </ol>
      </details>

      <div className="secao">Vagas abertas</div>
      <div className="card mb">
        <b>Abrir uma vaga</b>
        <p className="ajuda" style={{ marginTop: 2 }}>Comece pelo nome da vaga. Depois o Hub te guia: do que o time precisa, a vaga, os candidatos.</p>
        <div className="linha" style={{ gap: 8 }}>
          <input type="text" placeholder="Ex.: Vendas com foco no online" value={titulo} onChange={(e) => setTitulo(e.target.value)} style={{ flex: 1, margin: 0 }} />
          <button type="button" className="btn p" disabled={!titulo.trim()} onClick={abrir}>Abrir vaga</button>
        </div>
        {erro && <div className="aviso mt">{erro}</div>}
      </div>
      {abertas.length > 0 && <div className="grade mb" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>{abertas.map(cartaoVaga)}</div>}

      <div className="secao">Onboarding: o primeiro mês</div>
      {!dados.onboardings.length && <p className="mudo">Quando você contratar alguém pela vaga, o onboarding começa sozinho aqui.</p>}
      <div className="grade mb" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {dados.onboardings.map((o) => {
          const feitos = Object.values(o.feitos ?? {}).filter(Boolean).length;
          return (
            <Link key={o.id} href={`/pessoas/contratacao/onboarding?id=${o.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <b style={{ fontSize: 16 }}>{nomeDe(o.pessoa_id)}</b>
              <div style={{ height: 6, background: "var(--line)", borderRadius: 3, margin: "8px 0" }}><div style={{ width: `${(feitos / totalItensOnb) * 100}%`, height: 6, background: "var(--red)", borderRadius: 3 }} /></div>
              <small className="mudo">{feitos} de {totalItensOnb} passos · começou em {dia(o.inicio)}</small>
            </Link>
          );
        })}
      </div>
      {semOnb.length > 0 && (
        <details className="mb">
          <summary className="link-loja" style={{ cursor: "pointer" }}>Começar o onboarding de alguém que já está na equipe</summary>
          <div className="linha mt" style={{ gap: 8 }}>
            <select value={pessoaOnb} onChange={(e) => setPessoaOnb(e.target.value)} style={{ flex: 1, margin: 0 }}>
              <option value="">Escolha a pessoa…</option>
              {semOnb.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <button type="button" className="btn s" disabled={!pessoaOnb} onClick={async () => {
              try { const id = await novoOnboarding(portal.id, pessoaOnb); router.push(`/pessoas/contratacao/onboarding?id=${id}`); } catch (e) { setErro((e as Error).message); }
            }}>Começar</button>
          </div>
        </details>
      )}

      {fechadas.length > 0 && (
        <>
          <div className="secao">Vagas fechadas ou pausadas</div>
          <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>{fechadas.map(cartaoVaga)}</div>
        </>
      )}
    </>
  );
}
