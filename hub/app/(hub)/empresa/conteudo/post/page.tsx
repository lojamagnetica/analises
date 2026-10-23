"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CarrosselTweet } from "@/components/CarrosselTweet";
import { Copiar } from "@/components/Copiar";
import { Texto } from "@/components/Texto";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dia } from "@/lib/formato";
import { DIAS_SEMANA, diaDaSemana } from "@/lib/instagram";
import {
  FORMATOS_CASA, FUNCOES, HORARIOS, PERFIS, STATUS_CASA, apagarPost, ehCarrossel, lerPost, lerSlides, salvarPost, taxaEnvio,
  type PostCasa, type StatusCasa,
} from "@/lib/conteudo-casa";

/** Um trecho do material pelo título da seção (ex.: "Teleprompter"), sem o título. */
function secao(md: string, nome: string) {
  const m = md.replace(/\r/g, "").match(new RegExp(`(^|\\n)## ${nome}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`, "i"));
  return m ? m[2].trim() : "";
}

function Editar({ p, aoSalvar }: { p: PostCasa; aoSalvar: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(p);
  const [aviso, setAviso] = useState("");
  const campo = <K extends keyof PostCasa>(k: K, v: PostCasa[K]) => setF({ ...f, [k]: v });
  const editorias = PERFIS[p.perfil].editorias;
  return (
    <details className="card mt" open={!p.conteudo && !p.legenda}>
      <summary style={{ cursor: "pointer" }}><b>Editar o post</b> <span className="mudo" style={{ fontSize: 13.5 }}>· dia, formato, gancho, material e legenda</span></summary>
      <div className="grade g3 mt" style={{ gap: "0 12px" }}>
        <div><label className="rotulo">Dia</label><input type="date" value={f.data ?? ""} onChange={(e) => campo("data", e.target.value || null)} /></div>
        <div><label className="rotulo">Horário</label><select value={f.horario ?? ""} onChange={(e) => campo("horario", e.target.value || null)}><option value="">—</option>{[...new Set([...HORARIOS, f.horario ?? ""])].filter(Boolean).map((h) => <option key={h}>{h}</option>)}</select></div>
        <div><label className="rotulo">Formato</label><select value={f.formato} onChange={(e) => campo("formato", e.target.value)}>{[...new Set([...FORMATOS_CASA, f.formato])].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label className="rotulo">Função</label><select value={f.funcao ?? ""} onChange={(e) => campo("funcao", e.target.value || null)}><option value="">—</option>{[...new Set([...FUNCOES, f.funcao ?? ""])].filter(Boolean).map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label className="rotulo">Editoria</label><select value={f.editoria ?? ""} onChange={(e) => campo("editoria", e.target.value || null)}><option value="">—</option>{[...new Set([...editorias, f.editoria ?? ""])].filter(Boolean).map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label className="rotulo">Palavra-chave</label><input type="text" value={f.palavra_chave ?? ""} onChange={(e) => campo("palavra_chave", e.target.value.toUpperCase() || null)} placeholder="só no último slide e no comentário" /></div>
      </div>
      <label className="rotulo">Tema</label><input type="text" value={f.titulo} onChange={(e) => campo("titulo", e.target.value)} />
      <label className="rotulo">Gancho</label><input type="text" value={f.gancho} onChange={(e) => campo("gancho", e.target.value)} />
      <label className="rotulo">Ângulo e prática</label><textarea rows={3} value={f.angulo} onChange={(e) => campo("angulo", e.target.value)} />
      <label className="rotulo">Material pronto</label>
      <textarea rows={14} value={f.conteudo} onChange={(e) => campo("conteudo", e.target.value)} style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }} />
      <p className="ajuda">Carrossel: um slide por bloco, no padrão <b>**Slide 1 (gancho):** texto</b> e <b>**Slide 2 · Prática 1: título.**</b> com a explicação na linha de baixo. Reel: seção <b>## Teleprompter</b> com uma frase por linha.</p>
      <label className="rotulo">Legenda</label><textarea rows={7} value={f.legenda} onChange={(e) => campo("legenda", e.target.value)} />
      <label className="rotulo">Comentário fixado</label><input type="text" value={f.comentario_fixado ?? ""} onChange={(e) => campo("comentario_fixado", e.target.value || null)} />
      {aviso && <div className="aviso mt">{aviso}</div>}
      <div className="linha mt">
        <button type="button" className="btn p" onClick={async () => {
          setAviso("");
          try {
            const { id: _id, ...resto } = f;
            await salvarPost(p.id, resto); aoSalvar();
          } catch (e) { setAviso((e as Error).message); }
        }}>Salvar</button>
        <button type="button" className="btn s" onClick={async () => {
          if (!confirm("Apagar este post?")) return;
          await apagarPost(p.id); router.replace(`/empresa/conteudo?perfil=${p.perfil}`);
        }}>Apagar</button>
      </div>
    </details>
  );
}

function Post() {
  useEquipe();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { dados, recarregar } = useDados(async () => ({ post: id ? await lerPost(id) : null }), [id]);
  const p = dados?.post;
  useEffect(() => { if (p) document.title = `${p.titulo || "Post"} · magnética.hub`; }, [p]);
  if (!dados) return <Carregando />;
  if (!p) return <p className="mudo">Post não encontrado. <Link href="/empresa/conteudo">Voltar</Link></p>;

  const cfg = PERFIS[p.perfil];
  const slides = ehCarrossel(p.formato) ? lerSlides(p.conteudo) : [];
  const teleprompter = secao(p.conteudo, "Teleprompter");
  const proximo = STATUS_CASA[STATUS_CASA.indexOf(p.status) + 1] as StatusCasa | undefined;
  const t = taxaEnvio(p);

  return (
    <>
      <Link className="voltar" href={`/empresa/conteudo?perfil=${p.perfil}`}>← Conteúdo · {cfg.arroba}</Link>
      <Titulo titulo={p.titulo || p.gancho || "Post sem título"} sub={[p.data && `${DIAS_SEMANA[diaDaSemana(p.data)]} ${dia(p.data)}`, p.horario, p.formato, p.funcao, p.editoria].filter(Boolean).join(" · ")} />

      <div className="card mb">
        <div className="linha entre">
          <div className="linha" style={{ gap: 8 }}>
            <select value={p.status} style={{ width: "auto" }} onChange={async (e) => { await salvarPost(p.id, { status: e.target.value as StatusCasa }); recarregar(); }}>
              {STATUS_CASA.map((s) => <option key={s}>{s}</option>)}
            </select>
            {proximo && <button type="button" className="btn p peq" onClick={async () => { await salvarPost(p.id, { status: proximo }); recarregar(); }}>Marcar: {proximo}</button>}
          </div>
          <div className="linha" style={{ gap: 8 }}>
            {p.palavra_chave && <span className="chip">Palavra-chave: <b>{p.palavra_chave}</b></span>}
            {t != null && <span className="chip">Envios/alcance: <b>{t.toFixed(2).replace(".", ",")}%</b></span>}
            {p.notion_url && <a className="btn s peq" href={p.notion_url} target="_blank" rel="noopener noreferrer">Abrir no Notion</a>}
          </div>
        </div>
        {p.gancho && <p className="mt" style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", margin: "14px 0 4px" }}>{p.gancho}</p>}
        {p.angulo && <p className="mudo" style={{ margin: 0 }}>{p.angulo}</p>}
      </div>

      {slides.length > 0 && (
        <div className="card mb">
          <h2>Carrossel pronto</h2>
          <p className="mudo" style={{ fontSize: 14 }}>No modelo tweet validado do perfil, com o cabeçalho de {cfg.nome}. Baixe os PNGs e poste na ordem.</p>
          <CarrosselTweet slides={slides} nome={cfg.nome} arroba={cfg.arroba} avatar={cfg.avatar} arquivo={`carrossel-${(p.titulo || "post").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`} />
        </div>
      )}

      <div className="grade g2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="linha entre"><h2 style={{ margin: 0 }}>{slides.length ? "Texto dos slides" : "Roteiro"}</h2>{teleprompter && <Copiar texto={teleprompter} rotulo="Copiar teleprompter" />}</div>
          <div className="mt">{p.conteudo ? <Texto md={p.conteudo} /> : <p className="mudo">Ainda sem material. Use “Editar o post” para escrever ou colar.</p>}</div>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card">
            <div className="linha entre"><h2 style={{ margin: 0 }}>Legenda</h2>{p.legenda && <Copiar texto={p.legenda} rotulo="Copiar legenda" />}</div>
            <p className="mt" style={{ whiteSpace: "pre-wrap", margin: "12px 0 0" }}>{p.legenda || <span className="mudo">Sem legenda ainda.</span>}</p>
          </div>
          {p.comentario_fixado && (
            <div className="card">
              <div className="linha entre"><h2 style={{ margin: 0 }}>Comentário fixado</h2><Copiar texto={p.comentario_fixado} rotulo="Copiar" /></div>
              <p className="mt" style={{ margin: "12px 0 0" }}>{p.comentario_fixado}</p>
            </div>
          )}
          {p.status === "Postado" && (
            <div className="card">
              <h2>Resultado</h2>
              <div className="grade g2" style={{ gap: "0 12px" }}>
                <div><label className="rotulo">Alcance</label><input type="number" min={0} defaultValue={p.alcance ?? ""} onBlur={async (e) => { await salvarPost(p.id, { alcance: e.target.value ? Number(e.target.value) : null }); recarregar(); }} /></div>
                <div><label className="rotulo">Envios</label><input type="number" min={0} defaultValue={p.envios ?? ""} onBlur={async (e) => { await salvarPost(p.id, { envios: e.target.value ? Number(e.target.value) : null }); recarregar(); }} /></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Editar key={p.id + p.status + p.conteudo.length + p.legenda.length} p={p} aoSalvar={recarregar} />
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Post /></Suspense>;
}
