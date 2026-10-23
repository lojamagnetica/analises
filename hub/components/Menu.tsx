"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone } from "@/components/Icone";
import { Simbolo } from "@/components/Simbolo";
import { supabaseBrowser } from "@/lib/supabase/client";

type Item = { href: string; rotulo: string; icone: string; emBreve?: boolean; ponto?: boolean };
type Grupo = { id: string; rotulo: string; icone: string; itens: Item[] };

function grupos(equipe: boolean, temPortal: boolean, persFaltam: number, consultoria: boolean): Grupo[] {
  const g: Grupo[] = [];
  if (equipe) {
    g.push({
      id: "empresa", rotulo: "Empresa", icone: "home",
      itens: [
        { href: "/empresa", rotulo: "Painel da empresa", icone: "chart" },
        { href: "/empresa/carteira", rotulo: "Carteira", icone: "users" },
        { href: "/empresa/equipe", rotulo: "Equipe", icone: "team" },
        { href: "/empresa/conteudo", rotulo: "Conteúdo da casa", icone: "insta" },
        { href: "/empresa/marca", rotulo: "Marca", icone: "tag" },
      ],
    });
    g.push({
      id: "equipe", rotulo: "Portais", icone: "folder",
      itens: [
        { href: "/equipe", rotulo: "Painel dos portais", icone: "kanban" },
        { href: "/equipe/duvidas", rotulo: "Dúvidas pendentes", icone: "inbox" },
        { href: "/equipe/reunioes", rotulo: "Reuniões", icone: "cal" },
        { href: "/equipe/portais/novo", rotulo: "Novo portal", icone: "plus" },
        { href: "/equipe/analises", rotulo: "Análises de perfil", icone: "insta" },
        { href: "/equipe/acoes", rotulo: "Ações do Mês", icone: "bolt" },
        { href: "/equipe/gincanas", rotulo: "Gincanas", icone: "gift" },
        { href: "/equipe/biblioteca", rotulo: "Biblioteca", icone: "book" },
      ],
    });
  }
  if (!temPortal) return g;
  g.push(
    consultoria
      ? {
          id: "consultoria", rotulo: "Minha consultoria", icone: "target",
          itens: [
            { href: "/consultoria", rotulo: "Painel da consultoria", icone: "chart" },
            { href: "/reunioes", rotulo: "Encontros", icone: "video" },
          ],
        }
      : {
          id: "jornada", rotulo: "Minha jornada", icone: "map",
          itens: [
            { href: "/jornada", rotulo: "Os 7 passos", icone: "map" },
            { href: "/plano", rotulo: "Plano de Ação 90 dias", icone: "target" },
            { href: "/reunioes", rotulo: "Reuniões", icone: "video" },
          ],
        },
    {
      id: "loja", rotulo: "Minha loja", icone: "folder",
      itens: [
        { href: "/personalizacao", rotulo: "Personalização", icone: "sliders", ponto: persFaltam > 0 },
        { href: "/metas", rotulo: "Metas e calculadora", icone: "calc" },
        { href: "/clientes", rotulo: "Gestão de clientes", icone: "users", emBreve: true },
        { href: "/estoque", rotulo: "Giro de estoque", icone: "box", emBreve: true },
        { href: "/notas", rotulo: "Notas", icone: "note" },
      ],
    },
    {
      id: "pessoas", rotulo: "Gestão de pessoas", icone: "team",
      itens: [
        { href: "/pessoas", rotulo: "Minha equipe e perfis", icone: "users" },
        { href: "/pessoas/retorno", rotulo: "Dar retorno", icone: "chat" },
        { href: "/pessoas/reuniao-semanal", rotulo: "Reunião semanal", icone: "cal" },
        { href: "/pessoas/reuniao-mensal", rotulo: "Reunião do mês", icone: "chart" },
        { href: "/pessoas/desenvolvimento", rotulo: "Desenvolvimento", icone: "target" },
        { href: "/pessoas/gincanas", rotulo: "Gincanas", icone: "gift" },
      ],
    },
    {
      id: "vendas", rotulo: "Vendas", icone: "funnel",
      itens: [
        { href: "/acoes", rotulo: "Ações do Mês", icone: "bolt" },
        { href: "/scripts", rotulo: "Scripts de venda", icone: "chat" },
      ],
    },
    {
      id: "conteudo", rotulo: "Conteúdo", icone: "insta",
      itens: [
        { href: "/conteudo", rotulo: "Análise do perfil", icone: "insta" },
        { href: "/conteudo/semana", rotulo: "Programação da semana", icone: "cal" },
        { href: "/conteudo/roteiro", rotulo: "Criar roteiro", icone: "pencil" },
        { href: "/conteudo/resultados", rotulo: "Resultados", icone: "chart" },
        { href: "/conteudo/desafio", rotulo: "Desafio Loja Viral", icone: "spark" },
        { href: "/planeje", rotulo: "PLANEJE AQUI", icone: "kanban" },
      ],
    },
  );
  return g;
}

export function Menu(props: { equipe: boolean; temPortal: boolean; consultoria: boolean; persFaltam: number; nome: string; email: string; foto: string | null }) {
  const caminho = usePathname().replace(/(.)\/$/, "$1");
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState<string | null>(null);
  const lista = grupos(props.equipe, props.temPortal, props.persFaltam, props.consultoria);
  const ativo = (href: string) => caminho === href || (!["/equipe", "/empresa", "/pessoas", "/conteudo"].includes(href) && caminho.startsWith(href + "/")) || (href === "/pessoas" && /^\/pessoas\/(pessoa|teste)$/.test(caminho));
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lista.map((g) => [g.id, g.itens.some((i) => ativo(i.href))])),
  );

  useEffect(() => {
    setAberta(false);
    const atual = lista.find((g) => g.itens.some((i) => ativo(i.href)));
    if (atual) setAbertos((a) => ({ ...a, [atual.id]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho]);

  useEffect(() => {
    const abrir = () => setAberta(true);
    window.addEventListener("abrir-menu", abrir);
    return () => window.removeEventListener("abrir-menu", abrir);
  }, []);

  const termo = (busca ?? "").trim().toLowerCase();
  const achados = termo
    ? lista.flatMap((g) => g.itens).filter((i) => i.rotulo.toLowerCase().includes(termo))
    : [];

  return (
    <>
      <div className={`mobile-fundo ${aberta ? "aberto" : ""}`} onClick={() => setAberta(false)} />
      <aside className={`side ${aberta ? "aberta" : ""}`}>
        <div className="side-topo">
          <div className="logo"><Simbolo /></div>
          <div>
            <b className="marca-nome">magnética<span>.hub</span></b>
            <small>Hub · Loja Magnética</small>
          </div>
          <button className="icone-btn" aria-label="Fechar menu" onClick={() => setAberta(false)}>
            <Icone nome="menu" tamanho={18} />
          </button>
        </div>

        <nav className="nav">
          {props.temPortal && (
            <div className="nav-linha">
              <Link href="/inicio" className={`nav-item ${ativo("/inicio") ? "ativo" : ""}`}>
                <Icone nome="home" /> INÍCIO
              </Link>
              <button className="nav-busca" aria-label="Buscar" onClick={() => setBusca(busca === null ? "" : null)}>
                <Icone nome="search" tamanho={18} />
              </button>
            </div>
          )}

          {busca !== null && (
            <div style={{ margin: "4px 0 10px" }}>
              <input
                autoFocus
                type="text"
                placeholder="Buscar no menu…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{ background: "var(--side-2)", borderColor: "var(--side-3)", color: "var(--side-text)" }}
              />
              {achados.map((i) => (
                <Link key={i.href} href={i.href} className="nav-item" onClick={() => setBusca(null)}>
                  <Icone nome={i.icone} /> {i.rotulo}
                </Link>
              ))}
            </div>
          )}

          {props.temPortal && (
            <div className="nav-linha">
              <Link href="/assistente" className={`nav-item ia ${ativo("/assistente") ? "ativo" : ""}`}>
                <Icone nome="robot" /> ✨ Assistente Magnética
              </Link>
            </div>
          )}

          {lista.map((g) => (
            <div key={g.id}>
              <button
                className="nav-item nav-grupo"
                aria-expanded={!!abertos[g.id]}
                onClick={() => setAbertos((a) => ({ ...a, [g.id]: !a[g.id] }))}
              >
                <Icone nome={g.icone} /> {g.rotulo}
                <Icone nome="chevron" className="seta" />
              </button>
              {abertos[g.id] && (
                <div className="nav-sub">
                  {g.itens.map((i) => (
                    <Link key={i.href} href={i.href} className={ativo(i.href) ? "ativo" : ""}>
                      <Icone nome={i.icone} /> {i.rotulo}
                      {i.emBreve && <span className="em-breve">EM BREVE</span>}
                      {i.ponto && <span className="ponto" />}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {props.temPortal && (
            <>
              <Link href="/cursos" className={`nav-item ${ativo("/cursos") ? "ativo" : ""}`}>
                <Icone nome="play" /> CURSO
              </Link>
              <Link href="/duvidas" className={`nav-item ${ativo("/duvidas") ? "ativo" : ""}`}>
                <Icone nome="help" /> DÚVIDAS
              </Link>
            </>
          )}
        </nav>

        <div className="side-pe">
          <div className="pe-pessoa">
            <Link href="/conta#foto" className="avatar" title="Trocar a foto">
              {props.foto
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={props.foto} alt="" />
                : (props.nome || "?").trim().charAt(0).toUpperCase()}
            </Link>
            <div style={{ minWidth: 0 }}>
              <b>Olá, {props.nome.split(" ")[0]}!</b>
              <small>
                {props.email} · acesso ativo<span className="online" />
              </small>
            </div>
          </div>
          <div className="pe-botoes">
            <Link href="/conta"><Icone nome="pencil" /> Perfil</Link>
            <Link href="/conta#app"><Icone nome="phone" /> App</Link>
            <button type="button" onClick={() => supabaseBrowser().auth.signOut()}>Sair</button>
          </div>
        </div>
      </aside>
    </>
  );
}
