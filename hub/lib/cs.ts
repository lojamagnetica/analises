"use client";

// Início da CS: o que precisa da Claudia hoje, loja por loja. Junta acesso, caixa, leitura, reunião, plano, jornada,
// pendências e contrato em alertas simples, cada um com a mensagem pronta para a loja.
import { diasDesde, hoje } from "@/lib/formato";
import { ETAPAS, atrasado, buscarJornada } from "@/lib/jornada";
import { somarDias as somaDias } from "@/lib/acoes-mes";
import { semanaDe, semanaPassada } from "@/lib/leitura";
import { mesesDoInicio } from "@/lib/plano-mes";
import { buscarPendencias } from "@/lib/pendencias";
import { supabaseBrowser } from "@/lib/supabase/client";

export type AlertaCs = {
  chave: string; txt: string; grave: boolean;
  /** Página do portal da loja onde se resolve (abre como a loja vê ou como equipe). */
  destino?: string;
  /** Mensagem pronta para mandar à loja pelo WhatsApp. */
  msg?: string;
  /** Se preenchido, a CS fecha o alerta registrando a conversa (tipo e referência do registro em cs_contatos). */
  registro?: { tipo: string; ref: string };
};
export type Nivel = "vermelho" | "amarelo" | "verde";
export type LojaCs = {
  id: string; loja: string; tipo: string; whatsapp: string | null; responsavel: string | null;
  ultimo: string | null; proxReuniao: string | null; alertas: AlertaCs[]; nivel: Nivel; caixaCompleto: boolean | null;
  /** A última conversa registrada da CS com a loja. */
  contato: { feito_em: string; resumo: string | null; precisa_ajuda: boolean } | null;
};
export type PainelCs = { lojas: LojaCs[]; aCaminho: { id: string; loja: string; tipo: string; proxReuniao: string | null }[]; reunioes: { portal_id: string; loja: string; data: string; titulo: string | null }[]; semana: string };

const primeiro = (n: string | null) => (n ?? "").trim().split(/\s+/)[0] || "tudo bem";
const abertura = (l: { responsavel: string | null }) => `Oi, ${primeiro(l.responsavel)}! Aqui é a Claudia, da Loja Magnética.`;

/** Dias de loja aberta da semana (segunda a sábado) que já passaram, até ontem. */
function diasDaSemanaAteOntem(semana: string) {
  const h = hoje(); const out: string[] = [];
  for (let i = 0; i < 6; i++) { const d = somaDias(semana, i); if (d < h) out.push(d); }
  return out;
}

/** O dia útil seguinte à liberação da análise, em palavras ("terça"): o prazo de a CS confirmar com a loja. */
function prazoDoCheck(publicadaEm: string) {
  let d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date(publicadaEm));
  do { d = somaDias(d, 1); } while ([0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay()));
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" }).replace("-feira", "");
}

export async function painelCs(): Promise<PainelCs> {
  const sb = supabaseBrowser();
  const semana = semanaDe();
  const prox = mesesDoInicio().proximo;
  const [{ data: portais }, { data: perfis }, { data: caixa }, { data: leituras }, { data: reunioes }, { data: planos }, { data: contratos }, { data: numeros }, jornada, pend, { data: contatos }] = await Promise.all([
    sb.from("portais").select("id, loja, tipo, whatsapp, responsavel, menu_oculto, cs_acompanha").eq("ativo", true).order("loja"),
    sb.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
    sb.from("loja_caixa").select("portal_id, dia").gte("dia", semana),
    sb.from("loja_leituras").select("portal_id, publicada, pronta, publicada_em").eq("semana", semana),
    sb.from("reunioes").select("portal_id, data, titulo").gte("data", new Date().toISOString()).order("data"),
    sb.from("loja_plano_mes").select("portal_id, status").eq("mes", prox),
    sb.from("contratos").select("portal_id, fim, status").eq("status", "Ativo"),
    sb.from("loja_numeros_semana").select("portal_id").eq("semana", semanaPassada()),
    buscarJornada().catch(() => []),
    buscarPendencias().catch(() => []),
    sb.from("cs_contatos").select("portal_id, tipo, ref, feito_em, resumo, precisa_ajuda").gte("feito_em", new Date(Date.now() - 60 * 86_400_000).toISOString()).order("feito_em", { ascending: false }),
  ]);
  const lista = (portais ?? []).filter((p) => p.tipo !== "Curso" && p.cs_acompanha);
  // As demais lojas ainda estão na reunião de entrega: só passam para o acompanhamento quando a gestora liberar.
  const aCaminho = (portais ?? []).filter((p) => p.tipo !== "Curso" && !p.cs_acompanha).map((p) => ({ id: p.id as string, loja: p.loja as string, tipo: p.tipo as string, proxReuniao: ((reunioes ?? []).find((r) => r.portal_id === p.id)?.data as string | undefined) ?? null }));
  const diaDoMes = Number(hoje().slice(8));
  const passados = diasDaSemanaAteOntem(semana);
  const lojas: LojaCs[] = lista.map((p) => {
    const acessos = (perfis ?? []).filter((x) => x.portal_id === p.id);
    const ultimo = acessos.map((x) => x.ultimo_acesso as string | null).filter(Boolean).sort().reverse()[0] ?? null;
    const proxR = (reunioes ?? []).find((r) => r.portal_id === p.id);
    const al: AlertaCs[] = [];
    const semGestao = (p.menu_oculto ?? []).includes("gestao");
    let caixaCompleto: boolean | null = null;

    if (!acessos.length) al.push({ chave: "sem_acesso", txt: "O acesso ao portal ainda não foi criado", grave: false, destino: "/equipe" });
    else if (!ultimo) al.push({ chave: "nunca", txt: "Recebeu o acesso e nunca entrou", grave: true, msg: `${abertura(p)} Mandei o seu acesso ao portal da ${p.loja}. Abre agora pelo link, cria a sua senha e entra no Início. Me avisa aqui quando conseguir, e se travar me manda um print que eu te guio.` });
    else if (Math.floor(diasDesde(ultimo)) >= 7) al.push({ chave: "sem_entrar", txt: `Sem entrar no portal há ${Math.floor(diasDesde(ultimo))} dias`, grave: true, msg: `${abertura(p)} Faz ${Math.floor(diasDesde(ultimo))} dias que não vejo você no portal da ${p.loja}. Abre agora o Início: lá já está o que fazer hoje. Me responde aqui quando terminar, e se tiver qualquer dificuldade eu te ajudo.` });

    if (acessos.length && !semGestao) {
      const dias = new Set((caixa ?? []).filter((c) => c.portal_id === p.id).map((c) => c.dia as string));
      const faltam = passados.filter((d) => !dias.has(d));
      caixaCompleto = faltam.length === 0;
      if (faltam.length) al.push({ chave: "caixa", txt: faltam.length === 1 ? "Falta 1 dia de caixa nesta semana" : `Faltam ${faltam.length} dias de caixa nesta semana`, grave: faltam.length >= 2, destino: "/gestao/caixa",
        msg: `${abertura(p)} Vi que ${faltam.length === 1 ? "falta 1 dia" : `faltam ${faltam.length} dias`} de caixa no portal da ${p.loja}. Lança agora (leva 2 minutos) e me avisa por aqui. Lembra que na segunda a Camilla analisa a semana das lojas com o caixa 100%, e a sua análise já vem personalizada.` });
    } else if (acessos.length && semGestao && !(numeros ?? []).some((x) => x.portal_id === p.id)) {
      al.push({ chave: "numeros", txt: "Não mandou os números da semana passada", grave: true, msg: `${abertura(p)} Faltam os números da semana passada da ${p.loja}. Abre o portal, manda agora e me avisa. É com eles que a Camilla monta a sua análise.` });
    }

    const leit = (leituras ?? []).find((x) => x.portal_id === p.id);
    if (!leit) al.push({ chave: "leitura", txt: "Sem a leitura desta semana", grave: true, destino: "/inicio" });
    else if (!leit.publicada && leit.pronta) al.push({ chave: "leitura_pronta", txt: "Leitura encaminhada: falta a Camilla publicar", grave: false });
    else if (!leit.publicada) al.push({ chave: "leitura_rascunho", txt: "Rascunho da leitura pronto: revisar e encaminhar", grave: true, destino: "/inicio" });

    const contatosLoja = (contatos ?? []).filter((c) => c.portal_id === p.id);
    const contato = (contatosLoja[0] ?? null) as LojaCs["contato"];
    // A Camilla liberou a análise da semana: a CS confirma em 1 dia útil que a loja viu, entendeu e se precisa de ajuda.
    if (leit?.publicada && leit.publicada_em && !contatosLoja.some((c) => c.tipo === "leitura" && c.ref === semana)) {
      const entrou = !!ultimo && ultimo > (leit.publicada_em as string);
      al.push({ chave: "leitura_check", txt: `A Camilla liberou a análise da semana: confirme que a loja viu e entendeu (até ${prazoDoCheck(leit.publicada_em as string)}). ${entrou ? "Já entrou no Hub depois da liberação." : "Ainda não entrou no Hub desde a liberação."}`, grave: true, destino: "/inicio",
        registro: { tipo: "leitura", ref: semana },
        msg: `Oi, ${primeiro(p.responsavel)}! Aqui é a Claudia, da Loja Magnética. Vi que a Camilla já liberou a sua análise da semana. Você já conseguiu ver? Ficou alguma dúvida ou algo em que eu possa te ajudar?` });
    }
    // A loja precisa se sentir acompanhada: sem conversa registrada há mais de 7 dias vira um lembrete leve (14 dias, grave).
    if (acessos.length) {
      const dias = contato ? Math.floor(diasDesde(contato.feito_em)) : null;
      if (dias === null || dias >= 7) al.push({ chave: "sem_contato", txt: dias === null ? "Ainda sem conversa registrada com a loja" : `Sem conversar com a loja há ${dias} dias`, grave: dias !== null && dias >= 14,
        registro: { tipo: "geral", ref: hoje() },
        msg: `${abertura(p)} Passando para saber como foi a sua semana na ${p.loja}. Está tudo bem? Tem algo em que eu possa te ajudar?` });
    }

    if (!proxR && p.tipo !== "Curso") al.push({ chave: "reuniao", txt: "Sem próxima reunião marcada", grave: false, destino: "/equipe/reunioes",
      msg: `${abertura(p)} Vamos marcar a nossa próxima reunião da ${p.loja}. Te proponho terça às 10h ou quinta às 15h. Qual dos dois fica melhor?` });

    if (p.tipo === "Mentoria" && diaDoMes >= 15) {
      const pl = (planos ?? []).find((x) => x.portal_id === p.id);
      if (!(pl && ["enviado", "ok"].includes(pl.status))) al.push({ chave: "plano", txt: "Plano do próximo mês ainda não enviado", grave: diaDoMes >= 20,
        msg: `${abertura(p)} Falta enviar o plano do próximo mês da ${p.loja}. Abre o PLANEJE AQUI e envia até o dia 20, que a Camilla já monta a sua estratégia.` });
    }

    const ct = (contratos ?? []).filter((c) => c.portal_id === p.id && c.fim).map((c) => c.fim as string).sort().reverse()[0];
    if (ct) {
      const faltam = Math.ceil(-diasDesde(ct));
      if (faltam >= 0 && faltam <= 45) al.push({ chave: "contrato", txt: `O contrato termina em ${faltam} ${faltam === 1 ? "dia" : "dias"}: conversar sobre a continuidade`, grave: faltam <= 30,
        msg: `${abertura(p)} Quero te mostrar tudo o que construímos na ${p.loja} e o próximo passo. Fica melhor falarmos amanhã de manhã ou de tarde?` });
    }

    const j = jornada.find((x) => x.id === p.id);
    if (j) {
      const atrasos = ETAPAS.filter((e) => /CS/.test(e.quem)).flatMap((e) => e.checks.filter((k) => atrasado(j, k)));
      if (atrasos.length) al.push({ chave: "jornada", txt: atrasos.length === 1 ? `Item da jornada atrasado: ${atrasos[0].texto}` : `${atrasos.length} itens da jornada atrasados`, grave: true, destino: "/equipe/central" });
    }
    const pl = pend.find((x) => x.id === p.id);
    const abertas = (pl?.pendencias ?? []).filter((x) => x.quem === "Loja" && ["pendente", "solicitado"].includes(x.status)).length;
    if (abertas) al.push({ chave: "pendencias", txt: `${abertas} ${abertas === 1 ? "pendência" : "pendências"} com a loja`, grave: abertas >= 5, destino: "/equipe/pendencias",
      msg: `${abertura(p)} Faltam ${abertas} ${abertas === 1 ? "item" : "itens"} para o portal da ${p.loja} ficar completo. Te mando a lista agora e você me devolve até amanhã. Combinado?` });

    const relevantes = al.filter((a) => a.chave !== "sem_contato" || a.grave);
    const nivel: Nivel = relevantes.some((a) => a.grave) ? "vermelho" : relevantes.length ? "amarelo" : "verde";
    return { id: p.id, loja: p.loja, tipo: p.tipo, whatsapp: p.whatsapp ?? null, responsavel: p.responsavel ?? null, ultimo, proxReuniao: proxR?.data ?? null, alertas: al, nivel, caixaCompleto, contato };
  });
  const ordem = { vermelho: 0, amarelo: 1, verde: 2 } as const;
  lojas.sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || b.alertas.filter((x) => x.grave).length - a.alertas.filter((x) => x.grave).length || a.loja.localeCompare(b.loja));
  const nome = new Map(lojas.map((l) => [l.id, l.loja]));
  const semana7 = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const rs = (reunioes ?? []).filter((r) => r.data <= semana7 && nome.has(r.portal_id as string)).map((r) => ({ portal_id: r.portal_id as string, loja: nome.get(r.portal_id as string) as string, data: r.data as string, titulo: (r.titulo as string | null) ?? null }));
  return { lojas, aCaminho, reunioes: rs, semana };
}

/** Endereço do WhatsApp da loja com a mensagem pronta. */
export function linkZap(whatsapp: string | null, msg: string) {
  let n = (whatsapp ?? "").replace(/\D/g, "");
  if (n && n.length <= 11) n = "55" + n;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}
