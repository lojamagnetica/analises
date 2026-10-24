"use client";

import Link from "next/link";
import { CapaCurso } from "@/components/CapaCurso";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PILARES, buscarCurso, pilarDe, trilha, type Aula } from "@/lib/curso";
import { dataCurta } from "@/lib/formato";

const minutos = (aulas: Aula[]) => aulas.reduce((s, a) => s + (a.duracao ?? 15), 0);

export default function Curso() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(async () => {
    const [curso, { data: gravacoes }] = await Promise.all([
      buscarCurso(portal.id),
      supabaseBrowser().from("reunioes").select("id, titulo, data, gravacao_url").eq("portal_id", portal.id).not("gravacao_url", "is", null).order("data", { ascending: false }),
    ]);
    return { curso, gravacoes: gravacoes ?? [] };
  }, [portal.id]);
  if (!dados) return <Carregando />;
  const c = dados.curso;
  const t = trilha(c, equipe);
  const aulasDe = (codigo: string) => c.aulas.filter((a) => a.fundamento === codigo);
  const vistas = (aulas: Aula[]) => aulas.filter((a) => c.assistidas.has(a.codigo)).length;
  const aula0 = c.aulas.filter((a) => a.modulo_id === "aula-0");

  // O banner mostra sempre o próximo passo: Aula 0 → fundamento atual (na aula que falta) → Manual.
  const atualAulas = t.atual ? aulasDe(t.atual.codigo) : [];
  const proximaAula = atualAulas.find((a) => !c.assistidas.has(a.codigo)) ?? atualAulas[0];
  const hero = !t.raioxFeito
    ? {
        olho: "Comece aqui", codigo: "0", topo: "Antes de tudo", pilar: null, titulo: <>Aula 0 · <b>Raio-X da sua loja</b></>,
        texto: "Descubra onde a sua loja está nos 16 fundamentos e por onde começar.",
        meta: [`${aula0.length} aulas`, `${minutos(aula0)} min`],
        href: "/cursos/fundamento?c=aula-0", botao: "Começar", extra: { href: "/cursos/raio-x", rotulo: "Fazer o Raio-X" },
      }
    : t.atual
      ? {
          olho: "Continue de onde parou", codigo: t.atual.codigo, topo: `Pilar ${pilarDe(t.atual.codigo)}`, pilar: pilarDe(t.atual.codigo),
          titulo: <>{t.atual.codigo} · <b>{t.atual.titulo}</b></>,
          texto: `Missão de 7 dias: ${t.atual.missao}.`,
          meta: [PILARES[pilarDe(t.atual.codigo)], `${vistas(atualAulas)} de ${atualAulas.length} ${atualAulas.length === 1 ? "aula" : "aulas"}`, `${minutos(atualAulas)} min`],
          href: `/cursos/fundamento?c=${t.atual.codigo}${proximaAula ? `&a=${proximaAula.codigo}` : ""}`,
          botao: vistas(atualAulas) ? "Continuar aula" : "Assistir agora",
          extra: { href: `/cursos/fundamento?c=${t.atual.codigo}#missao`, rotulo: "Ver missão e prova" },
        }
      : {
          olho: "Reta final", codigo: "16", topo: "Encerramento", pilar: null, titulo: <>Manual da sua <b>Loja Magnética</b></>,
          texto: "Os 16 fundamentos estão de pé. Monte o Manual e tire a Foto do Dia 90.",
          meta: ["16/16 provas"], href: "/cursos/fundamento?c=fim", botao: "Montar o Manual", extra: null,
        };

  return (
    <>
      <Titulo titulo="Curso Loja Magnética" aba="Curso" sub="16 fundamentos para a sua loja sair do improviso e funcionar com processo, com ou sem você no balcão." />

      <section className="mb-hero">
        <div className="mb-hero-txt">
          <span className="mb-olho">{hero.olho}</span>
          <h1>{hero.titulo}</h1>
          <p>{hero.texto}</p>
          <div className="mb-hero-meta">{hero.meta.map((m) => <span key={m}>{m}</span>)}</div>
          <div className="mb-hero-acoes">
            <Link className="btn-play" href={hero.href}><Icone nome="play" /> {hero.botao}</Link>
            {hero.extra && <Link className="btn-vidro" href={hero.extra.href}>{hero.extra.rotulo}</Link>}
          </div>
        </div>
        <div className="mb-hero-arte">
          <CapaCurso grande codigo={hero.codigo} topo={hero.topo} pilar={hero.pilar} progresso={t.atual ? vistas(atualAulas) / Math.max(atualAulas.length, 1) : undefined} />
        </div>
      </section>

      <div className="card mb-placar">
        <div className="mb-anel" style={{ ["--p" as string]: (t.placar / 16) * 100 }}><div><b>{t.placar}</b><small>de 16</small></div></div>
        <div>
          <div className="linha entre" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Placar Magnético</h2>
            <span className="mudo" style={{ fontSize: 13 }}>Cada prova entregue soma 1. Pilar completo ganha o selo.</span>
          </div>
          <div className="mb-pilares">
            {t.porPilar.map((p) => (
              <div key={p.pilar} className="mb-pilar">
                <small>Pilar {p.pilar}{p.feitos === p.total ? " · selo ✓" : ""}</small>
                <b>{p.nome}</b>
                <div className="barra"><i style={{ width: `${(p.feitos / Math.max(p.total, 1)) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {c.modulos.map((m) => {
        const fundamentos = c.fundamentos.filter((f) => f.modulo_id === m.id);
        const bonus = c.aulas.filter((a) => a.modulo_id === m.id && !a.fundamento);
        const feitos = fundamentos.filter((f) => ["entregue", "ja-funciona"].includes(t.estado.get(f.codigo)!)).length;
        const [rotulo, nome] = m.titulo.includes(" · ") ? m.titulo.split(" · ") : ["", m.titulo];
        return (
          <section key={m.id}>
            <div className="mb-secao">
              <div>
                <h2>{rotulo && <small>{rotulo}</small>}{nome}</h2>
                {m.promessa && <p>{m.promessa}</p>}
              </div>
              {fundamentos.length > 0 && <span className="mb-cont">{feitos}/{fundamentos.length} fundamentos</span>}
            </div>
            <div className="mb-linha">
              {m.id === "aula-0" && (
                <Link href="/cursos/fundamento?c=aula-0" className={`mb-card${!t.raioxFeito ? " atual" : ""}`}>
                  <CapaCurso codigo="0" titulo="Raio-X da sua loja" topo="Antes de tudo" feito={t.raioxFeito} progresso={vistas(aula0) / Math.max(aula0.length, 1)} />
                  <div className="mb-card-corpo">
                    <small>{aula0.length} aulas · {minutos(aula0)} min</small>
                    <b>Raio-X, Foto do Dia Zero e Contrato de Foco</b>
                    <span className={`mb-estado${t.raioxFeito ? " ok" : " atual"}`}>{t.raioxFeito ? "Raio-X feito" : "Comece aqui"}</span>
                  </div>
                </Link>
              )}
              {fundamentos.map((f) => {
                const e = t.estado.get(f.codigo)!;
                const aulas = aulasDe(f.codigo);
                const conteudo = (
                  <>
                    <CapaCurso codigo={f.codigo} titulo={f.titulo} topo={`Pilar ${pilarDe(f.codigo)}`} pilar={pilarDe(f.codigo)}
                      bloqueado={e === "bloqueado"} feito={e === "entregue" || e === "ja-funciona"} progresso={vistas(aulas) / Math.max(aulas.length, 1)} />
                    <div className="mb-card-corpo">
                      <small>{aulas.length} {aulas.length === 1 ? "aula" : "aulas"} · {minutos(aulas)} min</small>
                      <b>{f.titulo}</b>
                      <span className={`mb-estado${e === "atual" ? " atual" : e === "entregue" || e === "ja-funciona" ? " ok" : ""}`}>
                        {e === "entregue" ? "✓ Prova entregue" : e === "ja-funciona" ? "✓ Já funciona na loja" : e === "atual" ? "Você está aqui" : e === "bloqueado" ? "Abre depois da prova anterior" : "Liberado"}
                      </span>
                    </div>
                  </>
                );
                return e === "bloqueado"
                  ? <div key={f.codigo} className="mb-card">{conteudo}</div>
                  : <Link key={f.codigo} href={`/cursos/fundamento?c=${f.codigo}`} className={`mb-card${e === "atual" ? " atual" : ""}`}>{conteudo}</Link>;
              })}
              {m.id !== "aula-0" && m.id !== "encerramento" && bonus.map((a) => (
                <Link key={a.codigo} href="/cursos/fundamento?c=bonus" className="mb-card">
                  <CapaCurso codigo="+" titulo={a.titulo.replace("Bônus · ", "")} topo="Bônus" feito={c.assistidas.has(a.codigo)} />
                  <div className="mb-card-corpo">
                    <small>Bônus · {a.duracao ?? 15} min</small>
                    <b>{a.titulo.replace("Bônus · ", "")}</b>
                    <span className="mb-estado">{a.topicos.slice(0, 2).join(" · ") || "Aula extra"}</span>
                  </div>
                </Link>
              ))}
              {m.id === "encerramento" && (
                <Link href="/cursos/fundamento?c=fim" className="mb-card">
                  <CapaCurso codigo={`${t.placar}/16`} titulo="Manual da loja" topo="Encerramento" feito={t.placar === 16} />
                  <div className="mb-card-corpo">
                    <small>{t.placar}/16 provas</small>
                    <b>Manual da sua Loja Magnética</b>
                    <span className="mb-estado">Foto do Dia 90 x Dia Zero e o Selo Loja Magnética</span>
                  </div>
                </Link>
              )}
            </div>
          </section>
        );
      })}

      {dados.gravacoes.length > 0 && (
        <section>
          <div className="mb-secao"><div><h2><small>Ao vivo</small>Gravações dos seus encontros</h2></div><span className="mb-cont">{dados.gravacoes.length} gravações</span></div>
          <div className="mb-linha">
            {dados.gravacoes.map((g) => (
              <a key={g.id} className="mb-card" href={g.gravacao_url!} target="_blank" rel="noopener">
                <CapaCurso codigo="▶" titulo={dataCurta(g.data)} topo="Encontro" />
                <div className="mb-card-corpo"><small>{dataCurta(g.data)}</small><b>{g.titulo}</b><span className="mb-estado">Assistir a gravação</span></div>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
