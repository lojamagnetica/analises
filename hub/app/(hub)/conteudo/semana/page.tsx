"use client";

import Link from "next/link";
import { useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Excluir } from "@/components/Excluir";
import { Titulo } from "@/components/Titulo";
import { Trancado } from "@/components/Trancado";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { MESES } from "@/lib/conteudo";
import { somarDias } from "@/lib/acoes-mes";
import { variaveisDaLoja } from "@/lib/scripts";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  COR_OBJETIVO, DIAS_SEMANA, OBJETIVOS, STATUS, agendaIcs, baixar, carregarConteudo, conteudoSalvar, datasProximas, diaDaSemana,
  gerarSemana, postApagar, postSalvar, postsCriar, roteirosDaLoja, segundaDe, type Ajustes, type MetodoConteudo, type Post,
  type Status,
} from "@/lib/instagram";

const ICONE_STATUS: Record<Status, string> = { Ideia: "💡", Roteiro: "✍️", Gravado: "🎬", Programado: "⏰", Publicado: "✅" };
const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

/** O mês inteiro: um ponto por post (cor do objetivo, ícone da etapa), datas comerciais e lançamentos. Clicar no dia abre a semana. */
function Mes({ inicio, posts, datas, lancamentos, aoMudarMes, aoAbrirDia }: {
  inicio: string; posts: Post[]; datas: { mes: number; dia: number | null; titulo: string }[]; lancamentos: { titulo: string; data: string }[];
  aoMudarMes: (n: number) => void; aoAbrirDia: (d: string) => void;
}) {
  const [ano, mes] = inicio.split("-").map(Number);
  const ultimo = somarDias(`${mes === 12 ? ano + 1 : ano}-${String(mes === 12 ? 1 : mes + 1).padStart(2, "0")}-01`, -1);
  const comeco = segundaDe(inicio);
  const semanas = Math.ceil((Math.round((Date.parse(ultimo) - Date.parse(comeco)) / 86_400_000) + 1) / 7);
  const dias = Array.from({ length: semanas * 7 }, (_, i) => somarDias(comeco, i));
  const doMes = posts.filter((p) => p.data >= inicio && p.data <= ultimo);
  const datasDoMes = datas.filter((d) => d.mes === mes - 1 && d.dia != null);
  return (
    <div className="card mb">
      <div className="linha entre">
        <div className="linha" style={{ gap: 6 }}>
          <button type="button" className="btn s peq" aria-label="Mês anterior" onClick={() => aoMudarMes(-1)}>←</button>
          <b>{MESES[mes - 1]} de {ano}</b>
          <button type="button" className="btn s peq" aria-label="Próximo mês" onClick={() => aoMudarMes(1)}>→</button>
          {inicio !== hoje().slice(0, 8) + "01" && <button type="button" className="btn s peq" onClick={() => aoMudarMes(0)}>Hoje</button>}
        </div>
        <small className="mudo">{plural(doMes.length, "post")} no mês · {plural(doMes.filter((p) => p.status === "Publicado").length, "publicado")}</small>
      </div>
      <div className="linha mt" style={{ gap: 10, fontSize: 12.5 }}>
        {OBJETIVOS.map((o) => <span key={o} className="linha" style={{ gap: 4 }}><i className="mes-ponto" style={{ ["--c" as string]: COR_OBJETIVO[o] }} />{o}</span>)}
        <span className="mudo">{STATUS.map((x) => `${ICONE_STATUS[x]} ${x}`).join(" · ")}</span>
      </div>
      <div className="mes-grade mt">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => <div key={d} className="mes-cab">{DIAS_SEMANA[d]}</div>)}
        {dias.map((d) => {
          const fora = d < inicio || d > ultimo;
          const ps = posts.filter((p) => p.data === d);
          const comerciais = fora ? [] : datasDoMes.filter((x) => x.dia === Number(d.slice(8)));
          const lanc = lancamentos.filter((l) => l.data === d);
          return (
            <button key={d} type="button" className={`mes-dia ${fora ? "fora" : ""} ${d === hoje() ? "hoje" : ""}`} onClick={() => aoAbrirDia(d)} aria-label={`Abrir a semana de ${dia(d)}`}>
              <b>{Number(d.slice(8))}</b>
              <span className="mes-pontos">
                {ps.map((p) => <span key={p.id} className="mes-ponto" title={`${p.objetivo} · ${p.status} · ${p.gancho || p.tema}`} style={{ ["--c" as string]: COR_OBJETIVO[p.objetivo] }}>{ICONE_STATUS[p.status]}</span>)}
              </span>
              {comerciais.map((x) => <small key={x.titulo} className="mes-marca">📆 {x.titulo}</small>)}
              {lanc.map((l) => <small key={l.titulo} className="mes-marca">🚀 {l.titulo}</small>)}
            </button>
          );
        })}
      </div>
      <p className="ajuda">Clique num dia para abrir a semana dele.</p>
    </div>
  );
}

function CartaoPost({ p, m, aoMudar }: { p: Post; m: MetodoConteudo; aoMudar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(p);
  const [erro, setErro] = useState("");
  const campo = <K extends keyof Post>(k: K, v: Post[K]) => setF({ ...f, [k]: v });
  const salvar = async (extra: Partial<Post> = {}) => {
    setErro("");
    try {
      const { id: _id, portal_id: _p, created_at: _c, ...resto } = { ...f, ...extra };
      await postSalvar(p.id, resto); setAberto(false); aoMudar();
    } catch (e) { setErro((e as Error).message); }
  };
  return (
    <div className="card" style={{ padding: 12, borderLeft: `4px solid ${COR_OBJETIVO[p.objetivo]}`, opacity: p.status === "Publicado" ? 0.7 : 1 }}>
      <div className="linha entre" style={{ gap: 4 }}>
        <small><b>{p.formato}</b> · {p.hora ?? ""}</small>
        <span className={`selo ${p.status === "Publicado" ? "feito" : p.status === "Ideia" ? "espera" : "andamento"}`} style={{ fontSize: 11 }}>{p.status}</span>
      </div>
      <div style={{ fontWeight: 700, margin: "6px 0 2px", fontSize: 14 }}>{p.gancho || p.tema}</div>
      <small className="mudo">{p.tema}</small>
      <div className="linha mt" style={{ gap: 6 }}>
        <button type="button" className="btn s peq" onClick={() => setAberto(!aberto)}>{aberto ? "Fechar" : "Abrir"}</button>
        {p.status !== "Publicado" && (
          <button type="button" className="btn s peq" onClick={() => salvar({ status: STATUS[STATUS.indexOf(p.status) + 1] })}>→ {STATUS[STATUS.indexOf(p.status) + 1]}</button>
        )}
      </div>
      {aberto && (
        <div className="mt">
          <div className="grade g2" style={{ gap: "0 8px" }}>
            <div><label className="rotulo">Dia</label><input type="date" value={f.data} onChange={(e) => campo("data", e.target.value)} /></div>
            <div><label className="rotulo">Hora</label><input type="time" value={f.hora ?? ""} onChange={(e) => campo("hora", e.target.value)} /></div>
            <div><label className="rotulo">Formato</label><select value={f.formato} onChange={(e) => campo("formato", e.target.value)}>{[...new Set([...m.formatos, f.formato])].map((x) => <option key={x}>{x}</option>)}</select></div>
            <div><label className="rotulo">Objetivo</label><select value={f.objetivo} onChange={(e) => campo("objetivo", e.target.value as Post["objetivo"])}>{OBJETIVOS.map((x) => <option key={x}>{x}</option>)}</select></div>
          </div>
          <label className="rotulo">Gancho (falado e escrito na tela)</label><input type="text" value={f.gancho} onChange={(e) => campo("gancho", e.target.value)} />
          <label className="rotulo">Roteiro</label><textarea rows={6} value={f.roteiro} onChange={(e) => campo("roteiro", e.target.value)} />
          <label className="rotulo">CTA</label><input type="text" value={f.cta} onChange={(e) => campo("cta", e.target.value)} />
          <label className="rotulo">Legenda</label><textarea rows={4} value={f.legenda} onChange={(e) => campo("legenda", e.target.value)} placeholder="Ocasião, faixa de preço, tamanhos e como comprar" />
          <div className="linha" style={{ gap: 6 }}>
            {f.legenda && <Copiar texto={f.legenda} rotulo="Copiar legenda" />}
            <Link className="btn s peq" href={`/conteudo/roteiro?post=${p.id}${p.modelo ? `&m=${p.modelo}` : ""}`}>Preencher no gerador</Link>
          </div>
          <div className="grade g2" style={{ gap: "0 8px" }}>
            <div><label className="rotulo">Etapa</label><select value={f.status} onChange={(e) => campo("status", e.target.value as Post["status"])}>{STATUS.map((x) => <option key={x}>{x}</option>)}</select></div>
            <label className="marcar" style={{ alignSelf: "end" }}><input type="checkbox" checked={!!f.com_rosto} onChange={(e) => campo("com_rosto", e.target.checked)} /><span>Com você no vídeo</span></label>
          </div>
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt" style={{ gap: 6 }}>
            <button type="button" className="btn p peq" onClick={() => salvar()}>Salvar</button>
            <Excluir pergunta="Apagar este post da programação?" fazer={() => postApagar(p.id)} aoFim={aoMudar} rotulo="Apagar" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Semana() {
  const { portal, pers, comoLoja } = usePortal();
  const [segunda, setSegunda] = useState(segundaDe(hoje()));
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [aviso, setAviso] = useState("");
  const [gravacao, setGravacao] = useState(false);
  const [vista, setVista] = useState<"semana" | "mes">("semana");
  const [mesInicio, setMesInicio] = useState(hoje().slice(0, 8) + "01");
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [c, datas, la] = await Promise.all([
      carregarConteudo(portal.id, comoLoja),
      sb.from("datas_comerciais").select("mes, dia, titulo"),
      sb.from("loja_acoes").select("acao_id").eq("portal_id", portal.id),
    ]);
    const ids = (la.data ?? []).map((x) => x.acao_id as string);
    const acoes = ids.length ? (await sb.from("acoes").select("id, titulo, venda_inicio, data_acao").in("id", ids)).data ?? [] : [];
    return { ...c, datas: (datas.data ?? []) as { mes: number; dia: number | null; titulo: string }[], lancamentos: acoes.map((x) => ({ titulo: x.titulo as string, data: (x.venda_inicio ?? x.data_acao) as string })) };
  }, [portal.id, comoLoja]);
  if (!dados) return <Carregando />;
  const { m, a, conteudo, posts } = dados;
  if (!a) return <Trancado titulo="Programação da semana" texto={m.textos.trancado} />;

  const aj: Ajustes = ajustes ?? conteudo.ajustes ?? {};
  const vars = variaveisDaLoja(pers.get(2)?.respostas, portal.loja);
  const domingo = somarDias(segunda, 6);
  const daSemana = posts.filter((p) => p.data >= segunda && p.data <= domingo);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const proximas = datasProximas(dados.datas, hoje(), 21);
  const lancamentos = dados.lancamentos.filter((l) => l.data >= hoje() && l.data <= somarDias(hoje(), 21));
  const reels = daSemana.filter((p) => p.formato !== "Stories" && p.status !== "Publicado");
  const listaGravacao = reels.map((p, i) => `${i + 1}. ${DIAS_SEMANA[diaDaSemana(p.data)]} ${dia(p.data).slice(0, 5)} · ${p.formato}\n   Gancho: ${p.gancho}\n${p.roteiro.split("\n").filter((l) => /\(|CENA|SLIDES|SEQUÊNCIA|OCASI/.test(l)).map((l) => `   ${l.trim()}`).join("\n")}`).join("\n\n");
  const salvarAjustes = async (n: Ajustes) => { setAjustes(n); await conteudoSalvar({ ...conteudo, ajustes: n }); };
  const roteiros = roteirosDaLoja(m, a);

  return (
    <>
      <Titulo titulo="Programação da semana" sub={m.textos.semana_sub} />
      <div className="chips mb" role="tablist">
        {(["semana", "mes"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={vista === v} className={`chip ${vista === v ? "escolhido" : ""}`} onClick={() => setVista(v)}>{v === "semana" ? "Semana" : "Mês"}</button>
        ))}
      </div>
      {aviso && <div className="aviso ok mb">{aviso}</div>}

      {vista === "mes" ? (
        <Mes inicio={mesInicio} posts={posts} datas={dados.datas} lancamentos={dados.lancamentos}
          aoMudarMes={(n) => {
            if (n === 0) { setMesInicio(hoje().slice(0, 8) + "01"); return; }
            const [y, mm] = mesInicio.split("-").map(Number);
            const t = y * 12 + (mm - 1) + n;
            setMesInicio(`${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`);
          }}
          aoAbrirDia={(d) => { setSegunda(segundaDe(d)); setVista("semana"); }} />
      ) : (
      <>
      <div className="card mb">
        <div className="linha entre">
          <div className="linha" style={{ gap: 6 }}>
            <button type="button" className="btn s peq" aria-label="Semana anterior" onClick={() => setSegunda(somarDias(segunda, -7))}>←</button>
            <b>Semana de {dia(segunda).slice(0, 5)} a {dia(domingo).slice(0, 5)}</b>
            <button type="button" className="btn s peq" aria-label="Próxima semana" onClick={() => setSegunda(somarDias(segunda, 7))}>→</button>
            {segunda !== segundaDe(hoje()) && <button type="button" className="btn s peq" onClick={() => setSegunda(segundaDe(hoje()))}>Hoje</button>}
          </div>
          <div className="linha" style={{ gap: 6 }}>
            <button type="button" className="btn p" disabled={domingo < hoje()} onClick={async () => {
              const novos = gerarSemana({ m, analise: a, portalId: portal.id, segunda, ajustes: aj, existentes: posts, lancamentos: dados.lancamentos, datas: dados.datas, vars });
              if (!novos.length) { setAviso("A semana já está montada. Apague um post para o Hub sugerir outro no lugar."); return; }
              await postsCriar(novos); setAviso(`${novos.length} posts na semana. Abra cada um, ajuste com as suas peças e siga o checklist antes de postar.`); recarregar();
            }}>✨ Montar a minha semana</button>
            <button type="button" className="btn s" disabled={!daSemana.length} onClick={() => baixar(`posts-${segunda}.ics`, agendaIcs(daSemana, portal.loja))}>📅 Colocar na agenda</button>
            <button type="button" className="btn s" disabled={!reels.length} onClick={() => setGravacao(!gravacao)}>🎬 Lista de gravação</button>
          </div>
        </div>
        <div className="linha mt" style={{ gap: 6 }}>
          {STATUS.map((s) => <span key={s} className="chip">{s}: {daSemana.filter((p) => p.status === s).length}</span>)}
          {OBJETIVOS.map((o) => <span key={o} className="chip" style={{ borderColor: COR_OBJETIVO[o], color: COR_OBJETIVO[o] }}>{o}: {daSemana.filter((p) => p.objetivo === o).length}</span>)}
        </div>
      </div>

      {gravacao && (
        <div className="card mb card-borda" style={{ ["--c" as string]: "var(--accent)" }}>
          <div className="linha entre"><b>Lista de gravação em lote · {reels.length} posts</b><Copiar texto={listaGravacao} rotulo="Copiar lista" /></div>
          <p className="ajuda">Uma manhã no provador, com luz natural, rende a semana. Separe as peças antes e grave na ordem.</p>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13.5, margin: 0 }}>{listaGravacao}</pre>
        </div>
      )}

      {(proximas.length > 0 || lancamentos.length > 0) && (
        <div className="aviso mb">
          {lancamentos.map((l) => <div key={l.titulo}>🚀 {l.titulo} começa a vender em {dia(l.data)}: o Hub coloca stories de espera 3 dias e 1 dia antes.</div>)}
          {proximas.map((d) => <div key={d.titulo + d.data}>📆 {d.titulo} em {dia(d.data)}: {m.textos.data_antes}</div>)}
        </div>
      )}

      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
        {dias.map((d) => {
          const doDia = daSemana.filter((p) => p.data === d);
          const ehHoje = d === hoje();
          return (
            <div key={d} style={{ background: ehHoje ? "var(--accent-soft)" : "var(--soft)", borderRadius: 14, padding: 10 }}>
              <div className="linha entre" style={{ marginBottom: 8 }}>
                <b>{DIAS_SEMANA[diaDaSemana(d)]} · {dia(d).slice(0, 5)}</b>
                {ehHoje && <span className="selo andamento">hoje</span>}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {doDia.map((p) => <CartaoPost key={p.id + p.status + p.data} p={p} m={m} aoMudar={recarregar} />)}
                {!doDia.length && <small className="mudo">{(aj.dias?.length ? aj.dias : [0, 1, 2, 3, 4, 5, 6]).includes(diaDaSemana(d)) ? "Sem post ainda." : "Dia sem postagem."}</small>}
                <button type="button" className="btn s peq" disabled={d < hoje()} onClick={async () => {
                  await postsCriar([{ portal_id: portal.id, data: d, hora: aj.hora || m.textos.hora_padrao, formato: "Reels", objetivo: "Atrair", tema: "Post novo", gancho: "", roteiro: "", legenda: "", cta: "", origem: "manual", status: "Ideia" }]);
                  recarregar();
                }}>+ post</button>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      <details className="card mt">
        <summary style={{ cursor: "pointer" }}><b>Ajustes da programação</b> <span className="mudo" style={{ fontSize: 13.5 }}>· dias, horário, cadência e série fixa</span></summary>
        <label className="rotulo">Dias de postar</label>
        <div className="chips">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const lista = aj.dias?.length ? aj.dias : [0, 1, 2, 3, 4, 5, 6];
            const on = lista.includes(d);
            return <button key={d} type="button" className="chip" aria-pressed={on} style={on ? { borderColor: "var(--red)", color: "var(--red)" } : undefined} onClick={() => salvarAjustes({ ...aj, dias: on ? lista.filter((x) => x !== d) : [...lista, d] })}>{DIAS_SEMANA[d]}</button>;
          })}
        </div>
        <div className="grade g3" style={{ gap: 12 }}>
          <div><label className="rotulo">Horário do post principal</label><input type="time" value={aj.hora || m.textos.hora_padrao} onChange={(e) => salvarAjustes({ ...aj, hora: e.target.value })} /><p className="ajuda">{m.textos.hora_nota}</p></div>
          <div>
            <label className="rotulo">Cadência</label>
            <select value={aj.por_dia ?? 2} onChange={(e) => salvarAjustes({ ...aj, por_dia: Number(e.target.value) as 1 | 2 })}>
              <option value={2}>2 por dia: 1 reel + 1 post complementar</option>
              <option value={1}>1 por dia: só o reel</option>
            </select>
          </div>
          <div>
            <label className="rotulo">Série fixa da segunda-feira</label>
            <select value={aj.serie ?? ""} onChange={(e) => salvarAjustes({ ...aj, serie: e.target.value || undefined })}>
              <option value="">Padrão do método</option>
              {roteiros.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
        </div>
      </details>
    </>
  );
}
