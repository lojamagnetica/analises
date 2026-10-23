"use client";

import Link from "next/link";
import { useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { NOTAS, PILARES, buscarCurso, pilarDe, salvarNota } from "@/lib/curso";

/** Radar dos 4 pilares: cada eixo vai de 0 a 8 pontos (4 fundamentos × nota 2). */
function Radar({ valores }: { valores: { nome: string; pontos: number }[] }) {
  const c = 150, r = 100;
  const ponto = (i: number, frac: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / valores.length;
    return [c + Math.cos(ang) * r * frac, c + Math.sin(ang) * r * frac];
  };
  const poligono = (frac: (i: number) => number) => valores.map((_, i) => ponto(i, frac(i)).join(",")).join(" ");
  return (
    <svg viewBox="-80 -6 460 312" style={{ width: "100%", maxWidth: 420, display: "block", margin: "0 auto" }} role="img" aria-label="Radar dos 4 pilares">
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={poligono(() => f)} fill="none" stroke="var(--line)" />)}
      {valores.map((_, i) => { const [x, y] = ponto(i, 1); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" />; })}
      <polygon points={poligono((i) => Math.max(0.04, valores[i].pontos / 8))} fill="var(--red)" fillOpacity={0.22} stroke="var(--red)" strokeWidth={2} />
      {valores.map((v, i) => {
        const [x, y] = ponto(i, 1.22);
        return (
          <text key={v.nome} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11.5} fill="var(--ink)">
            <tspan x={x} dy="-0.4em" fontWeight={700}>{v.nome}</tspan>
            <tspan x={x} dy="1.2em" fill="var(--muted)">{v.pontos}/8</tspan>
          </text>
        );
      })}
    </svg>
  );
}

export default function RaioX() {
  const { portal } = usePortal();
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(() => buscarCurso(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const notas = dados.notas;
  const respondidos = dados.fundamentos.filter((f) => notas.has(f.codigo)).length;
  const completo = respondidos === dados.fundamentos.length;
  const pilares = Object.keys(PILARES).map((p) => ({
    pilar: p, nome: PILARES[p],
    pontos: dados.fundamentos.filter((f) => pilarDe(f.codigo) === p).reduce((s, f) => s + (notas.get(f.codigo) ?? 0), 0),
  }));
  const funcionando = dados.fundamentos.filter((f) => notas.get(f.codigo) === 2).length;
  const comeco = dados.fundamentos.find((f) => notas.get(f.codigo) !== 2);
  const maisFraco = [...pilares].sort((a, b) => a.pontos - b.pontos)[0];
  const resumo = [
    `Raio-X · ${portal.loja}`,
    ...pilares.map((p) => `${p.pilar} ${p.nome}: ${p.pontos}/8`),
    `Funcionando toda semana: ${funcionando}/16`,
    ...dados.fundamentos.map((f) => `${f.codigo} ${f.titulo}: ${NOTAS[notas.get(f.codigo) ?? 0].rotulo}`),
    comeco ? `Por onde começar: ${comeco.codigo} ${comeco.titulo}` : "Todos os fundamentos funcionando",
  ].join("\n");

  return (
    <>
      <Titulo voltar={{ href: "/cursos/fundamento?c=aula-0", rotulo: "Aula 0" }} titulo="Raio-X da sua loja" sub="Para cada fundamento, a nota de hoje: 0 não existe, 1 existe mas não roda sempre, 2 funciona toda semana. Seja sincero(a): o radar só ajuda se for verdade." />
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="grade g2">
        <div>
          {Object.keys(PILARES).map((p) => (
            <div key={p} className="card mb">
              <h2>{p} · {PILARES[p]}</h2>
              {dados.fundamentos.filter((f) => pilarDe(f.codigo) === p).map((f) => (
                <div key={f.codigo} className="linha entre marcar" style={{ cursor: "default" }}>
                  <span style={{ minWidth: 160 }}>{f.codigo} · {f.titulo}</span>
                  <div className="linha" style={{ gap: 6, flexWrap: "nowrap" }} role="group" aria-label={`Nota de ${f.titulo}`}>
                    {NOTAS.map((n) => (
                      <button
                        key={n.nota}
                        type="button"
                        title={n.ajuda}
                        aria-pressed={notas.get(f.codigo) === n.nota}
                        className={`btn peq ${notas.get(f.codigo) === n.nota ? "p" : "s"}`}
                        onClick={async () => {
                          setErro("");
                          try { await salvarNota(portal.id, f.codigo, n.nota); recarregar(); } catch (e) { setErro((e as Error).message); }
                        }}
                      >{n.nota} · {n.rotulo}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div>
          <div className="card mb" style={{ position: "sticky", top: 16 }}>
            <h2>Seu radar</h2>
            <Radar valores={pilares.map((p) => ({ nome: p.nome, pontos: p.pontos }))} />
            <p className="mudo" style={{ textAlign: "center" }}>{respondidos}/16 respondidos · {funcionando}/16 funcionando toda semana</p>
            {completo ? (
              <>
                <div className="aviso ok mb">
                  O pilar mais fraco hoje é <b>{maisFraco.nome}</b>.
                  {comeco ? <> Pela ordem do curso, comece por <b>{comeco.codigo} · {comeco.titulo}</b>.</> : " Todos os fundamentos já funcionam: vá direto às provas."}
                </div>
                <div className="linha">
                  {comeco && <Link className="btn p" href={`/cursos/fundamento?c=${comeco.codigo}`}>Começar {comeco.codigo} →</Link>}
                  <Copiar texto={resumo} rotulo="Copiar resultado" />
                </div>
                <p className="ajuda">Na mentoria, mande o resultado para a sua CS antes do diagnóstico. No Contrato de Foco (aula 0.4) você escolhe o resultado número 1 dos próximos 90 dias a partir deste radar.</p>
              </>
            ) : (
              <p className="ajuda">Responda os 16 para ver por onde começar.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
