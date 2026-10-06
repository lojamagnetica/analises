"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone } from "@/components/Icone";

type Item = { href: string; rotulo: string; icone: string; emBreve?: boolean; ponto?: boolean };
type Grupo = { id: string; rotulo: string; icone: string; itens: Item[] };

function grupos(equipe: boolean, temPortal: boolean, persFaltam: number): Grupo[] {
  const g: Grupo[] = [];
  if (equipe) {
    g.push({
      id: "equipe", rotulo: "Equipe", icone: "team",
      itens: [
        { href: "/equipe", rotulo: "Painel dos portais", icone: "chart" },
        { href: "/equipe/duvidas", rotulo: "Dúvidas pendentes", icone: "inbox" },
        { href: "/equipe/reunioes", rotulo: "Reuniões", icone: "cal" },
        { href: "/equipe/portais/novo", rotulo: "Novo portal", icone: "plus" },
        { href: "/equipe/biblioteca", rotulo: "Biblioteca", icone: "book" },
      ],
    });
  }
  if (!temPortal) return g;
  g.push(
    {
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
      id: "vendas", rotulo: "Vendas", icone: "funnel",
      itens: [{ href: "/scripts", rotulo: "Scripts de venda", icone: "chat" }],
    },
    {
      id: "marketing", rotulo: "Marketing", icone: "pencil",
      itens: [
        { href: "/planeje", rotulo: "PLANEJE AQUI", icone: "cal" },
        { href: "/kanban", rotulo: "Kanban de conteúdo", icone: "kanban" },
      ],
    },
  );
  return g;
}

export function Menu(props: { equipe: boolean; temPortal: boolean; persFaltam: number; nome: string; email: string }) {
  const caminho = usePathname();
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState<string | null>(null);
  const lista = grupos(props.equipe, props.temPortal, props.persFaltam);
  const ativo = (href: string) => caminho === href || (href !== "/equipe" && caminho.startsWith(href + "/"));
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
          <div className="logo">LM</div>
          <div>
            <b>Loja Magnética</b>
            <small>Hub · Portal da Mentoria</small>
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
                <Icone nome="play" /> CURSOS
              </Link>
              <Link href="/duvidas" className={`nav-item ${ativo("/duvidas") ? "ativo" : ""}`}>
                <Icone nome="help" /> DÚVIDAS
              </Link>
            </>
          )}
        </nav>

        <div className="side-pe">
          <div className="pe-pessoa">
            <div className="avatar">{(props.nome || "?").trim().charAt(0).toUpperCase()}</div>
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
            <a href="/auth/sair">Sair</a>
          </div>
        </div>
      </aside>
    </>
  );
}
