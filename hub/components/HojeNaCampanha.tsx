"use client";

// Modo campanha do Início: a campanha no topo (dentro do herói) e o "Hoje na campanha".
import Link from "next/link";
import { useState } from "react";
import { dataCurta, hoje } from "@/lib/formato";
import { itensDeHoje, marcarCampanha, semanaDaCampanha, type Campanha } from "@/lib/campanha";
import type { Post } from "@/lib/instagram";

/** O bloco da campanha dentro do herói: nome, semana, o destaque de hoje e o botão para a página da campanha. */
export function CampanhaNoTopo({ c }: { c: Campanha }) {
  const s = semanaDaCampanha(c);
  const destaque = c.dias[hoje()]?.destaque;
  return (
    <Link href="/campanha" className="campanha">
      <small>🎁 {c.chamada || "Sua campanha"}</small>
      <div className="nome">{c.nome}</div>
      <div style={{ fontSize: 13, opacity: 0.9 }}>
        {s.atual ? `Semana ${s.atual} de ${s.total} · ${dataCurta(s.ini).slice(0, 5)} a ${dataCurta(s.fim).slice(0, 5)}` : `Semana de preparo · começa em ${dataCurta(c.inicio).slice(0, 5)}`}
      </div>
      <div className="barra"><i style={{ width: `${Math.max(s.pct, 4)}%` }} /></div>
      {destaque && <div style={{ fontSize: 14, lineHeight: 1.4, marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: negrito(destaque) }} />}
      <span className="btn b peq">Abrir a campanha →</span>
    </Link>
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
