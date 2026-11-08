"use client";

// Reunião de entrega do Hub: a reunião individual extra em que a Camilla entrega o portal pronto.
// O roteiro sai dos dados da loja (Contrato de Foco, Plano de Ação, rotina, planner, áreas com cadeado),
// com o foco em deixar claro o uso no dia a dia: depois dela a loja usa o Hub sozinha.
import { supabaseBrowser } from "@/lib/supabase/client";
import { buscarEncontro, proximoEncontro } from "@/lib/encontro";
import { NOME_PLANO, proximaPeloPlano } from "@/lib/reunioes-plano";
import { hoje } from "@/lib/formato";

const sb = () => supabaseBrowser();
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export async function buscarEntrega(portalId: string) {
  const [{ data: p }, { data: f }, { data: cts }, { data: itens }, { data: pers }, { data: planner }, { data: diag }, { data: prep }, { data: reus }, grupo] = await Promise.all([
    sb().from("portais").select("id, loja, responsavel, tipo, sem_equipe, venda_diaria, menu_trancado, plano_titulos, rotina_token, apoio_conteudo, entrega").eq("id", portalId).single(),
    sb().from("fichas").select("foco_curto, resultado_n1, indicador, foco_de_acordo_em, fundamentos_trabalhando").eq("portal_id", portalId).maybeSingle(),
    sb().from("contratos").select("plano_id, inicio, fim, status").eq("portal_id", portalId).order("inicio", { ascending: false }),
    sb().from("plano_itens").select("mes, feito").eq("portal_id", portalId),
    sb().from("personalizacao").select("etapa, concluida").eq("portal_id", portalId).eq("etapa", 20).maybeSingle(),
    sb().from("loja_planner").select("liberado").eq("portal_id", portalId).maybeSingle(),
    sb().from("loja_diagnostico").select("status").eq("portal_id", portalId).eq("loja", "").maybeSingle(),
    sb().from("diagnostico_preparo").select("escolha").eq("portal_id", portalId).maybeSingle(),
    sb().from("reunioes").select("titulo, data, selecionar").eq("portal_id", portalId).order("data"),
    buscarEncontro().catch(() => null),
  ]);
  const ct = (cts ?? []).find((c) => c.status === "Ativo") ?? (cts ?? [])[0] ?? null;
  return {
    p: p as Record<string, unknown> & { loja: string; responsavel: string | null; tipo: string; sem_equipe: boolean | null; venda_diaria: boolean | null; menu_trancado: string[] | null; plano_titulos: Record<string, string> | null; rotina_token: string | null; apoio_conteudo: string | null },
    f: f as { foco_curto: string | null; resultado_n1: string | null; indicador: string | null; foco_de_acordo_em: string | null; fundamentos_trabalhando: string[] | null } | null,
    ct: ct as { plano_id: string | null; inicio: string | null; fim: string | null } | null,
    itens: (itens ?? []) as { mes: number; feito: boolean }[],
    rotinaRespondida: !!pers?.concluida,
    plannerLiberado: !!planner?.liberado,
    diagnosticoLiberado: diag?.status === "liberada",
    escolha: (prep?.escolha ?? null) as { gargalo?: string; alavanca?: string } | null,
    reunioes: (reus ?? []) as { titulo: string | null; data: string; selecionar: string | null }[],
    grupo: grupo ? proximoEncontro(grupo) : null,
  };
}
export type DadosEntrega = Awaited<ReturnType<typeof buscarEntrega>>;

export type Bloco = { titulo: string; minutos: number; mostrar: string; falas: string[] };
export type Conferir = { ok: boolean; texto: string };

/** O que precisa estar pronto antes da reunião (para a entrega não travar no meio). */
export function antesDaReuniao(d: DadosEntrega): Conferir[] {
  return [
    { ok: d.diagnosticoLiberado, texto: "Diagnóstico da loja liberado" },
    { ok: !!d.f?.resultado_n1, texto: "Contrato de Foco preenchido (resumo, resultado e indicador)" },
    { ok: d.itens.length > 0, texto: "Plano de Ação aplicado no portal (mês a mês)" },
    { ok: d.rotinaRespondida, texto: "Formulário da rotina de gestão respondido pela loja" },
    { ok: d.plannerLiberado, texto: "Planner de gestão montado e liberado" },
    { ok: true, texto: "Acesso da lojista criado e testado (e-mail e senha) e o Hub instalado no celular dela" },
  ];
}

/** O roteiro, bloco a bloco: o que mostrar na tela e as falas (frases curtas). */
export function roteiroEntrega(d: DadosEntrega): Bloco[] {
  const nome = (d.p.responsavel ?? "").split(/,| e /)[0].trim() || "você";
  const time = !d.p.sem_equipe;
  const mes1 = d.p.plano_titulos?.["1"];
  const meses = new Set(d.itens.map((i) => i.mes)).size;
  const NOMES: Record<string, string> = {
    marca: "Nossa marca (a história e o guia das marcas)", conteudo: "Conteúdo (a análise do Instagram e as ferramentas)", clientes: "De cliente a fã",
    loja: "Minha loja", diagnostico: "Diagnóstico", gestao: "Gestão estratégica", pessoas: "Gestão de pessoas", vendas: "Vendas",
  };
  // Na ordem em que abrem: Nossa marca na semana depois do Diagnóstico, depois Conteúdo, depois o resto.
  const ORDEM = ["marca", "conteudo", "clientes", "vendas", "gestao", "pessoas", "diagnostico", "loja"];
  const trancadas = [...(d.p.menu_trancado ?? [])].sort((a, b) => (ORDEM.indexOf(a) + 99) % 99 - (ORDEM.indexOf(b) + 99) % 99).map((x) => NOMES[x] ?? x);
  const proxima = proximaPeloPlano(d.ct?.plano_id, d.ct?.inicio, d.reunioes, hoje());
  const plano = d.ct?.plano_id ? NOME_PLANO[d.ct.plano_id] ?? d.ct.plano_id : "";
  const [inicio, , meta] = (d.f?.indicador ?? "").split("·").map((x) => x.trim());
  const blocos: Bloco[] = [
    {
      titulo: "1. Abertura: para que serve esta reunião", minutos: 5, mostrar: "O Início do portal dela, no celular dela",
      falas: [
        `${nome}, hoje é a entrega do seu Hub.`,
        "É uma reunião só: no fim dela você usa sozinha, no dia a dia.",
        "Vamos fazer tudo no seu celular, com você mexendo.",
        "Pode me interromper a qualquer momento.",
      ],
    },
    {
      titulo: "2. O Contrato de Foco: o norte dos próximos 90 dias", minutos: 7, mostrar: "Início › a faixa do Contrato de Foco › abre o Diagnóstico",
      falas: [
        d.f?.foco_curto ? `O nosso foco: ${d.f.foco_curto}.` : "Este é o nosso foco dos próximos 90 dias.",
        ...(d.f?.resultado_n1 ? [`Por extenso: ${d.f.resultado_n1}`] : []),
        ...(inicio && meta ? [`Hoje: ${inicio}. Onde vamos chegar: ${meta}.`] : []),
        "Tudo o que está no Hub serve a esse resultado.",
        d.f?.foco_de_acordo_em ? "Você já deu o seu de acordo. 💛" : "Se fizer sentido para você, dá o seu de acordo agora, comigo.",
      ],
    },
    {
      titulo: "3. O Diagnóstico: onde a loja está hoje", minutos: 8, mostrar: "Diagnóstico › Diagnóstico da loja",
      falas: [
        "Aqui está a foto da sua loja hoje.",
        // "Processos Comerciais: Crediário: regra…" → sem o pilar na frente.
        ...(d.escolha?.gargalo ? [`O que mais trava: ${d.escolha.gargalo.replace(/^[^:]+:\s*/, "")}.`] : []),
        ...(d.escolha?.alavanca ? [`O que vai trazer resultado mais rápido: ${d.escolha.alavanca}.`] : []),
        "Você não precisa decorar: sempre que quiser, está aqui.",
      ],
    },
    {
      titulo: "4. O Plano de Ação: o que fazer em cada mês", minutos: 10, mostrar: "Minha mentoria › Plano de Ação",
      falas: [
        `São ${meses || "os"} meses, um de cada vez.`,
        "Todo mês tem uma correção da gestão e o que vai trazer resultado.",
        ...(mes1 ? [`Este mês: ${mes1}.`] : []),
        "Fez? Marca aqui. Eu acompanho daqui.",
        "Tocar numa tarefa feita e ver o verde: é a sua evolução.",
      ],
    },
    {
      titulo: "5. O Meu dia: o que olhar todo dia", minutos: 10, mostrar: "Início › Meu dia e Sua rotina de hoje",
      falas: [
        "Todo dia começa aqui: a meta de hoje e como foi ontem.",
        d.p.venda_diaria ? "Cada venda você registra em Vendas do dia, na hora: o caixa soma sozinho." : "No fim do dia, o caixa lançado no Fechamento de caixa.",
        ...(d.p.venda_diaria ? ["Venda no crediário: o registro da compra sai pronto para mandar à cliente."] : []),
        "A Sua rotina de hoje mostra só o que é de hoje. Fez, marca.",
        ...(time ? ["Todo dia tem a mensagem de direção pronta: você copia e manda no grupo da loja, mesmo de fora."] : []),
      ],
    },
    {
      titulo: "6. O Planner de gestão: a sua rotina fixa", minutos: 7, mostrar: "Planner de gestão",
      falas: [
        "Aqui fica a sua rotina de gestão: o que é de todo dia, de toda semana e de todo mês.",
        d.rotinaRespondida ? "Ele saiu das suas respostas do formulário da rotina." : "Para ele ficar do seu jeito, vamos responder agora o formulário da rotina.",
        "Cada tarefa tem o dia certo e o como fazer.",
        "As do dia aparecem sozinhas no Meu dia.",
      ],
    },
    {
      titulo: "7. O PLANEJE AQUI: o mês seguinte", minutos: 5, mostrar: "Início › atalho Planeje [mês] (o prazo em vermelho)",
      falas: [
        "Todo mês você planeja o mês seguinte aqui.",
        "O prazo é o dia 20: está em vermelho no atalho.",
        "Eu leio e devolvo com os ajustes.",
      ],
    },
    {
      titulo: "8. Como falar comigo e os próximos encontros", minutos: 5, mostrar: "Fale com a Camilla e o Próximo encontro no Início",
      falas: [
        "Dúvida, travou: Fale com a Camilla. A resposta vem em até 12 horas úteis.",
        ...(d.grupo ? [`O próximo encontro em grupo é ${ddmm(d.grupo.iso.slice(0, 10))}: o link fica no Início.`] : []),
        proxima === "nenhuma"
          ? `${plano ? `No plano ${plano}` : "No seu plano"}, os próximos encontros são os em grupo.`
          : proxima ? `O nosso próximo encontro individual, pelo plano: ${proxima.titulo}, perto de ${ddmm(proxima.data)}.` : "Os próximos encontros ficam sempre no Início.",
      ],
    },
    {
      titulo: "9. O que ainda vai abrir", minutos: 3, mostrar: "O menu: as áreas com cadeado no fim",
      falas: trancadas.length
        ? ["O que está com cadeado abre na etapa certa, uma área a cada 15 dias.", `Na ordem: ${trancadas.join("; depois ")}.`, "Assim você aprende uma coisa de cada vez."]
        : ["Todas as áreas já estão abertas para você."],
    },
    {
      titulo: "10. Fechamento: os combinados saem de você", minutos: 5, mostrar: "—",
      falas: [
        "Me diz numa frase: o que você faz amanhã cedo no Hub?",
        d.p.venda_diaria ? "Quando você registra as vendas: na hora de cada venda?" : "Em que horário você lança o caixa?",
        "Que dia da semana você abre o Planner para ver a semana?",
        "Combinado. Eu acompanho daqui. 💛",
      ],
    },
  ];
  return blocos;
}

/** O roteiro em texto, para copiar. */
export function roteiroTexto(loja: string, blocos: Bloco[]) {
  const total = blocos.reduce((s, b) => s + b.minutos, 0);
  return [`Reunião de entrega do Hub · ${loja} · ${total} min`, "", ...blocos.flatMap((b) => [`${b.titulo} (${b.minutos} min)`, `Mostrar: ${b.mostrar}`, ...b.falas.map((x) => `> ${x}`), ""])].join("\n");
}
