"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import {
  PILARES, ROTULO_ESTADO, buscarCurso, embedVideo, marcarAula, marcarProva, nomeAula, pilarDe, trilha,
  type Aula, type Ferramenta,
} from "@/lib/curso";
import { dataCurta } from "@/lib/formato";

function CardAula({ a, vista, aoMarcar }: { a: Aula; vista: boolean; aoMarcar: (v: boolean) => void }) {
  const [marcada, setMarcada] = useState(vista);
  useEffect(() => setMarcada(vista), [vista]);
  const embed = a.video_url ? embedVideo(a.video_url) : null;
  return (
    <div className="card">
      {embed ? (
        <iframe src={embed} title={a.titulo} style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 12, marginBottom: 12 }} allowFullScreen />
      ) : (
        <div style={{ aspectRatio: "16/9", borderRadius: 12, background: "var(--grad)", display: "grid", placeItems: "center", color: "#fff", marginBottom: 12, textAlign: "center" }}>
          <div><Icone nome="play" tamanho={36} /><div style={{ fontSize: 13, opacity: 0.9 }}>{a.video_url ? "Abrir a aula" : "Aula em gravação"}</div></div>
        </div>
      )}
      <h3 style={{ marginBottom: 4 }}>{nomeAula(a)}</h3>
      <small className="mudo">{a.duracao ? `${a.duracao} min` : "até 15 min"}</small>
      {a.topicos.length > 0 && <ul style={{ paddingLeft: 18, margin: "10px 0" }}>{a.topicos.map((t) => <li key={t} style={{ marginBottom: 4 }}>{t}</li>)}</ul>}
      {a.video_url && !embed && <p><a href={a.video_url} target="_blank" rel="noopener">Abrir a aula →</a></p>}
      <label className="marcar"><input type="checkbox" checked={marcada} onChange={(e) => { setMarcada(e.target.checked); aoMarcar(e.target.checked); }} /><span>Assisti esta aula</span></label>
    </div>
  );
}

function ListaFerramentas({ itens }: { itens: Ferramenta[] }) {
  if (!itens.length) return null;
  return (
    <div className="card mb">
      <h2>Ferramentas</h2>
      {itens.map((f) => {
        const noHub = f.formato === "No Hub" && f.nome.startsWith("Raio-X") ? "/cursos/raio-x" : null;
        return (
          <div key={f.id} className="linha entre marcar" style={{ cursor: "default" }}>
            <span><span className="selo espera" style={{ marginRight: 8 }}>{f.formato}</span>{f.nome}</span>
            {noHub ? <Link className="btn p peq" href={noHub}>Abrir</Link>
              : f.url ? <a className="btn p peq" href={f.url} target="_blank" rel="noopener">Abrir</a>
              : <span className="mudo" style={{ fontSize: 13 }}>em produção</span>}
          </div>
        );
      })}
    </div>
  );
}

function Fundamento() {
  const c = useSearchParams().get("c") ?? "aula-0";
  const { portal, equipe } = usePortal();
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(() => buscarCurso(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const t = trilha(dados, equipe);
  const fazer = async (acao: () => Promise<void>) => {
    setErro("");
    try { await acao(); recarregar(); } catch (e) { setErro((e as Error).message); }
  };
  const aulas = (filtro: (a: Aula) => boolean) => dados.aulas.filter(filtro).map((a) => (
    <CardAula key={a.id} a={a} vista={dados.assistidas.has(a.codigo)} aoMarcar={(v) => fazer(() => marcarAula(portal.id, a.codigo, v))} />
  ));
  const voltar = { href: "/cursos", rotulo: "Curso" };

  // Aula 0, bônus e encerramento não têm prova própria.
  if (c === "aula-0" || c === "bonus" || c === "fim") {
    const modulo = c === "aula-0" ? "aula-0" : c === "bonus" ? "m02" : "encerramento";
    const m = dados.modulos.find((x) => x.id === modulo);
    return (
      <>
        <Titulo voltar={voltar} titulo={c === "bonus" ? "Bônus · Contratar certo" : m?.titulo ?? ""} sub={c === "bonus" ? "Anúncio, entrevista e os primeiros 30 dias de quem entra." : m?.promessa ?? ""} />
        {c === "aula-0" && (
          <div className="card card-borda mb" style={{ ["--c" as string]: t.raioxFeito ? "var(--green)" : "var(--red)" }}>
            <h2>Missão: preencher o Raio-X e a Foto do Dia Zero antes da aula 1</h2>
            <p className="mudo" style={{ marginTop: 0 }}>{t.raioxFeito ? "Raio-X preenchido. Seu radar já mostra por onde começar." : "Dê nota 0, 1 ou 2 para os 16 fundamentos. Leva poucos minutos."}</p>
            <Link className="btn p" href="/cursos/raio-x">{t.raioxFeito ? "Ver meu Raio-X" : "Fazer o Raio-X agora"}</Link>
          </div>
        )}
        {c === "fim" && (
          <div className="card mb">
            <h2>Seu Manual · {t.placar}/16 provas</h2>
            <div className="grade g2" style={{ gap: 6 }}>
              {dados.fundamentos.map((f) => (
                <div key={f.codigo} className="linha entre marcar" style={{ cursor: "default" }}>
                  <span>{f.codigo} · {f.titulo}</span>
                  {dados.provas.has(f.codigo) ? <span className="selo feito">✓ {dataCurta(dados.provas.get(f.codigo))}</span> : <span className="selo espera">pendente</span>}
                </div>
              ))}
            </div>
            <p className="ajuda">{t.porPilar.filter((p) => p.feitos === p.total).map((p) => `Selo ${p.nome}`).join(" · ") || "Complete um pilar inteiro para ganhar o primeiro selo."}</p>
          </div>
        )}
        {erro && <div className="aviso mb">{erro}</div>}
        <div className="grade g2 mb">{aulas((a) => (c === "bonus" ? a.modulo_id === "m02" && !a.fundamento : a.modulo_id === modulo))}</div>
        <ListaFerramentas itens={dados.ferramentas.filter((f) => f.modulo_id === modulo && !f.fundamento)} />
      </>
    );
  }

  const f = dados.fundamentos.find((x) => x.codigo === c);
  if (!f) return <div className="card">Fundamento não encontrado.</div>;
  const estado = t.estado.get(f.codigo)!;
  const anterior = t.atual;
  const seguinte = t.atual; // o próximo que ainda precisa de prova (o que já funciona não trava)
  const entregue = dados.provas.get(f.codigo);

  return (
    <>
      <Titulo
        voltar={voltar}
        titulo={`${f.codigo} · ${f.titulo}`}
        sub={<>{f.promessa ?? `Pilar ${pilarDe(f.codigo)} · ${PILARES[pilarDe(f.codigo)]}`} <span className={`selo ${ROTULO_ESTADO[estado].classe}`} style={{ marginLeft: 6 }}>{ROTULO_ESTADO[estado].texto}</span></>}
      />
      {estado === "bloqueado" ? (
        <div className="card">
          <h2>Este fundamento abre depois da prova anterior</h2>
          <p className="mudo">Regra de ouro do curso: só avança quando entrega a prova.{anterior ? ` Agora o seu foco é ${anterior.codigo} · ${anterior.titulo}.` : ""}</p>
          {anterior && <Link className="btn p" href={`/cursos/fundamento?c=${anterior.codigo}`}>Ir para {anterior.codigo}</Link>}
        </div>
      ) : (
        <>
          {estado === "ja-funciona" && !entregue && (
            <div className="aviso ok mb">No seu Raio-X este fundamento já funciona. Pode pular as aulas e ir direto para a prova.</div>
          )}
          {erro && <div className="aviso mb">{erro}</div>}
          <div className="grade g2 mb">{aulas((a) => a.fundamento === f.codigo)}</div>
          <ListaFerramentas itens={dados.ferramentas.filter((x) => x.fundamento === f.codigo)} />
          <div className="grade g2">
            <div className="card card-borda" style={{ ["--c" as string]: "var(--orange)" }}>
              <small className="mudo">MISSÃO DE 7 DIAS</small>
              <h2 style={{ margin: "6px 0" }}>{f.missao}</h2>
              {f.efeito && <p className="mudo" style={{ margin: 0 }}>O efeito: {f.efeito.charAt(0).toLowerCase() + f.efeito.slice(1)}.</p>}
            </div>
            <div className="card card-borda" style={{ ["--c" as string]: entregue ? "var(--green)" : "var(--red)" }}>
              <small className="mudo">PROVA</small>
              <h2 style={{ margin: "6px 0" }}>{f.prova}</h2>
              {entregue ? (
                <>
                  <p className="mudo" style={{ marginTop: 0 }}>Entregue em {dataCurta(entregue)}. +1 no seu Placar Magnético.</p>
                  <div className="linha">
                    {seguinte && <Link className="btn p" href={`/cursos/fundamento?c=${seguinte.codigo}`}>Próximo: {seguinte.codigo} · {seguinte.titulo} →</Link>}
                    {!seguinte && <Link className="btn p" href="/cursos/fundamento?c=fim">Montar o Manual →</Link>}
                    <button className="btn s peq" type="button" onClick={() => fazer(() => marcarProva(portal.id, f.codigo, false))}>Desfazer</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mudo" style={{ marginTop: 0 }}>Quando cumprir a missão e tiver a prova em mãos, marque aqui. É autoavaliação: vale a sua palavra.</p>
                  <button
                    className="btn p"
                    type="button"
                    onClick={() => { if (confirm(`Você entregou a prova?\n\n${f.prova}`)) fazer(() => marcarProva(portal.id, f.codigo, true)); }}
                  >Entreguei a prova</button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Fundamento /></Suspense>;
}
