"use client";

// O mapa da Camilla no Meu dia: as reuniões de hoje (com o que ela deve a cada loja), tudo o que ela ficou de fazer e o que espera revisão.
import Link from "next/link";
import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { Recolhivel } from "@/components/Recolhivel";
import { dataCurta, hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import { buscarParaAprovar } from "@/lib/aprovar";
import { buscarProntas } from "@/lib/pronta";

type Devo = { id: string; portal_id: string; texto: string; prazo: string | null; loja: string };
type Reuniao = { portal_id: string | null; titulo: string | null; data: string; loja: string | null };

async function buscarMapa() {
  const sb = supabaseBrowser();
  const dia = hoje();
  const inicio = new Date(`${dia}T00:00:00-03:00`).toISOString();
  const fim = new Date(Date.parse(inicio) + 86_400_000).toISOString();
  const [{ data: portais }, { data: comb }, { data: reun }, revisar, prontas] = await Promise.all([
    sb.from("portais").select("id, loja, cs_acompanha").eq("ativo", true),
    sb.from("loja_combinados").select("id, portal_id, texto, prazo").eq("quem", "camilla").eq("status", "aberto").order("prazo", { ascending: true, nullsFirst: false }),
    sb.from("reunioes").select("portal_id, titulo, data").gte("data", inicio).lt("data", fim).order("data"),
    buscarParaAprovar().catch(() => null),
    buscarProntas().catch(() => null),
  ]);
  const ps = (portais ?? []) as { id: string; loja: string; cs_acompanha: boolean }[];
  const nome = new Map(ps.map((p) => [p.id, p.loja]));
  const devo = ((comb ?? []) as Omit<Devo, "loja">[]).filter((c) => nome.has(c.portal_id)).map((c) => ({ ...c, loja: nome.get(c.portal_id) as string }));
  const reunioes = ((reun ?? []) as Omit<Reuniao, "loja">[]).map((r) => ({ ...r, loja: r.portal_id ? nome.get(r.portal_id) ?? null : null }));
  const aCaminho = ps.filter((p) => !p.cs_acompanha).length;
  const incompletas = ps.filter((p) => p.cs_acompanha && prontas && (prontas.get(p.id)?.falta.length ?? 0) > 0).length;
  return { devo, reunioes, revisar: revisar?.itens.length ?? 0, aCaminho, incompletas };
}

const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function MeuMapa() {
  const { dados, recarregar } = useDados(() => buscarMapa(), []);
  const [todos, setTodos] = useState(false);
  if (!dados) return <Carregando />;
  const dia = hoje();
  const atrasados = dados.devo.filter((c) => c.prazo && c.prazo < dia);
  const hojeVence = dados.devo.filter((c) => c.prazo === dia);
  const lista = todos ? dados.devo : [...atrasados, ...hojeVence].slice(0, 12);
  const feito = async (id: string) => {
    const { error } = await supabaseBrowser().from("loja_combinados").update({ status: "feito", feito_em: new Date().toISOString() }).eq("id", id);
    if (error) alert(error.message); else recarregar();
  };
  const linha = (c: Devo) => (
    <div key={c.id} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
      <span><Link href={`/equipe/loja?id=${c.portal_id}`} style={{ fontWeight: 700, color: "inherit" }}>{c.loja}</Link> · {c.texto}
        {c.prazo && <small style={{ marginLeft: 6, color: c.prazo < dia ? "var(--red)" : "var(--muted)" }}>{c.prazo < dia ? `atrasado (era ${dataCurta(c.prazo)})` : c.prazo === dia ? "vence hoje" : `até ${dataCurta(c.prazo)}`}</small>}</span>
      <button type="button" className="btn s peq" onClick={() => feito(c.id)}>Feito</button>
    </div>
  );

  return (
    <>
      <div className="secao" style={{ marginTop: 0 }}>Seu mapa de hoje</div>
      <Recolhivel id="mapa-reunioes" cor="var(--purple)" titulo={`1 · Reuniões de hoje · ${dados.reunioes.length}`}>
        {!dados.reunioes.length && <p className="mudo" style={{ margin: "4px 0 0" }}>Nenhuma reunião marcada no Hub para hoje.</p>}
        {dados.reunioes.map((r, i) => {
          const deve = dados.devo.filter((c) => c.portal_id === r.portal_id);
          return (
            <div key={i} style={{ padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <b>{hora(r.data)}</b> · {r.portal_id ? <Link href={`/equipe/loja?id=${r.portal_id}`} style={{ fontWeight: 700, color: "inherit" }}>{r.loja}</Link> : (r.titulo || "Reunião")}
              {r.portal_id && <small className="mudo"> · {deve.length ? `você deve ${deve.length} ${deve.length === 1 ? "coisa" : "coisas"} a ela: ${deve.map((d) => d.texto).join(" · ")}` : "nada pendente seu com ela"}</small>}
            </div>
          );
        })}
      </Recolhivel>

      <Recolhivel id="mapa-devo" cor={atrasados.length ? "var(--red)" : "var(--feito)"} titulo={`2 · O que eu devo · ${dados.devo.length}`} extra={<small className="mudo">{atrasados.length} atrasados · {hojeVence.length} vencem hoje</small>}>
        {!lista.length && <p className="mudo" style={{ margin: "4px 0 0" }}>{dados.devo.length ? "Nada atrasado nem vencendo hoje. 🎉" : "Você não deve nada às lojas. 🎉"}</p>}
        {lista.map(linha)}
        {dados.devo.length > lista.length || todos ? (
          <p style={{ margin: "8px 0 0" }}><button type="button" className="link-loja" onClick={() => setTodos(!todos)}>{todos ? "Mostrar só os atrasados e de hoje" : `Ver todos os ${dados.devo.length}, por prazo`}</button></p>
        ) : null}
      </Recolhivel>

      <div className="grade g3 mb">
        <Link href="/equipe/aprovar" className="card" style={{ textDecoration: "none", color: "inherit" }}><small>3 · Para revisar</small><b style={{ display: "block", fontSize: 24 }}>{dados.revisar}</b><small className="mudo">liberar, validar, responder a Claudia</small></Link>
        <Link href="/equipe/lojas" className="card" style={{ textDecoration: "none", color: "inherit" }}><small>A caminho da Claudia</small><b style={{ display: "block", fontSize: 24 }}>{dados.aCaminho}</b><small className="mudo">lojas que ainda estão com você</small></Link>
        <Link href="/equipe/lojas" className="card" style={{ textDecoration: "none", color: "inherit" }}><small>Com a Claudia, mas incompletas</small><b style={{ display: "block", fontSize: 24, color: dados.incompletas ? "var(--orange)" : undefined }}>{dados.incompletas}</b><small className="mudo">veja o que falta em Minhas lojas</small></Link>
      </div>
      <div className="secao">O dia das lojas (o que a Claudia vê)</div>
    </>
  );
}
