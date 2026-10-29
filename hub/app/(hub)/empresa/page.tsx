"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { AtividadeRecente } from "@/components/AtividadeRecente";
import { Carregando, primeiroNome, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { buscarCarteira, contratoAtual } from "@/lib/carteira";
import { MESES_ABREV, dia, diasAte, diasDesde, hoje, moeda } from "@/lib/formato";
import { buscarFinanceiro, resumo, somaMes } from "@/lib/financeiro";
import { buscarComercial } from "@/lib/comercial";
import { ETAPAS_LEAD, buscarLeads } from "@/lib/leads";

/** Quantos dias faltam para o próximo aniversário (0 = hoje), no fuso de Recife. */
function diasParaAniversario(data: string) {
  const hoje = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Recife" }) + "T12:00:00");
  const [, m, d] = data.split("-").map(Number);
  let prox = new Date(hoje.getFullYear(), m - 1, d, 12);
  if (prox < hoje) prox = new Date(hoje.getFullYear() + 1, m - 1, d, 12);
  return Math.round((prox.getTime() - hoje.getTime()) / 86_400_000);
}

export default function PainelEmpresa() {
  const hub = useEquipe();
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const mes = hoje().slice(0, 7);
    const [carteira, { data: duvidas }, { data: acessos }, { data: aniversarios }, fin, passado, comercial, leads] = await Promise.all([
      buscarCarteira(),
      sb.from("solicitacoes").select("portal_id").in("status", ["Recebida", "Em andamento"]),
      sb.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
      sb.from("portais").select("id, loja, responsavel, aniversario").eq("ativo", true).not("aniversario", "is", null),
      buscarFinanceiro(mes).catch(() => null),
      buscarFinanceiro(somaMes(mes, -1)).catch(() => null),
      buscarComercial().catch(() => null),
      buscarLeads().catch(() => null),
    ]);
    return { ...carteira, mes, duvidas: duvidas ?? [], acessos: acessos ?? [], aniversarios: aniversarios ?? [], fin, passado, comercial, leads: leads?.leads ?? [] };
  }, []);
  if (!dados) return <Carregando />;

  const ativas = dados.lojas
    .filter((l) => l.ativo && (l.fichas?.situacao ?? "Em andamento") !== "Finalizada")
    .map((l) => ({ ...l, c: contratoAtual(l) }));
  const planoDe = (l: (typeof ativas)[number]) => l.fichas?.plano_id ?? l.c?.plano_id ?? null;
  const porPlano = [...dados.planos.map((p) => ({ nome: p.nome, n: ativas.filter((l) => planoDe(l) === p.id).length })),
    { nome: "Sem plano definido", n: ativas.filter((l) => !planoDe(l)).length }].filter((x) => x.n > 0);
  const maxPlano = Math.max(1, ...porPlano.map((x) => x.n));
  // Renovação é receita: os contratos que vencem em até 60 dias, com o valor do contrato atual.
  const vencendo = ativas.filter((l) => l.c?.fim && diasAte(l.c.fim) <= 60).sort((a, b) => (a.c?.fim ?? "").localeCompare(b.c?.fim ?? ""));
  const emRenovacao = vencendo.reduce((s, l) => s + Number(l.c?.valor ?? 0), 0);
  const proximosAniversarios = dados.aniversarios
    .map((a) => ({ ...a, faltam: diasParaAniversario(a.aniversario as string) }))
    .filter((a) => a.faltam <= 15)
    .sort((a, b) => a.faltam - b.faltam);
  const ultimoAcesso = (id: string) =>
    dados.acessos.filter((a) => a.portal_id === id && a.ultimo_acesso).map((a) => a.ultimo_acesso as string).sort().reverse()[0] ?? null;
  const atencao = ativas.filter((l) => { const a = ultimoAcesso(l.id); return l.fichas?.termometro === "Vermelho" || l.fichas?.termometro === "Amarelo" || (a && diasDesde(a) >= 14); }).length;

  // Financeiro: o mês, o mês passado e o ano.
  const r = dados.fin ? resumo(dados.fin.lancs, dados.fin.config) : null;
  const rp = dados.passado ? resumo(dados.passado.lancs, dados.passado.config) : null;
  const variacao = r && rp && rp.vendas ? Math.round(((r.vendas - rp.vendas) / rp.vendas) * 100) : null;
  const ano = dados.mes.slice(0, 4);
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const doMes = (m: string, t: string) => (dados.fin?.ano ?? []).filter((x) => x.mes === m && x.tipo === t).reduce((s, x) => s + Number(t === "entrada" ? x.bruto ?? x.valor : x.valor), 0);
  const todos = meses.map((m) => ({ m, ent: doMes(m, "entrada"), sai: doMes(m, "saida") }));
  // Do primeiro mês com lançamento até o mês atual (sem a fila de meses zerados antes de começar).
  const primeiro = todos.findIndex((x) => x.ent || x.sai);
  const barras = primeiro < 0 ? [] : todos.filter((x, i) => i >= primeiro && (x.ent || x.sai || x.m <= dados.mes));
  const maxBarra = Math.max(1, ...barras.map((x) => Math.max(x.ent, x.sai)));
  const vendasAno = barras.reduce((s, x) => s + x.ent, 0), lucroAno = barras.reduce((s, x) => s + x.ent - x.sai, 0);
  // Comercial do mês: vendas registradas e o funil de leads.
  const vendasMes = (dados.comercial?.vendas ?? []).filter((v) => (v.pagamento_em ?? v.created_at).slice(0, 7) === dados.mes);
  const leadsMes = dados.leads.filter((l) => l.created_at.slice(0, 7) === dados.mes);
  const abertos = ETAPAS_LEAD.filter((e) => e !== "Fechou").map((e) => ({ e, n: dados.leads.filter((l) => l.etapa === e).length }));
  const fecharam = dados.leads.filter((l) => l.etapa === "Fechou" && l.etapa_em.slice(0, 7) === dados.mes).length;
  const nomeMes = (m: string) => MESES_ABREV[Number(m.slice(5)) - 1];

  return (
    <>
      <Titulo titulo={`Olá, ${primeiroNome(hub.nome)}`} sub="Os números da empresa: quanto entrou, quanto sobrou, as vendas do mês, o funil e as renovações." />
      <div className="grade g4 mb">
        <Link href="/empresa/financeiro" className="card card-borda kpi" style={{ ["--c" as string]: "var(--orange)", textDecoration: "none" }}>
          <small>Vendas de {nomeMes(dados.mes)}</small><b>{r ? moeda(r.vendas) : "—"}</b>
          {variacao !== null && <small style={{ color: variacao >= 0 ? "var(--green)" : "var(--red)" }}>{variacao >= 0 ? "▲" : "▼"} {Math.abs(variacao)}% sobre {nomeMes(somaMes(dados.mes, -1))}</small>}
        </Link>
        <Link href="/empresa/financeiro" className="card card-borda kpi" style={{ ["--c" as string]: "var(--green)", textDecoration: "none" }}>
          <small>Lucro de {nomeMes(dados.mes)}</small><b style={{ color: r && r.lucro < 0 ? "var(--red)" : undefined }}>{r ? moeda(r.lucro) : "—"}</b>
          {r && r.aPagar > 0 && <small className="mudo">falta pagar {moeda(r.aPagar)}</small>}
        </Link>
        <Link href="/empresa/carteira" className="card card-borda kpi" style={{ ["--c" as string]: "var(--purple)", textDecoration: "none" }}>
          <small>Clientes ativas</small><b>{ativas.length}</b>
        </Link>
        <Link href="#vencendo" className="card card-borda kpi" style={{ ["--c" as string]: "var(--blue)", textDecoration: "none" }}>
          <small>Renovações em 60 dias</small><b>{vencendo.length}</b>{emRenovacao > 0 && <small className="mudo">{moeda(emRenovacao)} em jogo</small>}
        </Link>
      </div>

      <div className="grade g2">
        <div className="card">
          <h2>Faturamento de {ano}</h2>
          <p className="mudo" style={{ marginTop: 0 }}>Vendido no ano: <b>{moeda(vendasAno)}</b> · sobrou: <b>{moeda(lucroAno)}</b></p>
          {barras.map((x) => (
            <div key={x.m} className="mb">
              <div className="linha entre"><small><b>{nomeMes(x.m)}</b></small><small className="mudo">{moeda(x.ent)} · saiu {moeda(x.sai)}</small></div>
              <div className="barra"><i style={{ width: `${(x.ent / maxBarra) * 100}%` }} /></div>
              <div className="barra" style={{ height: 4, marginTop: 2 }}><i style={{ width: `${(x.sai / maxBarra) * 100}%`, background: "var(--red)" }} /></div>
            </div>
          ))}
          {!vendasAno && <p className="mudo">Lance as entradas e despesas no <Link href="/empresa/financeiro">Financeiro</Link>.</p>}
        </div>

        <div className="card">
          <h2>Comercial de {nomeMes(dados.mes)}</h2>
          <div className="grade g3" style={{ gap: 8 }}>
            <div className="kpi"><small>Vendas registradas</small><b>{vendasMes.length}</b><small className="mudo">{moeda(vendasMes.reduce((s, v) => s + Number(v.valor ?? 0), 0))}</small></div>
            <div className="kpi"><small>Leads novos</small><b>{leadsMes.length}</b></div>
            <div className="kpi"><small>Fecharam</small><b>{fecharam}</b><small className="mudo">{leadsMes.length ? `${Math.round((fecharam / leadsMes.length) * 100)}% dos novos` : ""}</small></div>
          </div>
          <p style={{ margin: "12px 0 4px" }}><b>Funil em aberto</b></p>
          {abertos.map((x) => <div key={x.e} className="linha entre"><span>{x.e}</span><b>{x.n}</b></div>)}
          <p style={{ marginBottom: 0 }}><Link href="/equipe/comercial/leads">Abrir leads e funil →</Link></p>
        </div>

        <div className="card" id="vencendo">
          <h2>Renovações</h2>
          <p className="mudo" style={{ marginTop: 0 }}>Contratos que vencem em até 60 dias. É a hora de falar de renovação ou do próximo plano.</p>
          {vencendo.length === 0 && <p className="mudo">Nenhum contrato vence nos próximos 60 dias.</p>}
          {vencendo.map((l) => {
            const d = diasAte(l.c?.fim);
            return (
              <div key={l.id} className="linha entre marcar" style={{ cursor: "default" }}>
                <Link href={`/equipe/portal?id=${l.id}#ficha`}><b>{l.loja}</b></Link>
                <span>{l.c?.valor ? <small className="mudo">{moeda(Number(l.c.valor))} · </small> : null}{dia(l.c?.fim)} <span className={`selo ${d < 0 ? "erro" : "alerta"}`}>{d < 0 ? "venceu" : `em ${d} dias`}</span></span>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2>Ativas por plano</h2>
          {porPlano.length === 0 && <p className="mudo">Nenhuma cliente ativa ainda.</p>}
          {porPlano.map((x) => (
            <div key={x.nome} className="mb">
              <div className="linha entre"><span>{x.nome}</span><b>{x.n}</b></div>
              <div className="barra"><i style={{ width: `${(x.n / maxPlano) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        {proximosAniversarios.length > 0 && (
          <div className="card">
            <h2>🎂 Aniversários das clientes</h2>
            {proximosAniversarios.map((a) => (
              <div key={a.id} className="linha entre" style={{ padding: "4px 0" }}>
                <span><b>{a.responsavel || a.loja}</b> <small className="mudo">· {a.loja} · {dia(a.aniversario as string).slice(0, 5)}</small></span>
                <span className={`selo ${a.faltam <= 3 ? "alerta" : "espera"}`}>{a.faltam === 0 ? "hoje" : a.faltam === 1 ? "amanhã" : `em ${a.faltam} dias`}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <h2>Execução com as lojas</h2>
          <p className="mudo" style={{ marginTop: 0 }}>O dia a dia com as clientes fica na Central do Cliente.</p>
          <div className="linha entre"><Link href="/empresa/acompanhamento">Lojas que precisam de atenção</Link><b>{atencao}</b></div>
          <div className="linha entre"><Link href="/equipe/duvidas">Mensagens esperando resposta</Link><b>{dados.duvidas.length}</b></div>
        </div>
      </div>
      {/* O movimento da equipe no Hub: só a Camilla vê. */}
      {hub.aprova && <AtividadeRecente />}
    </>
  );
}
