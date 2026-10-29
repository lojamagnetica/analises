"use client";

// Meu dia: o norte de gestão da loja. Junta o Fechamento de caixa (por vendedora), a meta do PLANEJE AQUI,
// o perfil de cada vendedora, a base de clientes e as ações do mês, e diz o que fazer hoje.
// As regras e os textos ficam aqui em cima, num lugar só, para a Camilla revisar.
import { supabaseBrowser } from "@/lib/supabase/client";
import { MESES } from "@/lib/conteudo";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { PA_IDEAL, buscarCaixa, fimDoMes, fmtPa, indicadores, somar, somarMes, type Caixa } from "@/lib/caixa";
import { buscarPlano, diasDeLoja, metaDoPlano, metasDoTime, semanaDoDia, type LinhaPlano } from "@/lib/plano-mes";
import { VANTAGEM, principal, type Letra } from "@/lib/pessoas";
export { VANTAGEM };
import { moeda } from "@/lib/formato";

// ───── Regras (para revisar) ─────

/** Abaixo disso o PA acende vermelho (o ideal do método é 2,5). */
export const PA_ALERTA = 2;
/** Preço médio vendido abaixo de 90% do preço médio do estoque: está vendendo as peças mais baratas. */
export const PM_ALERTA = 0.9;
/** Vendedora abaixo de 85% do ritmo da meta dela. */
export const RITMO_ALERTA = 0.85;
/** Mínimo de vendas no mês para ler os indicadores de uma vendedora. */
export const VENDAS_MINIMAS = 3;
/** Reta final: faltando estes dias e a loja abaixo do ritmo, é dia de reunião de reta final. */
export const DIAS_RETA_FINAL = 10;

export type Problema = "pa" | "pm" | "volume" | "ok" | "sem";

/** O que está acontecendo, a fala e as 3 ações de cada situação. */
export const SITUACOES: Record<Problema, { titulo: string; fala: string; acoes: string[] }> = {
  pa: {
    titulo: "PA baixo",
    fala: "você está vendendo, mas a cliente sai quase sempre com uma peça só.",
    acoes: [
      "Oferecer o look completo em todo atendimento: a peça e o que combina",
      "Meta de PA 2 até o fim da semana, conferida no fim de cada dia",
      "Treino de 10 minutos com o script da peça complementar",
    ],
  },
  pm: {
    titulo: "Vendendo as peças mais baratas",
    fala: "você está vendendo as peças mais baratas.",
    acoes: [
      "Começar o atendimento pelas peças campeãs de maior valor",
      "Falar do benefício (caimento, tecido, ocasião) antes do preço",
      "Separar 3 peças de valor para mostrar em todo atendimento",
    ],
  },
  volume: {
    titulo: "Poucas vendas para a meta",
    fala: "você está abaixo do ritmo da sua meta: o que falta são mais vendas.",
    acoes: [
      "Chamar 5 clientes da carteira dela por dia no WhatsApp",
      "Abordar toda cliente que entra em até 1 minuto",
      "Agendar 2 atendimentos na semana (horário marcado ou malinha)",
    ],
  },
  ok: {
    titulo: "No ritmo da meta",
    fala: "você está no ritmo da sua meta.",
    acoes: [
      "Reconhecer na frente do time",
      "Desafio da semana: superar o próprio PA",
      "Ensinar o que funciona para quem está abaixo",
    ],
  },
  sem: {
    titulo: "Sem vendas lançadas",
    fala: "",
    acoes: ["Lançar as vendas dela no Fechamento de caixa todo dia, para o Hub acompanhar"],
  },
};

/** Como abrir e fechar a conversa conforme o perfil (o como falar vem do método, em Gestão de Pessoas). */
export const JEITO: Record<Letra, { abre: string; fecha: string }> = {
  D: { abre: "Direto ao ponto, com o número:", fecha: "Quero ver esse número na sexta." },
  I: { abre: "Comece pelo que ela faz bem:", fecha: "Me conta no fim do dia como foi?" },
  S: { abre: "No particular, com calma:", fecha: "Eu estou junto com você nisso." },
  C: { abre: "Com o número na mão:", fecha: "Vamos acompanhar esse número todo dia." },
};

// ───── Tipos ─────

export type Config = { reuniao?: number; conteudo?: number; planejamento?: number };
export type Rotina = { config: Config; feitos: Record<string, string[]> };
export type Vendedora = {
  id: string; nome: string; letra: Letra | null;
  faturamento: number; vendas: number; pecas: number; meta: number | null;
  pa: number | null; tkm: number | null; pm: number | null; problema: Problema; diagnostico: string;
  /** Referências do feedback: o preço médio do estoque e quanto ela está abaixo do ritmo da meta. */
  pmEstoque?: number | null; faltaRitmo?: number | null;
};
export type Tarefa = { chave: string; texto: string; href?: string };
export type Atitude = { tipo: "CRM" | "Conteúdo" | "Ação"; titulo: string; texto: string; href: string; botao: string };

export const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

// ───── Banco ─────

const sb = () => supabaseBrowser();

export async function buscarMeuDia(portalId: string) {
  const agora = hoje();
  const mes = agora.slice(0, 7);
  const [caixa, plano, planoProx, { data: equipe }, { data: rot }, { data: clientes }, { data: datas }] = await Promise.all([
    buscarCaixa(portalId, mes),
    buscarPlano(portalId, mes).catch(() => null),
    buscarPlano(portalId, somarMes(mes, 1)).catch(() => null),
    sb().from("loja_equipe").select("id, nome, perfil").eq("portal_id", portalId).eq("ativo", true).order("nome"),
    sb().from("loja_rotina").select("config, feitos").eq("portal_id", portalId).maybeSingle(),
    sb().from("loja_clientes").select("aniversario, ultima_compra").eq("portal_id", portalId).limit(5000),
    sb().from("datas_comerciais").select("mes, dia, titulo"),
  ]);
  // O caixa de ontem pode ser do mês passado (dia 1).
  const ontem = somarDias(agora, -1);
  const caixaOntem = ontem.slice(0, 7) === mes ? caixa.filter((c) => c.dia === ontem) : await buscarCaixa(portalId, ontem.slice(0, 7)).then((l) => l.filter((c) => c.dia === ontem));
  return {
    agora, caixa, caixaOntem, plano, planoProx,
    equipe: (equipe ?? []) as { id: string; nome: string; perfil: Record<Letra, number> | null }[],
    rotina: { config: (rot?.config ?? {}) as Config, feitos: (rot?.feitos ?? {}) as Record<string, string[]> },
    clientes: (clientes ?? []) as { aniversario: string | null; ultima_compra: string | null }[],
    datas: (datas ?? []) as { mes: number; dia: number | null; titulo: string }[],
  };
}
export type DadosMeuDia = Awaited<ReturnType<typeof buscarMeuDia>>;

export async function salvarRotina(portalId: string, r: Rotina) {
  // Guarda só os últimos 60 dias de marcações.
  const limite = somarDias(hoje(), -60);
  const feitos = Object.fromEntries(Object.entries(r.feitos).filter(([d]) => d >= limite));
  const { error } = await sb().from("loja_rotina").upsert({ portal_id: portalId, config: r.config, feitos, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// ───── Contas (sem banco, dá para testar) ─────

export function placar(d: DadosMeuDia) {
  const { agora, caixa, plano } = d;
  const meta = plano ? metaDoPlano(plano.dados) : null;
  const ate = somar(caixa.filter((c) => c.dia < agora)).faturamento;
  const deHoje = somar(caixa.filter((c) => c.dia === agora)).faturamento;
  // Domingo não conta: a meta do dia divide o que falta pelos dias de loja aberta.
  const mes = agora.slice(0, 7);
  const ontemIso = somarDias(agora, -1);
  const restantes = Math.max(1, diasDeLoja(agora, fimDoMes(mes)));
  const passados = ontemIso.startsWith(mes) ? diasDeLoja(`${mes}-01`, ontemIso) : 0;
  const metaHoje = meta ? Math.max(0, (meta - ate) / restantes) : null;
  const ritmo = passados > 0 ? ate / passados : null;
  const ontemConta = ontemIso.startsWith(mes) && new Date(`${ontemIso}T12:00:00Z`).getUTCDay() !== 0;
  const ontem = somar(d.caixaOntem);
  return {
    meta, vendido: ate + deHoje, ate, deHoje, restantes, metaHoje, ritmo,
    // Quanto o ritmo atual está abaixo do necessário (0,25 = 25% abaixo).
    abaixo: metaHoje && ritmo != null && metaHoje > 0 ? Math.max(0, 1 - ritmo / metaHoje) : null,
    ontem: d.caixaOntem.length ? ontem.faturamento : null,
    // Meta de ontem: o que faltava dividido pelos dias que restavam ontem.
    metaOntem: meta && ontemConta ? Math.max(0, (meta - (ate - ontem.faturamento)) / (restantes + 1)) : null,
  };
}

export function vendedoras(d: DadosMeuDia, pmEstoque: number | null): Vendedora[] {
  const meta = d.plano ? metaDoPlano(d.plano.dados) : null;
  const metas = metasDoTime(meta, d.equipe.map((p) => p.id), d.plano?.dados.metas);
  // Proporção do mês já passada (até ontem), em dias de loja aberta.
  const mes = d.agora.slice(0, 7);
  const ontemIso = somarDias(d.agora, -1);
  const passou = Math.max(1, ontemIso.startsWith(mes) ? diasDeLoja(`${mes}-01`, ontemIso) : 0) / Math.max(1, diasDeLoja(`${mes}-01`, fimDoMes(mes)));
  return d.equipe.map((p) => {
    const linhas = d.caixa.filter((c) => c.dia < d.agora).flatMap((c) => (c.vendedoras ?? []).filter((v) => v.pessoa_id === p.id));
    const t = linhas.reduce((a, v) => ({ faturamento: a.faturamento + v.faturamento, vendas: a.vendas + v.vendas, pecas: a.pecas + v.pecas }), { faturamento: 0, vendas: 0, pecas: 0 });
    const i = indicadores({ ...t, dias: 1 });
    const metaV = metas[p.id] || null;
    const nome = p.nome.split(" ")[0];
    let problema: Problema = "ok";
    let diagnostico = "";
    if (t.vendas < VENDAS_MINIMAS) {
      problema = "sem";
      diagnostico = t.vendas ? `${nome} tem só ${t.vendas} ${t.vendas === 1 ? "venda lançada" : "vendas lançadas"} no mês: ainda é cedo para ler os números.` : `Ainda não há vendas da ${nome} lançadas no mês.`;
    } else if (i.pa != null && i.pa < PA_ALERTA) {
      problema = "pa";
      diagnostico = `${nome} está com PA ${fmtPa(i.pa)} no mês (o ideal é ${fmtPa(PA_IDEAL)}): vende, mas quase sempre uma peça só.`;
    } else if (pmEstoque && i.pm != null && i.pm < pmEstoque * PM_ALERTA) {
      problema = "pm";
      diagnostico = `O preço médio que a ${nome} vende é ${moeda(i.pm)}, e o do estoque é ${moeda(pmEstoque)}: ela está vendendo as peças mais baratas.`;
    } else if (metaV && t.faturamento < metaV * passou * RITMO_ALERTA) {
      problema = "volume";
      diagnostico = `${nome} está ${moeda(metaV * passou - t.faturamento)} abaixo do ritmo da meta dela: o PA está bom, faltam vendas.`;
    } else {
      diagnostico = `${nome} está no ritmo${metaV ? ` da meta (${moeda(t.faturamento)} de ${moeda(metaV)})` : ""}${i.pa != null ? `, com PA ${fmtPa(i.pa)}` : ""}.`;
    }
    const faltaRitmo = metaV ? Math.max(0, metaV * passou - t.faturamento) : null;
    return { id: p.id, nome, letra: principal(p.perfil)?.letra ?? null, ...t, meta: metaV, pa: i.pa, tkm: i.tkm, pm: i.pm, problema, diagnostico, pmEstoque, faltaRitmo };
  });
}

// ───── Feedback na linha de gestão da Camilla ─────
// Auto-responsabilidade e maturidade do time: a fala é sempre na segunda pessoa ("você está vendendo...",
// nunca "as clientes estão levando..."). A ordem: 1) mostrar o problema, com número; 2) pontuar o que ela já faz
// bem e a vantagem do perfil dela; 3) demonstrar a solução na prática; 4) entender a dificuldade de execução;
// 5) o combinado sai dela (o quê, quanto e até quando).

const USO: Record<string, string> = {
  pm: "Use essa força para apresentar primeiro as peças de valor mais alto em todo atendimento.",
  pa: "Use essa força para conduzir a cliente para o look completo.",
  volume: "Use essa força para chamar a sua carteira e trazer a cliente para a loja.",
  ok: "Use essa força para ensinar o time o que está dando certo.",
};

export type PassoFeedback = { titulo: string; fala?: string; dica?: string };

/** O feedback pronto em 5 passos, com os números dela e no jeito do perfil. */
export function feedback(v: Vendedora) {
  const s = SITUACOES[v.problema];
  if (!s.fala) return null;
  const j = v.letra ? JEITO[v.letra] : null;
  const pa = v.pa != null ? fmtPa(v.pa) : "—";
  const tkm = v.tkm != null ? moeda(v.tkm) : "—";
  const vantagemPerfil = v.letra ? `${VANTAGEM[v.letra]} ${USO[v.problema] ?? ""}`.trim() : "";
  const p = v.problema;
  const problema = p === "pm"
    ? `"${v.nome}, você está vendendo as peças mais baratas: o seu preço médio é ${v.pm != null ? moeda(v.pm) : "—"}${v.pmEstoque ? `, e o do estoque é ${moeda(v.pmEstoque)}` : ""}."`
    : p === "pa"
      ? `"${v.nome}, você está vendendo, mas a cliente sai quase sempre com uma peça só: o seu PA está em ${pa}, e o ideal é ${fmtPa(PA_IDEAL)}."`
      : p === "volume"
        ? `"${v.nome}, você está ${moeda(v.faturamento)}${v.meta ? ` de ${moeda(v.meta)}` : ""}: ${v.faltaRitmo ? `${moeda(v.faltaRitmo)} abaixo do ritmo da sua meta` : "abaixo do ritmo da sua meta"}. O que está faltando são mais vendas."`
        : `"${v.nome}, você está no ritmo da sua meta: ${moeda(v.faturamento)}${v.meta ? ` de ${moeda(v.meta)}` : ""}, com PA ${pa}."`;
  const fazBem = p === "pm"
    ? (v.pa != null && v.pa >= PA_ALERTA ? `"O seu PA é ${pa}: a cliente já leva mais de uma peça com você."` : `"Você atende bastante: são ${v.vendas} vendas no mês."`)
    : p === "pa"
      ? `"Você atende bastante e fecha venda: são ${v.vendas} vendas no mês, com ticket de ${tkm}."`
      : p === "volume"
        ? `"Quando você atende, a cliente compra bem: PA ${pa} e ticket ${tkm}."`
        : `"O seu atendimento está funcionando: ${v.vendas} vendas, PA ${pa} e ticket ${tkm}."`;
  const solucao: Record<string, PassoFeedback> = {
    pm: { titulo: "3. A solução, mostrada na prática", dica: "Pegue uma peça que ela vende muito e mostre qual seria a opção com um valor um pouco maior que ela poderia ter oferecido, e como argumentaria (tecido, caimento, ocasião).", fala: `"Em todo atendimento, você começa pelas peças de maior valor e fala do benefício antes do preço."` },
    pa: { titulo: "3. A solução, mostrada na prática", dica: "Pegue a peça que ela mais vende e monte com ela o look completo na frente dela: o que ofereceria junto e como falaria antes de ir para o caixa.", fala: `"Depois que a cliente escolhe, você mostra a peça que completa o look antes de ir para o caixa."` },
    volume: { titulo: "3. A solução, mostrada na prática", dica: "Escolham juntas, agora, 5 clientes da carteira dela, e ela escreve a primeira mensagem na sua frente.", fala: `"Você chama 5 clientes da sua carteira por dia e aborda toda cliente que entra em até 1 minuto."` },
    ok: { titulo: "3. O próximo desafio", dica: "Peça para ela contar o que está fazendo de diferente: é isso que vai para o time.", fala: `"O que você está fazendo de diferente? Quero que você ensine isso para o time."` },
  };
  const exemplo: Record<string, string> = {
    pm: "Ex.: começar por 3 peças de valor em todo atendimento até sexta.",
    pa: `Ex.: PA ${fmtPa(PA_ALERTA)} até sexta, conferido no fechamento do caixa.`,
    volume: "Ex.: 5 contatos da carteira por dia até sexta, registrados no Hub.",
    ok: "Ex.: superar o próprio PA e ensinar uma pessoa do time nesta semana.",
  };
  const passos: PassoFeedback[] = [
    { titulo: "1. O problema, com número", fala: problema },
    { titulo: "2. O que você já faz bem", fala: fazBem, dica: vantagemPerfil || undefined },
    solucao[p],
    { titulo: "4. A dificuldade", fala: p === "ok" ? `"O que você precisa para ir além?"` : `"O que pode te atrapalhar de fazer isso no atendimento? Do que você precisa?"` },
    { titulo: "5. O combinado (sai dela)", fala: `"Então me diz: o que você vai fazer, quanto e até quando?"`, dica: `${exemplo[p]}${j ? ` Para fechar: "${j.fecha}"` : ""}` },
  ];
  return { comoAbrir: j?.abre ?? null, passos, texto: passos.map((x) => `${x.titulo}\n${x.fala ?? ""}${x.dica ? `\n(${x.dica})` : ""}`).join("\n\n") };
}

export function carteira(d: DadosMeuDia) {
  const mmdd = (iso: string) => iso.slice(5, 10);
  const prox = Array.from({ length: 8 }, (_, i) => mmdd(somarDias(d.agora, i)));
  const aniversarioHoje = d.clientes.filter((c) => c.aniversario && mmdd(c.aniversario) === prox[0]).length;
  const aniversarioSemana = d.clientes.filter((c) => c.aniversario && prox.includes(mmdd(c.aniversario))).length;
  const de = somarDias(d.agora, -90), ate = somarDias(d.agora, -30);
  const sumidas = d.clientes.filter((c) => c.ultima_compra && c.ultima_compra >= de && c.ultima_compra <= ate).length;
  return { total: d.clientes.length, aniversarioHoje, aniversarioSemana, sumidas };
}

/** As 3 atitudes de atração do dia: uma de CRM, uma de conteúdo e uma de ação. */
export function atitudes(d: DadosMeuDia, problemaDaLoja: Problema): Atitude[] {
  const c = carteira(d);
  const out: Atitude[] = [];
  out.push(c.total === 0
    ? { tipo: "CRM", titulo: "Suba a sua base de clientes", texto: "Com a base no Hub, todo dia aparece aqui quem chamar: aniversariantes e quem sumiu.", href: "/clientes", botao: "Subir a base" }
    : c.sumidas || c.aniversarioSemana
      ? {
          tipo: "CRM", titulo: c.sumidas ? `${c.sumidas} ${c.sumidas === 1 ? "cliente sumida" : "clientes sumidas"}` : `${c.aniversarioSemana} aniversariantes na semana`,
          texto: [c.sumidas ? "Compraram há 30 a 90 dias e não voltaram." : "", c.aniversarioSemana ? `${c.aniversarioSemana} fazem aniversário nos próximos 7 dias.` : ""].filter(Boolean).join(" ") + " As mensagens estão prontas.",
          href: "/clientes/resgate", botao: "Ver e mandar no WhatsApp",
        }
      : { tipo: "CRM", titulo: "Carteira em dia", texto: "Ninguém sumido nem aniversariante esta semana. Mande uma novidade para as suas 10 melhores clientes.", href: "/clientes", botao: "Abrir clientes" });

  const produtos = (d.plano?.dados.produtos ?? []).filter(Boolean);
  const produto = produtos.length ? produtos[semanaDoDia(Number(d.agora.slice(8))) % produtos.length] : null;
  const alvo = produto ?? "as peças campeãs";
  const conteudo = problemaDaLoja === "pa"
    ? { titulo: `Reels: 3 looks completos com ${alvo}`, texto: "Mostra a peça e o que combina: ensina a cliente a levar o look, não só a peça." }
    : problemaDaLoja === "pm"
      ? { titulo: `Reels: por que ${alvo} vale cada centavo`, texto: "Caimento, tecido e ocasião antes do preço. Valoriza as peças de maior valor." }
      : { titulo: `Stories de novidade com ${alvo}`, texto: "Caixinha \"quero ver\" no último story: quem responder vira atendimento no WhatsApp." };
  out.push({ tipo: "Conteúdo", ...conteudo, texto: `${conteudo.texto}${produto ? " Produto em destaque do seu plano do mês." : ""}`, href: "/conteudo/semana", botao: "Abrir a programação" });

  // Ação: lançamento do plano chegando, data comercial chegando ou o foco da semana.
  const lanc = (d.plano?.dados.acoes ?? []).filter((a) => a.titulo && a.inicio >= d.agora && a.inicio <= somarDias(d.agora, 10)).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const ano = Number(d.agora.slice(0, 4));
  const data = d.datas.filter((x) => x.dia != null).map((x) => ({ ...x, iso: `${ano + (x.mes < Number(d.agora.slice(5, 7)) - 1 ? 1 : 0)}-${String(x.mes + 1).padStart(2, "0")}-${String(x.dia).padStart(2, "0")}` }))
    .filter((x) => x.iso >= d.agora && x.iso <= somarDias(d.agora, 15)).sort((a, b) => a.iso.localeCompare(b.iso))[0];
  const dias = (iso: string) => Math.round((Date.parse(iso) - Date.parse(d.agora)) / 86_400_000);
  const foco = d.plano?.dados.semanas?.[semanaDoDia(Number(d.agora.slice(8)))]?.foco?.trim();
  out.push(lanc
    ? { tipo: "Ação", titulo: dias(lanc.inicio) ? `${lanc.titulo} em ${dias(lanc.inicio)} ${dias(lanc.inicio) === 1 ? "dia" : "dias"}` : `${lanc.titulo} começa hoje`, texto: dias(lanc.inicio) <= 3 ? "Hoje é dia de stories de espera: mostre um pedaço e diga quando abre." : "Avise a carteira e comece o desejo nos stories, sem preço ainda.", href: "/planeje", botao: "Ver o plano do mês" }
    : data
      ? { tipo: "Ação", titulo: `${data.titulo} em ${dias(data.iso)} dias`, texto: "A campanha começa antes da data: looks para a ocasião nos stories e na vitrine a partir de hoje.", href: "/acoes", botao: "Ver as Ações do Mês" }
      : foco
        ? { tipo: "Ação", titulo: "Foco da semana", texto: foco, href: "/planeje", botao: "Ver o plano do mês" }
        : { tipo: "Ação", titulo: "Monte a ação do mês", texto: "Sem ação planejada para os próximos dias. Escolha uma no PLANEJE AQUI ou nas Ações do Mês.", href: "/planeje", botao: "Abrir o PLANEJE AQUI" });
  return out;
}

/** O checklist do dia: a rotina que ela escolheu e o que os números pedem. */
export function tarefas(d: DadosMeuDia, p: ReturnType<typeof placar>, vs: Vendedora[]): Tarefa[] {
  const t: Tarefa[] = [];
  const cfg = d.rotina.config;
  const hojeDow = dow(d.agora);
  const diaDoMes = Number(d.agora.slice(8));
  if (!d.caixaOntem.length) t.push({ chave: "caixa_ontem", texto: "Lançar o caixa de ontem", href: "/gestao/caixa" });
  if (hojeDow !== 0) t.push({ chave: "abertura", texto: "Reunião de abertura com o time (10 min, antes de abrir)", href: "/pessoas/reunioes?m=abertura" });
  if (p.abaixo != null && p.restantes <= DIAS_RETA_FINAL && p.abaixo > 0.1) {
    t.push({ chave: "reta_final", texto: `Reunião de reta final (15 min): faltam ${p.restantes} dias e a loja está ${Math.round(p.abaixo * 100)}% abaixo do ritmo`, href: "/pessoas/reunioes?m=reta_final" });
  }
  if (cfg.reuniao === hojeDow) t.push({ chave: "reuniao", texto: "Reunião semanal individual com cada vendedora (15 min cada)", href: "/pessoas/reunioes?m=individual" });
  if (cfg.conteudo === hojeDow) t.push({ chave: "conteudo", texto: "Montar o calendário de conteúdo da semana", href: "/conteudo/semana" });
  const planoEnviado = d.planoProx && d.planoProx.status !== "rascunho";
  const proximo = MESES[Number(somarMes(d.agora.slice(0, 7), 1).slice(5, 7)) - 1].toLowerCase();
  if (cfg.planejamento && diaDoMes >= cfg.planejamento && diaDoMes <= 20 && !planoEnviado) {
    t.push({ chave: "planejamento", texto: `Montar o plano de ${proximo} no PLANEJE AQUI (até dia 20)`, href: `/planeje/mes?m=${somarMes(d.agora.slice(0, 7), 1)}` });
  }
  for (const v of vs.filter((x) => x.problema === "pa" || x.problema === "pm" || x.problema === "volume")) {
    t.push({ chave: `feedback_${v.id}`, texto: `Chamar a ${v.nome}: ${SITUACOES[v.problema].titulo.replace(/^[A-Z][a-zá-ú]/, (x) => x.toLowerCase())}. O feedback está pronto abaixo.` });
  }
  const c = carteira(d);
  if (c.aniversarioHoje) t.push({ chave: "aniversario", texto: `Mandar parabéns para ${c.aniversarioHoje} ${c.aniversarioHoje === 1 ? "cliente" : "clientes"}`, href: "/clientes" });
  return t;
}

/** Acompanhamento da rotina no mês: quantas vezes fez a reunião e o calendário nos dias escolhidos. */
export function acompanhamento(d: DadosMeuDia) {
  const mes = d.agora.slice(0, 7);
  const cfg = d.rotina.config;
  const conta = (chave: string, diaSemana?: number) => {
    if (diaSemana == null) return null;
    let previstos = 0;
    for (let i = 1; i <= Number(d.agora.slice(8)); i++) if (dow(`${mes}-${String(i).padStart(2, "0")}`) === diaSemana) previstos++;
    const feitos = Object.entries(d.rotina.feitos).filter(([dia, l]) => dia.startsWith(mes) && l.includes(chave)).length;
    return { feitos, previstos };
  };
  return { reuniao: conta("reuniao", cfg.reuniao), conteudo: conta("conteudo", cfg.conteudo) };
}

/** O problema que mais aparece no time (para escolher o conteúdo do dia). */
export function problemaDaLoja(vs: Vendedora[], caixa: Caixa[]): Problema {
  const contagem = (["pa", "pm", "volume"] as Problema[]).map((p) => ({ p, n: vs.filter((v) => v.problema === p).length })).sort((a, b) => b.n - a.n);
  if (contagem[0].n) return contagem[0].p;
  const i = indicadores(somar(caixa));
  return i.pa != null && i.pa < PA_ALERTA ? "pa" : "volume";
}

export type { LinhaPlano };
