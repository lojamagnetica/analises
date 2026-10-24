"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icone } from "@/components/Icone";
import { Carregando, primeiroNome, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataHora, mesAtual, MESES_ABREV } from "@/lib/formato";
import { MESES } from "@/lib/conteudo";
import { buscarConsultoria, mesDaConsultoria } from "@/lib/consultoria";
import { liberado, requisito } from "@/lib/entrada";

const ATALHOS = [
  { href: "/painel", rotulo: "Painel da loja", icone: "chart", cor: "var(--red)" },
  { href: "/plano", rotulo: "Plano 90 dias", icone: "target", cor: "var(--purple)" },
  { href: "/gestao/caixa", rotulo: "Fechar o caixa", icone: "calc", cor: "var(--green)" },
  { href: "/scripts", rotulo: "Scripts", icone: "chat", cor: "var(--blue)" },
  { href: "/conteudo/semana", rotulo: "Conteúdo", icone: "insta", cor: "var(--orange)" },
  { href: "/clientes", rotulo: "Clientes", icone: "users", cor: "var(--purple)" },
  { href: "/assistente", rotulo: "Assistente", icone: "robot", cor: "var(--purple)" },
  { href: "/cursos", rotulo: "Cursos", icone: "play", cor: "var(--blue)" },
];

const TUDO = [
  { titulo: "Minha mentoria", icone: "map", cor: "var(--purple)", itens: [["/jornada", "Os 7 passos"], ["/plano", "Plano de Ação"], ["/reunioes", "Reuniões"], ["/notas", "Notas"]] },
  { titulo: "Minha loja", icone: "folder", cor: "var(--red)", itens: [["/comece", "Comece aqui"], ["/personalizacao", "Dados da loja"], ["/personalizacao/etapa?n=8", "Estoque e relatórios"], ["/pessoas", "Minha equipe e perfis"]] },
  { titulo: "Gestão estratégica", icone: "chart", cor: "var(--red)", itens: [["/painel", "Painel da loja"], ["/gestao/caixa", "Fechamento de caixa"], ["/metas", "Metas e calculadora"], ["/estoque", "Estoque x o que fazer"]] },
  { titulo: "Gestão de pessoas", icone: "team", cor: "var(--purple)", itens: [["/pessoas/retorno", "Dar retorno"], ["/pessoas/reuniao-semanal", "Reunião semanal"], ["/pessoas/reuniao-mensal", "Reunião do mês"], ["/pessoas/desenvolvimento", "Desenvolvimento"], ["/pessoas/gincanas", "Gincanas"]] },
  { titulo: "Vendas", icone: "funnel", cor: "var(--orange)", itens: [["/acoes", "Ações do Mês"], ["/scripts", "Scripts de venda"]] },
  { titulo: "De cliente a fã", icone: "users", cor: "var(--accent)", itens: [["/clientes", "Minhas clientes"], ["/clientes/tipos", "Ações por tipo"], ["/clientes/resgate", "Resgate"], ["/clientes/campanhas", "Top 10 campanhas"], ["/clientes/experiencia", "Experiência do cliente"]] },
  { titulo: "Conteúdo", icone: "insta", cor: "var(--accent)", itens: [["/conteudo", "Análise do perfil"], ["/conteudo/semana", "Programação da semana"], ["/conteudo/desafio", "Desafio Loja Viral"], ["/planeje", "PLANEJE AQUI"]] },
  { titulo: "Aprender", icone: "play", cor: "var(--blue)", itens: [["/cursos", "Cursos e gravações"], ["/duvidas", "Dúvidas entre encontros"], ["/assistente", "Assistente Magnética"]] },
];

const PASSOS_ENTRADA = [
  { chave: "video" as const, titulo: "Assistir ao vídeo de boas-vindas", href: "/comece" },
  { chave: "loja" as const, titulo: "Preencher os Dados da loja", href: "/personalizacao" },
  { chave: "equipe" as const, titulo: "Cadastrar a sua equipe", href: "/pessoas" },
];

export default function Inicio() {
  const { portal, nome, pers, comoLoja, equipe, entrada, persFaltam } = usePortal();
  const consultoria = portal.tipo === "Consultoria";
  const mes = mesAtual();
  useEffect(() => { document.title = "Início · magnética.hub"; }, []);
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: prox }, { data: plano }, { data: datas }, { data: passo }, consult] = await Promise.all([
      sb.from("reunioes").select("titulo, data").eq("portal_id", portal.id).gte("data", new Date().toISOString()).order("data").limit(1).maybeSingle(),
      sb.from("plano_itens").select("feito").eq("portal_id", portal.id),
      sb.from("datas_comerciais").select("dia, titulo").eq("mes", mes).order("dia", { nullsFirst: true }),
      sb.from("jornada_passos").select("titulo").eq("numero", portal.passo_atual).maybeSingle(),
      consultoria ? buscarConsultoria(portal.id) : Promise.resolve(null),
    ]);
    return { prox, plano, datas, passo, consult };
  }, [portal.id]);
  if (!dados) return <Carregando />;
  const { prox, plano, datas, passo, consult } = dados;

  const total = plano?.length ?? 0;
  const feitos = plano?.filter((p) => p.feito).length ?? 0;
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const etapa2 = pers.get(2)?.respostas;
  const quem = (typeof etapa2?.seu_nome === "string" && etapa2.seu_nome) || (comoLoja && portal.responsavel) || primeiroNome(nome);
  const c = consult?.dados;
  const nMes = c ? mesDaConsultoria(c.inicio) : 0;
  const mesC = c ? c.meses[Math.min(Math.max(nMes, 1), c.meses.length) - 1] : null;
  const abertas = consult ? consult.acoes.filter((a) => a.tipo === "Ação da loja" && a.status !== "Feito").length : 0;
  const atalhos = consultoria
    ? ATALHOS.map((a) => (a.href === "/plano" ? { ...a, href: "/consultoria", rotulo: "Consultoria", icone: "chart" } : a))
    : ATALHOS;
  const tudo = consultoria
    ? TUDO.map((g) => (g.titulo === "Minha mentoria" ? { ...g, titulo: "Minha consultoria", itens: [["/consultoria", "Painel da consultoria"], ["/reunioes", "Encontros"], ["/notas", "Notas"]] } : g))
    : TUDO;
  // A loja vê o cadeado nas áreas que ainda não abriram; a equipe vê tudo aberto.
  const ent = equipe ? null : entrada;
  const trancado = (href: string) => { const r = requisito(href.split("?")[0]); return !!ent && !!r && !liberado(r, ent); };
  const entradaAberta = !!ent && !ent.livre && !(ent.video && ent.loja && ent.equipe);

  return (
    <>
      <div className="heroi mt">
        <div>
          <h1>Que bom ter você aqui, {quem}! 🥂</h1>
          <p>{portal.lojas?.length > 1
            ? `Este é o Hub da ${portal.lojas.join(" e ")}. Tudo das suas lojas em um lugar só.`
            : `Este é o Hub da ${portal.loja}. Tudo da sua loja em um lugar só.`}</p>
        </div>
        <div className="meet">
          <small>Próximo encontro no Meet</small>
          {prox ? (
            <>
              <b style={{ textTransform: "capitalize" }}>{dataHora(prox.data)}</b>
              <div style={{ opacity: 0.9 }}>{prox.titulo}</div>
            </>
          ) : (
            <b>Ainda sem data marcada</b>
          )}
          {portal.meet_url && (
            <div className="mt">
              <a className="btn b peq" href={portal.meet_url} target="_blank" rel="noopener">Entrar na sala</a>
            </div>
          )}
        </div>
      </div>

      {entradaAberta && ent && (
        <div className="card card-borda mt" style={{ ["--c" as string]: "var(--red)" }}>
          <h3 style={{ marginTop: 0 }}>Sua entrada no Hub · {PASSOS_ENTRADA.filter((p) => ent[p.chave]).length} de 3</h3>
          <p className="mudo" style={{ marginTop: -4 }}>Cada passo abre novas áreas. Não pule etapas: é assim que o Hub fica certo para a sua loja.</p>
          <div className="grade g3" style={{ gap: 10 }}>
            {PASSOS_ENTRADA.map((p, i) => (
              <Link key={p.chave} href={p.href} className="marcar" style={{ gap: 10 }}>
                <span className={`selo ${ent[p.chave] ? "feito" : "espera"}`}>{ent[p.chave] ? "✓" : i + 1}</span>
                <span>{p.titulo}{p.chave === "loja" && !ent.loja ? ` · falta${persFaltam > 1 ? "m" : ""} ${persFaltam}` : ""}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="secao">Seus atalhos</div>
      <div className="atalhos">
        {atalhos.map((a) => (
          <Link key={a.href} href={a.href} className="atalho" style={{ ["--c" as string]: a.cor }}>
            <span className="quadrado"><Icone nome={a.icone} /></span>
            {a.rotulo}{trancado(a.href) ? " 🔒" : ""}
          </Link>
        ))}
      </div>

      <div className="grade g3 mt">
        {consultoria ? (
          <>
            <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
              <h3>Sua consultoria</h3>
              {c && mesC ? (
                <>
                  <p className="mudo">{nMes > c.duracao ? "Encerramento" : `Mês ${nMes} de ${c.duracao} · ${mesC.nome}`}{mesC.foco ? ` · ${mesC.foco}` : ""}</p>
                  <div className="barra"><i style={{ width: `${(Math.min(nMes, c.duracao) / c.duracao) * 100}%` }} /></div>
                </>
              ) : <p className="mudo">A estrutura da sua consultoria está sendo montada.</p>}
              <Link className="btn s peq mt" href="/consultoria">Abrir a consultoria</Link>
            </div>
            <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
              <h3>Ações da quinzena</h3>
              <p className="mudo">{abertas ? `${abertas} ${abertas === 1 ? "ação aberta" : "ações abertas"} até o próximo encontro` : "Tudo em dia por aqui"}</p>
              <Link className="btn s peq mt" href="/consultoria">Ver as ações</Link>
            </div>
          </>
        ) : (
          <>
            <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
              <h3>Sua jornada</h3>
              <p className="mudo">Passo {portal.passo_atual} de 7 · {passo?.titulo}</p>
              <div className="barra"><i style={{ width: `${(portal.passo_atual / 7) * 100}%` }} /></div>
              <Link className="btn s peq mt" href="/jornada">Ver os 7 passos</Link>
            </div>
            <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
              <h3>Plano de Ação 90 dias</h3>
              <p className="mudo">{total ? `${feitos} de ${total} tarefas feitas` : "Seu plano está sendo montado"}</p>
              <div className="barra"><i style={{ width: `${pct}%` }} /></div>
              <Link className="btn s peq mt" href="/plano">Abrir plano</Link>
            </div>
          </>
        )}
        <div className="card card-borda" style={{ ["--c" as string]: "var(--green)" }}>
          <h3>Datas de {MESES[mes].toLowerCase()}</h3>
          <p className="mudo">
            {(datas ?? []).map((d) => (d.dia ? `${d.titulo} (${d.dia}/${MESES_ABREV[mes]})` : d.titulo)).join(" · ") || "Sem datas cadastradas"}
          </p>
          <Link className="btn s peq" href={`/planeje/mes?m=${mes}`}>Planejar {MESES[mes].toLowerCase()}</Link>
        </div>
      </div>

      <div className="secao">Tudo aqui na plataforma</div>
      <div className="card">
        <div className="tudo" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {tudo.map((g) => (
            <div key={g.titulo}>
              <h3>
                <span className="quadrado" style={{ ["--c" as string]: g.cor }}><Icone nome={g.icone} /></span>
                {g.titulo}
              </h3>
              <div className="chips">
                {g.itens.map(([href, rotulo]) => (
                  <Link key={href} className="chip" href={href}>{rotulo}{trancado(href) ? " 🔒" : ""}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
