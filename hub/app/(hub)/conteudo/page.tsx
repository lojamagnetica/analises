"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Trancado } from "@/components/Trancado";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia } from "@/lib/formato";
import { buscarExtras, caracteresBio, carregarConteudo, completar, conteudoSalvar, type LojaConteudo } from "@/lib/instagram";

const idYoutube = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? null;

function Cabecalho({ emoji, titulo, sub }: { emoji: string; titulo: string; sub?: string }) {
  return (
    <div className="linha" style={{ gap: 12, margin: "28px 0 12px", flexWrap: "nowrap", alignItems: "flex-start" }}>
      <div style={{ fontSize: 22, width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--accent-soft)", flex: "none" }}>{emoji}</div>
      <div><h2 style={{ margin: 0 }}>{titulo}</h2>{sub && <p className="mudo" style={{ margin: "2px 0 0" }}>{sub}</p>}</div>
    </div>
  );
}

function Analise() {
  const { portal, equipe, comoLoja } = usePortal();
  const x = useSearchParams().get("x") ?? "";
  const [feitasLocal, setFeitas] = useState<string[] | null>(null);
  const [checklist, setChecklist] = useState<number[]>([]);
  const { dados } = useDados(async () => {
    const [c, extras] = await Promise.all([carregarConteudo(portal.id, comoLoja), buscarExtras(portal.id)]);
    return { ...c, extras: extras.filter((e) => e.status === "liberada" || (equipe && !comoLoja)) };
  }, [portal.id, comoLoja]);
  if (!dados) return <Carregando />;
  const { m, analise, conteudo, extras } = dados;
  const extra = x ? extras.find((e) => e.id === x) : undefined;
  const a = extra ? completar(m, extra.dados) : dados.a;
  // As marcações de uma análise extra ficam separadas das da principal.
  const px = extra ? `${extra.id}:` : "";
  if (!a) return <Trancado titulo="Análise do perfil" texto={m.textos.trancado} />;

  const feitas = feitasLocal ?? conteudo.feitas;
  const marcar = async (chave: string) => {
    const nova = feitas.includes(chave) ? feitas.filter((x) => x !== chave) : [...feitas, chave];
    setFeitas(nova);
    await conteudoSalvar({ ...conteudo, feitas: nova } as LojaConteudo);
  };
  const correcoesFeitas = a.correcoes.filter((_, i) => feitas.includes(`${px}c${i}`)).length;
  const yt = idYoutube(a.video_url);
  const rosto = a.reels.filter((r) => r.rosto), produto = a.reels.filter((r) => !r.rosto);
  const med = (xs: { views: number }[]) => (xs.length ? Math.round(xs.reduce((s, r) => s + r.views, 0) / xs.length) : 0);
  const maior = Math.max(1, ...a.reels.map((r) => r.views));

  return (
    <>
      {extras.length > 0 && (
        <div className="linha mb" style={{ gap: 8 }} role="group" aria-label="Escolha o Instagram">
          {dados.a && <Link className="chip" href="/conteudo" style={!extra ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)" } : undefined}>{dados.a.instagram || "Perfil principal"}</Link>}
          {extras.map((e) => (
            <Link key={e.id} className="chip" href={`/conteudo?x=${e.id}`} style={extra?.id === e.id ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)" } : undefined}>{e.instagram}</Link>
          ))}
        </div>
      )}
      {equipe && (extra ? extra.status : analise?.status) !== "liberada" && <div className="aviso mb">Rascunho: a loja ainda não vê esta análise. <Link href={`/equipe/analise?p=${portal.id}${extra ? `&x=${extra.id}` : ""}`}>Editar e liberar →</Link></div>}
      <div className="card mb" style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ height: 6, background: "var(--grad)" }} />
        <div style={{ padding: "22px 22px 18px" }}>
          <span className="selo andamento">★ Método Loja Magnética · Diagnóstico de Perfil</span>
          <h1 style={{ margin: "12px 0 4px", fontSize: 30 }}>Análise do Perfil</h1>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{portal.loja}{a.cidade ? ` · ${a.cidade}` : ""}</div>
          {a.lede && <p style={{ marginBottom: 0 }}>{a.lede}</p>}
          <div className="chips mt">
            <span className="chip">{dia(a.data)}</span><span className="chip">Análise com Camilla Ribeiro</span>{a.nicho && <span className="chip">{a.nicho}</span>}{a.instagram && <span className="chip">{a.instagram}</span>}
          </div>
          {yt ? (
            <div className="mt" style={{ position: "relative", paddingTop: "56.25%", borderRadius: 14, overflow: "hidden", background: "#000" }}>
              <iframe src={`https://www.youtube.com/embed/${yt}?rel=0`} title={`Análise do perfil · ${portal.loja}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
            </div>
          ) : null}
          <div className="grade g4 mt" style={{ gap: 10 }}>
            {[[String(a.correcoes.length), "Correções no perfil"], [`${a.numeros.destaques_de ? `${a.numeros.destaques_de}→` : ""}${a.numeros.destaques_para}`, "Destaques"], [a.numeros.frequencia, "Frequência de posts"], [a.numeros.meta_views, "Meta de views por reels"]].map(([n, l]) => (
              <div key={l} className="kpi" style={{ textAlign: "center", padding: 12, background: "var(--soft)", borderRadius: 12 }}><div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>{n}</div><small className="mudo">{l}</small></div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mb card-borda" style={{ ["--c" as string]: "var(--green)" }}>
        <div className="linha entre">
          <b>Seu próximo passo</b>
          <span className={`selo ${correcoesFeitas === a.correcoes.length ? "feito" : "andamento"}`}>{correcoesFeitas}/{a.correcoes.length} correções feitas</span>
        </div>
        <p style={{ margin: "6px 0 0" }}>{correcoesFeitas < a.correcoes.length ? "Comece pelas correções do perfil: elas são a porta da loja no Instagram." : "Perfil arrumado. Agora é constância:"} <Link href="/conteudo/semana">montar a semana de posts →</Link></p>
      </div>

      <Cabecalho emoji="🛠️" titulo="Correções imediatas do perfil" sub="A bio e o link são a porta da loja no Instagram. Marque o que já fez." />
      <div className="grade g2">
        {a.correcoes.map((c, i) => (
          <label key={i} className="card" style={{ cursor: "pointer", opacity: feitas.includes(`${px}c${i}`) ? 0.65 : 1 }}>
            <div className="linha entre" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
              <div className="linha" style={{ gap: 10, flexWrap: "nowrap", alignItems: "flex-start" }}>
                <input type="checkbox" checked={feitas.includes(`${px}c${i}`)} onChange={() => marcar(`${px}c${i}`)} style={{ marginTop: 4 }} aria-label={`Feito: ${c.titulo}`} />
                <b>{i + 1}. {c.titulo}</b>
              </div>
              <span className={`selo ${c.prazo === "Fazer agora" ? "andamento" : "espera"}`} style={{ flex: "none" }}>{c.prazo}</span>
            </div>
            <p style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{c.texto}</p>
          </label>
        ))}
      </div>
      {a.bio && (
        <div className="card mt card-borda" style={{ ["--c" as string]: "var(--accent)" }}>
          <div className="linha entre"><b>Bio pronta para colar</b><Copiar texto={a.bio} rotulo="Copiar bio" /></div>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 15, background: "var(--soft)", padding: 14, borderRadius: 12 }}>{a.bio}</pre>
          <small className="mudo">{caracteresBio(a.bio)} de {m.bio.limite} caracteres · a primeira linha é o campo de nome do perfil.</small>
        </div>
      )}
      {a.destaques.length > 0 && (
        <div className="card mt">
          <b>Destaques, na ordem da compra</b>
          <div className="linha mt" style={{ gap: 10 }}>
            {a.destaques.map((d, i) => (
              <div key={d} style={{ textAlign: "center", width: 74 }}>
                <div style={{ width: 52, height: 52, borderRadius: 99, margin: "0 auto 4px", display: "grid", placeItems: "center", background: "var(--grad)", color: "#fff", fontWeight: 800 }}>{String(i + 1).padStart(2, "0")}</div>
                <small>{d}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {(a.reels.length > 0 || a.conclusao) && (
        <>
          <Cabecalho emoji="📊" titulo="O que os números dizem" sub={a.reels.length ? "Os últimos reels em dois grupos: com você no vídeo e só com produto ou loja" : "O que os posts mais recentes mostram"} />
          <div className="card">
            {a.reels.map((r, i) => (
              <div key={i} style={{ margin: "0 0 8px" }}>
                <div className="linha entre" style={{ fontSize: 13.5 }}><span>{r.nome}</span><b>{r.views.toLocaleString("pt-BR")}</b></div>
                <div style={{ height: 8, borderRadius: 99, background: "var(--soft)" }}><div style={{ height: 8, borderRadius: 99, width: `${(r.views / maior) * 100}%`, background: r.rosto ? "var(--accent)" : "var(--muted)" }} /></div>
              </div>
            ))}
            {rosto.length > 0 && produto.length > 0 && <div className="grade g2 mt" style={{ gap: 10 }}>
              <div className="card" style={{ background: "var(--accent-soft)" }}><div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent)" }}>{med(rosto).toLocaleString("pt-BR")}</div><small>média de views com você no vídeo</small></div>
              <div className="card" style={{ background: "var(--soft)" }}><div style={{ fontSize: 26, fontWeight: 800 }}>{med(produto).toLocaleString("pt-BR")}</div><small>média de views só com produto ou loja</small></div>
            </div>}
            <p style={{ margin: a.reels.length ? undefined : 0 }}>{a.conclusao || m.textos.rosto_conclusao}</p>
          </div>
        </>
      )}

      {a.posts.length > 0 && (
        <>
          <Cabecalho emoji="🔁" titulo="Antes vs Depois: seus conteúdos analisados" sub="O que travou cada post e como ele ficaria corrigido" />
          <div className="grade g2">
            {a.posts.map((p, i) => (
              <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "var(--soft)" }}><small className="mudo">Post {i + 1}</small><div className="linha entre"><b>{p.titulo}</b><small className="mudo">{p.views}</small></div></div>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}><small style={{ color: p.acerto ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{p.acerto ? "✓ O que já está bom" : "✕ O que estava errado"}</small><p style={{ margin: "4px 0 0" }}>{p.errado}</p></div>
                <div style={{ padding: "12px 16px" }}><small style={{ color: "var(--green)", fontWeight: 700 }}>✓ {p.acerto ? "O que melhorar" : "Como deveria ser"}</small><p style={{ margin: "4px 0 0" }}>{p.certo}</p></div>
              </div>
            ))}
          </div>
        </>
      )}

      <Cabecalho emoji="⚖️" titulo="Certo vs Errado" sub="Referência rápida do que parar e do que começar a fazer" />
      <div className="grade g2">
        <div className="card"><b style={{ color: "var(--red)" }}>✕ Pare de fazer</b><ul style={{ paddingLeft: 18 }}>{a.pare.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="card"><b style={{ color: "var(--green)" }}>✓ Comece a fazer</b><ul style={{ paddingLeft: 18 }}>{a.comece.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </div>

      <Cabecalho emoji="🧭" titulo="Estratégia de conteúdo" sub="As regras de ouro para cada post daqui pra frente" />
      <div className="grade g3">{a.estrategia.map((r) => <div key={r.titulo} className="card"><div style={{ fontSize: 26 }}>{r.emoji}</div><b>{r.titulo}</b><p style={{ margin: "4px 0 0" }}>{r.texto}</p></div>)}</div>

      <Cabecalho emoji="📈" titulo="O que o algoritmo precisa ver" sub="Valem para todo post, sem exceção" />
      <div className="grade g3">{m.algoritmo.map((r) => <div key={r.titulo} className="card"><div style={{ fontSize: 26 }}>{r.emoji}</div><b>{r.titulo}</b><p style={{ margin: "4px 0 0" }}>{r.texto}</p></div>)}</div>

      <Cabecalho emoji="📋" titulo="Roteiros-modelo prontos" sub="Preencha os espaços no gerador de roteiro · até 30 segundos" />
      <div className="grade g3">
        {a.roteiros.map((r) => (
          <div key={r.id} className="card">
            <b>{r.nome}</b>{r.quando && <p className="mudo" style={{ margin: "2px 0 8px", fontSize: 13.5 }}>{r.quando}</p>}
            {r.linhas.map((l) => <p key={l.rotulo} style={{ margin: "0 0 6px", fontSize: 14 }}><b style={{ color: "var(--accent)" }}>{l.rotulo}:</b> {l.fala}</p>)}
            <Link className="btn s peq mt" href={`/conteudo/roteiro?m=${r.id}`}>Usar este modelo</Link>
          </div>
        ))}
      </div>

      <Cabecalho emoji="🔄" titulo="Workflow de produção semanal" sub="Da peça ao post publicado" />
      <div className="grade g3">{a.workflow.map((p, i) => <div key={p.titulo} className="card"><span className="selo andamento">{i + 1}</span><b style={{ display: "block", marginTop: 6 }}>{p.titulo}</b><p style={{ margin: "4px 0 0" }}>{p.texto}</p></div>)}</div>

      <Cabecalho emoji="🪝" titulo="Fórmulas de gancho prontas" sub="Feitas para prender nos 3 primeiros segundos" />
      <div className="card"><ol style={{ paddingLeft: 20, margin: 0 }}>{a.ganchos.map((g) => <li key={g} style={{ marginBottom: 6 }}>{g}</li>)}</ol></div>

      <Cabecalho emoji="💡" titulo="Banco de ideias" sub="Formatos e temas prontos para gravar na próxima semana" />
      <div className="grade g3">{a.ideias.map((x) => <div key={x.titulo} className="card"><span className="selo espera">{x.formato}</span><b style={{ display: "block", marginTop: 6 }}>{x.titulo}</b><p style={{ margin: "4px 0 0" }}>{x.texto}</p></div>)}</div>

      <Cabecalho emoji="📣" titulo="Guia de CTAs por situação" sub="O que falar no final de cada tipo de post" />
      <div className="grade g3">{a.ctas.map((c, i) => <div key={i} className="card"><small className="mudo">{c.situacao}</small><blockquote style={{ margin: "6px 0", fontWeight: 700 }}>“{c.fala}”</blockquote><p style={{ margin: 0, fontSize: 13.5 }}>{c.porque}</p></div>)}</div>

      <div className="card mt card-borda" style={{ ["--c" as string]: "var(--accent)" }}>
        <b>Como vender sem parecer catálogo: {m.vender_sem_catalogo.titulo.toLowerCase()}</b>
        <p style={{ marginBottom: 0 }}>{m.vender_sem_catalogo.texto}</p>
      </div>

      <Cabecalho emoji="✅" titulo="Checklist antes de publicar" sub="Passe por cada item antes de soltar o post" />
      <div className="card">
        {m.checklist.map((c, i) => (
          <label key={c} className="marcar"><input type="checkbox" checked={checklist.includes(i)} onChange={() => setChecklist(checklist.includes(i) ? checklist.filter((x) => x !== i) : [...checklist, i])} /><span>{c}</span></label>
        ))}
      </div>

      {a.ferramentas.length > 0 && (
        <>
          <Cabecalho emoji="🧰" titulo="Ferramentas recomendadas" />
          <div className="chips">{a.ferramentas.map((f) => <span key={f} className="chip">{f}</span>)}</div>
        </>
      )}

      <Cabecalho emoji="🗓️" titulo="Cronograma de execução" sub="Passo a passo para implementar tudo sem se perder" />
      <div className="grade g2">
        {a.cronograma.map((c, i) => (
          <label key={i} className="card" style={{ cursor: "pointer", opacity: feitas.includes(`${px}t${i}`) ? 0.65 : 1 }}>
            <div className="linha" style={{ gap: 10, flexWrap: "nowrap" }}>
              <input type="checkbox" checked={feitas.includes(`${px}t${i}`)} onChange={() => marcar(`${px}t${i}`)} aria-label={`Feito: ${c.titulo}`} />
              <span className="selo andamento">{c.quando}</span><b>{c.titulo}</b>
            </div>
            <p style={{ margin: "8px 0 0" }}>{c.texto}</p>
          </label>
        ))}
      </div>
      <p className="mudo mt" style={{ fontSize: 12.5, textAlign: "center" }}>Análise do perfil · Método Loja Magnética com Camilla Ribeiro</p>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Analise /></Suspense>;
}
