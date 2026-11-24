"use client";

// Página do post da loja, no mesmo jeito do calendário da Camilla:
// o que falta fazer (quando falta) → arquivos prontos para baixar → roteiro → legenda → postado → resultado.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { ModeloEditor } from "@/components/ModeloEditor";
import { lerModelo, listarModelos, type Modelo, type Valores } from "@/lib/modelos";
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
  const [editando, setEditando] = useState<{ img: ImagemPost; modelo: Modelo } | null>(null);
  // Montar aqui: os modelos da loja abrem dentro do post e o card pronto entra em "Pronto para postar".
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [criando, setCriando] = useState<Modelo | null>(null);
  const [outros, setOutros] = useState(false);
  // Rascunhos por modelo: trocar de modelo antes de salvar não perde as fotos nem o texto (fica guardado nesta aba do navegador).
  const chaveRasc = `rascunho-cards:${p.id}`;
  const [rascunhos, setRascunhos] = useState<Record<string, Valores>>(() => {
    try { return JSON.parse(sessionStorage.getItem(chaveRasc) ?? "{}"); } catch { return {}; }
  });
  const guardarRascunho = (id: string, val: Valores | null) => setRascunhos((r) => {
    const n = { ...r }; if (val) n[id] = val; else delete n[id];
    try { sessionStorage.setItem(chaveRasc, JSON.stringify(n)); } catch { /* foto grande demais para guardar: fica só na memória */ }
    return n;
  });
  useEffect(() => { listarModelos(p.portal_id).then(setModelos).catch(() => setModelos([])); }, [p.portal_id]);
  // Os modelos citados no roteiro, na ordem em que aparecem, vêm primeiro.
  const texto = `${p.roteiro ?? ""}\n${p.fazer ?? ""}`;
  const sugeridos = modelos.filter((m) => texto.includes(m.nome)).sort((a, b) => texto.indexOf(a.nome) - texto.indexOf(b.nome));
  const resto = modelos.filter((m) => !sugeridos.includes(m));
  const criarCard = async (png: Blob, valores: Valores) => {
    if (!criando) return;
    const base = `${String(itens.length + 1).padStart(2, "0")}-${criando.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").toLowerCase()}`;
    const novo = await postImagemSubir(p.portal_id, p.id, new File([png], `${base}.png`, { type: "image/png" }));
    await salvarLista([...itens, { ...novo, nome: `${base}.png`, modelo_id: criando.id, valores }]);
    guardarRascunho(criando.id, null);
    setCriando(null);
  };
  // Ver grande antes de baixar: toque na imagem abre em tela cheia, com as setas para passar.
  const [ver, setVer] = useState<number | null>(null);
  useEffect(() => {
    if (ver === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVer(null);
      if (e.key === "ArrowRight") setVer((v) => (v === null ? v : Math.min(itens.length - 1, v + 1)));
      if (e.key === "ArrowLeft") setVer((v) => (v === null ? v : Math.max(0, v - 1)));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ver, itens.length]);
  const abrirEditor = async (img: ImagemPost) => {
    if (!img.modelo_id) return;
    const m = await lerModelo(img.modelo_id);
    if (!m) { setMsg("Não encontrei o modelo deste card."); return; }
    setEditando({ img, modelo: m });
  };
  // Salva o card editado no lugar do antigo, na mesma posição.
  const salvarCard = async (png: Blob, valores: Valores) => {
    if (!editando) return;
    const base = editando.img.nome.replace(/\.[^.]+$/, "");
    const novo = await postImagemSubir(p.portal_id, p.id, new File([png], `${base}.png`, { type: "image/png" }));
    const item: ImagemPost = { ...novo, nome: `${base}.png`, modelo_id: editando.modelo.id, valores };
    await salvarLista(itens.map((x) => (x.path === editando.img.path ? item : x)));
    await postImagemTirar(editando.img).catch(() => null);
    setEditando(null);
  };
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
          ? "Na ordem de postagem. Toque na imagem para ver grande antes de baixar. No celular, o botão abre o compartilhar: escolha “Salvar imagens”."
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
                  : <img src={urls[i.path]} alt={`Arquivo ${k + 1}`} loading="lazy" onClick={() => setVer(k)} title="Ver grande" style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 8, border: "1px solid var(--linha, #e5e0d8)", cursor: "zoom-in" }} />
                : <div style={{ width: "100%", aspectRatio: "4 / 5", background: "#e8e4dc", borderRadius: 8 }} />}
              <button type="button" className="btn s peq" onClick={() => postImagemBaixar(i).catch((e) => setMsg(e.message))}>Baixar {k + 1}</button>
              {i.modelo_id && <button type="button" className="btn s peq" onClick={() => abrirEditor(i)}>Editar o card</button>}
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
      {ver !== null && itens[ver] && (
        <div role="dialog" aria-label={`Arquivo ${ver + 1} de ${itens.length}`} onClick={() => setVer(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(12,12,12,.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 12px 16px" }}>
          <button type="button" onClick={() => setVer(null)} aria-label="Fechar" style={{ position: "absolute", top: 10, right: 14, background: "none", border: 0, color: "#fff", fontSize: 30, cursor: "pointer" }}>×</button>
          <div style={{ position: "absolute", top: 18, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 14 }}>{ver + 1} de {itens.length}</div>
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: "100%", flex: 1, minHeight: 0 }}>
            <button type="button" onClick={() => setVer(Math.max(0, ver - 1))} disabled={ver === 0} aria-label="Anterior" style={{ background: "none", border: 0, color: "#fff", fontSize: 34, cursor: "pointer", opacity: ver === 0 ? 0.25 : 1 }}>‹</button>
            {ehVideo(itens[ver].nome)
              ? <video src={urls[itens[ver].path]} controls playsInline autoPlay style={{ maxWidth: "calc(100vw - 100px)", maxHeight: "calc(100vh - 140px)", borderRadius: 6, background: "#000" }} />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={urls[itens[ver].path]} alt={`Arquivo ${ver + 1}`} style={{ maxWidth: "calc(100vw - 100px)", maxHeight: "calc(100vh - 140px)", objectFit: "contain", borderRadius: 6 }} />}
            <button type="button" onClick={() => setVer(Math.min(itens.length - 1, ver + 1))} disabled={ver === itens.length - 1} aria-label="Próximo" style={{ background: "none", border: 0, color: "#fff", fontSize: 34, cursor: "pointer", opacity: ver === itens.length - 1 ? 0.25 : 1 }}>›</button>
          </div>
          <button type="button" className="btn p peq" style={{ marginTop: 12 }} onClick={(e) => { e.stopPropagation(); postImagemBaixar(itens[ver]).catch((er) => setMsg(er.message)); }}>Baixar {ver + 1}</button>
        </div>
      )}
      {editando && (
        <div className="card mt" style={{ borderColor: "var(--accent, #7A1E2A)" }}>
          <div className="linha entre"><b>Editar o card · {editando.modelo.nome}</b></div>
          <p className="mudo" style={{ fontSize: 13.5 }}>Troque o texto e veja o card mudar ao lado. Ao salvar, o card novo entra no lugar deste, na mesma ordem.</p>
          <ModeloEditor key={editando.img.path} modelo={editando.modelo} inicial={editando.img.valores} aoSalvar={salvarCard} aoFechar={() => setEditando(null)} />
        </div>
      )}
      {modelos.length > 0 && !editando && (
        <div className="mt" style={{ borderTop: "1px solid var(--line, #e5e0d8)", paddingTop: 12 }}>
          <b>Montar aqui no Hub</b>
          <p className="mudo" style={{ fontSize: 13.5, margin: "4px 0 8px" }}>Toque no modelo, coloque as suas fotos e o texto e salve: o card entra em “Pronto para postar”, na ordem. Monte um slide de cada vez.</p>
          <div className="chips">
            {sugeridos.map((m, k) => <button key={m.id} type="button" className={`chip${criando?.id === m.id ? " on" : ""}`} onClick={() => setCriando(m)}>{sugeridos.length > 1 ? `${k + 1} · ` : ""}{m.nome.replace(/^[^·]+·\s*/, "")}{rascunhos[m.id] ? " · não salvo" : ""}</button>)}
            {(outros || !sugeridos.length) && resto.map((m) => <button key={m.id} type="button" className={`chip${criando?.id === m.id ? " on" : ""}`} onClick={() => setCriando(m)}>{m.nome}{rascunhos[m.id] ? " · não salvo" : ""}</button>)}
            {sugeridos.length > 0 && resto.length > 0 && !outros && <button type="button" className="chip" onClick={() => setOutros(true)}>Outros modelos</button>}
          </div>
          {criando && (
            <div className="card mt" style={{ borderColor: "var(--accent, #7A1E2A)" }}>
              <b>{criando.nome}</b>
              {rascunhos[criando.id] && <p className="mudo" style={{ fontSize: 13, margin: "4px 0 0" }}>Voltou de onde você parou. Toque em “Salvar no post” para o card entrar em “Pronto para postar”.</p>}
              <ModeloEditor key={criando.id} modelo={criando} rascunho={rascunhos[criando.id]} aoMudar={(val) => guardarRascunho(criando.id, val)} aoSalvar={criarCard} aoFechar={() => setCriando(null)} />
            </div>
          )}
        </div>
      )}
      <label className="btn s peq mt" style={{ display: "inline-block", cursor: "pointer" }}>
        {itens.length ? "Adicionar arquivo" : "Subir arquivo pronto"}
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
      {params.get("de") === "campanha"
        ? <Link className="voltar" href="/campanha">← Voltar para a campanha</Link>
        : <Link className="voltar" href="/conteudo/semana">← Conteúdo da semana</Link>}
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
