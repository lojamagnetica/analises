"use client";

// Página do post da loja, no mesmo jeito do calendário da Camilla:
// o que falta fazer (quando falta) → arquivos prontos para baixar → roteiro → legenda → postado → resultado.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia } from "@/lib/formato";
import {
  DIAS_SEMANA, OBJETIVOS, STATUS, diaDaSemana, ehVideo, lerPostLoja, postApagar, postImagemBaixar, postImagemSubir, postImagemTirar,
  postImagemUrl, postSalvar, type ImagemPost, type Post,
} from "@/lib/instagram";

/** Arquivos prontos (imagens e vídeos). A loja também sobe o que aprovou por fora. */
function Arquivos({ p, aoMudar }: { p: Post; aoMudar: () => void }) {
  const itens = p.imagens ?? [];
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let vivo = true;
    Promise.all(itens.map(async (i) => [i.path, await postImagemUrl(i.path)] as const)).then((xs) => { if (vivo) setUrls(Object.fromEntries(xs)); });
    return () => { vivo = false; };
  }, [p.imagens]); // eslint-disable-line react-hooks/exhaustive-deps
  const salvarLista = async (lista: ImagemPost[]) => { await postSalvar(p.id, { imagens: lista }); aoMudar(); };
  const subir = async (fs: FileList | null) => {
    if (!fs?.length) return; setMsg("Subindo…");
    try { const novos: ImagemPost[] = []; for (const f of Array.from(fs)) novos.push(await postImagemSubir(p.portal_id, p.id, f)); await salvarLista([...itens, ...novos]); setMsg(""); }
    catch (e) { setMsg((e as Error).message); }
  };
  const tirar = async (i: ImagemPost) => {
    if (!confirm("Tirar este arquivo do post? Não dá para desfazer.")) return;
    try { await postImagemTirar(i); await salvarLista(itens.filter((x) => x.path !== i.path)); } catch (e) { setMsg((e as Error).message); }
  };
  const mover = async (k: number, d: -1 | 1) => {
    const l = [...itens]; const j = k + d; if (j < 0 || j >= l.length) return; [l[k], l[j]] = [l[j], l[k]]; await salvarLista(l);
  };
  const salvarTodas = async () => {
    setMsg("Preparando os arquivos…");
    try {
      const fs = await Promise.all(itens.map(async (i) => { const b = await (await fetch(await postImagemUrl(i.path))).blob(); return new File([b], i.nome, { type: b.type }); }));
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: fs })) { await nav.share({ files: fs }); setMsg(""); return; }
      for (const i of itens) { await postImagemBaixar(i); await new Promise((r) => setTimeout(r, 350)); }
      setMsg("");
    } catch (e) { setMsg((e as Error).name === "AbortError" ? "" : "Não consegui baixar agora. Toque e segure em cada imagem para salvar."); }
  };
  return (
    <div className="card mb">
      <div className="linha entre">
        <h2 style={{ margin: 0 }}>{itens.length ? "Pronto para postar" : "Arquivos do post"}</h2>
        {itens.length > 0 && <button type="button" className="btn p peq" onClick={salvarTodas}>Salvar no celular ({itens.length})</button>}
      </div>
      <p className="mudo" style={{ fontSize: 14 }}>
        {itens.length
          ? "Na ordem de postagem. No celular, o botão abre o compartilhar: escolha “Salvar imagens”. Também dá para tocar e segurar em cada uma."
          : "Ainda não tem arquivo neste post. Se você aprovou uma arte ou um vídeo por fora, suba aqui para ficar tudo junto."}
      </p>
      {msg && <div className="aviso">{msg}</div>}
      {itens.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 10 }}>
          {itens.map((i, k) => (
            <div key={i.path} style={{ display: "grid", gap: 4 }}>
              {urls[i.path]
                ? ehVideo(i.nome)
                  ? <video src={urls[i.path]} controls playsInline style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 8, background: "#000" }} />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={urls[i.path]} alt={`Arquivo ${k + 1}`} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 8, border: "1px solid var(--linha, #e5e0d8)" }} />
                : <div style={{ width: "100%", aspectRatio: "4 / 5", background: "#e8e4dc", borderRadius: 8 }} />}
              <button type="button" className="btn s peq" onClick={() => postImagemBaixar(i).catch((e) => setMsg(e.message))}>Baixar {k + 1}</button>
              <div className="linha entre" style={{ fontSize: 11.5 }}>
                <span className="linha" style={{ gap: 6 }}>
                  {k > 0 && <button type="button" className="link-loja" onClick={() => mover(k, -1)} aria-label="Mover para antes">←</button>}
                  {k < itens.length - 1 && <button type="button" className="link-loja" onClick={() => mover(k, 1)} aria-label="Mover para depois">→</button>}
                </span>
                <button type="button" className="link-loja" onClick={() => tirar(i)}>excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <label className="btn s peq mt" style={{ display: "inline-block", cursor: "pointer" }}>
        {itens.length ? "Adicionar arquivo" : "Subir arquivo"}
        <input type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { subir(e.target.files); e.target.value = ""; }} />
      </label>
    </div>
  );
}

function Editar({ p, aoSalvar }: { p: Post; aoSalvar: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(p);
  const [aviso, setAviso] = useState("");
  const campo = <K extends keyof Post>(k: K, v: Post[K]) => setF({ ...f, [k]: v });
  const salvar = async () => {
    setAviso("");
    try {
      const { id: _i, portal_id: _p, created_at: _c, imagens: _m, ...resto } = f;
      await postSalvar(p.id, resto); setAviso("Salvo."); aoSalvar();
    } catch (e) { setAviso((e as Error).message); }
  };
  return (
    <details className="card mb">
      <summary style={{ cursor: "pointer" }}><b>Editar o post</b></summary>
      <div className="grade g2 mt" style={{ gap: "0 8px" }}>
        <div><label className="rotulo">Dia</label><input type="date" value={f.data} onChange={(e) => campo("data", e.target.value)} /></div>
        <div><label className="rotulo">Horário</label><input type="time" value={f.hora ?? ""} onChange={(e) => campo("hora", e.target.value)} /></div>
        <div><label className="rotulo">Formato</label><input type="text" value={f.formato} onChange={(e) => campo("formato", e.target.value)} /></div>
        <div><label className="rotulo">Objetivo</label><select value={f.objetivo} onChange={(e) => campo("objetivo", e.target.value as Post["objetivo"])}>{OBJETIVOS.map((x) => <option key={x}>{x}</option>)}</select></div>
      </div>
      <label className="rotulo">Tema</label><input type="text" value={f.tema} onChange={(e) => campo("tema", e.target.value)} />
      <label className="rotulo">Gancho (falado e escrito na tela)</label><input type="text" value={f.gancho} onChange={(e) => campo("gancho", e.target.value)} />
      <label className="rotulo">O que você precisa fazer (um passo por linha; em branco quando o post já vai pronto)</label>
      <textarea rows={4} value={f.fazer ?? ""} onChange={(e) => campo("fazer", e.target.value)} />
      <label className="rotulo">Roteiro</label><textarea rows={6} value={f.roteiro} onChange={(e) => campo("roteiro", e.target.value)} />
      <label className="rotulo">Legenda</label><textarea rows={5} value={f.legenda} onChange={(e) => campo("legenda", e.target.value)} />
      {aviso && <div className="aviso mt">{aviso}</div>}
      <div className="linha mt" style={{ gap: 6 }}>
        <button type="button" className="btn p peq" onClick={salvar}>Salvar</button>
        <button type="button" className="btn s peq" onClick={async () => {
          if (!confirm("Apagar este post da programação? Não dá para desfazer.")) return;
          await postApagar(p.id); router.replace("/conteudo/semana");
        }}>Apagar</button>
      </div>
    </details>
  );
}

function PostDaLoja() {
  const { portal } = usePortal();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { dados, recarregar } = useDados(async () => ({ post: id ? await lerPostLoja(id) : null }), [id]);
  const p = dados?.post;
  useEffect(() => { if (p) document.title = `${p.gancho || p.tema || "Post"} · magnética.hub`; }, [p]);
  if (!dados) return <Carregando />;
  if (!p || p.portal_id !== portal.id) return <p className="mudo">Post não encontrado. <Link href="/conteudo/semana">Voltar</Link></p>;

  const proximo = STATUS[STATUS.indexOf(p.status) + 1];
  const passos = (p.fazer ?? "").split("\n").map((l) => l.replace(/^\s*[-•\d.)]+\s*/, "").trim()).filter(Boolean);
  const salvarNum = (k: "alcance" | "envios" | "salvamentos" | "vendas") => async (e: React.FocusEvent<HTMLInputElement>) => {
    await postSalvar(p.id, { [k]: e.target.value ? Number(e.target.value) : null }); recarregar();
  };

  return (
    <>
      <Link className="voltar" href="/conteudo/semana">← Conteúdo da semana</Link>
      <Titulo titulo={p.gancho || p.tema || "Post"} sub={[`${DIAS_SEMANA[diaDaSemana(p.data)]} ${dia(p.data)}`, p.hora, p.formato].filter(Boolean).join(" · ")} />

      <div className="card mb">
        <div className="linha" style={{ gap: 8 }}>
          <select value={p.status} style={{ width: "auto" }} onChange={async (e) => { await postSalvar(p.id, { status: e.target.value as Post["status"] }); recarregar(); }}>
            {STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
          {proximo && <button type="button" className="btn p peq" onClick={async () => { await postSalvar(p.id, { status: proximo }); recarregar(); }}>Marcar: {proximo}</button>}
        </div>
        {p.tema && p.gancho && <p className="mudo" style={{ margin: "10px 0 0" }}>{p.tema}</p>}
      </div>

      {passos.length > 0 && p.status !== "Publicado" && (
        <div className="card mb card-borda" style={{ ["--c" as string]: "var(--orange)" }}>
          <h2 style={{ marginTop: 0 }}>O que você precisa fazer</h2>
          <ol style={{ margin: "4px 0 0 18px", padding: 0, display: "grid", gap: 6 }}>{passos.map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      )}

      <Arquivos p={p} aoMudar={recarregar} />

      {p.roteiro && (
        <div className="card mb">
          <div className="linha entre"><h2 style={{ margin: 0 }}>Roteiro</h2><Copiar texto={p.roteiro} rotulo="Copiar roteiro" /></div>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>{p.roteiro}</div>
        </div>
      )}

      <div className="card mb">
        <div className="linha entre"><h2 style={{ margin: 0 }}>Legenda</h2>{p.legenda && <Copiar texto={p.legenda} rotulo="Copiar legenda" />}</div>
        {p.legenda ? <div style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>{p.legenda}</div> : <p className="mudo">Sem legenda ainda. Escreva em “Editar o post”.</p>}
      </div>

      {p.status === "Publicado" && (
        <div className="card mb">
          <h2>Resultado</h2>
          <p className="mudo" style={{ fontSize: 14 }}>Dois ou três dias depois de postar, anote o que o Instagram mostra.</p>
          <div className="grade g4" style={{ gap: "0 8px" }}>
            <div><label className="rotulo">Alcance</label><input type="number" min={0} defaultValue={p.alcance ?? ""} onBlur={salvarNum("alcance")} /></div>
            <div><label className="rotulo">Envios</label><input type="number" min={0} defaultValue={p.envios ?? ""} onBlur={salvarNum("envios")} /></div>
            <div><label className="rotulo">Salvamentos</label><input type="number" min={0} defaultValue={p.salvamentos ?? ""} onBlur={salvarNum("salvamentos")} /></div>
            <div><label className="rotulo">Vendas</label><input type="number" min={0} defaultValue={p.vendas ?? ""} onBlur={salvarNum("vendas")} /></div>
          </div>
        </div>
      )}

      <Editar key={p.id + p.status} p={p} aoSalvar={recarregar} />
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><PostDaLoja /></Suspense>;
}
