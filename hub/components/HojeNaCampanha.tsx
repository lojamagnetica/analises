"use client";

// Modo campanha do Início: a campanha no topo (dentro do herói) e o "Hoje na campanha".
import Link from "next/link";
import { useEffect, useState } from "react";
import { dataCurta, hoje } from "@/lib/formato";
import { coresDeHoje, itensDeHoje, marcarCampanha, semanaDaCampanha, subirFotoCampanha, tirarFotoCampanha, urlFotoCampanha, type Campanha } from "@/lib/campanha";
import { carregarFontes } from "@/lib/montador";
import type { Post } from "@/lib/instagram";

/** O bloco da campanha dentro do herói: com a identidade da campanha (cores e letras) e a moldura da foto da loja. */
export function CampanhaNoTopo({ c: inicial }: { c: Campanha }) {
  const [c, setC] = useState(inicial);
  const s = semanaDaCampanha(c);
  const destaque = c.dias[hoje()]?.destaque;
  const cores = coresDeHoje(c);
  const [url, setUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => { if (cores) carregarFontes(); }, [cores]);
  useEffect(() => { let vivo = true; if (c.foto) urlFotoCampanha(c.foto).then((u) => vivo && setUrl(u)); else setUrl(""); return () => { vivo = false; }; }, [c.foto]);
  const semana = s.atual ? `Semana ${s.atual} de ${s.total} · ${dataCurta(s.ini).slice(0, 5)} a ${dataCurta(s.fim).slice(0, 5)}` : `Semana de preparo · começa em ${dataCurta(c.inicio).slice(0, 5)}`;

  // Campanha sem identidade cadastrada: o bloco simples, com as cores do Hub.
  if (!cores) {
    return (
      <Link href="/campanha" className="campanha">
        <small>🎁 {c.chamada || "Sua campanha"}</small>
        <div className="nome">{c.nome}</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>{semana}</div>
        <div className="barra"><i style={{ width: `${Math.max(s.pct, 4)}%` }} /></div>
        {destaque && <div style={{ fontSize: 14, lineHeight: 1.4, marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: negrito(destaque) }} />}
        <span className="btn b peq">Abrir a campanha →</span>
      </Link>
    );
  }

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setEnviando(true); setErro("");
    try { const foto = await subirFotoCampanha(c, arquivo); setC({ ...c, foto }); } catch (e) { setErro((e as Error).message); }
    setEnviando(false);
  };
  const tirar = async () => {
    if (!confirm("Tirar a foto da campanha?")) return;
    setErro("");
    try { await tirarFotoCampanha(c); setC({ ...c, foto: null }); } catch (e) { setErro((e as Error).message); }
  };
  return (
    <div className="campanha com-visual" style={{ ["--cf" as string]: cores.fundo, ["--ct" as string]: cores.texto, ["--cc" as string]: cores.cor }}>
      <small>{c.chamada || "Sua campanha"}</small>
      <div className="nome">{c.nome}</div>
      <div className="corpo">
        <div className="texto">
          <div className="semana">{semana}</div>
          <div className="barra"><i style={{ width: `${Math.max(s.pct, 4)}%` }} /></div>
          {destaque && <div className="hoje" dangerouslySetInnerHTML={{ __html: negrito(destaque).replace(/<\/?b>/g, "") }} />}
          <Link href="/campanha" className="btn peq abrir">Abrir a campanha →</Link>
        </div>
        <div className="foto-c">
          <label className={`moldura${url ? " cheia" : ""}`} title={url ? "Trocar a foto" : "Pôr a foto da campanha"}>
            {url ? <img src={url} alt={`Foto da campanha ${c.nome}`} /> : <span><b>＋</b>{enviando ? "Enviando…" : <>Foto da<br />campanha</>}</span>}
            <input type="file" accept="image/*" hidden onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {url && <button className="tirar" onClick={tirar}>tirar</button>}
        </div>
      </div>
      {erro && <div className="ajuda" style={{ color: "var(--cc)" }}>{erro}</div>}
    </div>
  );
}

/** "Hoje na campanha": os passos do dia, os posts do dia e o que falta do Antes, cada um com o botão para onde se resolve. */
export function HojeNaCampanha({ c, posts }: { c: Campanha; posts: Pick<Post, "id" | "data" | "tema" | "formato" | "status" | "fazer" | "imagens">[] }) {
  const [feitos, setFeitos] = useState(c.feitos);
  const [erro, setErro] = useState("");
  const itens = itensDeHoje({ ...c, feitos }, posts);
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(new Date(`${hoje()}T12:00:00Z`));
  const marcar = async (chave: string, feito: boolean) => {
    const antes = feitos; setErro("");
    setFeitos(feito ? { ...antes, [chave]: hoje() } : Object.fromEntries(Object.entries(antes).filter(([k]) => k !== chave)));
    try { setFeitos(await marcarCampanha(c.id, chave, feito)); } catch (e) { setFeitos(antes); setErro((e as Error).message); }
  };
  return (
    <div className="card card-borda mt" style={{ ["--c" as string]: "var(--red)" }}>
      <h3 style={{ margin: "0 0 4px" }}>Hoje na campanha · {semana}, {dataCurta(hoje()).slice(0, 5)}</h3>
      {erro && <div className="aviso">{erro}</div>}
      {!itens.length && <p className="mudo" style={{ margin: 0 }}>Nada da campanha para hoje. Aproveite para adiantar a semana em <Link className="link-loja" href="/campanha">Sua campanha</Link>.</p>}
      {itens.map((it) => (
        <div key={it.chave} className="item-c">
          {/* Post: o feito vem do status "Publicado", marcado na página do post. */}
          {it.post
            ? <span className={`num-c${it.feito ? " ok" : ""}`} style={{ cursor: "default", flexBasis: 26, width: 26, height: 26 }}>{it.feito ? "✓" : ""}</span>
            : <button className={`num-c${it.feito ? " ok" : ""}`} style={{ flexBasis: 26, width: 26, height: 26 }} onClick={() => marcar(it.chave, !it.feito)} aria-label={it.feito ? `Desmarcar: ${it.titulo}` : `Marcar como feito: ${it.titulo}`}>{it.feito ? "✓" : ""}</button>}
          <div className="t">
            <span style={it.feito ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>{it.titulo}</span>
            {it.texto && !it.feito && <small>{it.texto}</small>}
          </div>
          {!it.feito && <Link className={`btn ${it.botao === "Fazer" ? "p" : "s"} peq`} href={it.link}>{it.botao}</Link>}
        </div>
      ))}
    </div>
  );
}

// Destaque do dia pode ter **negrito**; o resto vai como texto.
const negrito = (t: string) => t.replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]!)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
