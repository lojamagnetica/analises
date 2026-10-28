"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarMetodo, buscarPessoas, principal, type Letra } from "@/lib/pessoas";
import {
  ALERTA_NECESSIDADE, CAMPOS_VAGA, ETAPAS_CANDIDATO, NECESSIDADE, PONTOS_ENTREVISTA, anuncio, buscarContratacao, excluirVaga,
  notaTotal, resultadoTeste, salvarCandidato, salvarVaga, type DadosVaga, type Necessidade, type Vaga,
} from "@/lib/contratacao";

const VOLTAR = { href: "/pessoas/contratacao", rotulo: "Contratação" };

function Etapa({ n, titulo, sub, children }: { n: number; titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="card mb" style={{ borderLeft: "4px solid var(--red)" }}>
      <div className="linha" style={{ gap: 10, alignItems: "center", marginBottom: 4 }}>
        <span className="selo andamento" style={{ minWidth: 26, textAlign: "center" }}>{n}</span>
        <h2 style={{ margin: 0, fontSize: 19 }}>{titulo}</h2>
      </div>
      <p className="mudo" style={{ margin: "0 0 12px" }}>{sub}</p>
      {children}
    </div>
  );
}

function PaginaVaga() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(async () => {
    const [c, p, m] = await Promise.all([buscarContratacao(portal.id), buscarPessoas(portal.id), buscarMetodo().catch(() => null)]);
    return { ...c, equipe: p.pessoas.filter((x) => x.ativo), m };
  }, [portal.id]);
  const vaga = dados?.vagas.find((v) => v.id === id) ?? null;
  const [titulo, setTitulo] = useState("");
  const [nec, setNec] = useState<Necessidade>({});
  const [v, setV] = useState<DadosVaga>({});
  const [salvo, setSalvo] = useState("");
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState({ nome: "", whatsapp: "" });
  useEffect(() => { if (vaga) { setTitulo(vaga.titulo); setNec(vaga.necessidade ?? {}); setV(vaga.vaga ?? {}); } }, [vaga?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dados) return <Carregando />;
  if (!vaga) return <><Titulo voltar={VOLTAR} titulo="Vaga" /><div className="card">Vaga não encontrada.</div></>;
  const salvar = async (d: Partial<Vaga>, msg: string) => {
    setErro(""); setSalvo("");
    try { await salvarVaga(portal.id, vaga.id, d); setSalvo(msg); recarregar(); } catch (e) { setErro((e as Error).message); }
  };
  const candidatos = dados.candidatos.filter((c) => c.vaga_id === vaga.id).sort((a, b) => notaTotal(b.entrevista) - notaTotal(a.entrevista));
  const P = dados.m?.perfis;
  const porPerfil = (["D", "I", "S", "C"] as Letra[]).map((l) => ({ l, n: dados.equipe.filter((p) => principal(p.perfil)?.letra === l).length }));

  return (
    <>
      <Titulo voltar={VOLTAR} titulo={vaga.titulo} aba="Vaga" />
      <div className="card mb linha" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Nome da vaga" style={{ flex: 1, minWidth: 200, margin: 0 }} />
        <select value={vaga.situacao} aria-label="Situação da vaga" onChange={(e) => salvar({ situacao: e.target.value }, "Situação atualizada.")} style={{ width: "auto", margin: 0 }}>
          <option value="aberta">Aberta</option><option value="pausada">Pausada</option><option value="fechada">Fechada</option>
        </select>
        <button type="button" className="btn s peq" disabled={!titulo.trim() || titulo === vaga.titulo} onClick={() => salvar({ titulo: titulo.trim() }, "Nome salvo.")}>Salvar nome</button>
        <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => {
          if (!confirm(`Excluir a vaga "${vaga.titulo}" com todos os candidatos? Não dá para desfazer.`)) return;
          try { await excluirVaga(vaga.id); router.push(VOLTAR.href); } catch (e) { setErro((e as Error).message); }
        }}>Excluir vaga</button>
      </div>
      {erro && <div className="aviso mb">{erro}</div>}
      {salvo && <div className="aviso ok mb">{salvo}</div>}

      <Etapa n={1} titulo="Do que o time precisa" sub="Antes de procurar alguém, olhe para quem já está aqui.">
        {dados.equipe.length > 0 && (
          <div className="mb" style={{ background: "var(--soft)", borderRadius: 12, padding: 12 }}>
            <b style={{ fontSize: 14 }}>O seu time hoje · {dados.equipe.length} pessoas</b>
            <div className="chips" style={{ margin: "8px 0" }}>
              {porPerfil.filter((x) => x.n).map((x) => <span key={x.l} className="chip">{P?.[x.l]?.nome ?? x.l}: {x.n}</span>)}
              {dados.equipe.some((p) => !p.perfil) && <span className="chip">Sem teste: {dados.equipe.filter((p) => !p.perfil).length}</span>}
            </div>
            <small className="mudo">{dados.equipe.map((p) => `${p.nome}${p.funcao ? ` (${p.funcao})` : ""}`).join(" · ")}</small>
          </div>
        )}
        {NECESSIDADE.map((q) => (
          <label key={q.id} className="ajuda" style={{ display: "block" }}><b style={{ color: "var(--ink)", fontSize: 14.5 }}>{q.pergunta}</b>
            <span style={{ display: "block", fontStyle: "italic" }}>{q.ex}</span>
            <textarea rows={2} value={nec[q.id] ?? ""} onChange={(e) => setNec({ ...nec, [q.id]: e.target.value })} />
          </label>
        ))}
        <div className="aviso mb">⚠️ {ALERTA_NECESSIDADE}</div>
        <button type="button" className="btn p peq" onClick={() => salvar({ necessidade: nec }, "Etapa 1 salva.")}>Salvar</button>
      </Etapa>

      <Etapa n={2} titulo="A vaga" sub="Com o que você definiu acima, descreva a vaga. O anúncio sai pronto embaixo.">
        <div className="grade g2" style={{ gap: "0 12px" }}>
          {CAMPOS_VAGA.map((c) => (
            <label key={c.id} className="ajuda" style={{ display: "block", gridColumn: c.longo ? "1 / -1" : undefined }}><b style={{ color: "var(--ink)" }}>{c.rotulo}</b>
              {c.longo
                ? <textarea rows={2} placeholder={`Ex.: ${c.ex}`} value={v[c.id] ?? ""} onChange={(e) => setV({ ...v, [c.id]: e.target.value })} />
                : <input type="text" placeholder={`Ex.: ${c.ex}`} value={v[c.id] ?? ""} onChange={(e) => setV({ ...v, [c.id]: e.target.value })} />}
            </label>
          ))}
        </div>
        <button type="button" className="btn p peq mb" onClick={() => salvar({ vaga: v }, "Etapa 2 salva.")}>Salvar</button>
        <details>
          <summary className="link-loja" style={{ cursor: "pointer" }}>Ver o anúncio pronto para divulgar</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", background: "var(--soft)", padding: 12, borderRadius: 12, fontSize: 14 }}>{anuncio(portal.loja, titulo || vaga.titulo, v)}</pre>
          <Copiar texto={anuncio(portal.loja, titulo || vaga.titulo, v)} rotulo="Copiar anúncio" />
        </details>
      </Etapa>

      <Etapa n={3} titulo="Candidatos" sub="Cadastre quem se interessou. Em cada um: a entrevista, o teste e, se for o caso, contratar.">
        <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
          <input type="text" placeholder="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} style={{ flex: 2, minWidth: 160, margin: 0 }} />
          <input type="text" inputMode="tel" placeholder="WhatsApp" value={novo.whatsapp} onChange={(e) => setNovo({ ...novo, whatsapp: e.target.value })} style={{ flex: 1, minWidth: 130, margin: 0 }} />
          <button type="button" className="btn p" disabled={!novo.nome.trim()} onClick={async () => {
            setErro("");
            try { await salvarCandidato(portal.id, vaga.id, null, { nome: novo.nome.trim(), whatsapp: novo.whatsapp.trim() }); setNovo({ nome: "", whatsapp: "" }); recarregar(); }
            catch (e) { setErro((e as Error).message); }
          }}>+ Candidato</button>
        </div>
        {!candidatos.length && <p className="mudo" style={{ margin: 0 }}>Nenhum candidato ainda.</p>}
        {candidatos.length > 0 && (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Candidato</th><th>Etapa</th><th>Entrevista</th><th>Teste</th><th /></tr></thead>
              <tbody>
                {candidatos.map((c) => {
                  const et = ETAPAS_CANDIDATO.find((x) => x.id === c.etapa) ?? ETAPAS_CANDIDATO[0];
                  const nota = notaTotal(c.entrevista);
                  const atencao = c.teste ? resultadoTeste(c.teste).filter((r) => r.nivel === "atencao").length : null;
                  return (
                    <tr key={c.id}>
                      <td><b>{c.nome}</b></td>
                      <td><span className={`selo ${et.classe}`}>{et.nome}</span></td>
                      <td>{nota ? `${nota} de ${PONTOS_ENTREVISTA.length * 5}` : "—"}</td>
                      <td>{c.teste ? (atencao ? `🔴 ${atencao} em atenção` : "🟢 respondido") : "—"}</td>
                      <td><Link href={`/pessoas/contratacao/candidato?id=${c.id}`}>Abrir →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Etapa>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><PaginaVaga /></Suspense>;
}
