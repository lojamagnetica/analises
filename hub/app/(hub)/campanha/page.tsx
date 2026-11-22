"use client";

// Sua campanha: a casa da campanha da loja. Antes (uma vez só), Semanas (semana a semana) e Resultado.
// As abas abrem por etapa (loja_campanhas.abas): a Camilla libera a próxima depois de testar a anterior.
import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { antesFeitos, buscarCampanhaAtiva, marcarCampanha, semanaDaCampanha, type Aba, type Campanha } from "@/lib/campanha";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "antes", rotulo: "1 · Antes" },
  { id: "semanas", rotulo: "2 · Semanas" },
  { id: "resultado", rotulo: "3 · Resultado" },
];

export default function SuaCampanha() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(() => buscarCampanhaAtiva(portal.id), [portal.id]);
  const [aba, setAba] = useState<Aba>("antes");
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
      ) : (
        <div className="card"><p className="mudo" style={{ margin: 0 }}>Em preparação.</p></div>
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
