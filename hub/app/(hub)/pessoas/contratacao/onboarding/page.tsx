"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { BASE } from "@/lib/config";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataHora, dia, diasAte } from "@/lib/formato";
import { buscarPessoas } from "@/lib/pessoas";
import {
  FASES_ONBOARDING, ROTEIRO_HISTORIA, buscarContratacao, dataDaFase, excluirOnboarding, salvarOnboarding, totalItensOnb,
} from "@/lib/contratacao";

const VOLTAR = { href: "/pessoas/contratacao", rotulo: "Contratação" };

/** O primeiro mês de quem entrou: cada fase com a data, o que fazer e como fazer. */
function PaginaOnboarding() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarContratacao(portal.id)), equipe: (await buscarPessoas(portal.id)).pessoas }), [portal.id]);
  const o = dados?.onboardings.find((x) => x.id === id) ?? null;
  const [feitos, setFeitos] = useState<Record<string, boolean>>({});
  const [notas, setNotas] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => { if (o) { setFeitos(o.feitos ?? {}); setNotas(o.notas ?? ""); } }, [o?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dados) return <Carregando />;
  if (!o) return <><Titulo voltar={VOLTAR} titulo="Onboarding" /><div className="card">Onboarding não encontrado.</div></>;
  const pessoa = dados.equipe.find((p) => p.id === o.pessoa_id);
  const nome = pessoa?.nome.split(" ")[0] ?? "a pessoa nova";
  const salvar = async (d: Parameters<typeof salvarOnboarding>[1]) => {
    setErro("");
    try { await salvarOnboarding(o.id, d); } catch (e) { setErro((e as Error).message); }
  };
  const marcar = (k: string, v: boolean) => { const n = { ...feitos, [k]: v }; setFeitos(n); salvar({ feitos: n }); };
  const total = Object.values(feitos).filter(Boolean).length;
  const diaDo = -diasAte(o.inicio) + 1;
  // A fase de hoje: a primeira que ainda não passou.
  const linkEstudo = typeof window !== "undefined" ? `${window.location.origin}${BASE}/estudo/?t=${o.estudo_token}` : "";
  const faseHoje = FASES_ONBOARDING.find((f) => diasAte(dataDaFase(o.inicio, f.ate)) >= 0)?.id;

  return (
    <>
      <Titulo voltar={VOLTAR} titulo={`Onboarding de ${pessoa?.nome ?? "pessoa"}`} aba="Onboarding" />
      <div className="card mb card-borda" style={{ ["--c" as string]: "var(--red)" }}>
        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
          <div>
            <b style={{ fontSize: 18 }}>{diaDo < 1 ? `Começa em ${dia(o.inicio)}` : diaDo > 31 ? "Primeiro mês concluído" : `Hoje é o dia ${diaDo} de ${nome} na loja`}</b>
            <div className="mudo" style={{ fontSize: 14 }}>{total} de {totalItensOnb} passos feitos</div>
          </div>
          <label className="ajuda" style={{ margin: 0 }}>Primeiro dia
            <input type="date" value={o.inicio} onChange={async (e) => { if (e.target.value) { await salvar({ inicio: e.target.value }); recarregar(); } }} style={{ margin: 0 }} />
          </label>
        </div>
        <div style={{ height: 8, background: "var(--line)", borderRadius: 4, marginTop: 10 }}><div style={{ width: `${(total / totalItensOnb) * 100}%`, height: 8, background: "var(--red)", borderRadius: 4 }} /></div>
      </div>
      {erro && <div className="aviso mb">{erro}</div>}

      {FASES_ONBOARDING.map((f) => (
        <div key={f.id} className="card mb" style={{ borderLeft: `4px solid ${f.id === faseHoje ? "var(--red)" : "var(--line)"}` }}>
          <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{f.titulo}</h3>
            <small className="mudo">{f.id === faseHoje ? "👉 agora · " : ""}até {dia(dataDaFase(o.inicio, f.ate))}</small>
          </div>
          {f.itens.map((it) => (
            <div key={it.id} style={{ borderTop: "1px solid var(--line)", padding: "8px 0" }}>
              <label className="marcar" style={{ margin: 0 }}>
                <input type="checkbox" checked={!!feitos[it.id]} onChange={(e) => marcar(it.id, e.target.checked)} />
                <span><b style={{ textDecoration: feitos[it.id] ? "line-through" : undefined }}>{it.t}</b>{it.d && <><br /><small className="mudo">{it.d}</small></>}</span>
              </label>
              {it.estudo && (
                <div className="linha" style={{ marginLeft: 30, marginTop: 6, gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <a className="btn p peq" href={`https://wa.me/?text=${encodeURIComponent(`Oi, ${nome}! Este é o seu material de estudo da ${portal.loja}: ${linkEstudo}`)}`} target="_blank" rel="noopener">Mandar o link de estudo</a>
                  <Copiar texto={linkEstudo} rotulo="Copiar link" />
                  <Link href="/guia-marcas" className="link-loja">Completar o Guia das marcas</Link>
                </div>
              )}
              {it.quiz && (
                <div style={{ marginLeft: 30, marginTop: 6, fontSize: 14 }}>
                  {o.quiz
                    ? <><b>Acertou {o.quiz.acertos} de {o.quiz.total}</b> <small className="mudo">em {dataHora(o.quiz_em)}</small>
                      {o.quiz.erros.length > 0 && <ul style={{ margin: "4px 0", paddingLeft: 18 }}>{o.quiz.erros.map((x, k) => <li key={k}>{x.pergunta} <b>→ {x.certa}</b></li>)}</ul>}</>
                    : <span className="mudo">Ainda não fez o quiz.</span>}
                </div>
              )}
              {it.historia && (
                <details style={{ marginLeft: 30, marginTop: 6 }}>
                  <summary className="link-loja" style={{ cursor: "pointer" }}>Roteiro de 30 minutos para apresentar a história</summary>
                  <ol style={{ margin: "8px 0", paddingLeft: 20, fontSize: 14 }}>
                    {ROTEIRO_HISTORIA.map((r) => <li key={r.t} style={{ marginBottom: 6 }}><b>{r.t}:</b> {r.d}</li>)}
                  </ol>
                  <Link href="/nossa-historia" className="btn s peq">Abrir Nossa história</Link>
                </details>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="card mb">
        <label className="ajuda" style={{ display: "block", margin: 0 }}><b style={{ color: "var(--ink)" }}>Anotações do primeiro mês</b>
          <textarea rows={4} value={notas} placeholder="O que você percebeu, combinados, pontos para o feedback…" onChange={(e) => setNotas(e.target.value)} onBlur={() => notas !== o.notas && salvar({ notas })} />
        </label>
      </div>
      <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => {
        if (!confirm(`Excluir o onboarding de ${pessoa?.nome ?? "esta pessoa"}? A pessoa continua na equipe.`)) return;
        try { await excluirOnboarding(o.id); router.push(VOLTAR.href); } catch (e) { setErro((e as Error).message); }
      }}>Excluir onboarding</button>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><PaginaOnboarding /></Suspense>;
}
