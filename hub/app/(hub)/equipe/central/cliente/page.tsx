"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { LinkAcesso } from "@/components/LinkAcesso";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { BASE } from "@/lib/config";
import { dataCurta, dataHora, isoParaLocal, localParaIso, moeda } from "@/lib/formato";
import { gerarLink } from "@/lib/acoes";
import { aberta, buscarPendencias, mensagemParaLoja } from "@/lib/pendencias";
import {
  etapasDoPlano, buscarJornada, mensagemBoasVindas, marcarCheck, mudarEtapa, prazoDoItem, atrasado, receberPassagem, situacao,
  type Check, type ClienteJornada,
} from "@/lib/jornada";

const NOME_PLANO: Record<string, string> = { premium: "Premium", gold: "Gold", start: "Start" };

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
    if (k.acao === "boasvindas") return <Copiar texto={mensagemBoasVindas(c, nome.split(" ")[0], NOME_PLANO[c.plano ?? ""] ?? null)} rotulo={k.chave === "grupo" ? "Copiar boas-vindas" : "Copiar boas-vindas com o horário"} />;
    if (k.acao === "contrato") return <Link className="btn s peq" href={`/equipe/central/contrato?id=${c.id}`}>Gerar o contrato</Link>;
    if (k.acao === "acesso") {
      if (!c.email) return <small className="mudo">Sem e-mail no portal: preencha o e-mail em <Link href={`/equipe/portal?id=${c.id}`}>Editar portal</Link> para gerar o acesso.</small>;
      return link ? <LinkAcesso link={link} nome={c.responsavel ?? ""} whatsapp={c.whatsapp} /> : (
        <button type="button" className="btn s peq" onClick={async () => { setErro(""); try { setLink(await gerarLink(c.email!, c.responsavel ?? "", c.id)); } catch (e) { setErro((e as Error).message); } }}>Gerar o link de acesso agora (na call)</button>
      );
    }
    if (k.acao === "pendencias" && pend) return (
      <span className="linha" style={{ gap: 8 }}>
        <small className="mudo">{abertasLoja ? `${abertasLoja} ${abertasLoja === 1 ? "item" : "itens"} da loja em aberto` : "Nada pendente da loja"}</small>
        {abertasLoja > 0 && <Copiar texto={mensagemParaLoja(pend, site)} rotulo="Copiar mensagem de Pendências" />}
        <Link className="btn s peq" href={`/equipe/portal?id=${c.id}#pendencias`}>Ver pendências</Link>
      </span>
    );
    if (k.acao === "diagnostico") return <button type="button" className="btn s peq" onClick={() => abrirPortal(c.id, "/painel")}>Abrir o Diagnóstico da loja</button>;
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
