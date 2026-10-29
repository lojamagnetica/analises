"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora, dia, hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import { semanaDe } from "@/lib/leitura";
import { ETAPAS, atrasado, buscarJornada, marcarCheck, prazoDoItem, type Check, type ClienteJornada } from "@/lib/jornada";

/** Os itens da jornada que são da Camilla (a CS cuida do resto). */
const MEUS = new Set(["gargalo", "raiox", "reuniao_diag", "foco", "rota_revisao", "mes3", "revisao_90", "foco_2", "encerramento"]);

type Pendente = { c: ClienteJornada; k: Check; etapa: string; prazo: string | null; atraso: boolean };

/** Minha central: o acompanhamento diário do que é só da Camilla (aprovar, montar, liberar e as etapas no nome dela). */
export default function MinhaCentral() {
  const { nome, abrirPortal } = useEquipe();
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const agora = new Date().toISOString();
    const semana = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const [jornada, diag, gestao, analise, extra, planos, historias, leituras, reunioes, acoes, pautas] = await Promise.all([
      buscarJornada(),
      sb.from("loja_diagnostico").select("portal_id, loja, updated_at").eq("status", "rascunho"),
      sb.from("loja_gestao").select("portal_id, area, updated_at").eq("status", "rascunho"),
      sb.from("loja_analise_perfil").select("portal_id, updated_at").eq("status", "rascunho"),
      sb.from("loja_analise_extra").select("id, portal_id, instagram, updated_at").eq("status", "rascunho"),
      sb.from("loja_plano_mes").select("portal_id, mes, enviado_em").eq("status", "enviado"),
      sb.from("loja_historia").select("id, loja, updated_at").eq("narrativa_pronta", true).eq("narrativa_aprovada", false),
      sb.from("loja_leituras").select("portal_id, semana, pronta, publicada").eq("semana", semanaDe()),
      sb.from("reunioes").select("portal_id, data, titulo").gte("data", agora).lte("data", semana).order("data"),
      sb.from("acoes").select("id, titulo").eq("publicada", false),
      sb.from("pautas").select("id, titulo").eq("liberada", false),
    ]);
    return {
      jornada, diag: diag.data ?? [], gestao: gestao.data ?? [], analise: analise.data ?? [], extra: extra.data ?? [], planos: planos.data ?? [],
      historias: historias.data ?? [], leituras: leituras.data ?? [], reunioes: reunioes.data ?? [], acoes: acoes.data ?? [], pautas: pautas.data ?? [],
    };
  }, []);
  if (!dados) return <Carregando />;

  const loja = (id: string) => dados.jornada.find((c) => c.id === id)?.loja ?? "Loja";
  // As etapas da jornada no meu nome: só a etapa atual de cada cliente, o que ainda não foi feito.
  const pendentes: Pendente[] = dados.jornada.flatMap((c) => {
    const et = ETAPAS.find((e) => e.n === c.etapa);
    if (!et) return [];
    return et.checks.filter((k) => MEUS.has(k.chave) && !c.checks.get(k.chave)?.feito)
      .map((k) => ({ c, k, etapa: et.nome, prazo: prazoDoItem(c, k), atraso: atrasado(c, k) }));
  }).sort((a, b) => Number(b.atraso) - Number(a.atraso) || a.c.loja.localeCompare(b.c.loja));
  const leiturasEncaminhadas = dados.leituras.filter((l) => l.pronta && !l.publicada);
  const paraAprovar = dados.historias.length + leiturasEncaminhadas.length + dados.planos.length;
  const emConstrucao = dados.diag.length + dados.gestao.length + dados.analise.length + dados.extra.length;
  const hojeD = hoje();
  const reunioesHoje = dados.reunioes.filter((r) => (r.data as string).slice(0, 10) === hojeD);

  return (
    <>
      <Titulo titulo="Minha central" sub="O seu dia a dia com as lojas: o que espera a sua aprovação, o que você está montando, as etapas da jornada no seu nome e os seus encontros." />
      <div className="grade g4 mb">
        {([
          [paraAprovar, "esperando a sua aprovação", "var(--red)", "#aprovar"],
          [pendentes.length, `etapas da jornada no seu nome${pendentes.some((p) => p.atraso) ? ` (${pendentes.filter((p) => p.atraso).length} atrasadas)` : ""}`, "var(--orange)", "#jornada"],
          [emConstrucao, "rascunhos em construção", "var(--purple)", "#construcao"],
          [reunioesHoje.length, "encontros hoje", "var(--blue)", "#encontros"],
        ] as const).map(([n, r, c, href]) => (
          <Link key={r} href={href} className="card card-borda kpi" style={{ ["--c" as string]: c, textDecoration: "none" }}><b>{n}</b><small>{r}</small></Link>
        ))}
      </div>
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="card mb linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <span><b>✨ Diagnóstico com o agente</b> <span className="mudo">· Raio-X, gargalo, perguntas, roteiro da reunião e o Diagnóstico da loja, no seu método.</span></span>
        <Link className="btn p peq" href="/empresa/minha-central/diagnostico">Preparar um diagnóstico</Link>
      </div>

      <div className="card mb" id="aprovar">
        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}><h2 style={{ margin: 0 }}>Esperando a sua aprovação</h2><Link className="btn s peq" href="/equipe/aprovar">Abrir Para aprovar</Link></div>
        {!paraAprovar && <p className="mudo">Nada esperando por você agora. 🎉</p>}
        {dados.historias.map((h) => (
          <div key={h.id} className="linha entre marcar" style={{ cursor: "default" }}>
            <span><b>{h.loja}</b> · storytelling da Nossa história, encaminhado pela equipe</span>
            <Link className="btn p peq" href="/empresa/historias">Revisar</Link>
          </div>
        ))}
        {leiturasEncaminhadas.map((l) => (
          <div key={l.portal_id} className="linha entre marcar" style={{ cursor: "default" }}>
            <span><b>{loja(l.portal_id)}</b> · leitura da semana encaminhada</span>
            <button type="button" className="btn p peq" onClick={() => abrirPortal(l.portal_id, "/inicio")}>Revisar e publicar</button>
          </div>
        ))}
        {dados.planos.map((p) => (
          <div key={p.portal_id + p.mes} className="linha entre marcar" style={{ cursor: "default" }}>
            <span><b>{loja(p.portal_id)}</b> · plano do mês {p.mes.slice(5)}/{p.mes.slice(2, 4)} enviado pela loja{p.enviado_em ? ` em ${dia(p.enviado_em.slice(0, 10))}` : ""}</span>
            <Link className="btn p peq" href="/equipe/planos">Responder</Link>
          </div>
        ))}
      </div>

      <div className="card mb" id="jornada">
        <h2 style={{ marginTop: 0 }}>Etapas da jornada no seu nome</h2>
        <p className="mudo" style={{ marginTop: 0 }}>Gargalo, revisão do diagnóstico, reunião de diagnóstico, revisão da Rota, missões do mês 3, revisão de 90 dias e encerramento.</p>
        {!pendentes.length && <p className="mudo">Nenhuma etapa sua em aberto.</p>}
        {pendentes.map(({ c, k, etapa, prazo, atraso }) => (
          <div key={c.id + k.chave} className="linha entre marcar" style={{ cursor: "default", gap: 8, flexWrap: "wrap" }}>
            <span><b>{c.loja}</b> <small className="mudo">· {etapa}{c.dia != null ? ` · dia ${c.dia}` : ""}</small><br />{k.texto}</span>
            <span className="linha" style={{ gap: 8 }}>
              {prazo && <span className={`selo ${atraso ? "erro" : "espera"}`}>{atraso ? "atrasado · " : "até "}{dia(prazo)}</span>}
              {c.etapa === 2 && <Link className="btn s peq" href={`/empresa/minha-central/diagnostico?p=${c.id}`}>✨ Preparar com o agente</Link>}
              <Link className="btn s peq" href={`/equipe/central/cliente?id=${c.id}`}>Abrir</Link>
              <button type="button" className="btn p peq" onClick={async () => { setErro(""); try { await marcarCheck(c.id, k.chave, { feito: true }, nome); recarregar(); } catch (x) { setErro((x as Error).message); } }}>Feito</button>
            </span>
          </div>
        ))}
      </div>

      <div className="grade g2">
        <div className="card" id="construcao">
          <h2 style={{ marginTop: 0 }}>Rascunhos em construção</h2>
          <p className="mudo" style={{ marginTop: 0 }}>O que você está montando e a loja ainda não vê.</p>
          {!emConstrucao && <p className="mudo">Nenhum rascunho aberto.</p>}
          {dados.diag.map((d) => <div key={"d" + d.portal_id + d.loja} className="linha entre marcar" style={{ cursor: "default" }}><span><b>{loja(d.portal_id)}</b> · Diagnóstico{d.loja ? ` (${d.loja})` : ""}</span><button type="button" className="link-loja" onClick={() => abrirPortal(d.portal_id, "/painel")}>Abrir</button></div>)}
          {dados.gestao.map((g) => <div key={"g" + g.portal_id + g.area} className="linha entre marcar" style={{ cursor: "default" }}><span><b>{loja(g.portal_id)}</b> · Gestão estratégica: {g.area}</span><button type="button" className="link-loja" onClick={() => abrirPortal(g.portal_id, "/estoque")}>Abrir</button></div>)}
          {dados.analise.map((a) => <div key={"a" + a.portal_id} className="linha entre marcar" style={{ cursor: "default" }}><span><b>{loja(a.portal_id)}</b> · Análise do Instagram</span><Link className="link-loja" href={`/equipe/analise?p=${a.portal_id}`}>Abrir</Link></div>)}
          {dados.extra.map((x) => <div key={"x" + x.id} className="linha entre marcar" style={{ cursor: "default" }}><span><b>{loja(x.portal_id)}</b> · Análise de {x.instagram}</span><Link className="link-loja" href={`/equipe/analise?p=${x.portal_id}&x=${x.id}`}>Abrir</Link></div>)}
          {(dados.acoes.length > 0 || dados.pautas.length > 0) && <p className="ajuda" style={{ marginBottom: 0 }}>Para todas as lojas: {dados.acoes.length} Ações do Mês e {dados.pautas.length} pautas ainda não publicadas.</p>}
        </div>

        <div className="card" id="encontros">
          <h2 style={{ marginTop: 0 }}>Encontros nos próximos 7 dias</h2>
          {!dados.reunioes.length && <p className="mudo">Nenhum encontro marcado.</p>}
          {dados.reunioes.map((r, i) => (
            <div key={i} className="linha entre marcar" style={{ cursor: "default" }}>
              <span><b>{loja(r.portal_id)}</b> · {r.titulo}</span>
              <span style={{ whiteSpace: "nowrap", textTransform: "capitalize", fontWeight: (r.data as string).slice(0, 10) === hojeD ? 700 : undefined }}>{dataHora(r.data)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
