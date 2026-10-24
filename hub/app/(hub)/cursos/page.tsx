"use client";

import Link from "next/link";
import { CapaCurso } from "@/components/CapaCurso";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { BASE } from "@/lib/config";
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

  // O banner é a vitrine do curso (vale para quem compra só o curso). Dentro dele, o próximo passo:
  // Boas-vindas → fundamento atual (na aula que falta) → Manual.
  const atualAulas = t.atual ? aulasDe(t.atual.codigo) : [];
  const proximaAula = atualAulas.find((a) => !c.assistidas.has(a.codigo)) ?? atualAulas[0];
  const segue = !t.raioxFeito
    ? { olho: "Comece aqui", titulo: "Boas-vindas e mentalidade", texto: `${aula0.length} aulas · ${minutos(aula0)} min · termina com o Raio-X da sua loja`,
        href: "/cursos/fundamento?c=aula-0", botao: vistas(aula0) ? "Continuar" : "Começar o curso", progresso: vistas(aula0) / Math.max(aula0.length, 1) }
    : t.atual
      ? { olho: "Continue de onde parou", titulo: `${t.atual.codigo} · ${t.atual.titulo}`,
          texto: `${PILARES[pilarDe(t.atual.codigo)]} · ${vistas(atualAulas)} de ${atualAulas.length} ${atualAulas.length === 1 ? "aula" : "aulas"} · ${minutos(atualAulas)} min`,
          href: `/cursos/fundamento?c=${t.atual.codigo}${proximaAula ? `&a=${proximaAula.codigo}` : ""}`,
          botao: vistas(atualAulas) ? "Continuar aula" : "Assistir agora", progresso: vistas(atualAulas) / Math.max(atualAulas.length, 1) }
      : { olho: "Reta final", titulo: "Manual da sua Loja Magnética", texto: "Os 16 fundamentos estão de pé. Monte o Manual e tire a Foto do Dia 90.",
          href: "/cursos/fundamento?c=fim", botao: "Montar o Manual", progresso: 1 };
  const totalAulas = c.aulas.length;

  return (
    <>
      <Titulo titulo="" aba="Método Loja Magnética" />

      <section className="mb-hero mb-vitrine">
        <div className="mb-hero-txt">
          <span className="mb-olho">Curso · um método magnética</span>
          <h1>Método<br /><b>Loja Magnética</b></h1>
          <p>16 fundamentos para a sua loja sair do improviso e funcionar com processo, com ou sem você no balcão.</p>
          <div className="mb-hero-meta"><span>{c.modulos.length} módulos</span><span>{c.fundamentos.length} fundamentos</span><span>{totalAulas} aulas de até 15 min</span></div>
          <Link href={segue.href} className="mb-segue">
            <span className="mb-segue-play"><Icone nome="play" /></span>
            <span className="mb-segue-txt">
              <small>{segue.olho}</small>
              <b>{segue.titulo}</b>
              <em>{segue.texto}</em>
              <i className="mb-segue-barra"><i style={{ width: `${segue.progresso * 100}%` }} /></i>
            </span>
            <span className="mb-segue-botao">{segue.botao} →</span>
          </Link>
        </div>
        <div className="mb-hero-foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/curso/camilla-banner.jpg`} alt="Camilla Ribeiro" />
          <span className="mb-hero-assina"><b>Camilla Ribeiro</b>Método Loja Magnética</span>
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
                  <CapaCurso codigo="00" titulo="Boas-vindas e mentalidade" topo="Comece aqui" feito={t.raioxFeito} progresso={vistas(aula0) / Math.max(aula0.length, 1)} />
                  <div className="mb-card-corpo">
                    <small>{aula0.length} aulas · {minutos(aula0)} min</small>
                    <b>Mentalidade do dono, como usar o curso e o Raio-X da loja</b>
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
