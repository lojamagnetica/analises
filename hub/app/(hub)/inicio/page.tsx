"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icone } from "@/components/Icone";
import { Carregando, primeiroNome, useDados, useLojaFoco, usePortal } from "@/lib/hub";
import { buscarContratoFoco } from "@/lib/foco";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataCurta, dataHora, dia, hoje, mesAtual, MESES_ABREV } from "@/lib/formato";
import { buscarPlanos, mesDoPlano, mesesDoInicio, semanaDoDia } from "@/lib/plano-mes";
import { MESES } from "@/lib/conteudo";
import { buscarConsultoria, mesDaConsultoria } from "@/lib/consultoria";
import { SetePassos, type Passo } from "@/components/SetePassos";
import { dadosCompletos, liberado, prazoDiagnostico, requisito, emOnboarding } from "@/lib/entrada";
import { buscarMeuContrato, pertoDoFim, tempoDoContrato } from "@/lib/contrato";
import { Renovacao } from "@/components/Renovacao";
import { MeuDia } from "@/components/MeuDia";
import { AvisosDaLoja } from "@/components/AvisosDaLoja";
import { CaixaDaSemana } from "@/components/LeituraDaSemana";
import { chaveDoAtalho, lerVisto, marcarVisto, temNovidade } from "@/lib/atalho-novo";
import { buscarNovidades } from "@/lib/novidades-atalhos";
import { RankingDoMes } from "@/components/RankingVendedoras";
import { buscarEncontro, linkAgenda, proximoEncontro } from "@/lib/encontro";
import { areaFechada } from "@/lib/bussola";

const ATALHOS = [
  { href: "/consultoria/planner", rotulo: "Planner de gestão", icone: "cal", cor: "var(--red)" },
  { href: "/leitura", rotulo: "Leitura da semana", icone: "chart", cor: "var(--purple)" },
  { href: "/gestao/vez", rotulo: "Lista da vez", icone: "users", cor: "var(--orange)" },
  { href: "/plano", rotulo: "Plano 90 dias", icone: "target", cor: "var(--purple)" },
  { href: "/gestao/caixa", rotulo: "Fechar o caixa", icone: "calc", cor: "var(--green)" },
  // O Planeje do próximo mês: o nome do mês e o endereço são montados na tela.
  { href: "/planeje/mes", rotulo: "Planeje o próximo mês", icone: "cal", cor: "var(--green)" },
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
  // Atalhos que ficam verdes quando tem novidade que a pessoa ainda não abriu (neste aparelho).
  const { dados: novidades } = useDados(() => buscarNovidades(portal.id, equipe).catch(() => ({} as Record<string, string>)), [portal.id, equipe]);
  const [vistos, setVistos] = useState<Record<string, string>>({});
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: prox }, { data: plano }, { data: datas }, { data: passos }, consult, { count: respondidas }, contrato, planosMes, grupo] = await Promise.all([
      sb.from("reunioes").select("titulo, data").eq("portal_id", portal.id).gte("data", new Date().toISOString()).neq("selecionar", "Adiado").order("data").limit(1).maybeSingle(),
      sb.from("plano_itens").select("feito").eq("portal_id", portal.id),
      sb.from("datas_comerciais").select("dia, titulo").eq("mes", mes).order("dia", { nullsFirst: true }),
      sb.from("jornada_passos").select("numero, titulo, descricao").order("numero"),
      consultoria ? buscarConsultoria(portal.id) : Promise.resolve(null),
      sb.from("solicitacoes").select("id", { count: "exact", head: true }).eq("portal_id", portal.id).eq("status", "Respondida"),
      buscarMeuContrato(portal.id).catch(() => null),
      buscarPlanos(portal.id).catch(() => []),
      portal.tipo === "Mentoria" ? buscarEncontro().catch(() => null) : Promise.resolve(null),
    ]);
    return { prox, plano, datas, passos: (passos ?? []) as Passo[], consult, respondidas: respondidas ?? 0, contrato, planosMes, grupo };
  }, [portal.id]);
  // Contrato de Foco vigente: fica no topo para lembrar o resultado nº 1 sempre que entrar (o da loja em foco, quando há várias).
  const [lojaFoco] = useLojaFoco();
  const { dados: focoD } = useDados(() => buscarContratoFoco(portal.id, lojaFoco), [portal.id, lojaFoco]);
  const foco = focoD ?? null;
  // Loja em foco: o nome no topo é só o de quem cuida dela; com as lojas juntas, o nome geral.
  const { dados: donos } = useDados(async () => {
    if ((portal.lojas?.length ?? 0) < 2) return [] as { loja: string; nome: string }[];
    const { data } = await supabaseBrowser().rpc("responsaveis_das_lojas", { p: portal.id });
    return (data ?? []) as { loja: string; nome: string }[];
  }, [portal.id]);
  const donoDaLoja = lojaFoco ? donos?.find((x) => x.loja === lojaFoco)?.nome : undefined;
  if (!dados) return <Carregando />;
  const { prox, plano, datas, passos, consult, respondidas, contrato, planosMes, grupo } = dados;
  // No quadro do Meet vale o encontro mais próximo: a reunião individual ou o encontro em grupo.
  const pg = grupo ? proximoEncontro(grupo) : null;
  const usaGrupo = !!grupo && !!pg && (!prox || pg.iso < new Date(prox.data).toISOString());
  const proxEncontro = usaGrupo ? { data: pg!.iso, titulo: grupo!.titulo } : prox;
  const salaMeet = usaGrupo ? grupo!.link : portal.meet_url;
  // 45 dias antes do fim do contrato: aviso de renovação.
  const fimContrato = contrato?.atual && pertoDoFim(contrato.atual) ? tempoDoContrato(contrato.atual) : null;
  const passo = passos.find((p) => p.numero === portal.passo_atual);

  const total = plano?.length ?? 0;
  const feitos = plano?.filter((p) => p.feito).length ?? 0;
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const passosEntrada = PASSOS_ENTRADA.filter((p) => !(portal.sem_equipe && p.chave === "equipe"));
  const etapa2 = pers.get(2)?.respostas;
  const quem = donoDaLoja || (typeof etapa2?.seu_nome === "string" && etapa2.seu_nome) || (comoLoja && portal.responsavel) || primeiroNome(nome);
  const c = consult?.dados;
  const nMes = c ? mesDaConsultoria(c.inicio) : 0;
  const mesC = c ? c.meses[Math.min(Math.max(nMes, 1), c.meses.length) - 1] : null;
  const abertas = consult ? consult.acoes.filter((a) => a.tipo === "Ação da loja" && a.status !== "Feito").length : 0;
  // Áreas que a equipe tirou do menu desta loja (consultorias personalizadas) somem também dos atalhos.
  const ocultos = portal.menu_oculto ?? [];
  const escondido = (href: string) => ocultos.includes(href.split("?")[0]) || (ocultos.includes("gestao") && /^\/(gestao|metas)/.test(href)) || (ocultos.includes("clientes") && href.startsWith("/clientes"));
  const mesProx = mesesDoInicio().proximo;
  // Consultoria: sem o atalho do Plano 90 dias nem o da própria Consultoria (a gestão usa o Planner, a Lista da vez e as Reuniões).
  const atalhos = (consultoria ? ATALHOS.filter((a) => a.href !== "/plano") : ATALHOS)
    // A análise da semana e do mês fica à mão da gestão (consultoria).
    .concat(consultoria ? [{ href: "/consultoria/reunioes", rotulo: "Reuniões de gestão", icone: "users", cor: "var(--blue)" }] : [])
    // Loja na mão: o atalho do caixa vira Registrar venda.
    .map((a) => (portal.venda_diaria && a.href === "/gestao/caixa" ? { ...a, href: "/gestao/vendas", rotulo: "Registrar venda" } : a))
    .map((a) => (a.href === "/planeje/mes" ? { ...a, href: `/planeje/mes?m=${mesProx}`, rotulo: `Planeje ${mesDoPlano(mesProx).toLowerCase()}` } : a))
    // Loja sem equipe não tem fila de atendimento.
    .filter((a) => !(a.href === "/gestao/vez" && portal.sem_equipe))
    .filter((a) => !escondido(a.href));
  const comNovidade = (href: string) => {
    const k = chaveDoAtalho(href);
    return !!novidades?.[k] && !trancado(href) && temNovidade(novidades[k], vistos[k] ?? lerVisto(portal.id, href));
  };
  // A loja vê o cadeado nas áreas que ainda não abriram; a equipe vê tudo aberto.
  const ent = equipe ? null : entrada;
  const trancado = (href: string) => { if (!equipe && areaFechada(href)) return true;
    // Área Conteúdo com cadeado nesta loja (Equipe › portal): o atalho da Análise do Instagram mostra o cadeado.
    if (!equipe && href.startsWith("/conteudo") && (portal.menu_trancado ?? []).includes("conteudo")) return true; const r = requisito(href.split("?")[0]); return !!ent && !!r && !liberado(r, ent); };
  const entradaAberta = !!ent && !ent.livre && !dadosCompletos(ent);
  // Onboarding: o Início mostra só a boas-vindas e o passo a passo de envio.
  const onboarding = emOnboarding(ent);
  // Mandou tudo e o Diagnóstico ainda não foi liberado: mostra o prazo.
  const esperandoDiag = !!ent && !ent.livre && dadosCompletos(ent) && !ent.diagnostico;
  // Diagnóstico liberado nos últimos 15 dias: avisa no Início.
  // PLANEJE AQUI: o foco da semana do plano deste mês e o lembrete do próximo (até o dia 20).
  const meses = mesesDoInicio();
  const planoAtual = planosMes.find((p) => p.mes === meses.atual);
  const planoProx = planosMes.find((p) => p.mes === meses.proximo);
  const focoSemana = planoAtual?.dados?.semanas?.[semanaDoDia(Number(hoje().slice(8)))]?.foco?.trim();
  const ajustar = [planoAtual, planoProx].find((p) => p?.status === "ajustar");
  const diagnosticoNovo = !!ent?.diagnosticoEm && Date.now() - new Date(ent.diagnosticoEm).getTime() < 15 * 86_400_000;

  return (
    <>
      {portal.venda_diaria && (
        <div className="linha mt" style={{ gap: 10, flexWrap: "wrap" }}>
          <Link className="btn p" href="/gestao/vendas">+ Registrar venda</Link>
          <Link className="btn s" href="/gestao/crediario">Crediário</Link>
          <Link className="btn s" href="/gestao/minhas-compras">Compras</Link>
          <Link className="btn s" href="/gestao/estoque-loja">Estoque</Link>
          <Link className="btn s" href="/clientes">Minhas clientes</Link>
        </div>
      )}
      <div className="heroi mt">
        <div>
          <h1>Que bom ter você aqui, {quem}!</h1>
          <p>{portal.lojas?.length > 1
            ? `Este é o Hub da ${portal.lojas.join(" e ")}. Tudo das suas lojas em um lugar só.`
            : `Este é o Hub da ${portal.loja}. Tudo da sua loja em um lugar só.`}</p>
        </div>
        <div className="meet">
          <small>Próximo encontro no Meet</small>
          {proxEncontro ? (
            <>
              <b style={{ textTransform: "capitalize" }}>{dataHora(proxEncontro.data)}</b>
              <div style={{ opacity: 0.9 }}>{proxEncontro.titulo}</div>
            </>
          ) : (
            <b>Ainda sem data marcada</b>
          )}
          {salaMeet && (
            <div className="mt">
              <a className="btn b peq" href={salaMeet} target="_blank" rel="noopener">Entrar na sala</a>
              {usaGrupo && <a className="link-loja" style={{ marginLeft: 10, color: "inherit" }} href={linkAgenda(grupo!)} target="_blank" rel="noopener">📅 Colocar na agenda</a>}
            </div>
          )}
        </div>
        {/* Contrato de Foco: faixa larga e baixa logo abaixo do nome (o resultado à esquerda, a meta e o de acordo à direita). */}
        {!onboarding && foco?.resultado && (
          <Link href="/painel" className="meet foco" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="foco-texto">
              <small>🎯 Contrato de Foco · o resultado nº 1</small>
              {/* No Início vai a versão curta; o contrato completo fica no Diagnóstico. */}
              <b style={{ display: "block", marginTop: 2, lineHeight: 1.35 }}>{foco.curto?.trim() || foco.resultado}</b>
            </div>
            <div className="foco-linha">
              <span>{foco.de_acordo_em ? `✓ De acordo em ${dataCurta(foco.de_acordo_em.slice(0, 10))} · ver o contrato` : equipe ? "Esperando o de acordo da loja" : "Falta o seu de acordo · toque para ver"}</span>
            </div>
          </Link>
        )}
      </div>

      {!onboarding && !equipe && <AvisosDaLoja />}
      {!onboarding && <CaixaDaSemana />}

      {entradaAberta && ent && (
        <div className="card card-borda mt" style={{ ["--c" as string]: "var(--red)" }}>
          <h3 style={{ marginTop: 0 }}>Para montar o seu Diagnóstico · {passosEntrada.filter((p) => ent[p.chave]).length} de {passosEntrada.length}</h3>
          <p className="mudo" style={{ marginTop: -4 }}>Com esses dados a equipe monta o Diagnóstico da sua loja em até 5 dias úteis. É dele que saem o seu Plano de Ação e o resto do Hub.</p>
          <div className="grade g3" style={{ gap: 10 }}>
            {passosEntrada.map((p, i) => (
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
          <p style={{ margin: "10px 0 0" }}>Lembrou de algo ou tem mais algum arquivo? Mande em <Link className="link-loja" href="/personalizacao/etapa?n=8">Estoque e relatórios</Link> ou no Fale com a Camilla.</p>
        </div>
      )}

      {diagnosticoNovo && (
        <div className="card card-borda mt" style={{ ["--c" as string]: "var(--green)" }}>
          <h3 style={{ marginTop: 0 }}>Seu Diagnóstico está pronto! 🎉</h3>
          <p className="mudo" style={{ margin: 0 }}>Veja como a sua loja está hoje: estoque, compras, linhas, fornecedores e a análise do seu Instagram. O seu Plano de Ação e as ferramentas da mentoria também já abriram.</p>
          <Link className="btn p peq mt" href="/painel">Ver o meu Diagnóstico →</Link>
        </div>
      )}

      {!trancado("/planeje") && focoSemana && (
        <Link href={`/planeje/mes?m=${meses.atual}`} className="card card-borda mt" style={{ ["--c" as string]: "var(--purple)", display: "block", textDecoration: "none", color: "inherit" }}>
          <small className="mudo">🎯 Foco desta semana · do seu plano de {mesDoPlano(meses.atual).toLowerCase()}</small>
          <div style={{ whiteSpace: "pre-wrap", fontWeight: 600, marginTop: 4 }}>{focoSemana}</div>
        </Link>
      )}

      {ajustar && (
        <Link href={`/planeje/mes?m=${ajustar.mes}`} className="card card-borda mt linha entre" style={{ ["--c" as string]: "var(--orange)", textDecoration: "none", color: "inherit" }}>
          <span><b>A Camilla pediu ajustes</b> no seu plano de {mesDoPlano(ajustar.mes).toLowerCase()}.</span>
          <span className="btn s peq">Ver</span>
        </Link>
      )}

      {respondidas > 0 && (
        <Link href="/assistente" className="card card-borda mt linha entre" style={{ ["--c" as string]: "var(--purple)", textDecoration: "none", color: "inherit" }}>
          <span><b>Você tem {respondidas === 1 ? "1 resposta nova" : `${respondidas} respostas novas`}</b> em Fale com a Camilla.</span>
          <span className="btn s peq">Ver resposta{respondidas === 1 ? "" : "s"}</span>
        </Link>
      )}

      {fimContrato && contrato && <Renovacao portalId={portal.id} faltam={fimContrato.faltam} consultoria={consultoria} pedida={contrato.pedida} />}

      {!onboarding && <>
      <div className="secao">Seus atalhos</div>
      <div className="atalhos">
        {/* Atalhos com cadeado (liberados em outra etapa) ficam no fim. */}
        {[...atalhos.filter((a) => !trancado(a.href)), ...atalhos.filter((a) => trancado(a.href))].map((a) => (
          <Link key={a.href} href={a.href} className={`atalho${comNovidade(a.href) ? " novo" : ""}`} style={{ ["--c" as string]: a.cor }}
            onClick={() => { const k = chaveDoAtalho(a.href); setVistos((v) => ({ ...v, [k]: marcarVisto(portal.id, a.href) })); }}>
            <span className="quadrado"><Icone nome={a.icone} /></span>
            {a.rotulo}{trancado(a.href) ? " 🔒" : ""}
            {comNovidade(a.href) && <small className="novidade">novidade</small>}
            {/* Lista da vez: os atendimentos de cada vendedora, hoje e no mês. */}
            {/* PLANEJE do mês seguinte: o prazo de envio para a Camilla (dia 20) à vista, ou o enviado ✓. */}
            {a.href.startsWith("/planeje/mes") && !trancado(a.href) && (
              planoProx && planoProx.status !== "rascunho"
                ? <small style={{ color: "var(--feito)", fontWeight: 700, fontSize: 11.5 }}>Enviado ✓</small>
                : <small style={{ color: "var(--red)", fontWeight: 700, fontSize: 11.5, lineHeight: 1.25 }}>
                    {Number(hoje().slice(8)) > 20 ? "Prazo passou: envie hoje" : `Planeje e envie para a Camilla até 20/${hoje().slice(5, 7)}`}
                  </small>
            )}
          </Link>
        ))}
      </div>

      {/* Sua rotina de hoje logo abaixo dos atalhos; antes do Diagnóstico (caixa trancado), a loja ainda vê os 7 passos. */}
      {!trancado("/gestao/caixa") && !escondido("/gestao/caixa") ? (
        <div className="mt"><MeuDia portalId={portal.id} estoque={pers.get(8)?.respostas} modo={{ solo: !!portal.sem_equipe, vendaDiaria: !!portal.venda_diaria, apoio: portal.apoio_conteudo }} lojas={portal.lojas ?? []} canais={portal.canais ?? []} lateral={<RankingDoMes compacto />} /></div>
      ) : !consultoria && passos.length > 0 && !escondido("/jornada") && (
        <>
          <div className="secao">Os 7 passos da sua mentoria</div>
          <SetePassos passos={passos} atual={portal.passo_atual} />
        </>
      )}
      </>}
      {ent && (ent.livre || (ent.video && ent.loja && ent.equipe)) && (
        <p className="ajuda"><Link className="link-loja" href="/comece">▶ Rever o vídeo de boas-vindas e o passo a passo</Link></p>
      )}

      {/* No onboarding, o Início fica só com a boas-vindas e o passo a passo de envio. */}
      {!onboarding && <>
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
            {!escondido("/jornada") && <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
              <h3>Sua jornada</h3>
              <p className="mudo">Passo {portal.passo_atual} de 7 · {passo?.titulo}</p>
              <div className="barra"><i style={{ width: `${(portal.passo_atual / 7) * 100}%` }} /></div>
              <Link className="btn s peq mt" href="/jornada">Ver os 7 passos</Link>
            </div>}
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
      </>}
    </>
  );
}
