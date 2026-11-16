"use client";

// Conferência do caixa: a dona vê, dia a dia, o que foi lançado, quem lançou e quem corrigiu depois.
// Nos dias que vieram do link de vendas por canal, cada venda aparece com o nome de quem lançou.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataHora, dia, hoje, moeda } from "@/lib/formato";
import { FORMAS, diaDaSemana, fimDoMes, mesDeHoje, nomeMes, problemasDoCaixa, somarMes, type Caixa } from "@/lib/caixa";
import { supabaseBrowser } from "@/lib/supabase/client";
import { diaDeLoja, feriadoNacional } from "@/lib/feriados";

type Lancado = Caixa & { lancado_por: string | null; corrigido_por: string | null; created_at: string; atualizado_em: string | null };
type VendaLink = { id: string; dia: string; canal: string; valor: number; pecas: number | null; quem: string | null; created_at: string };
const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const somarDias = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function ConferenciaDoCaixa() {
  const { portal } = usePortal();
  const [mes, setMes] = useState(mesDeHoje());
  useEffect(() => { document.title = "Conferência do caixa · magnética.hub"; }, []);
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: caixa }, { data: link }, { count: time }] = await Promise.all([
      sb.from("loja_caixa").select("id, loja, dia, faturamento, vendas, pecas, obs, pagamentos, vendedoras, malinha, cadastros, origem, justificativa, lancado_por, corrigido_por, created_at, atualizado_em")
        .eq("portal_id", portal.id).gte("dia", `${mes}-01`).lte("dia", fimDoMes(mes)).order("dia", { ascending: false }),
      sb.from("loja_canais_registro").select("id, dia, canal, valor, pecas, quem, created_at")
        .eq("portal_id", portal.id).eq("tipo", "venda").gte("dia", `${mes}-01`).lte("dia", fimDoMes(mes)).order("created_at"),
      sb.from("loja_equipe").select("id", { count: "exact", head: true }).eq("portal_id", portal.id).eq("ativo", true),
    ]);
    const lancados = (caixa ?? []).map((c) => ({ ...c, faturamento: Number(c.faturamento), vendas: Number(c.vendas), pecas: Number(c.pecas) })) as Lancado[];
    return { lancados, link: (link ?? []).map((v) => ({ ...v, valor: Number(v.valor) })) as VendaLink[], comTime: (time ?? 0) > 0 };
  }, [portal.id, mes]);
  if (!dados) return <Carregando />;

  // Os dias do mês até hoje, do mais novo para o mais antigo (domingo só aparece se teve lançamento).
  const ate = mes === mesDeHoje() ? hoje() : fimDoMes(mes);
  const dias: string[] = [];
  for (let d = ate; d >= `${mes}-01`; d = somarDias(d, -1)) dias.push(d);
  const total = dados.lancados.reduce((s, c) => s + c.faturamento, 0);
  const faltando = dias.filter((d) => diaDeLoja(d) && d < hoje() && !dados.lancados.some((c) => c.dia === d)).length;

  return (
    <>
      <Titulo titulo="Conferência do caixa" sub="Dia a dia: o que foi lançado, quem lançou e quem corrigiu. Para conferir com o sistema da loja." />
      <div className="linha entre mb" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className="linha" style={{ gap: 8, alignItems: "center" }}>
          <button type="button" className="btn s peq" aria-label="Mês anterior" onClick={() => setMes(somarMes(mes, -1))}>‹</button>
          <b style={{ textTransform: "capitalize" }}>{nomeMes(mes)}</b>
          <button type="button" className="btn s peq" aria-label="Próximo mês" disabled={mes >= mesDeHoje()} onClick={() => setMes(somarMes(mes, 1))}>›</button>
        </span>
        <Link className="btn p peq" href="/gestao/caixa">Lançar ou corrigir no Fechamento de caixa</Link>
      </div>
      <div className="grade g3 mb">
        <div className="kpi"><small>Lançado no mês</small><b style={NUM}>{moeda(total)}</b></div>
        <div className="kpi"><small>Dias lançados</small><b>{new Set(dados.lancados.map((c) => c.dia)).size}</b></div>
        <div className="kpi"><small>Dias sem lançamento</small><b style={{ color: faltando ? "var(--red)" : undefined }}>{faltando}</b></div>
      </div>
      {portal.regras_caixa
        ? <p className="ajuda">O que conta como venda do dia e o que entra no recebido segue as <Link href="/gestao/caixa?regras=1">Regras do caixa da sua loja</Link> (vale-presente, consórcio, crédito da cliente, troca…). Confira se estão certas.</p>
        : <p className="ajuda">Voucher, vale-troca e saldo de troca não entram no caixa do Hub. Para conferir com o sistema, tire o voucher do total do sistema.</p>}

      {dias.map((d) => {
        const doDia = dados.lancados.filter((c) => c.dia === d);
        const vendasLink = dados.link.filter((v) => v.dia === d);
        // Domingo e feriado nacional sem lançamento: a loja fechou, não falta nada.
        if (!doDia.length && (!diaDeLoja(d) || d === hoje())) return null;
        if (!doDia.length) return (
          <div key={d} className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
            <div className="linha entre"><b style={{ textTransform: "capitalize" }}>{diaDaSemana(d)} · {dia(d)}</b><span className="selo erro">sem lançamento</span></div>
            <div className="linha mt"><Link className="btn p peq" href={`/gestao/caixa?mes=${d.slice(0, 7)}&dia=${d}`}>Lançar este dia</Link></div>
          </div>
        );
        return doDia.map((c) => {
          const problemas = problemasDoCaixa(c, dados.comTime);
          const formas = FORMAS.filter((x) => c.pagamentos?.[x.chave]).map((x) => `${x.nome} ${moeda(c.pagamentos![x.chave]!)}`);
          return (
            <div key={c.id} className="card card-borda mb" style={{ ["--c" as string]: problemas.length ? "var(--orange)" : "var(--feito)" }}>
              <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
                <b style={{ textTransform: "capitalize" }}>{diaDaSemana(d)} · {dia(d)}{c.loja ? ` · ${c.loja}` : ""}{feriadoNacional(d) ? ` · ${feriadoNacional(d)}` : ""}</b>
                <b style={NUM}>{moeda(c.faturamento)}</b>
              </div>
              <div className="mudo" style={NUM}>{c.vendas} {c.vendas === 1 ? "venda" : "vendas"} · {c.pecas} {c.pecas === 1 ? "peça" : "peças"}</div>
              {formas.length > 0 && <div style={{ marginTop: 4 }}>{formas.join(" · ")}</div>}
              {(c.vendedoras ?? []).length > 0 && <div style={{ marginTop: 4 }}>{(c.vendedoras ?? []).map((v) => `${v.nome} ${moeda(v.faturamento)}`).join(" · ")}</div>}
              <div className="ajuda" style={{ marginTop: 6 }}>
                Lançado por <b>{c.lancado_por ?? "não registrado"}</b> em {dataHora(c.created_at)}
                {c.corrigido_por && c.atualizado_em ? <> · corrigido por <b>{c.corrigido_por}</b> em {dataHora(c.atualizado_em)}</> : null}
              </div>
              {c.obs && <div className="ajuda">Observação: {c.obs}</div>}
              {c.justificativa && <div className="ajuda">Motivo escrito: {c.justificativa}</div>}
              {problemas.length > 0 && <div className="aviso mt" style={{ marginBottom: 0 }}>Para conferir: {problemas.join("; ")}</div>}
              <div className="linha mt" style={{ gap: 8 }}>
                <Link className={`btn ${problemas.length ? "p" : "s"} peq`} href={`/gestao/caixa?mes=${d.slice(0, 7)}&corrigir=${c.id}`}>{problemas.length ? "Corrigir este dia" : "Abrir para alterar"}</Link>
              </div>
              {vendasLink.length > 0 && (
                <details className="mt">
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>{vendasLink.length} {vendasLink.length === 1 ? "venda lançada" : "vendas lançadas"} no link, uma por uma</summary>
                  {vendasLink.map((v) => (
                    <div key={v.id} className="linha entre" style={{ gap: 8, padding: "4px 0", borderTop: "1px solid var(--line)", ...NUM }}>
                      <span>{hora(v.created_at)} · <b>{v.quem?.trim() || "sem nome"}</b> · {v.canal}{v.pecas ? ` · ${v.pecas} ${v.pecas === 1 ? "peça" : "peças"}` : ""}</span>
                      <span>{moeda(v.valor)}</span>
                    </div>
                  ))}
                </details>
              )}
            </div>
          );
        });
      })}
    </>
  );
}
