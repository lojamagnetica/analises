"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { BASE } from "@/lib/config";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { DIAS_SEMANA, diaDaSemana, segundaDe } from "@/lib/instagram";
import {
  FORMATOS_CASA, PERFIS, STATUS_CASA, criarPost, ehCarrossel, listarPosts, salvarPost, taxaEnvio,
  type Perfil, type PostCasa, type StatusCasa,
} from "@/lib/conteudo-casa";

const ABAS = [
  { id: "semana", rotulo: "Semana" },
  { id: "prontos", rotulo: "Roteiros e carrosséis prontos" },
  { id: "ideias", rotulo: "Banco de ideias" },
  { id: "resultados", rotulo: "Resultados" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const GRUPOS: [string, (f: string) => boolean][] = [
  ["Todos", () => true],
  ["Carrosséis", (f) => ehCarrossel(f)],
  ["Split-screen", (f) => /split/i.test(f)],
  ["Reels", (f) => /reel/i.test(f)],
  ["Frases", (f) => /frase/i.test(f)],
  ["Stories", (f) => /stories/i.test(f)],
];

const seloStatus = (s: StatusCasa) => (s === "Postado" ? "feito" : s === "Ideia" ? "espera" : s === "Planejado" ? "alerta" : "andamento");

function Cartao({ p, perfil }: { p: PostCasa; perfil: Perfil }) {
  return (
    <Link href={`/empresa/conteudo/post?id=${p.id}&perfil=${perfil}`} className="card" style={{ padding: 12, textDecoration: "none", color: "inherit", display: "block", opacity: p.status === "Postado" ? 0.7 : 1 }}>
      <div className="linha entre" style={{ gap: 4 }}>
        <small><b>{p.horario ?? "—"}</b> · {p.formato}</small>
        <span className={`selo ${seloStatus(p.status)}`} style={{ fontSize: 11 }}>{p.status}</span>
      </div>
      <div style={{ fontWeight: 700, margin: "6px 0 2px", fontSize: 14, color: "var(--ink)" }}>{p.titulo || p.gancho || "Post sem título"}</div>
      {p.gancho && p.titulo && <small className="mudo" style={{ display: "block" }}>{p.gancho}</small>}
      {(p.funcao || p.palavra_chave) && <small className="mudo">{[p.funcao, p.palavra_chave && `palavra ${p.palavra_chave}`].filter(Boolean).join(" · ")}</small>}
    </Link>
  );
}

function Conteudo() {
  useEquipe();
  const router = useRouter();
  const params = useSearchParams();
  const perfil: Perfil = params.get("perfil") === "magnetica" ? "magnetica" : "camilla";
  const aba = (ABAS.find((a) => a.id === params.get("aba"))?.id ?? "semana") as Aba;
  const ir = (p: Perfil, a: Aba) => router.replace(`/empresa/conteudo?perfil=${p}&aba=${a}`);
  const [segunda, setSegunda] = useState(segundaDe(hoje()));
  const [grupo, setGrupo] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [nova, setNova] = useState({ titulo: "", gancho: "", formato: FORMATOS_CASA[0] });
  const { dados: posts, recarregar } = useDados(() => listarPosts(perfil), [perfil]);
  const cfg = PERFIS[perfil];

  const novoPost = async (extra: Partial<PostCasa>) => {
    const id = await criarPost({ perfil, status: "Planejado", formato: FORMATOS_CASA[0], ...extra });
    router.push(`/empresa/conteudo/post?id=${id}&perfil=${perfil}`);
  };

  return (
    <>
      <Titulo titulo="Conteúdo da casa" sub="Planejamento, roteiros e carrosséis prontos da empresa e do seu perfil." />

      <div className="grade g2 mb">
        {(Object.keys(PERFIS) as Perfil[]).map((p) => (
          <button key={p} type="button" className="card" onClick={() => ir(p, aba)}
            style={{ textAlign: "left", cursor: "pointer", display: "flex", gap: 14, alignItems: "center", borderColor: p === perfil ? "var(--red)" : undefined, boxShadow: p === perfil ? "0 0 0 1px var(--red)" : undefined }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}${PERFIS[p].avatar}`} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", filter: "grayscale(1)" }} />
            <div>
              <b style={{ color: "var(--ink)" }}>{PERFIS[p].titulo.split(" · ")[0]}</b>
              <div className="mudo" style={{ fontSize: 13.5 }}>{PERFIS[p].arroba}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="chips mb">
        {ABAS.map((a) => (
          <button key={a.id} type="button" className="chip" aria-pressed={a.id === aba} onClick={() => ir(perfil, a.id)}
            style={a.id === aba ? { borderColor: "var(--red)", color: "var(--red)", fontWeight: 700 } : undefined}>{a.rotulo}</button>
        ))}
      </div>

      {!posts ? <Carregando /> : aba === "semana" ? (() => {
        const domingo = somarDias(segunda, 6);
        const daSemana = posts.filter((p) => p.data && p.data >= segunda && p.data <= domingo);
        const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
        return (
          <>
            <div className="card mb">
              <div className="linha entre">
                <div className="linha" style={{ gap: 6 }}>
                  <button type="button" className="btn s peq" aria-label="Semana anterior" onClick={() => setSegunda(somarDias(segunda, -7))}>←</button>
                  <b>Semana de {dia(segunda).slice(0, 5)} a {dia(domingo).slice(0, 5)}</b>
                  <button type="button" className="btn s peq" aria-label="Próxima semana" onClick={() => setSegunda(somarDias(segunda, 7))}>→</button>
                  {segunda !== segundaDe(hoje()) && <button type="button" className="btn s peq" onClick={() => setSegunda(segundaDe(hoje()))}>Hoje</button>}
                </div>
                <span className="mudo" style={{ fontSize: 13.5 }}>{daSemana.length} posts na semana · {cfg.arroba}</span>
              </div>
              <div className="linha mt" style={{ gap: 6 }}>
                {STATUS_CASA.filter((s) => s !== "Ideia").map((s) => <span key={s} className="chip">{s}: {daSemana.filter((p) => p.status === s).length}</span>)}
              </div>
            </div>
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
              {dias.map((d) => {
                const doDia = daSemana.filter((p) => p.data === d);
                return (
                  <div key={d} style={{ background: d === hoje() ? "var(--accent-soft)" : "var(--soft)", borderRadius: 14, padding: 10 }}>
                    <div className="linha entre" style={{ marginBottom: 8 }}>
                      <b>{DIAS_SEMANA[diaDaSemana(d)]} · {dia(d).slice(0, 5)}</b>
                      {d === hoje() && <span className="selo andamento">hoje</span>}
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {doDia.map((p) => <Cartao key={p.id} p={p} perfil={perfil} />)}
                      {!doDia.length && <small className="mudo">Sem post ainda.</small>}
                      <button type="button" className="btn s peq" onClick={() => novoPost({ data: d })}>+ post</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })() : aba === "prontos" ? (() => {
        const filtro = GRUPOS.find((g) => g[0] === grupo)![1];
        const termo = busca.trim().toLowerCase();
        const lista = posts
          .filter((p) => p.status !== "Ideia" && (p.conteudo || p.legenda) && filtro(p.formato))
          .filter((p) => !termo || `${p.titulo} ${p.gancho} ${p.angulo} ${p.conteudo}`.toLowerCase().includes(termo))
          .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
        return (
          <>
            <div className="card mb">
              <div className="chips">
                {GRUPOS.map(([g, f]) => (
                  <button key={g} type="button" className="chip" aria-pressed={g === grupo} onClick={() => setGrupo(g)}
                    style={g === grupo ? { borderColor: "var(--red)", color: "var(--red)" } : undefined}>
                    {g} · {posts.filter((p) => p.status !== "Ideia" && (p.conteudo || p.legenda) && f(p.formato)).length}
                  </button>
                ))}
              </div>
              <input type="text" className="mt" placeholder="Buscar por tema, gancho ou palavra" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            {!lista.length && <p className="mudo">Nada pronto aqui ainda. Quando um post tiver roteiro ou slides, ele aparece nesta lista.</p>}
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {lista.map((p) => (
                <div key={p.id}>
                  <small className="mudo">{p.data ? `${DIAS_SEMANA[diaDaSemana(p.data)]} ${dia(p.data).slice(0, 5)}` : "Sem data"}</small>
                  <Cartao p={p} perfil={perfil} />
                </div>
              ))}
            </div>
          </>
        );
      })() : aba === "ideias" ? (() => {
        const ideias = posts.filter((p) => p.status === "Ideia");
        return (
          <>
            <form className="card mb" onSubmit={async (e) => {
              e.preventDefault();
              if (!nova.titulo.trim() && !nova.gancho.trim()) return;
              await criarPost({ perfil, status: "Ideia", titulo: nova.titulo.trim(), gancho: nova.gancho.trim(), formato: nova.formato });
              setNova({ ...nova, titulo: "", gancho: "" }); recarregar();
            }}>
              <h3>Nova ideia</h3>
              <div className="grade g3" style={{ gap: "0 12px" }}>
                <div><label className="rotulo">Tema</label><input type="text" value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} /></div>
                <div><label className="rotulo">Gancho</label><input type="text" value={nova.gancho} onChange={(e) => setNova({ ...nova, gancho: e.target.value })} placeholder="X não é Y. É Z." /></div>
                <div><label className="rotulo">Formato</label><select value={nova.formato} onChange={(e) => setNova({ ...nova, formato: e.target.value })}>{FORMATOS_CASA.map((f) => <option key={f}>{f}</option>)}</select></div>
              </div>
              <div className="linha mt"><button className="btn p" type="submit">Guardar ideia</button></div>
            </form>
            {!ideias.length && <p className="mudo">Nenhuma ideia guardada.</p>}
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {ideias.map((p) => (
                <div key={p.id} className="card" style={{ padding: 12 }}>
                  <small className="mudo">{p.formato}</small>
                  <div style={{ fontWeight: 700, margin: "4px 0", color: "var(--ink)" }}>{p.titulo || p.gancho}</div>
                  {p.titulo && p.gancho && <small className="mudo" style={{ display: "block" }}>{p.gancho}</small>}
                  {p.angulo && <small className="mudo" style={{ display: "block", marginTop: 4 }}>{p.angulo}</small>}
                  <div className="linha mt" style={{ gap: 6 }}>
                    <Link className="btn s peq" href={`/empresa/conteudo/post?id=${p.id}&perfil=${perfil}`}>Abrir</Link>
                    <button type="button" className="btn p peq" onClick={async () => { await salvarPost(p.id, { status: "Planejado", data: p.data ?? hoje() }); router.push(`/empresa/conteudo/post?id=${p.id}&perfil=${perfil}`); }}>Planejar</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      })() : (() => {
        const postados = posts.filter((p) => p.status === "Postado").sort((a, b) => (taxaEnvio(b) ?? -1) - (taxaEnvio(a) ?? -1));
        return (
          <div className="card">
            <h3>Envios por alcance</h3>
            <p className="mudo" style={{ fontSize: 14 }}>A métrica-norte: quanto do alcance virou envio. Lance os números na sexta e veja os campeões no topo.</p>
            {!postados.length ? <p className="mudo">Nenhum post marcado como Postado ainda.</p> : (
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead><tr><th>Dia</th><th>Post</th><th>Formato</th><th>Alcance</th><th>Envios</th><th>Envios/alcance</th></tr></thead>
                  <tbody>
                    {postados.map((p) => {
                      const t = taxaEnvio(p);
                      return (
                        <tr key={p.id}>
                          <td>{p.data ? dia(p.data).slice(0, 5) : "—"}</td>
                          <td><Link href={`/empresa/conteudo/post?id=${p.id}&perfil=${perfil}`}>{p.titulo || p.gancho}</Link></td>
                          <td>{p.formato}</td>
                          <td><input type="number" min={0} defaultValue={p.alcance ?? ""} style={{ width: 110 }} onBlur={async (e) => { await salvarPost(p.id, { alcance: e.target.value ? Number(e.target.value) : null }); recarregar(); }} /></td>
                          <td><input type="number" min={0} defaultValue={p.envios ?? ""} style={{ width: 90 }} onBlur={async (e) => { await salvarPost(p.id, { envios: e.target.value ? Number(e.target.value) : null }); recarregar(); }} /></td>
                          <td><b>{t == null ? "—" : `${t.toFixed(2).replace(".", ",")}%`}</b></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Conteudo /></Suspense>;
}
