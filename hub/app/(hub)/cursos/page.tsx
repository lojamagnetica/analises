"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ROTULO_ESTADO, buscarCurso, pilarDe, trilha } from "@/lib/curso";
import { dataCurta } from "@/lib/formato";

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

  const proximo = !t.raioxFeito
    ? { href: "/cursos/fundamento?c=aula-0", titulo: "Aula 0 · Raio-X da sua loja", texto: "Descubra onde a sua loja está nos 16 fundamentos e por onde começar." }
    : t.atual
      ? { href: `/cursos/fundamento?c=${t.atual.codigo}`, titulo: `${t.atual.codigo} · ${t.atual.titulo}`, texto: `Missão de 7 dias: ${t.atual.missao}.` }
      : { href: "/cursos/fundamento?c=fim", titulo: "Manual da sua Loja Magnética", texto: "Os 16 fundamentos estão de pé. Monte o Manual e tire a Foto do Dia 90." };

  return (
    <>
      <Titulo titulo="Curso Loja Magnética" sub="Em 16 fundamentos, sua loja sai do improviso e passa a funcionar com processo, com ou sem você no balcão." />

      <div className="grade g2 mb">
        <div className="card">
          <div className="linha entre">
            <h2 style={{ margin: 0 }}>Placar Magnético</h2>
            <b style={{ fontSize: 30, color: "var(--ink)" }}>{t.placar}/16</b>
          </div>
          <div className="barra mt"><i style={{ width: `${(t.placar / 16) * 100}%` }} /></div>
          <div className="grade g2 mt" style={{ gap: 10 }}>
            {t.porPilar.map((p) => (
              <div key={p.pilar} className="linha entre marcar" style={{ cursor: "default", flexWrap: "nowrap" }}>
                <span><b>{p.pilar}</b> · {p.nome}</span>
                <span className={`selo ${p.feitos === p.total ? "feito" : "espera"}`}>{p.feitos === p.total ? "selo ✓" : `${p.feitos}/${p.total}`}</span>
              </div>
            ))}
          </div>
          <p className="ajuda">Cada prova entregue soma 1 no placar. Pilar completo ganha o selo; 16/16 ganha o Selo Loja Magnética.</p>
        </div>
        <Link href={proximo.href} className="card card-borda" style={{ ["--c" as string]: "var(--red)", textDecoration: "none", color: "inherit" }}>
          <small className="mudo">SEU PRÓXIMO PASSO</small>
          <h2 style={{ margin: "6px 0" }}>{proximo.titulo}</h2>
          <p className="mudo" style={{ margin: 0 }}>{proximo.texto}</p>
          <span className="btn p peq mt">Continuar →</span>
        </Link>
      </div>

      <div className="card mb">
        <b>Como funciona:</b> cada aula tem até 15 minutos e entrega uma ferramenta pronta, uma missão de 7 dias e uma prova.
        Você marca &quot;entreguei a prova&quot; e o próximo fundamento libera. O que já funciona na sua loja (nota 2 no Raio-X) não trava a trilha.
      </div>

      {c.modulos.map((m) => {
        const fundamentos = c.fundamentos.filter((f) => f.modulo_id === m.id);
        const bonus = c.aulas.filter((a) => a.modulo_id === m.id && !a.fundamento);
        return (
          <div key={m.id}>
            <div className="secao">{m.titulo}</div>
            {m.promessa && <p className="mudo" style={{ marginTop: -6 }}>{m.promessa}</p>}
            <div className="grade g4">
              {m.id === "aula-0" && (
                <Link href="/cursos/fundamento?c=aula-0" className="card etapa" style={{ textDecoration: "none", color: "inherit" }}>
                  <span className={`selo ${t.raioxFeito ? "feito" : "andamento"}`}>{t.raioxFeito ? "Raio-X feito" : "comece aqui"}</span>
                  <b style={{ color: "var(--ink)" }}>Antes de tudo</b>
                  <p>{c.aulas.filter((a) => a.modulo_id === "aula-0").length} aulas · Raio-X, Foto do Dia Zero e Contrato de Foco</p>
                </Link>
              )}
              {fundamentos.map((f) => {
                const e = t.estado.get(f.codigo)!;
                const n = aulasDe(f.codigo).length;
                const conteudo = (
                  <>
                    <span className={`selo ${ROTULO_ESTADO[e].classe}`}>{ROTULO_ESTADO[e].texto}</span>
                    <small className="mudo">{f.codigo} · pilar {pilarDe(f.codigo)}</small>
                    <b style={{ color: "var(--ink)", paddingRight: 90 }}>{f.titulo}</b>
                    <p>{n} {n === 1 ? "aula" : "aulas"} · prova: {f.prova.toLowerCase()}</p>
                  </>
                );
                return e === "bloqueado" ? (
                  <div key={f.codigo} className="card etapa" style={{ opacity: 0.6 }}>{conteudo}</div>
                ) : (
                  <Link key={f.codigo} href={`/cursos/fundamento?c=${f.codigo}`} className="card etapa" style={{ textDecoration: "none", color: "inherit", ...(e === "atual" ? { boxShadow: "0 0 0 2px var(--red)" } : {}) }}>{conteudo}</Link>
                );
              })}
              {m.id !== "aula-0" && m.id !== "encerramento" && bonus.map((a) => (
                <Link key={a.codigo} href="/cursos/fundamento?c=bonus" className="card etapa" style={{ textDecoration: "none", color: "inherit" }}>
                  <span className="selo espera">bônus</span>
                  <b style={{ color: "var(--ink)" }}>{a.titulo.replace("Bônus · ", "")}</b>
                  <p>{a.topicos.join(" · ")}</p>
                </Link>
              ))}
              {m.id === "encerramento" && (
                <Link href="/cursos/fundamento?c=fim" className="card etapa" style={{ textDecoration: "none", color: "inherit" }}>
                  <span className={`selo ${t.placar === 16 ? "feito" : "espera"}`}>{t.placar}/16 provas</span>
                  <b style={{ color: "var(--ink)", paddingRight: 90 }}>Manual da loja</b>
                  <p>Foto do Dia 90 x Dia Zero e o Selo Loja Magnética</p>
                </Link>
              )}
            </div>
          </div>
        );
      })}

      {dados.gravacoes.length > 0 && (
        <>
          <div className="secao">Gravações dos seus encontros</div>
          <div className="grade g3">
            {dados.gravacoes.map((g) => (
              <a key={g.id} className="card card-borda" style={{ ["--c" as string]: "var(--purple)", textDecoration: "none", color: "inherit" }} href={g.gravacao_url!} target="_blank" rel="noopener">
                <b>{g.titulo}</b><div className="mudo">{dataCurta(g.data)} · ▶ assistir</div>
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}
