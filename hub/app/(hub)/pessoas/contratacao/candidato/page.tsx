"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { BASE } from "@/lib/config";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataHora, hoje } from "@/lib/formato";
import {
  ABERTAS, ETAPAS_CANDIDATO, NIVEL, OBSERVAR, PONTOS_ENTREVISTA, ROTEIRO, SOBRE_A_VAGA, buscarContratacao, contratar, excluirCandidato,
  linkDoTesteCandidato, notaTotal, resultadoTeste, salvarCandidato, type Candidato, type Entrevista,
} from "@/lib/contratacao";

function PaginaCandidato() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarContratacao(portal.id), [portal.id]);
  const c = dados?.candidatos.find((x) => x.id === id) ?? null;
  const vaga = dados?.vagas.find((v) => v.id === c?.vaga_id) ?? null;
  const [f, setF] = useState({ nome: "", whatsapp: "", obs: "" });
  const [e, setE] = useState<Entrevista>({});
  const [contrato, setContrato] = useState({ funcao: "", inicio: hoje() });
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (c) { setF({ nome: c.nome, whatsapp: c.whatsapp, obs: c.obs }); setE(c.entrevista ?? {}); }
    if (vaga) setContrato((x) => ({ ...x, funcao: vaga.titulo }));
  }, [c?.id, vaga?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dados) return <Carregando />;
  if (!c || !vaga) return <><Titulo voltar={{ href: "/pessoas/contratacao", rotulo: "Contratação" }} titulo="Candidato" /><div className="card">Candidato não encontrado.</div></>;
  const voltar = { href: `/pessoas/contratacao/vaga?id=${vaga.id}`, rotulo: vaga.titulo };
  const salvar = async (d: Partial<Candidato>, ok: string) => {
    setErro(""); setMsg("");
    try { await salvarCandidato(portal.id, vaga.id, c.id, d); setMsg(ok); recarregar(); } catch (x) { setErro((x as Error).message); }
  };
  const link = typeof window !== "undefined" ? linkDoTesteCandidato(`${window.location.origin}${BASE}`, c.teste_token) : "";
  const zap = c.whatsapp.replace(/\D/g, "");
  const textoZap = `Oi, ${c.nome.split(" ")[0]}! Que bom que você se interessou pela vaga da ${portal.loja}. O próximo passo é um teste rápido, de uns 10 minutos, pelo celular: ${link}`;
  const onb = dados.onboardings.find((o) => o.pessoa_id === c.pessoa_id);
  const res = c.teste ? resultadoTeste(c.teste) : null;
  const anotar = (k: string, t: string) => setE({ ...e, anotacoes: { ...(e.anotacoes ?? {}), [k]: t } });

  return (
    <>
      <Titulo voltar={voltar} titulo={c.nome} aba="Candidato" />
      {erro && <div className="aviso mb">{erro}</div>}
      {msg && <div className="aviso ok mb">{msg}</div>}

      <div className="card mb">
        <div className="grade g2" style={{ gap: "0 12px" }}>
          <label className="ajuda" style={{ display: "block" }}>Nome<input type="text" value={f.nome} onChange={(x) => setF({ ...f, nome: x.target.value })} /></label>
          <label className="ajuda" style={{ display: "block" }}>WhatsApp<input type="text" inputMode="tel" value={f.whatsapp} onChange={(x) => setF({ ...f, whatsapp: x.target.value })} /></label>
        </div>
        <label className="ajuda" style={{ display: "block" }}>Etapa
          <select value={c.etapa} onChange={(x) => salvar({ etapa: x.target.value as Candidato["etapa"] }, "Etapa atualizada.")}>
            {ETAPAS_CANDIDATO.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
        <label className="ajuda" style={{ display: "block" }}>Observações<textarea rows={2} value={f.obs} onChange={(x) => setF({ ...f, obs: x.target.value })} /></label>
        <div className="linha" style={{ gap: 8 }}>
          <button type="button" className="btn p peq" disabled={!f.nome.trim()} onClick={() => salvar({ nome: f.nome.trim(), whatsapp: f.whatsapp.trim(), obs: f.obs }, "Dados salvos.")}>Salvar</button>
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => {
            if (!confirm(`Excluir o candidato ${c.nome}? Não dá para desfazer.`)) return;
            try { await excluirCandidato(c.id); router.push(voltar.href); } catch (x) { setErro((x as Error).message); }
          }}>Excluir candidato</button>
        </div>
      </div>

      <div className="secao">Teste do candidato</div>
      <div className="card mb">
        {!c.teste ? (
          <>
            <p style={{ marginTop: 0 }}>Mande o link para {c.nome.split(" ")[0]} responder pelo celular. São 16 situações e 2 perguntas abertas, uns 10 minutos. O resultado aparece aqui.</p>
            <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
              {zap && <a className="btn p peq" href={`https://wa.me/55${zap.replace(/^55/, "")}?text=${encodeURIComponent(textoZap)}`} target="_blank" rel="noopener">Mandar pelo WhatsApp</a>}
              <Copiar texto={link} rotulo="Copiar link" />
            </div>
          </>
        ) : (
          <>
            <p className="mudo" style={{ marginTop: 0 }}>Respondido em {dataHora(c.teste_em)}. O teste é um apoio para a entrevista, não uma decisão.</p>
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
              {res!.map((r) => (
                <div key={r.id} style={{ background: "var(--soft)", borderRadius: 12, padding: 10 }}>
                  <div className="linha entre"><b style={{ fontSize: 14 }}>{r.icone} {r.nome}</b><span className={`selo ${NIVEL[r.nivel].classe}`}>{NIVEL[r.nivel].txt}</span></div>
                  {r.nivel === "atencao" && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{r.perguntar}</p>}
                </div>
              ))}
            </div>
            {c.teste.valores?.length > 0 && <p><b>O que é mais importante no trabalho:</b> {c.teste.valores.join(" · ")}</p>}
            {ABERTAS.map((a) => c.teste?.abertas?.[a.id]?.trim() && (
              <p key={a.id} style={{ margin: "6px 0" }}><b>{a.pergunta}</b><br />{c.teste.abertas[a.id]}</p>
            ))}
          </>
        )}
      </div>

      <div className="secao">Entrevista</div>
      <div className="card mb">
        <p className="mudo" style={{ marginTop: 0 }}>Faça as perguntas e anote o que a pessoa disse. Em cada uma: o que é bom sinal e o que pede atenção.</p>
        {PONTOS_ENTREVISTA.map((p) => (
          <div key={p.id} className="mb">
            <h3 style={{ margin: "12px 0 6px", color: "var(--red)" }}>{p.nome}</h3>
            {ROTEIRO.filter((q) => q.ponto === p.id).map((q) => (
              <div key={q.id} className="mb">
                <b style={{ fontSize: 14.5 }}>&quot;{q.pergunta}&quot;</b>
                <div style={{ fontSize: 13, margin: "4px 0" }}><span>✅ {q.bom}</span><br /><span>⚠️ {q.atencao}</span></div>
                <textarea rows={2} placeholder="O que a pessoa respondeu" value={e.anotacoes?.[q.id] ?? ""} onChange={(x) => anotar(q.id, x.target.value)} />
              </div>
            ))}
            <div className="linha" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <small>Nota de {p.nome.toLowerCase()}:</small>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={`chip${e.notas?.[p.id] === n ? " escolhido" : ""}`} onClick={() => setE({ ...e, notas: { ...(e.notas ?? {}), [p.id]: n } })}>{n}</button>
              ))}
            </div>
          </div>
        ))}
        <h3 style={{ margin: "12px 0 6px" }}>Sobre a vaga</h3>
        {SOBRE_A_VAGA.map((q) => (
          <div key={q.id} className="mb">
            <b style={{ fontSize: 14.5 }}>&quot;{q.pergunta}&quot;</b>
            <textarea rows={2} placeholder="Anotação (opcional)" value={e.anotacoes?.[q.id] ?? ""} onChange={(x) => anotar(q.id, x.target.value)} />
          </div>
        ))}
        <h3 style={{ margin: "12px 0 6px" }}>👀 O que observar</h3>
        {OBSERVAR.map((o) => (
          <label key={o.id} className="marcar"><input type="checkbox" checked={!!e.observar?.[o.id]} onChange={(x) => setE({ ...e, observar: { ...(e.observar ?? {}), [o.id]: x.target.checked } })} /><span>{o.texto}</span></label>
        ))}
        <div className="linha entre mt" style={{ gap: 8 }}>
          <b>Total: {notaTotal(e)} de {PONTOS_ENTREVISTA.length * 5}</b>
          <button type="button" className="btn p peq" onClick={() => salvar({ entrevista: e, ...(c.etapa === "triagem" ? { etapa: "entrevista" } : {}) }, "Entrevista salva.")}>Salvar entrevista</button>
        </div>
      </div>

      <div className="secao">Contratar</div>
      <div className="card mb">
        {c.etapa === "aprovado" && c.pessoa_id ? (
          <p style={{ margin: 0 }}>✓ {c.nome.split(" ")[0]} já está na equipe. {onb && <Link href={`/pessoas/contratacao/onboarding?id=${onb.id}`}>Abrir o onboarding →</Link>}</p>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>Decidiu contratar? A pessoa entra na sua equipe e o onboarding do primeiro mês começa.</p>
            <div className="grade g2" style={{ gap: "0 12px" }}>
              <label className="ajuda" style={{ display: "block" }}>Função<input type="text" value={contrato.funcao} onChange={(x) => setContrato({ ...contrato, funcao: x.target.value })} /></label>
              <label className="ajuda" style={{ display: "block" }}>Primeiro dia<input type="date" value={contrato.inicio} onChange={(x) => setContrato({ ...contrato, inicio: x.target.value })} /></label>
            </div>
            <button type="button" className="btn p" disabled={!contrato.inicio} onClick={async () => {
              if (!confirm(`Contratar ${c.nome}? A pessoa entra na equipe e o onboarding começa.`)) return;
              setErro("");
              try { const o = await contratar(c, contrato.funcao.trim(), contrato.inicio); router.push(`/pessoas/contratacao/onboarding?id=${o}`); }
              catch (x) { setErro((x as Error).message); }
            }}>Contratar</button>
          </>
        )}
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><PaginaCandidato /></Suspense>;
}
