"use client";

import { espelho, pontuar, type Conteudo, type Papel, type Respostas } from "@/lib/lojista";

/** O que a pessoa vê depois de responder: o perfil de condução, o espelho e as perguntas para pensar.
 * O índice e a prontidão não aparecem aqui: são só da equipe. */
export function RetornoLojista({ c, r, papel, nome }: { c: Conteudo; r: Respostas; papel: Papel; nome: string }) {
  const res = pontuar(c, r, papel);
  const perfil = res.principal ? c.B.perfis[res.principal] : null;
  const apoio = res.apoio ? c.B.perfis[res.apoio] : null;
  const imagem = res.faixa === "imagem";
  const reflexao = imagem ? c.retorno.reflexao_imagem : c.retorno.reflexao_equilibrada;
  const notas = c.D.habilidades.map((h, i) => ({ ...h, nota: Number(r.D.notas[i]) || 0 })).filter((h) => h.nota > 0).sort((a, b) => b.nota - a.nota);
  const fortes = notas.slice(0, 2), cuidar = notas.slice(-2).reverse();

  return (
    <>
      <div className="card mb">
        <h1 style={{ margin: "0 0 6px" }}>Seu retrato, {nome}</h1>
        <p className="mudo" style={{ margin: 0 }}>{c.retorno.intro}</p>
      </div>

      {perfil && (
        <div className="card mb">
          <div className="secao" style={{ marginTop: 0 }}>Como você conduz a loja</div>
          <h2 style={{ margin: "0 0 4px" }}>{perfil.nome}</h2>
          <p style={{ margin: "0 0 10px" }}>{perfil.resumo}</p>
          <p style={{ margin: "0 0 6px" }}><b>O seu ponto forte:</b> {perfil.forte}</p>
          <p style={{ margin: 0 }}><b>Onde vale prestar atenção:</b> {perfil.cuidado}</p>
          {apoio && <p className="ajuda" style={{ marginBottom: 0 }}>Em segundo lugar, você também tem um jeito de {apoio.nome.toLowerCase()}: {apoio.resumo.toLowerCase()}</p>}
        </div>
      )}

      <div className="card mb">
        <div className="secao" style={{ marginTop: 0 }}>{c.retorno.espelho_titulo}</div>
        {espelho(c, r, papel).map((x) => (
          <div key={x.titulo} style={{ marginBottom: 12 }}>
            <b>{x.titulo}</b>
            {x.linhas.map((l) => <p key={l} style={{ margin: "2px 0 0" }}>{l}</p>)}
          </div>
        ))}
        <p style={{ margin: "14px 0 6px" }}>{imagem ? c.retorno.texto_imagem : c.retorno.texto_equilibrada}</p>
        <div className="aviso ok">
          <b>Para pensar com calma:</b>
          <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}>{reflexao.map((q) => <li key={q}>{q}</li>)}</ol>
        </div>
      </div>

      {notas.length > 0 && (
        <div className="card mb">
          <div className="secao" style={{ marginTop: 0 }}>Suas habilidades, do seu ponto de vista</div>
          <p style={{ margin: "0 0 4px" }}><b>Onde você se vê mais forte:</b> {fortes.map((h) => h.nome.split(":")[0]).join(" · ")}</p>
          <p style={{ margin: 0 }}><b>Onde você mais quer desenvolver:</b> {cuidar.map((h) => h.nome.split(":")[0]).join(" · ")}</p>
        </div>
      )}

      <div className="card mb"><b>Próximo passo</b><p style={{ margin: "4px 0 0" }}>{c.retorno.proximo_passo}</p></div>
    </>
  );
}
