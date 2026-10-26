"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { AtividadeRecente } from "@/components/AtividadeRecente";
import { Carregando, primeiroNome, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ETAPAS_JORNADA, buscarCarteira, contratoAtual, corTermometro } from "@/lib/carteira";
import { dataHora, dia, diasAte, diasDesde, haQuanto } from "@/lib/formato";

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
    const agora = new Date().toISOString();
    const semana = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const [carteira, { data: reunioes }, { data: duvidas }, { data: acessos }, { data: aniversarios }] = await Promise.all([
      buscarCarteira(),
      sb.from("reunioes").select("portal_id, data, titulo").gte("data", agora).lte("data", semana).order("data"),
      sb.from("solicitacoes").select("portal_id").in("status", ["Recebida", "Em andamento"]),
      sb.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
      sb.from("portais").select("id, loja, responsavel, aniversario").eq("ativo", true).not("aniversario", "is", null),
    ]);
    return { ...carteira, reunioes: reunioes ?? [], duvidas: duvidas ?? [], acessos: acessos ?? [], aniversarios: aniversarios ?? [] };
  }, []);
  if (!dados) return <Carregando />;

  const ativas = dados.lojas
    .filter((l) => l.ativo && (l.fichas?.situacao ?? "Em andamento") !== "Finalizada")
    .map((l) => ({ ...l, c: contratoAtual(l) }));
  const loja = (id: string) => dados.lojas.find((l) => l.id === id)?.loja ?? "—";
  const planoDe = (l: (typeof ativas)[number]) => l.fichas?.plano_id ?? l.c?.plano_id ?? null;

  const porPlano = [...dados.planos.map((p) => ({ nome: p.nome, n: ativas.filter((l) => planoDe(l) === p.id).length })),
    { nome: "Sem plano definido", n: ativas.filter((l) => !planoDe(l)).length }].filter((x) => x.n > 0);
  const maxPlano = Math.max(1, ...porPlano.map((x) => x.n));
  const porEtapa = ETAPAS_JORNADA.map((nome, i) => ({ nome: i ? `${i} · ${nome}` : "Sem etapa", n: ativas.filter((l) => (l.fichas?.etapa ?? 0) === i).length }));
  const vencendo = ativas
    .filter((l) => l.c?.fim && diasAte(l.c.fim) <= 60)
    .sort((a, b) => (a.c?.fim ?? "").localeCompare(b.c?.fim ?? ""));
  // Aniversário das clientes nos próximos 15 dias: dá tempo de preparar algo especial.
  const proximosAniversarios = dados.aniversarios
    .map((a) => ({ ...a, faltam: diasParaAniversario(a.aniversario as string) }))
    .filter((a) => a.faltam <= 15)
    .sort((a, b) => a.faltam - b.faltam);
  const ultimoAcesso = (id: string) =>
    dados.acessos.filter((a) => a.portal_id === id && a.ultimo_acesso).map((a) => a.ultimo_acesso as string).sort().reverse()[0] ?? null;
  const atencao = ativas
    .map((l) => ({ l, acesso: ultimoAcesso(l.id) }))
    .filter(({ l, acesso }) => l.fichas?.termometro === "Vermelho" || l.fichas?.termometro === "Amarelo" || (acesso && diasDesde(acesso) >= 14))
    .sort((a, b) => (a.l.fichas?.termometro === "Vermelho" ? 0 : 1) - (b.l.fichas?.termometro === "Vermelho" ? 0 : 1));
  const vermelhos = ativas.filter((l) => l.fichas?.termometro === "Vermelho").length;

  return (
    <>
      <Titulo titulo={`Olá, ${primeiroNome(hub.nome)}`} sub="O painel da empresa: quem está ativa, o que vence e quem precisa de atenção." />
      {proximosAniversarios.length > 0 && (
        <div className="card card-borda mb" style={{ ["--c" as string]: "var(--purple)" }}>
          <h3 style={{ marginTop: 0 }}>🎂 Aniversários chegando</h3>
          {proximosAniversarios.map((a) => (
            <div key={a.id} className="linha entre" style={{ padding: "4px 0" }}>
              <span><b>{a.responsavel || a.loja}</b> <small className="mudo">· {a.loja} · {dia(a.aniversario as string).slice(0, 5)}</small></span>
              <span className={`selo ${a.faltam <= 3 ? "alerta" : "espera"}`}>{a.faltam === 0 ? "hoje" : a.faltam === 1 ? "amanhã" : `em ${a.faltam} dias`}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grade g4 mb">
        {([
          [ativas.length, "clientes ativas", "var(--red)", "/empresa/carteira"],
          [vencendo.length, "contratos vencendo em 60 dias", "var(--orange)", "#vencendo"],
          [vermelhos, "termômetros vermelhos", "var(--purple)", "#atencao"],
          [dados.duvidas.length, "mensagens esperando resposta", "var(--blue)", "/equipe/duvidas"],
        ] as const).map(([n, r, c, href]) => (
          <Link key={r} href={href} className="card card-borda kpi" style={{ ["--c" as string]: c, textDecoration: "none" }}><b>{n}</b><small>{r}</small></Link>
        ))}
      </div>

      <div className="grade g2">
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

        <div className="card">
          <h2>Onde estão na jornada</h2>
          <table className="tabela">
            <tbody>
              {porEtapa.filter((x) => x.n > 0 || x.nome !== "Sem etapa").map((x) => (
                <tr key={x.nome}><td>{x.nome}</td><td style={{ textAlign: "right" }}>{x.n ? <b>{x.n}</b> : <span className="mudo">0</span>}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" id="vencendo">
          <h2>Contratos vencendo</h2>
          <p className="mudo" style={{ marginTop: 0 }}>Até 60 dias. É a hora de falar de renovação.</p>
          {vencendo.length === 0 && <p className="mudo">Nenhum contrato vence nos próximos 60 dias.</p>}
          {vencendo.map((l) => {
            const d = diasAte(l.c?.fim);
            return (
              <div key={l.id} className="linha entre marcar" style={{ cursor: "default" }}>
                <Link href={`/equipe/portal?id=${l.id}#ficha`}><b>{l.loja}</b></Link>
                <span>{dia(l.c?.fim)} <span className={`selo ${d < 0 ? "erro" : "alerta"}`}>{d < 0 ? "venceu" : `em ${d} dias`}</span></span>
              </div>
            );
          })}
        </div>

        <div className="card" id="atencao">
          <h2>Precisam de atenção</h2>
          <p className="mudo" style={{ marginTop: 0 }}>Termômetro vermelho ou amarelo, ou sem entrar no portal há 14 dias ou mais.</p>
          {atencao.length === 0 && <p className="mudo">Ninguém em alerta agora.</p>}
          {atencao.map(({ l, acesso }) => (
            <div key={l.id} className="linha entre marcar" style={{ cursor: "default" }}>
              <Link href={`/equipe/portal?id=${l.id}#ficha`}><b>{l.loja}</b></Link>
              <span className="linha">
                {l.fichas?.termometro && <span className={`selo ${corTermometro(l.fichas.termometro)}`}>{l.fichas.termometro}</span>}
                {acesso && diasDesde(acesso) >= 14 && <span className="selo espera">acesso {haQuanto(acesso)}</span>}
              </span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Encontros nos próximos 7 dias</h2>
          {dados.reunioes.length === 0 && <p className="mudo">Nenhum encontro marcado.</p>}
          {dados.reunioes.map((r, i) => (
            <div key={i} className="linha entre marcar" style={{ cursor: "default" }}>
              <span><b>{loja(r.portal_id)}</b> · {r.titulo}</span>
              <span style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{dataHora(r.data)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Ainda vai chegar aqui</h2>
          <p className="mudo" style={{ marginTop: 0 }}>Vendas do mês e funil (fase 4), diagnósticos da semana e fila do dia da operação (fase 2).</p>
        </div>
      </div>
      <AtividadeRecente />
    </>
  );
}
