"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CamposPessoa } from "@/components/CamposPessoa";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { LETRAS, buscarMetodo, buscarPessoas, linkDoTeste, pessoaDesligar, pessoaSalvar, principal, retornoFeito } from "@/lib/pessoas";
import { BASE } from "@/lib/config";
import { dataCurta, dia } from "@/lib/formato";

function Pessoa() {
  const id = useSearchParams().get("id") ?? "";
  const { portal } = usePortal();
  const [editar, setEditar] = useState(false);
  const [erro, setErro] = useState("");
  const [link, setLink] = useState("");
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarPessoas(portal.id)), m: await buscarMetodo() }), [portal.id]);
  if (!dados) return <Carregando />;
  const { m } = dados;
  const PERFIS = m.perfis, MOTORES = m.motores;
  const p = dados.pessoas.find((x) => x.id === id);
  if (!p) return <div className="card">Pessoa não encontrada.</div>;
  const pr = principal(p.perfil);
  const perfil = pr ? PERFIS[pr.letra] : null;
  const total = p.perfil ? Object.values(p.perfil).reduce((a, b) => a + b, 0) : 0;
  const retornos = dados.retornos.filter((r) => r.pessoa_id === p.id);
  const fichas = dados.fichas.filter((f) => f.pessoa_id === p.id);

  return (
    <>
      <Titulo voltar={{ href: "/pessoas", rotulo: "Minha equipe" }} titulo={p.nome} sub={[p.funcao, p.entrada ? `na loja desde ${dia(p.entrada)}` : null, p.motor ? `motor: ${p.motor} (${MOTORES[p.motor]})` : null].filter(Boolean).join(" · ")} />
      <div className="linha mb">
        <Link className="btn p" href={`/pessoas/teste?id=${p.id}`}>{p.perfil ? "Refazer o teste de perfil" : "Fazer o teste de perfil"}</Link>
        <button className="btn s" type="button" onClick={async () => {
          setErro("");
          try { setLink(await linkDoTeste(p.id, `${window.location.origin}${BASE}`)); } catch (e) { setErro((e as Error).message); }
        }}>Enviar o teste pelo link</button>
        <Link className="btn s" href={`/pessoas/retorno?pessoa=${p.id}`}>Dar retorno</Link>
        <Link className="btn s" href={`/pessoas/desenvolvimento?pessoa=${p.id}`}>Ficha de desenvolvimento</Link>
        <button className="btn s" type="button" onClick={() => setEditar(!editar)}>Editar dados</button>
      </div>
      {erro && !editar && <div className="aviso mb">{erro}</div>}
      {link && (() => {
        const nome = p.nome.split(" ")[0];
        const msg = `Oi, ${nome}! Responde este teste rapidinho? Leva uns 5 minutos e não tem resposta certa: é para a gente te conhecer melhor e saber como te ajudar no dia a dia.\n\n${link}`;
        return (
          <div className="card mb card-borda" style={{ ["--c" as string]: "var(--red)" }}>
            <b>Link do teste de {nome}</b>
            <p className="mudo" style={{ margin: "4px 0 10px" }}>Abre só o teste, no celular da pessoa, sem login e sem acesso ao resto do portal. Vale para uma resposta: quando a pessoa enviar, o perfil aparece aqui e o link deixa de abrir.</p>
            <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
            <div className="linha mt" style={{ gap: 8 }}>
              <Copiar texto={msg} rotulo="Copiar mensagem com o link" />
              <a className="btn s peq" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener">Enviar no WhatsApp</a>
            </div>
          </div>
        );
      })()}
      {editar && (
        <form className="card mb" action={async (f) => {
          setErro("");
          try { await pessoaSalvar(portal.id, p.id, f); setEditar(false); recarregar(); } catch (e) { setErro((e as Error).message); }
        }}>
          <CamposPessoa p={p} m={m} />
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt">
            <button className="btn p" type="submit">Salvar</button>
            <button className="btn s" type="button" onClick={async () => { if (confirm(`${p.nome} saiu da loja?`)) { await pessoaDesligar(p.id, false); recarregar(); } }}>Saiu da loja</button>
          </div>
        </form>
      )}

      {!perfil ? (
        <div className="card mb">
          <h2>Ainda sem perfil</h2>
          <p className="mudo">São 24 situações de loja: em cada uma, a frase que mais parece e a que menos parece com a pessoa. Mande o link para ela responder no celular dela, ou responda você, pelo que observa no dia a dia.</p>
        </div>
      ) : (
        <div className="grade g2 mb">
          <div className="card card-borda" style={{ ["--c" as string]: perfil.cor }}>
            <small className="mudo">PERFIL {pr!.letra}{pr!.segunda ? ` COM TRAÇOS DE ${pr!.segunda}` : ""} · {p.respondido_por === "pessoa" ? "respondido pela pessoa" : "pela observação do líder"} · {dia(p.perfil_em)}</small>
            <h2 style={{ margin: "6px 0" }}>{perfil.nome}</h2>
            <p style={{ marginTop: 0 }}>{perfil.resumo}</p>
            {LETRAS.map((l) => (
              <div key={l} className="mb" style={{ marginBottom: 8 }}>
                <div className="linha entre" style={{ fontSize: 13 }}><span>{l} · {PERFIS[l].nome}</span><span>{Math.round(((p.perfil![l] ?? 0) / total) * 100)}%</span></div>
                <div className="barra"><i style={{ width: `${((p.perfil![l] ?? 0) / total) * 100}%`, background: PERFIS[l].cor }} /></div>
              </div>
            ))}
            <p className="ajuda">{m.textos.perfil_regra}</p>
          </div>
          <div className="card">
            <h2>Como agir com {p.nome.split(" ")[0]}</h2>
            <p><b>Pontos fortes:</b> {perfil.forte.join(" · ")}</p>
            <p><b>Cuidado com:</b> {perfil.cuidado.join(" · ")}</p>
            <p><b>O que motiva:</b> {perfil.motivar}</p>
            <p><b>Como dar retorno:</b> {perfil.retorno}</p>
            <p><b>Como cobrar:</b> {perfil.cobrar}</p>
            <p><b>Como ensinar:</b> {perfil.ensinar}</p>
            <p><b>Evite:</b> {perfil.evitar}</p>
            <p style={{ marginBottom: 0 }}><b>Onde rende mais na loja:</b> {perfil.rende}</p>
            {pr!.segunda && <p className="ajuda">Tem traços de {PERFIS[pr!.segunda].nome}: {PERFIS[pr!.segunda].resumo.toLowerCase()}</p>}
          </div>
        </div>
      )}

      <div className="grade g2">
        <div className="card">
          <h2>Retornos</h2>
          {retornos.length === 0 && <p className="mudo">Nenhum retorno registrado.</p>}
          {retornos.map((r) => (
            <details key={r.id} className="marcar" style={{ display: "block" }}>
              <summary style={{ cursor: "pointer" }}>
                <span className={`selo ${r.tipo === "Reconhecer" ? "feito" : "alerta"}`} style={{ marginRight: 8 }}>{r.tipo}</span>
                {dataCurta(r.created_at)} · {r.situacao.slice(0, 60)}{r.situacao.length > 60 ? "…" : ""} {r.feito ? "· ✓ conversado" : ""}
              </summary>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13.5 }}>{r.roteiro}</pre>
              <label className="marcar"><input type="checkbox" checked={r.feito} onChange={async (e) => { await retornoFeito(r.id, e.target.checked); recarregar(); }} /><span>Já conversei</span></label>
            </details>
          ))}
        </div>
        <div className="card">
          <h2>Fichas de desenvolvimento</h2>
          {fichas.length === 0 && <p className="mudo">Nenhuma habilidade do mês ainda.</p>}
          {fichas.map((f) => (
            <div key={f.id} className="marcar" style={{ display: "block", cursor: "default" }}>
              <span className={`selo ${f.status === "Concluído" ? "feito" : "andamento"}`} style={{ marginRight: 8 }}>{f.status}</span>
              <b>{f.competencia}</b> · {f.estagio}{f.prazo ? ` · até ${dia(f.prazo)}` : ""}
              <div className="mudo" style={{ fontSize: 13 }}>Como vou saber que aprendeu: {f.objetivo}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Pessoa /></Suspense>;
}
