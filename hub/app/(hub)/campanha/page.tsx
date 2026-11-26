"use client";

// Sua campanha: a casa da campanha da loja. Antes (uma vez só), Semanas (semana a semana) e Resultado.
// As abas abrem por etapa (loja_campanhas.abas): a Camilla libera a próxima depois de testar a anterior.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { antesFeitos, buscarCampanhaAtiva, buscarPostsDaCampanha, itensDoDia, marcarCampanha, semanaDaCampanha, semanasDaCampanha, type Aba, type Campanha } from "@/lib/campanha";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "antes", rotulo: "1 · Antes" },
  { id: "semanas", rotulo: "2 · Semanas" },
  { id: "resultado", rotulo: "3 · Resultado" },
];

export default function SuaCampanha() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(() => buscarCampanhaAtiva(portal.id), [portal.id]);
  // Ao voltar de um post (botão Fazer), reabre a mesma aba e a mesma semana, no mesmo ponto da página.
  const [volta] = useState<{ aba: Aba; semana: number; y: number } | null>(() => {
    try { const v = sessionStorage.getItem("campanha-volta"); sessionStorage.removeItem("campanha-volta"); return v ? JSON.parse(v) : null; } catch { return null; }
  });
  const [aba, setAba] = useState<Aba>(volta?.aba ?? "antes");
  const [feitos, setFeitos] = useState<Record<string, string> | null>(null);
  const [erro, setErro] = useState("");
  if (dados === undefined) return <Carregando />;
  const voltar = { href: "/inicio", rotulo: "Início" };
  if (!dados) {
    return (
      <>
        <Titulo titulo="Sua campanha" voltar={voltar} />
        <div className="card"><p className="mudo" style={{ margin: 0 }}>Nenhuma campanha valendo agora. Quando a Camilla aprovar a próxima, ela aparece aqui e no topo do seu Início.</p></div>
      </>
    );
  }
  const c: Campanha = { ...dados, feitos: feitos ?? dados.feitos };
  const s = semanaDaCampanha(c);
  const aberta = (a: Aba) => c.abas.includes(a);

  const marcar = async (chave: string, feito: boolean) => {
    setErro("");
    const antes = c.feitos;
    setFeitos(feito ? { ...antes, [chave]: "hoje" } : Object.fromEntries(Object.entries(antes).filter(([k]) => k !== chave)));
    try { setFeitos(await marcarCampanha(c.id, chave, feito)); } catch (e) { setFeitos(antes); setErro((e as Error).message); }
  };

  return (
    <>
      <Titulo titulo={`Sua campanha · ${c.nome}`} aba="Sua campanha" voltar={voltar}
        sub={<>{dataCurta(c.inicio).slice(0, 5)} a {dataCurta(c.fim).slice(0, 5)}{s.atual ? ` · semana ${s.atual} de ${s.total}` : " · semana de preparo"}{c.aprovada_em ? ` · aprovada pela Camilla em ${dataCurta(c.aprovada_em).slice(0, 5)}` : ""}</>} />
      {equipe && c.status === "rascunho" && <div className="aviso mb">Rascunho: a loja ainda não vê esta campanha.</div>}
      {erro && <div className="aviso mb">{erro}</div>}

      <div className="abas-campanha">
        {ABAS.map((a) => (
          <button key={a.id} className={`aba-c${aba === a.id ? " on" : ""}`} onClick={() => setAba(a.id)}>
            {a.rotulo}{aberta(a.id) ? "" : " 🔒"}
          </button>
        ))}
      </div>

      {!aberta(aba) ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Essa parte abre em breve 🔒</h3>
          <p className="mudo" style={{ margin: 0 }}>
            Primeiro, deixe pronto o que está em <b>Antes</b>. A Camilla libera {aba === "semanas" ? "o passo a passo de cada semana" : "o resultado da campanha"} logo depois.
          </p>
          {aba !== "antes" && <button className="btn s peq mt" onClick={() => setAba("antes")}>Ir para o Antes</button>}
        </div>
      ) : aba === "antes" ? (
        <Antes c={c} marcar={marcar} />
      ) : aba === "semanas" ? (
        <Semanas c={c} marcar={marcar} volta={volta} />
      ) : (
        <div className="card"><p className="mudo" style={{ margin: 0 }}>O resultado da campanha aparece aqui quando ela terminar: as vendas do período e o que funcionou.</p></div>
      )}

      <p className="ajuda">Travou em algum passo? Toque em <Link className="link-loja" href="/assistente">Fale com a Camilla</Link> e diga qual.</p>
    </>
  );
}

function Antes({ c, marcar }: { c: Campanha; marcar: (chave: string, feito: boolean) => void }) {
  const feitos = antesFeitos(c);
  const total = c.antes.length;
  return (
    <div className="card card-borda" style={{ ["--c" as string]: feitos === total ? "var(--feito)" : "var(--red)" }}>
      <div className="linha entre" style={{ alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{feitos === total ? "Tudo pronto para começar! 🎉" : "Faça uma vez, antes da semana 1"}</h3>
        <span className={`selo ${feitos === total ? "feito" : "andamento"}`}>{feitos} de {total}</span>
      </div>
      <div className="barra" style={{ margin: "10px 0 4px" }}><i style={{ width: `${total ? (feitos / total) * 100 : 0}%` }} /></div>
      <p className="ajuda" style={{ margin: "0 0 6px" }}>Toque no número quando terminar o passo. Errou? Toque de novo para desmarcar.</p>
      {c.antes.map((p, i) => {
        const feito = !!c.feitos[p.id];
        const externo = !!p.link && /^https?:/.test(p.link);
        return (
          <div key={p.id} className="passo-c">
            <button className={`num-c${feito ? " ok" : ""}`} onClick={() => marcar(p.id, !feito)} aria-label={feito ? `Desmarcar: ${p.titulo}` : `Marcar como feito: ${p.titulo}`}>
              {feito ? "✓" : i + 1}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={feito ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>{p.titulo}</b>
              {(p.texto || p.ate) && <div className="mudo" style={{ fontSize: 13, margin: "2px 0 0" }}>{p.ate && !feito ? <b style={{ color: "var(--red)" }}>Até {p.ate}. </b> : null}{p.texto}</div>}
              {p.link && !feito && (
                externo
                  ? <a className="btn s peq mt" style={{ marginTop: 8 }} href={p.link} target="_blank" rel="noopener">{p.botao || "Abrir"}</a>
                  : <Link className="btn s peq" style={{ marginTop: 8 }} href={p.link}>{p.botao || "Abrir"}</Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Semanas: o foco de cada semana e, dia a dia, o que postar e o que fazer, cada um com o botão para onde se resolve.
function Semanas({ c, marcar, volta }: { c: Campanha; marcar: (chave: string, feito: boolean) => void; volta: { semana: number; y: number } | null }) {
  const { portal, equipe } = usePortal();
  // Semana que começa depois de portal.conteudo_ate fica fechada para a loja (a Camilla abre semana a semana).
  const fechada = (ini: string) => !!portal.conteudo_ate && ini > portal.conteudo_ate;
  const { dados: posts } = useDados(() => buscarPostsDaCampanha(c), [c.id]);
  const atual = semanaDaCampanha(c).atual;
  const [aberta, setAberta] = useState<number>(volta?.semana ?? (atual || 1));
  useEffect(() => { if (posts !== undefined && volta) requestAnimationFrame(() => window.scrollTo(0, volta.y)); }, [posts, volta]);
  if (posts === undefined) return <Carregando />;
  const guardar = () => { try { sessionStorage.setItem("campanha-volta", JSON.stringify({ aba: "semanas", semana: aberta, y: window.scrollY })); } catch { /* sem memória da aba */ } };
  const semanas = semanasDaCampanha(c);
  return (
    <>
      <p className="ajuda">Semana a semana: o foco, o que postar em cada dia e o que fazer na loja. Toque na semana para abrir os dias.</p>
      {semanas.map((s) => {
        const foco = c.dias[`semana-${s.n}`]?.destaque;
        const itens = s.dias.flatMap((d) => itensDoDia(c, posts ?? [], d));
        const feitos = itens.filter((i) => i.feito).length;
        if (fechada(s.ini) && !equipe) {
          return (
            <div key={s.n} className="card card-borda mb" style={{ ["--c" as string]: "var(--line)", opacity: 0.75 }}>
              <div className="linha entre"><b>Semana {s.n} · {dataCurta(s.ini).slice(0, 5)} a {dataCurta(s.fim).slice(0, 5)}</b><span className="selo espera">🔒 em preparo</span></div>
              <p className="mudo" style={{ margin: "6px 0 0", fontSize: 13.5 }}>A Camilla abre esta semana com tudo pronto antes de ela começar.</p>
            </div>
          );
        }
        const aberto = aberta === s.n;
        const agora = s.n === atual;
        return (
          <div key={s.n} className="card card-borda mb" style={{ ["--c" as string]: agora ? "var(--red)" : "var(--line)" }}>
            <button type="button" onClick={() => setAberta(aberto ? -1 : s.n)} className="linha entre"
              style={{ width: "100%", background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit" }}>
              <b>{s.n ? `Semana ${s.n}` : "Preparo"} · {dataCurta(s.ini).slice(0, 5)} a {dataCurta(s.fim).slice(0, 5)}</b>
              <span className="linha" style={{ gap: 8 }}>
                {agora && <span className="selo andamento">esta semana</span>}
                {fechada(s.ini) && equipe && <span className="selo espera">🔒 fechada para a loja</span>}
                {itens.length > 0 && <small className="mudo">{feitos} de {itens.length}</small>}
                <span aria-hidden>{aberto ? "▾" : "▸"}</span>
              </span>
            </button>
            {foco && <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-line" }} dangerouslySetInnerHTML={{ __html: negrito(foco) }} />}
            {aberto && s.dias.map((d) => {
              const its = itensDoDia(c, posts ?? [], d);
              const dest = c.dias[d]?.destaque;
              if (!its.length && !dest) return null;
              return (
                <div key={d} style={{ marginTop: 14 }}>
                  <div className="secao" style={{ margin: "0 0 4px", textTransform: "capitalize" }}>{diaDaSemana(d)}, {dataCurta(d).slice(0, 5)}</div>
                  {dest && <div style={{ fontSize: 14, lineHeight: 1.4, marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: negrito(dest) }} />}
                  {its.map((it) => (
                    <div key={it.chave} className="item-c">
                      {it.post
                        ? <span className={`num-c${it.feito ? " ok" : ""}`} style={{ cursor: "default", flexBasis: 26, width: 26, height: 26 }}>{it.feito ? "✓" : ""}</span>
                        : <button className={`num-c${it.feito ? " ok" : ""}`} style={{ flexBasis: 26, width: 26, height: 26 }} onClick={() => marcar(it.chave, !it.feito)} aria-label={it.feito ? `Desmarcar: ${it.titulo}` : `Marcar como feito: ${it.titulo}`}>{it.feito ? "✓" : ""}</button>}
                      <div className="t">
                        <span style={it.feito ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>{it.titulo}</span>
                        {it.texto && !it.feito && <small>{it.texto}</small>}
                      </div>
                      {!it.feito && <Link className={`btn ${it.botao === "Fazer" ? "p" : "s"} peq`} href={it.post ? `${it.link}&de=campanha` : it.link} onClick={guardar}>{it.botao}</Link>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

const diaDaSemana = (d: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(new Date(`${d}T12:00:00Z`));
// O foco e o destaque podem ter **negrito**; o resto vai como texto.
const negrito = (t: string) => t.replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]!)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
