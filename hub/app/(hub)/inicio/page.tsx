"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icone } from "@/components/Icone";
import { Carregando, primeiroNome, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataCurta, dataHora, mesAtual, MESES_ABREV } from "@/lib/formato";
import { MESES } from "@/lib/conteudo";
import { buscarConsultoria, mesDaConsultoria } from "@/lib/consultoria";
import { SetePassos, type Passo } from "@/components/SetePassos";
import { dadosCompletos, liberado, prazoDiagnostico, requisito } from "@/lib/entrada";

const ATALHOS = [
  { href: "/painel", rotulo: "Diagnóstico", icone: "chart", cor: "var(--red)" },
  { href: "/plano", rotulo: "Plano 90 dias", icone: "target", cor: "var(--purple)" },
  { href: "/gestao/caixa", rotulo: "Fechar o caixa", icone: "calc", cor: "var(--green)" },
  { href: "/conteudo", rotulo: "Análise do Instagram", icone: "insta", cor: "var(--orange)" },
  { href: "/clientes", rotulo: "Clientes", icone: "users", cor: "var(--purple)" },
  { href: "/assistente", rotulo: "Fale com a Camilla", icone: "chat", cor: "var(--purple)" },
  { href: "/cursos", rotulo: "Cursos", icone: "play", cor: "var(--blue)" },
];

const PASSOS_ENTRADA = [
  { chave: "video" as const, titulo: "Assistir ao vídeo de boas-vindas", href: "/comece" },
  { chave: "loja" as const, titulo: "Preencher os Dados da loja", href: "/personalizacao" },
  { chave: "equipe" as const, titulo: "Cadastrar a sua equipe e fazer o teste de perfil", href: "/personalizacao/etapa?n=5" },
];

export default function Inicio() {
  const { portal, nome, pers, comoLoja, equipe, entrada, persFaltam } = usePortal();
  const consultoria = portal.tipo === "Consultoria";
  const mes = mesAtual();
  useEffect(() => { document.title = "Início · magnética.hub"; }, []);
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: prox }, { data: plano }, { data: datas }, { data: passos }, consult, { count: respondidas }] = await Promise.all([
      sb.from("reunioes").select("titulo, data").eq("portal_id", portal.id).gte("data", new Date().toISOString()).order("data").limit(1).maybeSingle(),
      sb.from("plano_itens").select("feito").eq("portal_id", portal.id),
      sb.from("datas_comerciais").select("dia, titulo").eq("mes", mes).order("dia", { nullsFirst: true }),
      sb.from("jornada_passos").select("numero, titulo, descricao").order("numero"),
      consultoria ? buscarConsultoria(portal.id) : Promise.resolve(null),
      sb.from("solicitacoes").select("id", { count: "exact", head: true }).eq("portal_id", portal.id).eq("status", "Respondida"),
    ]);
    return { prox, plano, datas, passos: (passos ?? []) as Passo[], consult, respondidas: respondidas ?? 0 };
  }, [portal.id]);
  if (!dados) return <Carregando />;
  const { prox, plano, datas, passos, consult, respondidas } = dados;
  const passo = passos.find((p) => p.numero === portal.passo_atual);

  const total = plano?.length ?? 0;
  const feitos = plano?.filter((p) => p.feito).length ?? 0;
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const etapa2 = pers.get(2)?.respostas;
  const quem = (typeof etapa2?.seu_nome === "string" && etapa2.seu_nome) || (comoLoja && portal.responsavel) || primeiroNome(nome);
  const c = consult?.dados;
  const nMes = c ? mesDaConsultoria(c.inicio) : 0;
  const mesC = c ? c.meses[Math.min(Math.max(nMes, 1), c.meses.length) - 1] : null;
  const abertas = consult ? consult.acoes.filter((a) => a.tipo === "Ação da loja" && a.status !== "Feito").length : 0;
  const atalhos = consultoria
    ? ATALHOS.map((a) => (a.href === "/plano" ? { ...a, href: "/consultoria", rotulo: "Consultoria", icone: "chart" } : a))
    : ATALHOS;
  // A loja vê o cadeado nas áreas que ainda não abriram; a equipe vê tudo aberto.
  const ent = equipe ? null : entrada;
  const trancado = (href: string) => { const r = requisito(href.split("?")[0]); return !!ent && !!r && !liberado(r, ent); };
  const entradaAberta = !!ent && !ent.livre && !dadosCompletos(ent);
  // Mandou tudo e o Diagnóstico ainda não foi liberado: mostra o prazo.
  const esperandoDiag = !!ent && !ent.livre && dadosCompletos(ent) && !ent.diagnostico;

  return (
    <>
      <div className="heroi mt">
        <div>
          <h1>Que bom ter você aqui, {quem}!</h1>
          <p>{portal.lojas?.length > 1
            ? `Este é o Hub da ${portal.lojas.join(" e ")}. Tudo das suas lojas em um lugar só.`
            : `Este é o Hub da ${portal.loja}. Tudo da sua loja em um lugar só.`}</p>
        </div>
        <div className="meet">
          <small>Próximo encontro no Meet</small>
          {prox ? (
            <>
              <b style={{ textTransform: "capitalize" }}>{dataHora(prox.data)}</b>
              <div style={{ opacity: 0.9 }}>{prox.titulo}</div>
            </>
          ) : (
            <b>Ainda sem data marcada</b>
          )}
          {portal.meet_url && (
            <div className="mt">
              <a className="btn b peq" href={portal.meet_url} target="_blank" rel="noopener">Entrar na sala</a>
            </div>
          )}
        </div>
      </div>

      {entradaAberta && ent && (
        <div className="card card-borda mt" style={{ ["--c" as string]: "var(--red)" }}>
          <h3 style={{ marginTop: 0 }}>Para montar o seu Diagnóstico · {PASSOS_ENTRADA.filter((p) => ent[p.chave]).length} de 3</h3>
          <p className="mudo" style={{ marginTop: -4 }}>Com esses dados a equipe monta o Diagnóstico da sua loja em até 5 dias úteis. É dele que saem o seu Plano de Ação e o resto do Hub.</p>
          <div className="grade g3" style={{ gap: 10 }}>
            {PASSOS_ENTRADA.map((p, i) => (
              <Link key={p.chave} href={p.href} className="marcar" style={{ gap: 10 }}>
                <span className={`selo ${ent[p.chave] ? "feito" : "espera"}`}>{ent[p.chave] ? "✓" : i + 1}</span>
                <span>{p.titulo}{p.chave === "loja" && !ent.loja ? ` · falta${persFaltam > 1 ? "m" : ""} ${persFaltam}` : ""}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {esperandoDiag && ent && (
        <div className="card card-borda mt" style={{ ["--c" as string]: "var(--green)" }}>
          <h3 style={{ marginTop: 0 }}>Recebemos tudo! 🎉</h3>
          <p className="mudo" style={{ margin: 0 }}>
            Seu Diagnóstico fica pronto em até 5 dias úteis{ent.dadosEm ? <>, até <b>{dataCurta(prazoDiagnostico(ent.dadosEm))}</b></> : ""}.
            Assim que ele sair, o Plano de Ação e as outras áreas abrem para você.
          </p>
        </div>
      )}

      {respondidas > 0 && (
        <Link href="/assistente" className="card card-borda mt linha entre" style={{ ["--c" as string]: "var(--purple)", textDecoration: "none", color: "inherit" }}>
          <span><b>Você tem {respondidas === 1 ? "1 resposta nova" : `${respondidas} respostas novas`}</b> em Fale com a Camilla.</span>
          <span className="btn s peq">Ver resposta{respondidas === 1 ? "" : "s"}</span>
        </Link>
      )}

      <div className="secao">Seus atalhos</div>
      <div className="atalhos">
        {atalhos.map((a) => (
          <Link key={a.href} href={a.href} className="atalho" style={{ ["--c" as string]: a.cor }}>
            <span className="quadrado"><Icone nome={a.icone} /></span>
            {a.rotulo}{trancado(a.href) ? " 🔒" : ""}
          </Link>
        ))}
      </div>

      <div className="grade g3 mt">
        {consultoria ? (
          <>
            <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
              <h3>Sua consultoria</h3>
              {c && mesC ? (
                <>
                  <p className="mudo">{nMes > c.duracao ? "Encerramento" : `Mês ${nMes} de ${c.duracao} · ${mesC.nome}`}{mesC.foco ? ` · ${mesC.foco}` : ""}</p>
                  <div className="barra"><i style={{ width: `${(Math.min(nMes, c.duracao) / c.duracao) * 100}%` }} /></div>
                </>
              ) : <p className="mudo">A estrutura da sua consultoria está sendo montada.</p>}
              <Link className="btn s peq mt" href="/consultoria">Abrir a consultoria</Link>
            </div>
            <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
              <h3>Ações da quinzena</h3>
              <p className="mudo">{abertas ? `${abertas} ${abertas === 1 ? "ação aberta" : "ações abertas"} até o próximo encontro` : "Tudo em dia por aqui"}</p>
              <Link className="btn s peq mt" href="/consultoria">Ver as ações</Link>
            </div>
          </>
        ) : (
          <>
            <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
              <h3>Sua jornada</h3>
              <p className="mudo">Passo {portal.passo_atual} de 7 · {passo?.titulo}</p>
              <div className="barra"><i style={{ width: `${(portal.passo_atual / 7) * 100}%` }} /></div>
              <Link className="btn s peq mt" href="/jornada">Ver os 7 passos</Link>
            </div>
            <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
              <h3>Plano de Ação 90 dias{trancado("/plano") ? " 🔒" : ""}</h3>
              {trancado("/plano") ? (
                <p className="mudo">Seu plano é montado a partir do seu Diagnóstico. Ele abre quando o Diagnóstico ficar pronto.</p>
              ) : (
                <>
                  <p className="mudo">{total ? `${feitos} de ${total} tarefas feitas` : "Seu plano está sendo montado"}</p>
                  <div className="barra"><i style={{ width: `${pct}%` }} /></div>
                  <Link className="btn s peq mt" href="/plano">Abrir plano</Link>
                </>
              )}
            </div>
          </>
        )}
        <div className="card card-borda" style={{ ["--c" as string]: "var(--green)" }}>
          <h3>Datas de {MESES[mes].toLowerCase()}</h3>
          <p className="mudo">
            {(datas ?? []).map((d) => (d.dia ? `${d.titulo} (${d.dia}/${MESES_ABREV[mes]})` : d.titulo)).join(" · ") || "Sem datas cadastradas"}
          </p>
          <Link className="btn s peq" href={`/planeje/mes?m=${mes}`}>Planejar {MESES[mes].toLowerCase()}</Link>
        </div>
      </div>

      {!consultoria && passos.length > 0 && (
        <>
          <div className="secao">Os 7 passos da sua mentoria</div>
          <SetePassos passos={passos} atual={portal.passo_atual} />
        </>
      )}
    </>
  );
}
