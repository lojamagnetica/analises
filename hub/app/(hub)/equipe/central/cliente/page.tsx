"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { LinkAcesso } from "@/components/LinkAcesso";
import { MensagensCS } from "@/components/MensagensCS";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { BASE } from "@/lib/config";
import { dataCurta, dataHora, isoParaLocal, localParaIso, moeda } from "@/lib/formato";
import { contratoAnexar, contratoRemoverAnexo, gerarLink } from "@/lib/acoes";
import { abrirContratoAssinado } from "@/lib/contrato";
import { supabaseBrowser } from "@/lib/supabase/client";
import { aberta, buscarPendencias, mensagemParaLoja } from "@/lib/pendencias";
import { mensagemDiagnosticoPronto } from "@/lib/entrada";
import { resumoOnboarding } from "@/lib/onboarding";
import { perguntasParaCS, responderPerguntas } from "@/lib/diagnostico-preparo";
import {
  etapasDoPlano, buscarJornada, mensagensCS, marcarCheck, mudarEtapa, prazoDoItem, atrasado, receberPassagem, situacao,
  type Check, type ClienteJornada,
} from "@/lib/jornada";


/** Contrato assinado: a Claudia anexa o PDF aqui, na Central, e a cliente vê no portal dela (Contrato e renovação). */
function ContratoAssinado({ portalId }: { portalId: string }) {
  const { dados, recarregar } = useDados(async () => {
    const { data } = await supabaseBrowser().from("contratos").select("id, status, inicio, fim, arquivo").eq("portal_id", portalId).order("inicio", { ascending: false });
    return (data ?? []) as { id: string; status: string; inicio: string | null; fim: string | null; arquivo: string | null }[];
  }, [portalId]);
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>({});
  const [subindo, setSubindo] = useState(false);
  if (!dados) return null;
  const ct = dados.find((x) => x.status === "Ativo") ?? dados[0];
  const fazer = async (f: () => Promise<void>, ok: string) => {
    setMsg({}); setSubindo(true);
    try { await f(); setMsg({ ok }); recarregar(); } catch (e) { setMsg({ erro: (e as Error).message }); }
    setSubindo(false);
  };
  return (
    <div className="card mb">
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Contrato assinado</h3>
        {ct && <span className={`selo ${ct.arquivo ? "feito" : "alerta"}`}>{ct.arquivo ? "Anexado · a cliente já vê" : "Falta anexar"}</span>}
      </div>
      {!ct ? (
        <p className="mudo" style={{ marginBottom: 0 }}>Esta cliente ainda não tem contrato cadastrado. Cadastre o plano e as datas em <Link href={`/equipe/portal?id=${portalId}`}>Editar portal</Link> (parte Contratos) e volte aqui para anexar o assinado.</p>
      ) : (
        <>
          <p className="ajuda">Anexe o PDF (ou foto) do contrato assinado. A cliente abre em Contrato e renovação, no portal dela.</p>
          <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
            {ct.arquivo && <button type="button" className="btn s peq" onClick={() => abrirContratoAssinado(ct.arquivo!)}>Abrir o anexado</button>}
            <label className="btn p peq" style={{ cursor: subindo ? "wait" : "pointer" }}>
              {subindo ? "Enviando…" : ct.arquivo ? "Trocar o arquivo" : "Anexar o contrato assinado"}
              <input type="file" accept=".pdf,image/*" disabled={subindo} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) fazer(() => contratoAnexar(portalId, ct.id, f, ct.arquivo), "Contrato assinado anexado. A cliente já vê no portal."); }} />
            </label>
            {ct.arquivo && <button type="button" className="btn s peq" disabled={subindo} onClick={() => { if (confirm("Remover o contrato assinado? A cliente deixa de ver.")) fazer(() => contratoRemoverAnexo(ct.id, ct.arquivo!), "Contrato assinado removido."); }}>Remover</button>}
          </div>
        </>
      )}
      {msg.ok && <div className="aviso ok mt">{msg.ok}</div>}
      {msg.erro && <div className="aviso mt">{msg.erro}</div>}
    </div>
  );
}

function Item({ c, k, nome, recarregar, extra }: { c: ClienteJornada; k: Check; nome: string; recarregar: () => void; extra?: React.ReactNode }) {
  const feito = c.checks.get(k.chave);
  const prazo = prazoDoItem(c, k);
  const late = atrasado(c, k);
  const [erro, setErro] = useState("");
  const fazer = async (f: () => Promise<void>) => { setErro(""); try { await f(); recarregar(); } catch (e) { setErro((e as Error).message); } };
  const fixo = k.chave === "passagem" || k.chave === "recebida";
  return (
    <div className={`check-jornada ${feito?.feito ? "feito" : late ? "atrasado" : ""}`}>
      <label className="linha" style={{ gap: 10, alignItems: "flex-start", cursor: fixo ? "default" : "pointer" }}>
        <input type="checkbox" checked={!!feito?.feito} disabled={fixo} onChange={(e) => fazer(() => marcarCheck(c.id, k.chave, { feito: e.target.checked, marcado_para: feito?.marcado_para ?? null, obs: feito?.obs ?? null }, nome))} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontWeight: 600 }}>{k.texto}</b>
          <small className="mudo" style={{ display: "block" }}>
            {feito?.feito ? `Feito${feito.por_nome ? ` por ${feito.por_nome}` : ""} · ${dataHora(feito.updated_at)}` : prazo ? `${late ? "Atrasado · " : ""}prazo: ${dataCurta(prazo)}` : ""}
          </small>
        </span>
      </label>
      {k.data && (
        <div className="linha" style={{ gap: 8, marginTop: 6, marginLeft: 28 }}>
          <small className="mudo">Marcado para</small>
          <input type="datetime-local" defaultValue={feito?.marcado_para ? isoParaLocal(feito.marcado_para) : ""} style={{ maxWidth: 230 }}
            onBlur={(e) => { const v = e.target.value ? localParaIso(e.target.value) : null; if (v !== (feito?.marcado_para ?? null)) fazer(() => marcarCheck(c.id, k.chave, { feito: feito?.feito ?? false, marcado_para: v, obs: feito?.obs ?? null }, nome)); }} />
        </div>
      )}
      {extra && <div style={{ marginLeft: 28, marginTop: 8 }}>{extra}</div>}
      {erro && <div className="aviso mt">{erro}</div>}
    </div>
  );
}

/** As perguntas do gargalo que a Camilla liberou: a CS manda no grupo da loja e cola aqui as respostas. */
function PerguntasGargalo({ portalId, loja, responsavel }: { portalId: string; loja: string; responsavel: string | null }) {
  const { dados, recarregar } = useDados(() => perguntasParaCS(portalId), [portalId]);
  const [resp, setResp] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  if (!dados?.perguntas?.length) return null;
  const texto = `Oi, ${(responsavel ?? "").split(" ")[0] || loja}! Para a sua reunião de diagnóstico com a Camilla, responde estas perguntas sobre como é hoje na loja (pode ser por áudio):\n\n${dados.perguntas.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: dados.respostas ? "var(--green)" : "var(--orange)" }}>
      <h3 style={{ marginTop: 0 }}>Perguntas do gargalo para mandar</h3>
      <p className="ajuda" style={{ marginTop: 0 }}>A Camilla escolheu o gargalo{dados.gargalo ? ` (${dados.gargalo})` : ""} e liberou as perguntas. Mande no grupo da loja e cole aqui as respostas quando chegarem.</p>
      <p style={{ whiteSpace: "pre-wrap", background: "var(--soft)", borderRadius: 10, padding: 10 }}>{texto}</p>
      <Copiar texto={texto} rotulo="Copiar a mensagem" />
      <label className="ajuda" style={{ display: "block", marginTop: 10 }}>Respostas da loja<textarea rows={5} value={resp ?? dados.respostas ?? ""} onChange={(e) => setResp(e.target.value)} placeholder="Cole aqui o que a loja respondeu (ou o resumo do áudio)" /></label>
      {resp !== null && <button type="button" className="btn p peq" onClick={async () => { setMsg(""); try { await responderPerguntas(portalId, resp); setResp(null); setMsg("Salvo ✓ A Camilla já vê as respostas."); recarregar(); } catch (e) { setMsg((e as Error).message); } }}>Salvar as respostas</button>}
      {msg && <small className="mudo"> {msg}</small>}
    </div>
  );
}

function Cliente() {
  const id = useSearchParams().get("id") ?? "";
  const { nome, abrirPortal } = useEquipe();
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const [j, p] = await Promise.all([buscarJornada(id), buscarPendencias(id)]);
    return { c: j[0] ?? null, pend: p[0] ?? null };
  }, [id]);
  if (!dados) return <Carregando />;
  const { c, pend } = dados;
  if (!c) return <div className="card">Cliente não encontrada ou inativa.</div>;
  const s = situacao(c);
  const etapas = etapasDoPlano(c.plano).filter((e) => e.n <= 8);
  const p = c.passagem;
  const abertasLoja = pend ? pend.pendencias.filter((x) => x.quem === "Loja" && aberta(x)).length : 0;
  const site = typeof window !== "undefined" ? `${location.origin}${BASE}` : "";

  const extra = (k: Check) => {
    if (k.acao === "boasvindas") {
      const quais: Record<string, string[]> = { grupo: ["boasvindas", "contrato"], onboarding_marcado: ["assinado", "agendado"], clube: ["clube_aviso", "clube_boasvindas"] };
      return <MensagensCS mensagens={mensagensCS(c).filter((m) => (quais[k.chave] ?? []).includes(m.chave))} />;
    }
    if (k.acao === "contrato") return <Link className="btn s peq" href={`/equipe/central/contrato?id=${c.id}`}>Gerar o contrato</Link>;
    if (k.acao === "post") return <Link className="btn s peq" href={`/equipe/central/post?id=${c.id}`}>Fazer o post de entrada</Link>;
    if (k.acao === "acesso" && c.checks.get("onboarding")?.feito) {
      // Depois da call: o resumo para o grupo (só a equipe vê; não entra na apresentação).
      const feito = c.checks.get("onboarding");
      const resumo = resumoOnboarding(c.responsavel, feito?.marcado_para?.slice(0, 10) ?? null);
      return (
        <span className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          <Copiar texto={resumo} rotulo="Copiar o resumo para o grupo" />
          {c.whatsapp && <a className="btn s peq" target="_blank" rel="noopener" href={`https://wa.me/${c.whatsapp.replace(/\D/g, "").replace(/^(?!55)/, "55")}?text=${encodeURIComponent(resumo)}`}>Mandar no WhatsApp</a>}
          <Link className="link-loja" href={`/equipe/central/onboarding?id=${c.id}`}>Abrir a apresentação</Link>
        </span>
      );
    }
    if (k.acao === "acesso") {
      const apresentar = <Link className="btn p peq" href={`/equipe/central/onboarding?id=${c.id}`} style={{ marginRight: 8 }}>▶ Apresentação do onboarding</Link>;
      if (!c.email) return <>{apresentar}<small className="mudo">Sem e-mail no portal: preencha o e-mail em <Link href={`/equipe/portal?id=${c.id}`}>Editar portal</Link> para gerar o acesso.</small></>;
      return link ? <LinkAcesso link={link} nome={c.responsavel ?? ""} whatsapp={c.whatsapp} /> : (
        <>{apresentar}<button type="button" className="btn s peq" onClick={async () => { setErro(""); try { setLink(await gerarLink(c.email!, c.responsavel ?? "", c.id)); } catch (e) { setErro((e as Error).message); } }}>Só gerar o link de acesso</button></>
      );
    }
    if (k.acao === "pendencias" && pend) return (
      <span className="linha" style={{ gap: 8 }}>
        <small className="mudo">{abertasLoja ? `${abertasLoja} ${abertasLoja === 1 ? "item" : "itens"} da loja em aberto` : "Nada pendente da loja"}</small>
        {abertasLoja > 0 && <Copiar texto={mensagemParaLoja(pend, site)} rotulo="Copiar mensagem de Pendências" />}
        <Link className="btn s peq" href={`/equipe/portal?id=${c.id}#pendencias`}>Ver pendências</Link>
      </span>
    );
    if (k.acao === "diagnostico") return (
      <span className="linha" style={{ gap: 8 }}>
        <button type="button" className="btn s peq" onClick={() => abrirPortal(c.id, "/painel")}>Abrir o Diagnóstico da loja</button>
        <Copiar texto={mensagemDiagnosticoPronto((c.responsavel ?? "").split(" ")[0], site)} rotulo="Copiar aviso: Diagnóstico pronto" />
        {c.whatsapp && <a className="btn s peq" target="_blank" rel="noopener" href={`https://wa.me/${c.whatsapp.replace(/\D/g, "").replace(/^(?!55)/, "55")}?text=${encodeURIComponent(mensagemDiagnosticoPronto((c.responsavel ?? "").split(" ")[0], site))}`}>Mandar no WhatsApp</a>}
      </span>
    );
    if (k.acao === "plano") return <button type="button" className="btn s peq" onClick={() => abrirPortal(c.id, c.tipo === "Consultoria" ? "/consultoria" : "/plano")}>Abrir o {c.tipo === "Consultoria" ? "Painel da consultoria" : "Plano de Ação"}</button>;
    if (k.acao === "reunioes") return <Link className="btn s peq" href={`/equipe/portal?id=${c.id}#reunioes`}>Reuniões do portal</Link>;
    return null;
  };

  return (
    <>
      <Titulo voltar={{ href: "/equipe/central", rotulo: "Central do Cliente" }} titulo={c.loja} sub={`${c.responsavel ?? ""}${c.dia != null ? ` · dia ${c.dia} de mentoria` : ""}${s.etapa ? ` · Etapa ${s.etapa.n}: ${s.etapa.nome}` : ""}`} />
      <div className="linha mb" style={{ gap: 8 }}>
        <label className="linha" style={{ gap: 6 }}>
          <small className="mudo">Etapa</small>
          <select value={c.etapa} onChange={async (e) => { setErro(""); try { await mudarEtapa(c.id, Number(e.target.value)); recarregar(); } catch (x) { setErro((x as Error).message); } }} style={{ maxWidth: 260 }}>
            {c.etapa < 1 && <option value={c.etapa}>{c.etapa === 0 ? "0 · Venda e passagem" : "Sem etapa"}</option>}
            {etapas.filter((e) => e.n >= 1).map((e) => <option key={e.n} value={e.n}>{e.n} · {e.nome}</option>)}
          </select>
        </label>
        <button type="button" className="btn s peq" onClick={() => abrirPortal(c.id)}>Abrir o portal</button>
        <button type="button" className="btn s peq" onClick={() => abrirPortal(c.id, "/inicio", true)}>Ver como a loja</button>
        <Link className="btn s peq" href={`/equipe/portal?id=${c.id}`}>Editar portal</Link>
      </div>
      {erro && <div className="aviso mb">{erro}</div>}

      {!p && (
        <div className="card card-borda mb linha entre" style={{ ["--c" as string]: "var(--orange)" }}>
          <span><b>Sem a passagem do Comercial.</b> Esta cliente entrou no Hub antes da Central. Registre a venda e os dados do contrato para liberar o contrato e as mensagens.</span>
          <Link className="btn p peq" href={`/equipe/comercial/venda?portal=${c.id}`}>Registrar a passagem</Link>
        </div>
      )}

      {p && (
        <details className="card mb" open={!p.recebida_em}>
          <summary style={{ cursor: "pointer" }}><b>Passagem do Comercial</b> <small className="mudo">· {p.vendido_por ?? "—"} · {dataHora(p.created_at)}{p.recebida_em ? ` · recebida por ${p.recebida_por}` : ""}</small></summary>
          <div className="grade g2 mt" style={{ gap: 10 }}>
            <div><small className="mudo">Valor e pagamento</small><div>{p.valor ? moeda(Number(p.valor)) : "—"}{p.pagamento_em ? ` · pago em ${dataCurta(p.pagamento_em)}` : ""}{p.forma_pagamento ? ` · ${p.forma_pagamento}` : ""}</div></div>
            <div><small className="mudo">Como chegou</small><div>{p.origem ?? "—"}</div></div>
            <div style={{ gridColumn: "1 / -1" }}><small className="mudo">Se a mentoria resolver uma coisa só em 90 dias</small><div><b>{p.resultado_90 ?? "—"}</b></div></div>
            {p.observacoes && <div style={{ gridColumn: "1 / -1" }}><small className="mudo">O que a CS precisa saber</small><div style={{ whiteSpace: "pre-wrap" }}>{p.observacoes}</div></div>}
            <div><small className="mudo">Alinhou o que a mentoria não faz</small><div>{p.alinhado ? "Sim" : "Não"}</div></div>
            <div><small className="mudo">Bônus · garantia</small><div>{p.bonus ? "Com bônus" : "Sem bônus"} · {p.garantia ? "com garantia" : "sem garantia"}</div></div>
          </div>
          {!p.recebida_em && <button type="button" className="btn p peq mt" onClick={async () => { await receberPassagem(c.id, nome); recarregar(); }}>Receber a passagem</button>}
        </details>
      )}

      <ContratoAssinado portalId={c.id} />

      <PerguntasGargalo portalId={c.id} loja={c.loja} responsavel={c.responsavel} />

      {s.etapa && (
        <div className="card mb">
          <div className="linha entre"><h3 style={{ margin: 0 }}>Etapa {s.etapa.n} · {s.etapa.nome}</h3><small className="mudo">{s.etapa.quem} · dia {s.etapa.janela[0]} a {s.etapa.janela[1]}</small></div>
          {s.foraDaJanela && <div className="aviso mt">Passou do prazo desta etapa (dia {s.etapa.janela[1]}). Feche o que falta e avance.</div>}
          <div className="mt">{s.etapa.checks.map((k) => <Item key={k.chave} c={c} k={k} nome={nome} recarregar={recarregar} extra={extra(k)} />)}</div>
          {s.etapa.checks.length > 0 && s.etapa.checks.every((k) => c.checks.get(k.chave)?.feito) && s.etapa.n < 8 && (
            <button type="button" className="btn p peq mt" onClick={async () => { const prox = etapas.find((e) => e.n > s.etapa!.n); if (prox) { await mudarEtapa(c.id, prox.n); recarregar(); } }}>Tudo feito: avançar para a próxima etapa</button>
          )}
        </div>
      )}

      <details className="card mb">
        <summary style={{ cursor: "pointer" }}><b>Mensagens padrão do CS</b> <small className="mudo">· as 6 mensagens da entrada da cliente, já com o nome dela</small></summary>
        <div className="mt"><MensagensCS mensagens={mensagensCS(c)} /></div>
      </details>

      <details className="card">
        <summary style={{ cursor: "pointer" }}><b>A jornada inteira</b> <small className="mudo">· todas as etapas e o que já foi feito</small></summary>
        {etapas.filter((e) => e.checks.length).map((e) => (
          <div key={e.n} className="mt">
            <b>{e.n} · {e.nome}</b> <small className="mudo">({e.checks.filter((k) => c.checks.get(k.chave)?.feito).length} de {e.checks.length})</small>
            {e.n !== c.etapa && e.checks.map((k) => <Item key={k.chave} c={c} k={k} nome={nome} recarregar={recarregar} />)}
            {e.n === c.etapa && <p className="ajuda" style={{ margin: "4px 0" }}>É a etapa atual (acima).</p>}
          </div>
        ))}
      </details>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Cliente /></Suspense>;
}
