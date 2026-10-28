"use client";

// Contratação: do que o time precisa → a vaga → triagem → entrevista → teste do candidato → contratou → onboarding.
// Conteúdo (roteiro, teste e onboarding) aprovado pela Camilla. A loja cadastra e edita tudo; o candidato responde o teste pelo link.
import { hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

// ───── As 7 etapas ─────

export const ETAPAS_CONTRATACAO = [
  { n: 1, titulo: "Do que o time precisa", sub: "Antes de abrir a vaga: a principal carência, o que complementa quem já está aqui e quem não se encaixaria." },
  { n: 2, titulo: "A vaga", sub: "Funções, habilidades, perfil, salário e carga horária. Sai o anúncio pronto para divulgar." },
  { n: 3, titulo: "Triagem", sub: "Os candidatos da vaga, cada um na sua etapa." },
  { n: 4, titulo: "Entrevista", sub: "O roteiro com o que avaliar em cada resposta, o que observar e as notas." },
  { n: 5, titulo: "Teste do candidato", sub: "Um link com situações do dia a dia: equipe, justiça, iniciativa, valores, prioridades, ambição, desafio e cobrança." },
  { n: 6, titulo: "Contratou", sub: "Um clique: o candidato vira pessoa da equipe e começa o onboarding." },
  { n: 7, titulo: "Onboarding", sub: "O primeiro mês, dia a dia, para a pessoa não se sentir solta e você não precisar estar o tempo todo." },
];

// ───── Etapa 1: do que o time precisa ─────

export const NECESSIDADE = [
  { id: "carencia", pergunta: "Qual é a principal carência do seu time hoje?", ex: "Ex.: ninguém da equipe tem facilidade com o online: os stories e o WhatsApp ficam parados." },
  { id: "complementa", pergunta: "Que habilidade ou jeito de ser complementaria quem já está aqui?", ex: "Ex.: alguém com iniciativa, que puxe a venda e não espere a cliente pedir." },
  { id: "nao_encaixa", pergunta: "Pelo seu jeito de gestão, que tipo de pessoa não daria certo aqui?", ex: "Ex.: quem precisa de alguém dizendo o que fazer o tempo todo, porque eu não consigo estar na loja todos os dias." },
] as const;
export const ALERTA_NECESSIDADE = "Não adianta contratar mais uma pessoa com base zero justamente na principal dor do time. Se a carência é o online, a vaga precisa pedir isso.";
export type Necessidade = Partial<Record<(typeof NECESSIDADE)[number]["id"], string>>;

// ───── Etapa 2: a vaga ─────

export const CAMPOS_VAGA = [
  { id: "funcoes", rotulo: "Funções: o que a pessoa vai fazer", ex: "Atender no salão, repor e organizar, postar stories, chamar clientes no WhatsApp", longo: true },
  { id: "habilidades", rotulo: "Habilidades que a vaga pede", ex: "Gostar de gente, facilidade com Instagram, organização", longo: true },
  { id: "perfil", rotulo: "Perfil de comportamento que você busca", ex: "Iniciativa, comprometimento, aceita feedback, espírito de time", longo: true },
  { id: "requisitos", rotulo: "Requisitos (se tiver)", ex: "Morar perto, disponibilidade aos sábados", longo: false },
  { id: "salario", rotulo: "Salário e comissão", ex: "R$ 1.800 + 1% de comissão", longo: false },
  { id: "carga", rotulo: "Carga horária", ex: "Segunda a sábado, 9h às 18h, com folga na semana", longo: false },
  { id: "beneficios", rotulo: "Benefícios", ex: "Vale-transporte, desconto nas compras", longo: false },
] as const;
export type DadosVaga = Partial<Record<(typeof CAMPOS_VAGA)[number]["id"], string>>;

export function anuncio(loja: string, titulo: string, v: DadosVaga) {
  const l = (rot: string, t?: string) => (t?.trim() ? `\n*${rot}*\n${t.trim()}\n` : "");
  return `📢 *Vaga: ${titulo}*${loja ? ` · ${loja}` : ""}\n` +
    l("O que você vai fazer", v.funcoes) + l("O que buscamos", [v.habilidades, v.perfil].filter((x) => x?.trim()).join("\n")) +
    l("Requisitos", v.requisitos) + l("Salário", v.salario) + l("Horário", v.carga) + l("Benefícios", v.beneficios) +
    "\nInteressou? Mande uma mensagem com o seu nome e por que você quer trabalhar com a gente. 💛";
}

// ───── Etapa 3: a etapa de cada candidato ─────

export const ETAPAS_CANDIDATO = [
  { id: "triagem", nome: "Triagem", classe: "espera" },
  { id: "entrevista", nome: "Entrevista", classe: "andamento" },
  { id: "teste", nome: "Teste respondido", classe: "andamento" },
  { id: "aprovado", nome: "Contratado", classe: "feito" },
  { id: "nao_seguiu", nome: "Não seguiu", classe: "erro" },
] as const;
export type EtapaCandidato = (typeof ETAPAS_CANDIDATO)[number]["id"];

// ───── Etapa 4: entrevista ─────

export const PONTOS_ENTREVISTA = [
  { id: "comprometimento", nome: "Comprometimento" },
  { id: "iniciativa", nome: "Iniciativa" },
  { id: "autorresponsabilidade", nome: "Autorresponsabilidade" },
  { id: "processo", nome: "Disposição para viver o processo" },
  { id: "time", nome: "Espírito de time" },
] as const;

export const ROTEIRO = [
  { id: "e1", ponto: "comprometimento", pergunta: "Me conta de um trabalho ou compromisso que você manteve mesmo quando ficou difícil. O que te fez continuar?",
    bom: "Exemplo concreto, fala do que aprendeu e assume a escolha de ter ficado.", atencao: "Não lembra de nenhum, ou todos os empregos terminaram \"por causa dos outros\"." },
  { id: "e2", ponto: "comprometimento", pergunta: "Por que você saiu do seu último emprego?",
    bom: "Fala com respeito do lugar anterior, mesmo que tenha tido problema.", atencao: "Fala mal do chefe ou dos colegas, ou saiu de repente, sem avisar." },
  { id: "e3", ponto: "iniciativa", pergunta: "Conta uma vez em que você viu algo errado ou faltando e resolveu sem ninguém pedir.",
    bom: "Age por conta própria e depois comunica.", atencao: "\"Não era minha função\" ou \"eu esperava mandarem\"." },
  { id: "e4", ponto: "iniciativa", pergunta: "A loja está vazia e você já fez tudo o que pediram. O que você faz?",
    bom: "Arruma, repõe, estuda os produtos, chama cliente no WhatsApp.", atencao: "\"Fico no celular\" ou \"espero a cliente entrar\"." },
  { id: "e5", ponto: "autorresponsabilidade", pergunta: "Me conta de um erro seu no trabalho. O que aconteceu depois?",
    bom: "Assume o erro sem rodeio, conta o que fez para consertar e o que mudou.", atencao: "Não lembra de nenhum erro, ou foi \"culpa do sistema\" ou \"da colega\"." },
  { id: "e6", ponto: "autorresponsabilidade", pergunta: "Se você não bater a meta num mês, de quem é a responsabilidade?",
    bom: "\"Minha. Vou ver o que posso fazer diferente.\"", atencao: "\"Da loja que não tinha produto\", \"do movimento\", \"da crise\"." },
  { id: "e7", ponto: "processo", pergunta: "Nos primeiros meses você vai aprender muita coisa nova, receber feedback e às vezes errar. Como você lida com alguém te corrigindo?",
    bom: "Vê o feedback como ajuda e dá um exemplo de algo que melhorou com correção.", atencao: "Fica na defensiva, ou \"não gosto que fiquem em cima\"." },
  { id: "e8", ponto: "processo", pergunta: "O que você quer estar fazendo daqui a 2 anos?",
    bom: "Tem um plano, mesmo simples, e liga a vaga a esse plano.", atencao: "\"Não sei\" ou \"qualquer coisa que pagar bem\"." },
  { id: "e9", ponto: "time", pergunta: "Uma colega está com muitas clientes e você está livre. A cliente dela não é sua venda. O que você faz?",
    bom: "Ajuda sem pensar duas vezes.", atencao: "\"Cada uma cuida da sua\" ou preocupação com a comissão." },
  { id: "e10", ponto: "time", pergunta: "Já teve conflito com alguém no trabalho? Como resolveu?",
    bom: "Conversou direto com a pessoa, com respeito.", atencao: "Fez fofoca, levou para o chefe sem conversar antes, ou \"nunca tive conflito com ninguém\"." },
] as const;

export const SOBRE_A_VAGA = [
  { id: "v1", pergunta: "Como você atenderia uma cliente que entra e diz \"só estou olhando\"?" },
  { id: "v2", pergunta: "Você usa Instagram e WhatsApp para vender? Me mostra no seu celular." },
  { id: "v3", pergunta: "Você tem disponibilidade para sábado, feriado e horário de campanha?" },
] as const;

export const OBSERVAR = [
  { id: "pontual", texto: "Chegou no horário (ou avisou do atraso)" },
  { id: "apresentacao", texto: "Cuidou da apresentação: roupa, cabelo, limpeza" },
  { id: "postura", texto: "Olha nos olhos, cumprimenta, sorri" },
  { id: "celular", texto: "Não ficou mexendo no celular" },
  { id: "curiosa", texto: "Fez perguntas sobre a loja" },
  { id: "tratou", texto: "Tratou bem quem estava na loja (pergunte para a equipe depois)" },
] as const;

export type Entrevista = { observar?: Record<string, boolean>; notas?: Record<string, number>; anotacoes?: Record<string, string> };
export const notaTotal = (e: Entrevista) => PONTOS_ENTREVISTA.reduce((s, p) => s + (e.notas?.[p.id] ?? 0), 0);

// ───── Etapa 5: teste do candidato (aprovado pela Camilla) ─────

export type Dimensao = "equipe" | "justica" | "iniciativa" | "prioridades" | "ambicao" | "desafio" | "cobranca";
export const DIMENSOES: { id: Dimensao; nome: string; icone: string; perguntar: string }[] = [
  { id: "equipe", nome: "Trabalho em equipe", icone: "🤝", perguntar: "Pergunte: \"Uma colega está com muitas clientes e você está livre. O que você faz?\" e \"Já teve conflito com alguém? Como resolveu?\"" },
  { id: "justica", nome: "Senso de justiça", icone: "⚖️", perguntar: "Pergunte: \"Se você visse um colega fazendo algo errado no trabalho, o que faria?\" Ouça se a pessoa separa amizade de certo e errado." },
  { id: "iniciativa", nome: "Iniciativa", icone: "🚀", perguntar: "Pergunte: \"Conta uma vez em que você resolveu algo sem ninguém pedir\" e \"A loja está vazia e você já fez tudo. O que você faz?\"" },
  { id: "prioridades", nome: "Prioridades", icone: "📌", perguntar: "Pergunte: \"Me conta de uma vez em que você teve que escolher entre o trabalho e algo pessoal. Como decidiu?\"" },
  { id: "ambicao", nome: "Ambição", icone: "📈", perguntar: "Pergunte: \"O que você quer estar fazendo daqui a 2 anos?\"" },
  { id: "desafio", nome: "Gosto por desafio", icone: "🔥", perguntar: "Pergunte: \"Qual foi a coisa mais difícil que você já aprendeu? Como foi?\"" },
  { id: "cobranca", nome: "Aceitar ser cobrado", icone: "🎯", perguntar: "Pergunte: \"Me conta de um erro seu. O que aconteceu depois?\" e \"Como você lida com alguém te corrigindo?\"" },
];

type Opcao = { t: string; p: number };
export type Situacao = { n: number; dim: Dimensao; pergunta: string; opcoes: Opcao[] };
export const SITUACOES: Situacao[] = [
  { n: 1, dim: "equipe", pergunta: "Num trabalho em grupo (escola, igreja, emprego), uma pessoa não fez a parte dela e o prazo é amanhã. Você:", opcoes: [
    { t: "Faço a parte dela para não prejudicar o grupo e depois converso com ela", p: 2 },
    { t: "Junto o grupo, a gente divide o que falta e alguém conversa com ela", p: 3 },
    { t: "Aviso o responsável que ela não fez", p: 1 },
    { t: "Entrego só a minha parte: cada um responde pelo seu", p: 0 }] },
  { n: 2, dim: "equipe", pergunta: "O que mais te incomoda num lugar de trabalho?", opcoes: [
    { t: "Gente que não ajuda os colegas", p: 3 },
    { t: "Chefe que não reconhece o meu esforço", p: 1 },
    { t: "Fofoca e clima ruim", p: 2 },
    { t: "Ter que fazer coisa que não é minha função", p: 0 }] },
  { n: 3, dim: "justica", pergunta: "Você percebe que um colega leva para casa produtos da loja sem pagar. Ele é seu amigo. Você:", opcoes: [
    { t: "Converso com ele e digo que, se continuar, vou ter que falar", p: 2 },
    { t: "Conto para o responsável, porque é errado", p: 3 },
    { t: "Não falo nada: não é problema meu", p: 0 },
    { t: "Falo com ele, mas não conto para ninguém", p: 1 }] },
  { n: 4, dim: "justica", pergunta: "O caixa fecha com R$ 50 a mais, e ninguém percebeu. Você:", opcoes: [
    { t: "Aviso na hora", p: 3 },
    { t: "Deixo lá: uma hora aparece a explicação", p: 1 },
    { t: "Guardo, para cobrir alguma falta no futuro", p: 0 },
    { t: "Confiro de novo antes de falar com alguém", p: 2 }] },
  { n: 5, dim: "iniciativa", pergunta: "É seu primeiro dia, e a pessoa que ia te treinar faltou. Você:", opcoes: [
    { t: "Espero alguém me dizer o que fazer", p: 0 },
    { t: "Pergunto a quem estiver ali como posso ajudar", p: 2 },
    { t: "Observo como as coisas funcionam e começo pelo que dá para fazer sem ajuda", p: 3 },
    { t: "Ligo para o responsável e pergunto o que fazer", p: 1 }] },
  { n: 6, dim: "iniciativa", pergunta: "Você vê uma coisa que poderia ser feita de um jeito melhor no lugar onde trabalha ou estuda. Você:", opcoes: [
    { t: "Penso numa solução e levo para quem decide", p: 3 },
    { t: "Comento com os colegas", p: 1 },
    { t: "Faço do meu jeito, sem avisar", p: 0 },
    { t: "Espero perguntarem a minha opinião", p: 0 }] },
  { n: 8, dim: "prioridades", pergunta: "Você tem um compromisso pessoal importante, e a loja pede que você fique depois do horário numa data de muito movimento. Você:", opcoes: [
    { t: "Fico e remarco o compromisso", p: 2 },
    { t: "Explico, e procuro alguém que possa ficar no meu lugar", p: 3 },
    { t: "Vou embora: horário é horário", p: 0 },
    { t: "Fico, mas passo o resto do dia de mau humor", p: 1 }] },
  { n: 9, dim: "prioridades", pergunta: "Você tem 4 coisas para fazer e tempo para 2. Qual faz primeiro?", opcoes: [
    { t: "A mais urgente para o cliente", p: 3 },
    { t: "A mais fácil, para adiantar", p: 1 },
    { t: "A que o chefe pediu por último", p: 1 },
    { t: "A que eu mais gosto", p: 0 }] },
  { n: 10, dim: "ambicao", pergunta: "Daqui a 3 anos você quer estar:", opcoes: [
    { t: "No mesmo lugar, se estiver bom", p: 1 },
    { t: "Num cargo maior, liderando pessoas", p: 3 },
    { t: "Ganhando mais, não importa onde", p: 1 },
    { t: "Não penso tão longe", p: 0 }] },
  { n: 11, dim: "ambicao", pergunta: "Se você tivesse uma meta de vendas e batesse na metade do mês, você:", opcoes: [
    { t: "Relaxo um pouco: já cumpri", p: 0 },
    { t: "Continuo no mesmo ritmo", p: 1 },
    { t: "Tento dobrar: quanto mais, melhor", p: 3 },
    { t: "Ajudo os colegas a baterem a deles", p: 2 }] },
  { n: 12, dim: "desafio", pergunta: "Te oferecem uma tarefa que você nunca fez e que é difícil. Você:", opcoes: [
    { t: "Aceito, mesmo com medo", p: 3 },
    { t: "Prefiro fazer o que já sei bem", p: 0 },
    { t: "Aceito, se alguém me ensinar antes", p: 2 },
    { t: "Pergunto quanto vou ganhar a mais", p: 1 }] },
  { n: 13, dim: "desafio", pergunta: "Qual frase mais parece com você?", opcoes: [
    { t: "\"Gosto de rotina e de saber o que vou fazer\"", p: 0 },
    { t: "\"Gosto de coisa nova, me entedio fácil\"", p: 2 },
    { t: "\"Gosto quando é difícil e eu consigo\"", p: 3 },
    { t: "\"Gosto de fazer bem feito o que já sei\"", p: 1 }] },
  { n: 14, dim: "cobranca", pergunta: "Seu chefe te chama na frente de um cliente e aponta um erro seu. Você:", opcoes: [
    { t: "Não falo nada na hora, mas depois peço para conversar em particular", p: 3 },
    { t: "Me defendo na hora", p: 0 },
    { t: "Peço desculpas e corrijo", p: 2 },
    { t: "Perco a vontade de trabalhar no resto do dia", p: 0 }] },
  { n: 15, dim: "cobranca", pergunta: "Te dizem que o seu trabalho não está bom. Qual seu primeiro pensamento?", opcoes: [
    { t: "\"O que eu posso fazer diferente?\"", p: 3 },
    { t: "\"Ninguém me explicou direito\"", p: 0 },
    { t: "\"Que injusto, eu me esforcei\"", p: 1 },
    { t: "\"Preciso entender melhor o que esperam de mim\"", p: 2 }] },
  { n: 16, dim: "cobranca", pergunta: "Com que frequência você gostaria de receber feedback?", opcoes: [
    { t: "Toda semana", p: 3 },
    { t: "Uma vez por mês", p: 2 },
    { t: "Só quando eu errar", p: 1 },
    { t: "Prefiro que não fiquem em cima", p: 0 }] },
];
export const VALORES_TRABALHO = ["Salário", "Aprender", "Ser reconhecido", "Estabilidade", "Bom ambiente", "Crescer de cargo", "Horário flexível", "Fazer diferença na vida das pessoas", "Ter liberdade", "Trabalhar em equipe"];
export const ABERTAS = [
  { id: "conquista", pergunta: "Conta uma conquista sua de que você tem orgulho. Pode ser da escola, da família, de qualquer lugar." },
  { id: "porque", pergunta: "Por que você quer trabalhar aqui?" },
] as const;

export type Teste = { respostas: Record<string, number>; valores: string[]; abertas: Partial<Record<(typeof ABERTAS)[number]["id"], string>> };

/** O resultado por ponto: 🟢 forte, 🟡 médio, 🔴 atenção. */
export function resultadoTeste(t: Teste) {
  return DIMENSOES.map((d) => {
    const qs = SITUACOES.filter((s) => s.dim === d.id);
    const pontos = qs.reduce((s, q) => s + (q.opcoes[t.respostas[q.n]]?.p ?? 0), 0);
    const r = pontos / (qs.length * 3);
    return { ...d, pontos, max: qs.length * 3, nivel: (r >= 0.75 ? "forte" : r >= 0.45 ? "medio" : "atencao") as "forte" | "medio" | "atencao" };
  });
}
export const NIVEL = { forte: { txt: "🟢 forte", classe: "feito" }, medio: { txt: "🟡 médio", classe: "andamento" }, atencao: { txt: "🔴 atenção", classe: "erro" } };

// ───── Etapa 7: onboarding (aprovado pela Camilla) ─────

export const ROTEIRO_HISTORIA = [
  { t: "Contar o começo (10 min)", d: "Abra a linha do tempo de fotos em Nossa história e conte com a sua voz: como a loja nasceu, o momento difícil e a conquista. Não leia: as fotos são o guia." },
  { t: "A nossa cliente (5 min)", d: "Quem é ela e como ela sai daqui. Pergunte: \"você já foi atendida assim em alguma loja?\"" },
  { t: "Os valores (10 min)", d: "Para cada valor, dê um exemplo real que aconteceu na loja e pergunte: \"como isso aparece no seu atendimento?\"" },
  { t: "O jeito da casa (5 min)", d: "O que sempre fazemos e o que nunca fazemos com uma cliente." },
  { t: "Fechamento", d: "Pergunte: \"o que mais te chamou atenção na nossa história?\" A resposta mostra se a pessoa se conectou." },
];

export type ItemOnb = { id: string; t: string; d?: string; historia?: boolean; estudo?: boolean; quiz?: boolean };
export const FASES_ONBOARDING: { id: string; titulo: string; ate: number; itens: ItemOnb[] }[] = [
  { id: "d1", titulo: "Dia 1 · A visão da empresa", ate: 0, itens: [
    { id: "d1a", t: "Receber pessoalmente (dona ou gerente)", d: "Nunca \"se vira aí\". É o primeiro dia que define a visão que a pessoa vai ter da empresa." },
    { id: "d1b", t: "Apresentar a história, a cultura e os valores da loja", d: "Use o roteiro abaixo com a página Nossa história.", historia: true },
    { id: "d1c", t: "Explicar as regras do dia a dia", d: "Horários, uniforme e apresentação, uso do celular, a quem pedir ajuda." },
    { id: "d1d", t: "Estudar as marcas, linhas e produtos", d: "Mande o link de estudo: a história da loja e o Guia das marcas, para ler no celular.", estudo: true },
    { id: "d1e", t: "Fechar o dia: \"o que você entendeu da nossa loja?\"" },
  ] },
  { id: "d23", titulo: "Dias 2 e 3 · Conhecer na prática", ate: 2, itens: [
    { id: "d2a", t: "Tour guiado pelo estoque e pelas seções da loja", d: "Tocar e ver onde fica cada coisa." },
    { id: "d2b", t: "Ajudar a organizar uma seção", d: "O primeiro contato real com o produto." },
    { id: "d2c", t: "Acompanhar alguém experiente da equipe nos atendimentos, só observando" },
    { id: "d2d", t: "10 minutos de conversa no fim de cada dia", d: "O que viu e o que ficou de dúvida." },
    { id: "d2e", t: "Quiz das marcas e produtos (dia 3)", d: "Depois de ver os produtos na loja, a pessoa faz o quiz pelo mesmo link de estudo. O resultado aparece aqui.", quiz: true },
  ] },
  { id: "d45", titulo: "Dias 4 e 5 · Começar a atuar com apoio", ate: 4, itens: [
    { id: "d4a", t: "Fazer atendimentos com alguém do lado" },
    { id: "d4b", t: "Assumir tarefas simples sem ajuda", d: "Repor, organizar, receber mercadoria." },
    { id: "d4c", t: "Primeiro feedback (fim da semana 1)", d: "O que já faz bem e UM ponto para melhorar. Só um." },
  ] },
  { id: "s24", titulo: "Semanas 2 a 4 · Autonomia crescente", ate: 27, itens: [
    { id: "s2a", t: "Atender sem ajuda, com uma \"madrinha\" de referência para dúvidas" },
    { id: "s2b", t: "Check-in rápido por dia (5 minutos)", d: "Assim você acompanha sem precisar estar o tempo todo presente." },
    { id: "s2c", t: "Corrigir os erros normais na hora, sem drama", d: "Não saber onde fica um produto, demorar no caixa, esquecer um procedimento." },
    { id: "s2d", t: "Levar os sinais de alerta para a conversa de feedback", d: "Atrasos repetidos, falta de iniciativa para perguntar, descaso com a apresentação." },
  ] },
  { id: "m1", titulo: "Fim do mês 1 · Feedback formal", ate: 30, itens: [
    { id: "m1a", t: "Feedback formal e decisão de seguir", d: "Depois disso a pessoa entra no fluxo normal de Desenvolvimento do Hub." },
  ] },
];

/** A data de cada fase, a partir do primeiro dia. */
export function dataDaFase(inicio: string, dias: number) {
  const d = new Date(`${inicio}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
export const totalItensOnb = FASES_ONBOARDING.reduce((s, f) => s + f.itens.length, 0);

// ───── Banco ─────

export type Vaga = { id: string; portal_id: string; titulo: string; situacao: string; necessidade: Necessidade; vaga: DadosVaga; created_at: string; updated_at: string };
export type Candidato = {
  id: string; vaga_id: string; portal_id: string; nome: string; whatsapp: string; etapa: EtapaCandidato; obs: string;
  entrevista: Entrevista; teste_token: string; teste: Teste | null; teste_em: string | null; pessoa_id: string | null; created_at: string;
};
export type Onboarding = {
  id: string; portal_id: string; pessoa_id: string; inicio: string; feitos: Record<string, boolean>; notas: string; created_at: string;
  estudo_token: string; quiz: { acertos: number; total: number; erros: { pergunta: string; certa: string }[] } | null; quiz_em: string | null;
};

const sb = () => supabaseBrowser();
async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

export async function buscarContratacao(portalId: string) {
  const [v, c, o] = await Promise.all([
    sb().from("loja_vagas").select("*").eq("portal_id", portalId).order("created_at", { ascending: false }),
    sb().from("loja_candidatos").select("*").eq("portal_id", portalId).order("created_at"),
    sb().from("loja_onboarding").select("*").eq("portal_id", portalId).order("inicio", { ascending: false }),
  ]);
  return { vagas: (v.data ?? []) as Vaga[], candidatos: (c.data ?? []) as Candidato[], onboardings: (o.data ?? []) as Onboarding[] };
}

export async function salvarVaga(portalId: string, id: string | null, d: Partial<Vaga>) {
  const dados = { ...d, updated_at: new Date().toISOString() };
  const r = id
    ? await ok(sb().from("loja_vagas").update(dados).eq("id", id).select("id").single())
    : await ok(sb().from("loja_vagas").insert({ ...dados, portal_id: portalId }).select("id").single());
  return (r.data as { id: string }).id;
}
export const excluirVaga = (id: string) => ok(sb().from("loja_vagas").delete().eq("id", id));

export async function salvarCandidato(portalId: string, vagaId: string, id: string | null, d: Partial<Candidato>) {
  const dados = { ...d, updated_at: new Date().toISOString() };
  const r = id
    ? await ok(sb().from("loja_candidatos").update(dados).eq("id", id).select("id").single())
    : await ok(sb().from("loja_candidatos").insert({ ...dados, portal_id: portalId, vaga_id: vagaId }).select("id").single());
  return (r.data as { id: string }).id;
}
export const excluirCandidato = (id: string) => ok(sb().from("loja_candidatos").delete().eq("id", id));

/** Contratou: vira pessoa da equipe, o candidato fica como contratado e começa o onboarding. */
export async function contratar(c: Candidato, funcao: string, inicio: string) {
  const { data } = await ok(sb().from("loja_equipe").insert({ portal_id: c.portal_id, nome: c.nome, funcao: funcao.slice(0, 80) || null, entrada: inicio, ativo: true }).select("id").single());
  const pessoaId = (data as { id: string }).id;
  await ok(sb().from("loja_candidatos").update({ etapa: "aprovado", pessoa_id: pessoaId, updated_at: new Date().toISOString() }).eq("id", c.id));
  const { data: o } = await ok(sb().from("loja_onboarding").insert({ portal_id: c.portal_id, pessoa_id: pessoaId, inicio }).select("id").single());
  return (o as { id: string }).id;
}

export async function novoOnboarding(portalId: string, pessoaId: string, inicio = hoje()) {
  const { data } = await ok(sb().from("loja_onboarding").insert({ portal_id: portalId, pessoa_id: pessoaId, inicio }).select("id").single());
  return (data as { id: string }).id;
}
export const salvarOnboarding = (id: string, d: Partial<Onboarding>) =>
  ok(sb().from("loja_onboarding").update({ ...d, updated_at: new Date().toISOString() }).eq("id", id));
export const excluirOnboarding = (id: string) => ok(sb().from("loja_onboarding").delete().eq("id", id));

/** O link do teste para mandar ao candidato. */
export const linkDoTesteCandidato = (base: string, token: string) => `${base}/candidato/?t=${token}`;
