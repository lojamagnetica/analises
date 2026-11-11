"use client";

// Controle de clientes: a porta de entrada da CS. Parece o Início do portal da loja: atalhos de tudo o que ela faz e usa,
// do que mais se usa (todo dia) ao que menos se usa (quando precisar).
import Link from "next/link";
import { useEffect } from "react";
import { Titulo } from "@/components/Titulo";
import { Icone } from "@/components/Icone";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { painelCs } from "@/lib/cs";
import { dataHora } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

type Atalho = { href: string; rotulo: string; icone: string; so?: "monta" };
const BLOCOS: { titulo: string; sub: string; atalhos: Atalho[] }[] = [
  {
    titulo: "Todo dia", sub: "A rotina da manhã e da tarde, nesta ordem.",
    atalhos: [
      { href: "/empresa/cs", rotulo: "Faça agora", icone: "target" },
      { href: "/empresa/caixa-do-dia", rotulo: "Caixa do dia", icone: "inbox", so: "monta" },
      { href: "/equipe/duvidas", rotulo: "Fale com a Camilla", icone: "chat" },
      { href: "/empresa/acompanhamento", rotulo: "Lojas que precisam de atenção", icone: "heart" },
      { href: "/equipe/pendencias", rotulo: "Pendências por cliente", icone: "check" },
      { href: "/empresa/novidades", rotulo: "Novidades das lojas", icone: "bolt" },
    ],
  },
  {
    titulo: "Toda semana", sub: "Jornada, gamificação e o que vai para a Camilla.",
    atalhos: [
      { href: "/equipe/central", rotulo: "Jornada das clientes", icone: "kanban" },
      { href: "/equipe/programa", rotulo: "Programa Brasil", icone: "gift" },
      { href: "/equipe/planos", rotulo: "Planos do mês", icone: "note", so: "monta" },
      { href: "/equipe/reunioes", rotulo: "Reuniões", icone: "cal" },
      { href: "/equipe/aprovar", rotulo: "Esperando a Camilla", icone: "send", so: "monta" },
    ],
  },
  {
    titulo: "Quando precisar", sub: "Ensinar, preparar e consultar.",
    atalhos: [
      { href: "/empresa/carteira", rotulo: "Gestão de Clientes", icone: "users" },
      { href: "/equipe/guias", rotulo: "Guias em vídeo", icone: "play" },
      { href: "/empresa/minha-central/diagnostico", rotulo: "Preparar diagnóstico", icone: "spark", so: "monta" },
      { href: "/equipe/acoes", rotulo: "Ações do Mês", icone: "compass", so: "monta" },
      { href: "/empresa/historias", rotulo: "Histórias das lojas", icone: "book" },
      { href: "/equipe/gincanas", rotulo: "Gincanas", icone: "hand", so: "monta" },
      { href: "/empresa/agentes", rotulo: "Agentes", icone: "robot", so: "monta" },
    ],
  },
];

export default function ControleDeClientes() {
  const { nome, monta } = useEquipe();
  const { dados, recarregar } = useDados(() => painelCs(), []);
  useEffect(() => { document.title = "Controle de clientes · magnética.hub"; }, []);
  if (!dados) return <Carregando />;
  const hoje = dados.lojas.filter((l) => l.nivel === "vermelho").length;
  const atencao = dados.lojas.filter((l) => l.nivel === "amarelo").length;
  const aviso = (href: string) => (href === "/empresa/cs" && hoje > 0 ? `${hoje} ${hoje === 1 ? "loja precisa" : "lojas precisam"} de você` : href === "/empresa/acompanhamento" && atencao > 0 ? `${atencao} em atenção` : null);
  return (
    <>
      <Titulo titulo={`Bom dia${nome ? `, ${nome.split(" ")[0]}` : ""}`} sub={`Controle de clientes: ${dados.lojas.length} ${dados.lojas.length === 1 ? "loja acompanhada" : "lojas acompanhadas"}${dados.aCaminho.length ? `, ${dados.aCaminho.length} a caminho` : ""}. ${hoje ? `${hoje} ${hoje === 1 ? "precisa" : "precisam"} de você hoje.` : "Todas em dia por enquanto."}`} />
      {BLOCOS.map((b) => (
        <section key={b.titulo}>
          <div className="secao">{b.titulo}</div>
          <p className="ajuda" style={{ marginTop: 0 }}>{b.sub}</p>
          <div className="atalhos mb">
            {b.atalhos.filter((a) => !a.so || monta).map((a) => {
              const av = aviso(a.href);
              return (
                <Link key={a.href} href={a.href} className={`atalho${av ? " novo" : ""}`}>
                  <span className="quadrado"><Icone nome={a.icone} /></span>
                  {a.rotulo}
                  {av && <small className="novidade">{av}</small>}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {dados.aCaminho.length > 0 && (
        <>
          <div className="secao">A caminho do acompanhamento</div>
          <p className="ajuda" style={{ marginTop: 0 }}>Estas lojas ainda estão na reunião de entrega e não entram nos alertas nem nas pendências. Depois da reunião, registre os combinados: a loja passa para o acompanhamento sozinha.</p>
          <div className="card mb">
            {dados.aCaminho.map((l, i) => (
              <div key={l.id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: i ? "1px solid var(--line)" : 0 }}>
                <span><b>{l.loja}</b> <span className="mudo">· {l.proxReuniao ? `reunião ${dataHora(l.proxReuniao)}` : "sem reunião marcada"}</span></span>
                <span className="linha" style={{ gap: 8, flexWrap: "wrap" }}><Link className="btn s peq" href={`/equipe/entrega?id=${l.id}`}>Combinados da reunião</Link>
                {monta && <button type="button" className="btn s peq" onClick={async () => {
                  if (!confirm(`Passar ${l.loja} para o acompanhamento da CS?`)) return;
                  const { error } = await supabaseBrowser().from("portais").update({ cs_acompanha: true }).eq("id", l.id);
                  if (error) alert(error.message); else recarregar();
                }}>Passar sem combinados</button>}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
