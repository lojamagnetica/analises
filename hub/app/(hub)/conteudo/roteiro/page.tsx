"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Trancado } from "@/components/Trancado";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { variaveisDaLoja } from "@/lib/scripts";
import {
  COR_OBJETIVO, camposDe, carregarConteudo, ctaDe, ganchoDe, montarLegenda, postSalvar, postsCriar, preencherCampos, roteirosDaLoja, textoDoRoteiro,
} from "@/lib/instagram";

const AUTOMATICOS = ["gancho com outras palavras", "CTA"];

function Gerador() {
  const params = useSearchParams();
  const router = useRouter();
  const postId = params.get("post");
  const { portal, pers, comoLoja } = usePortal();
  const [modelo, setModelo] = useState(params.get("m") ?? "");
  const [v, setV] = useState<Record<string, string>>({});
  const [gancho, setGancho] = useState("");
  const [cta, setCta] = useState("");
  const [data, setData] = useState(hoje());
  const [check, setCheck] = useState<number[]>([]);
  const [aviso, setAviso] = useState("");
  const { dados } = useDados(() => carregarConteudo(portal.id, comoLoja), [portal.id, comoLoja]);
  const post = dados?.posts.find((p) => p.id === postId) ?? null;
  useEffect(() => { if (post?.data) setData(post.data); }, [post?.data]);
  if (!dados) return <Carregando />;
  const { m, a } = dados;
  if (!a) return <Trancado titulo="Criar roteiro" texto={m.textos.trancado} />;

  const roteiros = roteirosDaLoja(m, a);
  const r = roteiros.find((x) => x.id === modelo) ?? roteiros[0];
  const loja = variaveisDaLoja(pers.get(2)?.respostas, portal.loja);
  const vals = { ...loja, ...v };
  const campos = camposDe([...r.linhas.map((l) => l.fala), ...m.legenda.linhas, gancho]).filter((c) => !AUTOMATICOS.includes(c) && !loja[c]);
  const ganchoFinal = preencherCampos(gancho || ganchoDe(r), vals);
  const ctaFinal = cta || ctaDe(r, vals);
  const roteiro = textoDoRoteiro({ ...r, linhas: r.linhas.map((l, i) => (i === 0 && gancho ? { ...l, fala: gancho } : /^cta/i.test(l.rotulo) && cta ? { ...l, fala: cta } : l)) }, vals);
  const legenda = montarLegenda(m, { ...vals, "gancho com outras palavras": v["gancho com outras palavras"] || ganchoFinal, CTA: ctaFinal });
  const faltam = campos.filter((c) => !v[c]?.trim()).length;
  const ganchos = [...m.ganchos.map((g) => ({ tipo: g.tipo, texto: g.texto })), ...a.ganchos.map((g) => ({ tipo: "Da sua análise", texto: g.match(/^[^:"]+:\s*"(.*)"$/)?.[1] ?? g }))];

  const salvar = async () => {
    const campos = { modelo: r.id, formato: r.formato.includes("Carrossel") ? "Carrossel" : "Reels", objetivo: r.objetivo, gancho: ganchoFinal, roteiro, cta: ctaFinal, legenda, data };
    if (post) { await postSalvar(post.id, { ...campos, status: post.status === "Ideia" ? "Roteiro" : post.status }); setAviso("Post atualizado na programação."); }
    else { await postsCriar([{ portal_id: portal.id, hora: dados.conteudo.ajustes.hora || m.textos.hora_padrao, tema: r.nome, origem: "roteiro", status: "Roteiro", ...campos }]); setAviso("Post salvo na programação."); }
    setTimeout(() => router.push("/conteudo/semana"), 900);
  };

  return (
    <>
      <Titulo voltar={{ href: "/conteudo/semana", rotulo: "Programação da semana" }} titulo="Criar roteiro" sub={m.textos.roteiro_sub} />
      {post && <div className="aviso mb">Preenchendo o post de {post.data.split("-").reverse().join("/")}: {post.tema}</div>}
      {aviso && <div className="aviso ok mb">{aviso}</div>}
      <div className="grade g2">
        <div>
          <div className="card mb">
            <label className="rotulo">Modelo</label>
            <select value={r.id} onChange={(e) => { setModelo(e.target.value); setGancho(""); setCta(""); }}>
              {roteiros.map((x) => <option key={x.id} value={x.id}>{x.nome} · {x.formato} · {x.objetivo}</option>)}
            </select>
            <p className="ajuda"><span style={{ color: COR_OBJETIVO[r.objetivo], fontWeight: 700 }}>{r.objetivo}</span> · {m.objetivos[r.objetivo]?.texto} {r.quando}</p>

            <label className="rotulo">Gancho</label>
            <select value={gancho} onChange={(e) => setGancho(e.target.value)}>
              <option value="">O do modelo: {ganchoDe(r)}</option>
              {ganchos.map((g, i) => <option key={i} value={g.texto}>{g.tipo}: {g.texto}</option>)}
            </select>
            <label className="rotulo">CTA</label>
            <select value={cta} onChange={(e) => setCta(e.target.value)}>
              <option value="">A do modelo: {ctaDe(r)}</option>
              {m.ctas.map((c, i) => <option key={i} value={c.fala}>{c.situacao}: {c.fala}</option>)}
            </select>
          </div>
          <div className="card">
            <b>Preencha com a sua peça</b> {faltam > 0 && <small className="mudo">· faltam {faltam}</small>}
            {campos.map((c) => (
              <div key={c}><label className="rotulo">{c[0].toUpperCase() + c.slice(1)}</label><input type="text" value={v[c] ?? ""} onChange={(e) => setV({ ...v, [c]: e.target.value })} /></div>
            ))}
            <label className="rotulo">Legenda: o gancho com outras palavras <small className="mudo">(opcional)</small></label>
            <input type="text" value={v["gancho com outras palavras"] ?? ""} onChange={(e) => setV({ ...v, "gancho com outras palavras": e.target.value })} placeholder={ganchoFinal} />
          </div>
        </div>

        <div>
          <div className="card mb card-borda" style={{ ["--c" as string]: COR_OBJETIVO[r.objetivo] }}>
            <div className="linha entre"><h2 style={{ margin: 0 }}>O roteiro</h2><Copiar texto={roteiro} rotulo="Copiar roteiro" /></div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.55 }}>{roteiro}</pre>
            <small className="mudo">Até 30 segundos · música em alta · termina seco, sem despedida.</small>
          </div>
          <div className="card mb">
            <div className="linha entre"><h2 style={{ margin: 0 }}>A legenda</h2><Copiar texto={legenda} rotulo="Copiar legenda" /></div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.55 }}>{legenda}</pre>
            <p className="ajuda">{m.legenda.regras.join(" ")}</p>
          </div>
          <div className="card mb">
            <b>Checklist antes de publicar · {check.length}/{m.checklist.length}</b>
            {m.checklist.map((c, i) => (
              <label key={c} className="marcar"><input type="checkbox" checked={check.includes(i)} onChange={() => setCheck(check.includes(i) ? check.filter((x) => x !== i) : [...check, i])} /><span>{c}</span></label>
            ))}
          </div>
          <div className="card">
            <div className="linha" style={{ gap: 8 }}>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ maxWidth: 170 }} aria-label="Dia do post" />
              <button type="button" className="btn p" onClick={salvar}>{post ? "Atualizar o post" : "Salvar na programação"}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Gerador /></Suspense>;
}
