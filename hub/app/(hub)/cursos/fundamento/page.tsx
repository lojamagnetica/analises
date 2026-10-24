"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CapaCurso } from "@/components/CapaCurso";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import {
  PILARES, buscarCurso, embedVideo, marcarAula, marcarProva, nomeAula, pilarDe, trilha,
  type Aula, type Ferramenta,
} from "@/lib/curso";
import { dataCurta } from "@/lib/formato";

/** Player da aula: vídeo quando existe; senão, a capa com o aviso. */
function Player({ a, capa }: { a: Aula | undefined; capa: { codigo: string; pilar: string | null; topo: string } }) {
  const embed = a?.video_url ? embedVideo(a.video_url) : null;
  return (
    <div className="mb-player">
      {embed ? <iframe src={embed} title={a!.titulo} allowFullScreen /> : (
        <>
          <CapaCurso grande codigo={capa.codigo} topo={capa.topo} pilar={capa.pilar} />
          <div className="mb-player-aviso">
            {a?.video_url
              ? <a href={a.video_url} target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "none" }}><span><Icone nome="play" />Abrir a aula</span></a>
              : <span><Icone nome="play" />Aula em gravação</span>}
          </div>
        </>
      )}
    </div>
  );
}

function Ferramentas({ itens }: { itens: Ferramenta[] }) {
  return (
    <div className="mb-bloco">
      <small>Ferramentas</small>
      <h3>O que você leva desta aula</h3>
      {!itens.length && <p>Esta aula não tem ferramenta para baixar.</p>}
      {itens.map((f) => {
        const noHub = f.formato === "No Hub" && f.nome.startsWith("Raio-X") ? "/cursos/raio-x" : null;
        return (
          <div key={f.id} className="mb-ferr">
            <span><span className="selo espera" style={{ marginRight: 6 }}>{f.formato}</span>{f.nome}</span>
            {noHub ? <Link className="btn p peq" href={noHub}>Abrir</Link>
              : f.url ? <a className="btn p peq" href={f.url} target="_blank" rel="noopener">Abrir</a>
              : <span className="mudo" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>em produção</span>}
          </div>
        );
      })}
    </div>
  );
}

function Fundamento() {
  const params = useSearchParams();
  const c = params.get("c") ?? "aula-0";
  const escolhida = params.get("a");
  const { portal, equipe } = usePortal();
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(() => buscarCurso(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const t = trilha(dados, equipe);
  const fazer = async (acao: () => Promise<void>) => {
    setErro("");
    try { await acao(); recarregar(); } catch (e) { setErro((e as Error).message); }
  };
  const voltar = { href: "/cursos", rotulo: "Curso" };

  // Aula 0, bônus e encerramento não têm prova própria; os fundamentos têm missão e prova.
  const especial = c === "aula-0" || c === "bonus" || c === "fim";
  const modulo = c === "aula-0" ? "aula-0" : c === "bonus" ? "m02" : "encerramento";
  const m = dados.modulos.find((x) => x.id === modulo);
  const f = especial ? null : dados.fundamentos.find((x) => x.codigo === c);
  if (!especial && !f) return <div className="card">Fundamento não encontrado.</div>;

  const estado = f ? t.estado.get(f.codigo)! : null;
  if (f && estado === "bloqueado") {
    const atual = t.atual;
    return (
      <>
        <Titulo voltar={voltar} titulo={`${f.codigo} · ${f.titulo}`} />
        <div className="mb-hero" style={{ gridTemplateColumns: "1fr" }}>
          <div className="mb-hero-txt">
            <span className="mb-olho">🔒 Ainda fechado</span>
            <h1>Este fundamento abre <b>depois da prova anterior</b></h1>
            <p>Regra de ouro do curso: só avança quando entrega a prova.{atual ? ` Agora o seu foco é ${atual.codigo} · ${atual.titulo}.` : ""}</p>
            {atual && <div className="mb-hero-acoes"><Link className="btn-play" href={`/cursos/fundamento?c=${atual.codigo}`}><Icone nome="play" /> Ir para {atual.codigo}</Link></div>}
          </div>
        </div>
      </>
    );
  }

  const aulas = dados.aulas.filter((a) => (f ? a.fundamento === f.codigo : c === "bonus" ? a.modulo_id === "m02" && !a.fundamento : a.modulo_id === modulo));
  const aula = aulas.find((a) => a.codigo === escolhida) ?? aulas.find((a) => !dados.assistidas.has(a.codigo)) ?? aulas[0];
  const idx = aula ? aulas.indexOf(aula) : -1;
  const proxima = idx >= 0 ? aulas[idx + 1] : undefined;
  const vista = aula ? dados.assistidas.has(aula.codigo) : false;
  const entregue = f ? dados.provas.get(f.codigo) : undefined;
  const pilar = f ? pilarDe(f.codigo) : null;
  const href = (a: Aula) => `/cursos/fundamento?c=${c}&a=${a.codigo}`;
  const titulo = f ? `${f.codigo} · ${f.titulo}` : c === "bonus" ? "Bônus · Contratar certo" : m?.titulo ?? "";
  const ferramentas = dados.ferramentas.filter((x) => (f ? x.fundamento === f.codigo : x.modulo_id === modulo && !x.fundamento));

  return (
    <>
      <Link className="voltar" href="/cursos"><Icone nome="back" tamanho={16} /> Curso{f ? ` · Pilar ${pilar} · ${PILARES[pilar!]}` : ""}</Link>
      {f && estado === "ja-funciona" && !entregue && <div className="aviso ok mt">No seu Raio-X este fundamento já funciona. Pode pular as aulas e ir direto para a prova.</div>}
      {erro && <div className="aviso mt">{erro}</div>}

      <div className="mb-aula mt">
        <div>
          <Player a={aula} capa={{ codigo: f ? f.codigo : c === "bonus" ? "+" : c === "fim" ? `${t.placar}/16` : "0", pilar, topo: aula ? nomeAula(aula) : titulo }} />
          <div className="mb-aula-info">
            <span className="mb-olho" style={{ color: "var(--red)" }}>{titulo}</span>
            <h1>{aula ? nomeAula(aula) : titulo}</h1>
            <div className="linha" style={{ gap: 12 }}>
              <small className="mudo">{aula?.duracao ? `${aula.duracao} min` : "até 15 min"}{aulas.length > 1 ? ` · aula ${idx + 1} de ${aulas.length}` : ""}</small>
            </div>
            {aula && aula.topicos.length > 0 && <div className="mb-topicos">{aula.topicos.map((x) => <span key={x}>{x}</span>)}</div>}
            {aula && (
              <div className="linha mt" style={{ gap: 10 }}>
                <button type="button" className={vista ? "btn s" : "btn p"} onClick={() => fazer(() => marcarAula(portal.id, aula.codigo, !vista))}>
                  <Icone nome="check" /> {vista ? "Aula assistida" : "Marcar como assistida"}
                </button>
                {proxima && <Link className="btn s" href={href(proxima)}>Próxima aula →</Link>}
              </div>
            )}
          </div>
        </div>

        <aside className="mb-lista">
          <div className="mb-lista-cab">
            <small>{f ? `Fundamento ${f.codigo}` : "Aulas"}</small>
            <b>{f ? f.titulo : titulo}</b>
            <div className="barra mt" style={{ height: 6 }}><i style={{ width: `${(aulas.filter((a) => dados.assistidas.has(a.codigo)).length / Math.max(aulas.length, 1)) * 100}%` }} /></div>
          </div>
          {aulas.map((a, i) => {
            const v = dados.assistidas.has(a.codigo);
            return (
              <Link key={a.id} href={href(a)} className={`mb-item${v ? " vista" : ""}${a.codigo === aula?.codigo ? " ativo" : ""}`}>
                <span className="bola">{v ? "✓" : i + 1}</span>
                <div><b>{nomeAula(a)}</b><small>{a.duracao ? `${a.duracao} min` : "até 15 min"}</small></div>
              </Link>
            );
          })}
          {f && <a href="#missao" className="mb-item"><span className="bola">★</span><div><b>Missão e prova</b><small>Para liberar o próximo fundamento</small></div></a>}
        </aside>
      </div>

      {c === "aula-0" && (
        <div className="mb-blocos">
          <div className="mb-bloco escuro" style={{ gridColumn: "span 2" }}>
            <small>Missão antes da aula 1</small>
            <h3>Preencher o Raio-X e a Foto do Dia Zero</h3>
            <p>{t.raioxFeito ? "Raio-X preenchido. Seu radar já mostra por onde começar." : "Dê nota 0, 1 ou 2 para os 16 fundamentos. Leva poucos minutos."}</p>
            <div><Link className="btn-play" href="/cursos/raio-x">{t.raioxFeito ? "Ver meu Raio-X" : "Fazer o Raio-X agora"}</Link></div>
          </div>
          <Ferramentas itens={ferramentas} />
        </div>
      )}

      {c === "bonus" && <div className="mb-blocos"><Ferramentas itens={ferramentas} /></div>}

      {c === "fim" && (
        <div className="card mt">
          <h2>Seu Manual · {t.placar}/16 provas</h2>
          <div className="grade g2" style={{ gap: 6 }}>
            {dados.fundamentos.map((x) => (
              <div key={x.codigo} className="linha entre marcar" style={{ cursor: "default" }}>
                <span>{x.codigo} · {x.titulo}</span>
                {dados.provas.has(x.codigo) ? <span className="selo feito">✓ {dataCurta(dados.provas.get(x.codigo))}</span> : <span className="selo espera">pendente</span>}
              </div>
            ))}
          </div>
          <p className="ajuda">{t.porPilar.filter((p) => p.feitos === p.total).map((p) => `Selo ${p.nome}`).join(" · ") || "Complete um pilar inteiro para ganhar o primeiro selo."}</p>
        </div>
      )}

      {f && (
        <div className="mb-blocos" id="missao">
          <Ferramentas itens={ferramentas} />
          <div className="mb-bloco">
            <small>Missão de 7 dias</small>
            <h3>{f.missao}</h3>
            {f.efeito && <p>O efeito: {f.efeito.charAt(0).toLowerCase() + f.efeito.slice(1)}.</p>}
          </div>
          <div className="mb-bloco escuro">
            <small>Prova · libera o próximo fundamento</small>
            <h3>{f.prova}</h3>
            {entregue ? (
              <>
                <p>Entregue em {dataCurta(entregue)}. +1 no seu Placar Magnético.</p>
                <div className="linha" style={{ gap: 8 }}>
                  {t.atual ? <Link className="btn-play" href={`/cursos/fundamento?c=${t.atual.codigo}`}>Próximo: {t.atual.codigo} →</Link>
                    : <Link className="btn-play" href="/cursos/fundamento?c=fim">Montar o Manual →</Link>}
                  <button className="btn-vidro" type="button" onClick={() => fazer(() => marcarProva(portal.id, f.codigo, false))}>Desfazer</button>
                </div>
              </>
            ) : (
              <>
                <p>Quando cumprir a missão e tiver a prova em mãos, marque aqui. É autoavaliação: vale a sua palavra.</p>
                <div>
                  <button className="btn-play" type="button" onClick={() => { if (confirm(`Você entregou a prova?\n\n${f.prova}`)) fazer(() => marcarProva(portal.id, f.codigo, true)); }}>
                    <Icone nome="check" /> Entreguei a prova
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Fundamento /></Suspense>;
}
