"use client";

import { useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados } from "@/lib/hub";
import { BASE } from "@/lib/config";
import { dataHora } from "@/lib/formato";
import {
  buscarConteudo, buscarTestes, criarTeste, editarTeste, excluirTeste, linkDoTeste, pontuar, salvarOlhar,
  type Conteudo, type Papel, type Teste,
} from "@/lib/lojista";

const FAIXA = { resultado: "Foco no resultado", equilibrado: "Equilibrado", imagem: "Foco na imagem" } as const;
const NIVEL = { alta: "Prontidão alta", media: "Prontidão média", baixa: "Prontidão baixa" } as const;
const PAPEL = { socio: "Sócio(a)", gerente: "Gerente" } as const;

function Resposta({ t, c, nome }: { t: Teste; c: Conteudo; nome: string }) {
  const [olhar, setOlhar] = useState(t.olhar ?? []);
  const [erro, setErro] = useState("");
  const r = t.respostas!;
  const res = t.resultado ?? pontuar(c, r, t.papel);
  const perfil = res.principal ? c.B.perfis[res.principal] : null;
  const apoio = res.apoio ? c.B.perfis[res.apoio] : null;
  const abertas = [
    ...c.A.abertas.map((q, i) => ({ q, a: r.A.abertas[i] })),
    ...c.C.itens.map((it, i) => ({ q: it.texto, a: it.tipo === "texto" ? String(r.C.itens[i] ?? "") : "" })).filter((x) => x.a),
    ...c.D.abertas.map((q, i) => ({ q, a: r.D.abertas[i] })),
  ].filter((x) => x.a?.trim());

  return (
    <div style={{ marginTop: 10 }}>
      <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
        {res.faixa && <span className={`selo ${res.faixa === "imagem" ? "alerta" : res.faixa === "equilibrado" ? "andamento" : "feito"}`}>{FAIXA[res.faixa]}{res.indice != null ? ` · ${res.indice}` : ""}</span>}
        <span className={`selo ${res.nivel === "alta" ? "feito" : res.nivel === "media" ? "andamento" : "alerta"}`}>{NIVEL[res.nivel]} · {res.prontidao}</span>
        {perfil && <span className="selo espera">{perfil.nome}{apoio ? ` + ${apoio.nome}` : ""}</span>}
      </div>
      <p className="ajuda" style={{ margin: "8px 0 0" }}>
        Saber {res.saber} · Poder {res.poder} · Querer {res.querer}
        {res.horas ? ` · Reserva ${res.horas.toLowerCase()} por semana` : ""}
        {res.trava ? ` · Maior trava: ${res.trava}` : ""}
      </p>
      <p className="ajuda" style={{ margin: "2px 0 0" }}>
        Índice por parte (0 resultado · 100 imagem): {Object.entries(res.partes).filter(([, v]) => v != null).map(([k, v]) => `${k} ${v}`).join(" · ")}
      </p>

      {perfil && (
        <div className="mt">
          <div className="secao" style={{ marginTop: 0 }}>Como conduzir ({perfil.nome})</div>
          <p style={{ margin: "0 0 4px" }}><b>Forte:</b> {perfil.forte}</p>
          <p style={{ margin: "0 0 4px" }}><b>Cuidado:</b> {perfil.cuidado}</p>
          <p style={{ margin: "0 0 4px" }}><b>Motivar:</b> {perfil.motivar}</p>
          <p style={{ margin: "0 0 4px" }}><b>Cobrar:</b> {perfil.cobrar}</p>
          <p style={{ margin: 0 }}><b>Acompanhar:</b> {perfil.acompanhar}</p>
        </div>
      )}

      <div className="mt">
        <div className="secao" style={{ marginTop: 0 }}>Habilidades: autoavaliação e olhar de fora</div>
        {c.D.habilidades.map((h, i) => {
          const minha = olhar.filter((o) => o.habilidade === i);
          const meu = minha.find((o) => o.por === nome);
          const self = Number(r.D.notas[i]) || 0;
          return (
            <div key={h.nome} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <div><b>{h.pilar}:</b> {h.nome}</div>
              <div className="linha" style={{ gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                <span className="mudo" style={{ fontSize: 13 }}>Ela se deu {self || "—"}</span>
                {minha.map((o) => <span key={o.por} className="selo espera">{o.por}: {o.nota} · {o.em.split("-").reverse().join("/")}</span>)}
                <select aria-label={`Sua nota para ${h.nome}`} value={meu?.nota ?? 0} style={{ width: "auto" }}
                  onChange={async (e) => {
                    setErro("");
                    try { setOlhar(await salvarOlhar({ ...t, olhar }, i, Number(e.target.value), nome)); } catch (x) { setErro((x as Error).message); }
                  }}>
                  <option value={0}>Minha nota</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          );
        })}
        {erro && <div className="aviso mt">{erro}</div>}
      </div>

      {abertas.length > 0 && (
        <details className="mt">
          <summary>Respostas escritas</summary>
          {abertas.map((x) => <p key={x.q} style={{ margin: "8px 0 0" }}><b>{x.q}</b><br />{x.a}</p>)}
        </details>
      )}
    </div>
  );
}

/** Teste do lojista na ficha da loja: gera o link para cada sócio e gerente e mostra o que eles responderam. Só a equipe vê. */
export function PerfilDoLojista({ portalId, nome }: { portalId: string; nome: string }) {
  const { dados, recarregar } = useDados(async () => ({ testes: await buscarTestes(portalId), conteudo: await buscarConteudo() }), [portalId]);
  const [novo, setNovo] = useState<{ nome: string; papel: Papel }>({ nome: "", papel: "socio" });
  const [editando, setEditando] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ nome: string; papel: Papel }>({ nome: "", papel: "socio" });
  const [confirmando, setConfirmando] = useState("");
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const { testes, conteudo } = dados;
  const base = typeof window !== "undefined" ? `${window.location.origin}${BASE}` : "";
  const tentar = async (f: () => Promise<void>) => { setErro(""); try { await f(); recarregar(); } catch (e) { setErro((e as Error).message); } };

  return (
    <div className="card mt" id="perfil-lojista">
      <h2>Perfil do lojista</h2>
      <p className="mudo" style={{ marginTop: 0 }}>Teste para quem decide na loja (sócios e gerente): como conduz, o quanto está pronto para aplicar e onde se desenvolver. Mande o link; o índice e a prontidão ficam só aqui, a pessoa vê o retrato dela.</p>
      {!conteudo && <div className="aviso">O conteúdo do teste ainda não foi carregado no banco.</div>}

      {testes.length === 0 && <p className="mudo">Ninguém cadastrado ainda.</p>}
      {testes.map((t) => (
        <div key={t.id} className="marcar" style={{ display: "block", cursor: "default" }}>
          {editando === t.id ? (
            <form className="linha" style={{ gap: 8, flexWrap: "wrap" }} action={() => tentar(async () => { await editarTeste(t.id, edit.nome, edit.papel); setEditando(null); })}>
              <input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} aria-label="Nome" style={{ flex: 1, minWidth: 160 }} />
              <select value={edit.papel} onChange={(e) => setEdit({ ...edit, papel: e.target.value as Papel })} style={{ width: "auto" }}><option value="socio">Sócio(a)</option><option value="gerente">Gerente</option></select>
              <button className="btn p peq" type="submit">Salvar</button>
              <button className="btn s peq" type="button" onClick={() => setEditando(null)}>Cancelar</button>
            </form>
          ) : (
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span><b>{t.nome}</b> <span className="mudo">· {PAPEL[t.papel]}</span> {t.respondido_em ? <span className="selo feito">respondeu em {dataHora(t.respondido_em)}</span> : <span className="selo espera">aguardando</span>}</span>
              <span className="linha" style={{ gap: 6 }}>
                {!t.respondido_em && <Copiar texto={linkDoTeste(base, t.token)} rotulo="Copiar link" />}
                <button className="btn s peq" type="button" onClick={() => { setEditando(t.id); setEdit({ nome: t.nome, papel: t.papel }); }}>Editar</button>
                {confirmando === t.id ? (
                  <>
                    <button className="btn p peq" type="button" onClick={() => tentar(async () => { await excluirTeste(t.id); setConfirmando(""); })}>Excluir mesmo</button>
                    <button className="btn s peq" type="button" onClick={() => setConfirmando("")}>Cancelar</button>
                  </>
                ) : <button className="btn s peq" type="button" onClick={() => setConfirmando(t.id)}>Excluir</button>}
              </span>
            </div>
          )}
          {t.respondido_em && t.respostas && conteudo && (
            <details style={{ marginTop: 6 }}><summary>Ver resultado</summary><Resposta t={t} c={conteudo} nome={nome} /></details>
          )}
        </div>
      ))}

      <form className="linha mt" style={{ gap: 8, flexWrap: "wrap" }} action={() => tentar(async () => { await criarTeste(portalId, novo.nome, novo.papel, nome); setNovo({ nome: "", papel: "socio" }); })}>
        <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="Nome de quem vai responder" aria-label="Nome de quem vai responder" style={{ flex: 1, minWidth: 180 }} />
        <select value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value as Papel })} aria-label="Papel" style={{ width: "auto" }}><option value="socio">Sócio(a)</option><option value="gerente">Gerente</option></select>
        <button className="btn p peq" type="submit" disabled={!novo.nome.trim()}>Gerar link</button>
      </form>
      {erro && <div className="aviso mt">{erro}</div>}
    </div>
  );
}
