"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone } from "@/components/Icone";
import { Simbolo } from "@/components/Simbolo";
import { supabaseBrowser } from "@/lib/supabase/client";

type Item = { href: string; rotulo: string; icone: string; emBreve?: boolean; ponto?: boolean };
type Grupo = { id: string; rotulo: string; icone: string; itens: Item[] };

export function grupos(equipe: boolean, temPortal: boolean, persFaltam: number, consultoria: boolean, estudio = false, soCurso = false): Grupo[] {
  const g: Grupo[] = [];
  if (equipe) {
    g.push({
      id: "empresa", rotulo: "Minha empresa", icone: "home",
      itens: [
        ...(estudio ? [{ href: "/empresa/estudio", rotulo: "Meu estúdio", icone: "pencil" }] : []),
        { href: "/equipe/agenda", rotulo: "Agenda", icone: "cal" },
        { href: "/empresa", rotulo: "Painel da empresa", icone: "chart" },
        { href: "/empresa/carteira", rotulo: "Gestão de Clientes", icone: "users" },
        { href: "/empresa/iscas", rotulo: "Radar das iscas", icone: "search" },
        { href: "/empresa/equipe", rotulo: "Equipe", icone: "team" },
        { href: "/empresa/conteudo", rotulo: "Conteúdo da casa", icone: "insta" },
        { href: "/empresa/marca", rotulo: "Marca", icone: "tag" },
        { href: "/empresa/contratos", rotulo: "Modelos de contrato", icone: "note" },
      ],
    });
    g.push({
      id: "central", rotulo: "Central do Cliente", icone: "kanban",
      itens: [
        { href: "/equipe/aprovar", rotulo: "Para aprovar", icone: "check" },
        { href: "/equipe/central", rotulo: "Jornada das clientes", icone: "kanban" },
        { href: "/equipe/pendencias", rotulo: "Pendências por cliente", icone: "check" },
        { href: "/equipe/planos", rotulo: "Planos do mês", icone: "kanban" },
        { href: "/equipe/duvidas", rotulo: "Caixa do Fale com a Camilla", icone: "inbox" },
      ],
    });
    g.push({
      id: "comercial", rotulo: "Comercial", icone: "target",
      itens: [
        { href: "/equipe/comercial", rotulo: "Painel comercial", icone: "chart" },
        { href: "/equipe/comercial/leads", rotulo: "Leads e funil", icone: "funnel" },
        { href: "/equipe/comercial/venda", rotulo: "Nova venda", icone: "plus" },
      ],
    });
    g.push({
      id: "equipe", rotulo: "Portais", icone: "folder",
      itens: [
        { href: "/equipe", rotulo: "Painel dos portais", icone: "kanban" },
        { href: "/equipe/importar", rotulo: "Importar dados", icone: "plus" },
        { href: "/equipe/reunioes", rotulo: "Reuniões", icone: "cal" },
        { href: "/equipe/portais/novo", rotulo: "Novo portal", icone: "plus" },
        { href: "/equipe/analises", rotulo: "Análises de perfil", icone: "insta" },
        { href: "/equipe/acoes", rotulo: "Ações do Mês", icone: "bolt" },
        { href: "/equipe/gincanas", rotulo: "Gincanas", icone: "gift" },
        { href: "/equipe/biblioteca", rotulo: "Biblioteca", icone: "book" },
      ],
    });
  }
  if (!temPortal || soCurso) return g;
  const consultoriaOuMentoria: Grupo = consultoria
    ? {
        id: "consultoria", rotulo: "Minha consultoria", icone: "target",
        itens: [
          { href: "/consultoria", rotulo: "Painel da consultoria", icone: "chart" },
          { href: "/consultoria/planner", rotulo: "Planner de gestão", icone: "cal" },
          { href: "/consultoria/materiais", rotulo: "Materiais", icone: "folder" },
          { href: "/reunioes", rotulo: "Encontros", icone: "video" },
          { href: "/notas", rotulo: "Notas", icone: "note" },
          { href: "/contrato", rotulo: "Contrato e renovação", icone: "note" },
        ],
      }
    : {
        id: "jornada", rotulo: "Minha mentoria", icone: "map",
        itens: [
          { href: "/jornada", rotulo: "Os 7 passos", icone: "map" },
          { href: "/plano", rotulo: "Plano de Ação 90 dias", icone: "target" },
          { href: "/reunioes", rotulo: "Reuniões", icone: "video" },
          { href: "/notas", rotulo: "Notas", icone: "note" },
          { href: "/contrato", rotulo: "Contrato e renovação", icone: "note" },
        ],
      };
  if (consultoria) g.push(consultoriaOuMentoria);
  g.push(
    {
      id: "loja", rotulo: "Minha loja", icone: "folder",
      itens: [
        { href: "/personalizacao", rotulo: "Dados da loja", icone: "sliders", ponto: persFaltam > 0 },
        { href: "/personalizacao/etapa?n=8", rotulo: "Estoque e relatórios", icone: "box" },
      ],
    },
    {
      // O resultado do Diagnóstico: o resumo, as análises de estoque e a do Instagram.
      id: "diagnostico", rotulo: "Diagnóstico", icone: "chart",
      itens: [
        { href: "/painel", rotulo: "Diagnóstico da loja", icone: "chart" },
        { href: "/estoque", rotulo: "Diagnóstico de estoque", icone: "box" },
        { href: "/conteudo", rotulo: "Análise do Instagram", icone: "insta" },
      ],
    },
    {
      id: "gestao", rotulo: "Gestão estratégica", icone: "calc",
      itens: [
        { href: "/gestao/caixa", rotulo: "Fechamento de caixa", icone: "calc" },
        { href: "/gestao/resultado", rotulo: "Resultado do mês", icone: "target" },
        { href: "/metas", rotulo: "Metas e calculadora", icone: "target" },
      ],
    },
    {
      id: "pessoas", rotulo: "Gestão de pessoas", icone: "team",
      itens: [
        { href: "/pessoas", rotulo: "Minha equipe e perfis", icone: "users" },
        { href: "/pessoas/organograma", rotulo: "Organograma", icone: "team" },
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
        { href: "/planeje", rotulo: "PLANEJE AQUI", icone: "kanban" },
      ],
    },
    {
      id: "clientes", rotulo: "De cliente a fã", icone: "users",
      itens: [
        { href: "/clientes", rotulo: "Minhas clientes", icone: "users" },
        { href: "/clientes/tipos", rotulo: "Ações por tipo de cliente", icone: "target" },
        { href: "/clientes/resgate", rotulo: "Resgate", icone: "chat" },
        { href: "/clientes/campanhas", rotulo: "Top 10 campanhas", icone: "bolt" },
        { href: "/clientes/experiencia", rotulo: "Experiência do cliente", icone: "spark" },
      ],
    },
    {
      id: "conteudo", rotulo: "Conteúdo", icone: "insta",
      itens: [
        { href: "/conteudo/semana", rotulo: "Programação da semana", icone: "cal" },
        { href: "/conteudo/pautas", rotulo: "Pautas quentes", icone: "spark" },
        { href: "/conteudo/roteiro", rotulo: "Criar roteiro", icone: "pencil" },
        { href: "/conteudo/bio", rotulo: "Link da Bio", icone: "link" },
        { href: "/conteudo/resultados", rotulo: "Resultados", icone: "chart" },
        { href: "/conteudo/desafio", rotulo: "Desafio Loja Viral", icone: "spark" },
      ],
    },
  );
  if (!consultoria) g.push(consultoriaOuMentoria);
  return g;
}

export function Menu(props: { ocultos?: string[]; equipe: boolean; temPortal: boolean; consultoria: boolean; persFaltam: number; trava?: (href: string) => boolean; nome: string; email: string; foto: string | null; estudio?: boolean; soCurso?: boolean }) {
  const caminho = usePathname().replace(/(.)\/$/, "$1");
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState<string | null>(null);
  const lista = grupos(props.equipe, props.temPortal, props.persFaltam, props.consultoria, props.estudio, props.soCurso)
    .filter((g) => !props.ocultos?.includes(g.id));
  const ativo = (href: string) => caminho === href || (!["/equipe", "/empresa", "/pessoas", "/conteudo", "/clientes", "/personalizacao"].includes(href) && caminho.startsWith(href + "/")) || (href === "/pessoas" && /^\/pessoas\/(pessoa|teste)$/.test(caminho));
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
          {props.temPortal && !props.soCurso && (
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

          {props.temPortal && !props.soCurso && (
            <div className="nav-linha">
              <Link href="/comece" className={`nav-item ${ativo("/comece") ? "ativo" : ""}`}>
                <Icone nome="play" /> COMECE AQUI
              </Link>
            </div>
          )}

          {props.temPortal && !props.soCurso && (
            <div className="nav-linha">
              <Link href="/assistente" className={`nav-item ia ${ativo("/assistente") ? "ativo" : ""}`}>
                <Icone nome="chat" /> Fale com a Camilla
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
                      {props.trava?.(i.href) ? <span className="em-breve" title="Abre depois da etapa anterior">🔒</span>
                        : i.emBreve ? <span className="em-breve">EM BREVE</span> : null}
                      {i.ponto && <span className="ponto" />}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {(props.temPortal || props.equipe) && (
            <Link href="/cursos" className={`nav-item ${ativo("/cursos") ? "ativo" : ""}`}>
              <Icone nome="play" /> CURSO
            </Link>
          )}

          {props.temPortal && !props.soCurso && (
            <Link href="/indique" className={`nav-item ${ativo("/indique") ? "ativo" : ""}`}>
              <Icone nome="gift" /> Indique uma loja 🎁
              {props.trava?.("/indique") && <span className="em-breve" title="Abre depois da etapa anterior">🔒</span>}
            </Link>
          )}

          {props.temPortal && !props.soCurso && (
            <Link href="/guia" className={`nav-item ${ativo("/guia") ? "ativo" : ""}`}>
              <Icone nome="help" /> Como usar o Hub
            </Link>
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
                {props.email ? <>{props.email} · </> : null}acesso ativo<span className="online" />
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
