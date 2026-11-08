// Conteúdo fixo do Hub: meses, blocos do PLANEJE AQUI, colunas do Kanban e as 7 etapas da Personalização.

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const BLOCOS_PLANEJE = [
  "Produtos em destaque",
  "Ações de venda",
  "O que precisa ser feito",
  "Meta de faturamento",
  "Semana 1",
  "Semana 2",
  "Semana 3",
  "Semana 4",
];

export const COLUNAS_KANBAN = ["Ideias", "Roteiro", "Gravar", "Editar", "Publicado"];

export const MESES_PLANO = ["", "Mês 1", "Mês 2", "Mês 3", "Mês 4"];
/** O título do mês no Plano de Ação: o número do mês e o tema que a Camilla escreveu para esta loja (se escreveu). */
export const tituloMes = (m: number, titulos?: Record<string, string> | null) => {
  const t = titulos?.[String(m)]?.trim();
  return t ? `Mês ${m} · ${t}` : `Mês ${m}`;
};

export type Campo = {
  id: string;
  rotulo: string;
  tipo: "texto" | "textarea" | "numero" | "opcao" | "multi";
  opcoes?: string[];
  ajuda?: string;
  /** Dado de número ou de relatório: a loja pode marcar "É uma estimativa" ou "Ainda não tenho". */
  dado?: boolean;
  /** Pergunta que entrou em 11/2026 (o que antes vinha pelo formulário do Drive): não vira pendência de quem já tinha concluído a etapa. */
  novo?: boolean;
};

/** Situação de um dado: tenho (padrão), estimado ou ainda não tenho. Fica em respostas[`${id}__st`]. */
export type Situacao = "tenho" | "estimado" | "nao_tenho";
export const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: "tenho", rotulo: "Tenho o dado" },
  { valor: "estimado", rotulo: "É uma estimativa" },
  { valor: "nao_tenho", rotulo: "Ainda não tenho" },
];
export const chaveSituacao = (id: string) => `${id}__st`;

export type Etapa = { numero: number; titulo: string; descricao: string; campos: Campo[] };

// As etapas de Dados da loja, na ordem em que a loja responde. O número é a chave no banco (2 e 6 saíram em 10/2026).
export const ETAPAS: Etapa[] = [
  {
    numero: 1,
    titulo: "A loja hoje",
    descricao: "Onde a loja está e onde você quer chegar.",
    campos: [
      { id: "tempo_loja", rotulo: "Há quanto tempo a loja existe?", tipo: "texto" },
      { id: "segmento", rotulo: "Segmento", tipo: "opcao", opcoes: ["Multimarca feminina", "Multimarca masculina", "Moda praia", "Infantil", "Plus size", "Marca própria", "Outro"] },
      { id: "faturamento_medio", rotulo: "Faturamento médio mensal (R$)", tipo: "numero", dado: true },
      { id: "maior_desafio", rotulo: "Hoje, qual é o maior desafio da loja?", tipo: "textarea" },
      { id: "o_que_funciona", rotulo: "O que já funciona bem?", tipo: "textarea" },
      { id: "onde_quer_chegar", rotulo: "Onde você quer que a loja esteja daqui a 12 meses?", tipo: "textarea" },
      { id: "o_que_movimenta", rotulo: "O que hoje você acredita que mais movimenta a loja?", tipo: "textarea" },
      { id: "objetivos", rotulo: "Quais são os seus objetivos com a mentoria? Liste em ordem de prioridade, do mais importante para o menos importante.", tipo: "textarea", novo: true },
      { id: "faturamento_12m", rotulo: "Faturamento e peças vendidas em cada um dos últimos 12 meses", tipo: "textarea", dado: true, novo: true, ajuda: "Ex.: nov/25 R$ 105 mil · 320 peças; dez/25 R$ 146 mil · 410 peças. Se tiver no sistema ou numa planilha, suba o arquivo no quadro \"Arquivos desta etapa\" e escreva \"está no arquivo\"." },
    ],
  },
  {
    numero: 9,
    titulo: "Gestão da loja",
    descricao: "Como é a rotina, as reuniões e os treinamentos do time.",
    campos: [
      { id: "freq_reuniao", rotulo: "Com que frequência você faz reunião com o time?", tipo: "opcao", opcoes: ["Toda semana", "A cada 15 dias", "Uma vez por mês", "Só quando precisa", "Não faço reunião"] },
      { id: "reconhece", rotulo: "Quando você faz as reuniões, costuma mostrar o resultado de todos e reconhecer publicamente?", tipo: "textarea" },
      { id: "rotina_dona", rotulo: "Me descreva a sua rotina hoje na loja", tipo: "textarea" },
      { id: "ultimo_treinamento", rotulo: "Qual foi a última vez que foi feito um treinamento com o seu time? Conte um pouco sobre o resultado.", tipo: "textarea" },
      { id: "processos", rotulo: "Vocês têm processos escritos na loja (metas, roteiro de venda, rotinas do time)?", tipo: "opcao", opcoes: ["Sim, temos e o time segue", "Temos algo, mas é informal", "Não temos nada escrito"], novo: true },
      { id: "vm", rotulo: "Vitrine e arrumação da loja: quem cuida e de quanto em quanto tempo vocês trocam?", tipo: "textarea", novo: true },
      { id: "sistema", rotulo: "Qual sistema vocês usam para vendas e estoque?", tipo: "texto", novo: true, ajuda: "Se não usam sistema, escreva \"não usamos\"." },
    ],
  },
  {
    numero: 10,
    titulo: "Ações e resultados",
    descricao: "O que já deu certo e o que não deu, para não repetir o que não funciona.",
    campos: [
      { id: "acao_sucesso", rotulo: "Qual a ação de maior sucesso da loja até hoje? Me descreva como foi feita e qual resultado teve.", tipo: "textarea" },
      { id: "acao_sem_retorno", rotulo: "Em qual ação você fez um grande investimento de energia ou dinheiro e não teve o retorno esperado? Descreva com detalhes.", tipo: "textarea" },
    ],
  },
  {
    numero: 5,
    titulo: "Time de vendas",
    descricao: "Quem atende e o teste de perfil de cada pessoa.",
    campos: [
      { id: "tamanho_time", rotulo: "Quantas pessoas atendem?", tipo: "numero" },
      { id: "comissao", rotulo: "Como funciona a comissão?", tipo: "textarea" },
      { id: "equipe_detalhe", rotulo: "Para cada pessoa: horário, salário fixo, comissão e benefícios", tipo: "textarea", novo: true, ajuda: "Ex.: Ana · 9h às 18h · R$ 1.800 + 1% · vale-transporte" },
      { id: "desafio_time", rotulo: "Qual é o maior desafio do time no atendimento hoje?", tipo: "textarea", novo: true },
    ],
  },
  {
    numero: 3,
    titulo: "Cliente ideal",
    descricao: "Quem compra, quanto gasta, o que valoriza.",
    campos: [
      { id: "idade", rotulo: "Faixa de idade", tipo: "texto", dado: true },
      { id: "perfil", rotulo: "Como ela é? (profissão, rotina, estilo)", tipo: "textarea" },
      { id: "valoriza", rotulo: "O que ela mais valoriza na sua loja?", tipo: "textarea" },
      { id: "objecoes", rotulo: "Objeções que mais aparecem", tipo: "textarea", ajuda: "Ex.: tá caro, vou pensar, não tem meu tamanho" },
      { id: "pos_venda", rotulo: "Como é o depois da compra? Vocês fazem pós-venda, reativação ou acompanhamento? Como?", tipo: "textarea", novo: true },
      { id: "carteira", rotulo: "Você trabalha a sua carteira de clientes (reativação, relacionamento, recompra)?", tipo: "opcao", opcoes: ["Sim, tenho um processo para isso", "Faço de vez em quando", "Ainda não faço"], novo: true },
      { id: "malinha", rotulo: "Vocês trabalham com malinha (condicional)? Como funciona?", tipo: "textarea", novo: true },
    ],
  },
  {
    numero: 4,
    titulo: "Mix de produtos e preços",
    descricao: "Marcas, categorias, faixas de preço e margem.",
    campos: [
      { id: "marcas", rotulo: "Principais marcas", tipo: "textarea", dado: true },
      { id: "categorias", rotulo: "Categorias que mais vendem", tipo: "textarea", dado: true },
      { id: "faixa_preco", rotulo: "Faixa de preço (da peça mais barata à mais cara)", tipo: "texto", dado: true },
      { id: "markup", rotulo: "Markup médio", tipo: "numero", ajuda: "Ex.: 2,6", dado: true },
      { id: "estoque", rotulo: "Como está o estoque hoje?", tipo: "opcao", opcoes: ["Equilibrado", "Muita peça parada", "Falta peça boa", "Não sei"] },
    ],
  },
  {
    numero: 8,
    titulo: "Estoque e relatórios",
    descricao: "Situação do estoque, preço médio, linhas e fornecedores. Suba o relatório do sistema ou responda estimando.",
    campos: [
      { id: "valor_estoque", rotulo: "Quanto você tem em estoque, a preço de venda (R$)?", tipo: "numero", dado: true },
      { id: "pecas_estoque", rotulo: "Quantas peças tem em estoque?", tipo: "numero", dado: true },
      { id: "pm_estoque", rotulo: "Preço médio das peças do estoque (R$)", tipo: "numero", dado: true, ajuda: "Se não souber, divida o valor do estoque pelo número de peças. É a base do seu ticket médio ideal." },
      { id: "linhas", rotulo: "Principais linhas e quanto cada uma representa", tipo: "textarea", dado: true, ajuda: "Ex.: Vestidos 30%, Alfaiataria 20%, Jeans 15%" },
      { id: "fornecedores", rotulo: "Principais fornecedores (até 5) e quanto cada um representa", tipo: "textarea", dado: true },
      { id: "compra_mes", rotulo: "Quanto você compra por mês, em média (R$)?", tipo: "numero", dado: true },
      { id: "parado", rotulo: "Que parte do estoque está parada há mais de 3 meses?", tipo: "opcao", dado: true, opcoes: ["Quase nada (até 10%)", "Um pouco (10% a 30%)", "Bastante (30% a 50%)", "Mais da metade"] },
      { id: "receber_manual", rotulo: "Sem o relatório de contas a receber? Escreva quanto você tem a receber no crediário e quanto está atrasado.", tipo: "textarea", dado: true, novo: true, ajuda: "Ex.: R$ 180 mil a receber, R$ 25 mil atrasado há mais de 30 dias. Se não vende fiado, marque \"Ainda não tenho\"." },
      { id: "crediario_pct", rotulo: "Quanto do faturamento é vendido no crediário ou fiado (boleto, nota, carnê)? (%)", tipo: "numero", dado: true, novo: true, ajuda: "Se não vende fiado, coloque 0." },
      { id: "crediario_como", rotulo: "Como funciona o crediário: em quantas vezes, quem libera e como vocês cobram?", tipo: "textarea", novo: true },
    ],
  },
  {
    numero: 7,
    titulo: "Canais e conteúdo",
    descricao: "Onde você vende e como a loja usa o conteúdo hoje.",
    campos: [
      { id: "canais", rotulo: "Onde você vende hoje?", tipo: "multi", opcoes: ["Loja física", "WhatsApp", "Instagram (Direct)", "Site / e-commerce", "Malinha / condicional"] },
      { id: "principal", rotulo: "Qual canal traz mais faturamento?", tipo: "texto" },
      { id: "base_clientes", rotulo: "Quantas clientes tem na base (com WhatsApp)?", tipo: "numero", dado: true },
      { id: "freq_posts", rotulo: "Com que frequência você posta os conteúdos da loja hoje?", tipo: "opcao", opcoes: ["Todo dia", "3 a 5 vezes por semana", "1 a 2 vezes por semana", "Menos de 1 vez por semana", "Quase nunca"] },
      { id: "como_pensa", rotulo: "Como você pensa nos conteúdos hoje?", tipo: "textarea" },
      { id: "dificuldade_conteudo", rotulo: "O que você acha mais difícil na hora de produzir os conteúdos da loja?", tipo: "textarea" },
      { id: "resultado_conteudo", rotulo: "O quanto você acha que postar conteúdo hoje traz resultado para a loja?", tipo: "opcao", opcoes: ["Traz muito resultado", "Traz algum resultado", "Traz pouco resultado", "Não traz resultado", "Não sei dizer"] },
      { id: "instagram", rotulo: "Qual é o @ do Instagram da loja?", tipo: "texto", novo: true },
      { id: "quem_posta", rotulo: "Quem cria e quem posta os conteúdos?", tipo: "texto", novo: true },
      { id: "inspiracoes", rotulo: "Quais perfis te inspiram? Coloque o @ de cada um.", tipo: "textarea", novo: true },
      { id: "concorrentes", rotulo: "Quais são os @ dos seus principais concorrentes?", tipo: "textarea", novo: true },
      { id: "trafego", rotulo: "Vocês investem em anúncio pago (tráfego)? Quanto por mês e como sabem se deu resultado?", tipo: "textarea", novo: true },
      { id: "insta_numeros", rotulo: "Sem os prints do Instagram? Escreva os números do Painel Profissional dos últimos 30 dias.", tipo: "textarea", dado: true, novo: true, ajuda: "Contas alcançadas, interações, seguidores e, mais ou menos, quantas pessoas veem cada Story." },
      { id: "loja_descricao", rotulo: "Sem vídeo ou fotos da loja? Descreva como ela é.", tipo: "textarea", dado: true, novo: true, ajuda: "Rua e entorno, tamanho, quantas araras, vitrine, provador e onde fica o estoque." },
    ],
  },
];

export type Respostas = Record<string, string | string[]>;

// ───── Formulário da rotina de gestão (Planner de gestão) ─────
// Fica fora de ETAPAS: não conta nos Dados da loja nem trava áreas. As respostas montam a sugestão do Planner.
export const FAZ = ["Faço e funciona", "Faço, mas sem constância", "Não faço"];
const MOMENTOS = ["Antes de abrir a loja", "Assim que abre", "No meio do dia", "No fim do dia", "Não tenho momento fixo"];
const SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Não tenho dia fixo"];
const MES = (de: number, ate: number) => [...Array.from({ length: ate - de + 1 }, (_, i) => `Dia ${de + i}`), "Não tenho dia fixo"];
/** Uma demanda vira duas perguntas: se faz hoje e quando. */
const demanda = (id: string, oque: string, quando: string, opcoes: string[]): Campo[] => [
  { id, rotulo: `${oque} · você faz hoje?`, tipo: "opcao", opcoes: FAZ },
  { id: `${id}_quando`, rotulo: quando, tipo: "opcao", opcoes },
];
export const ROTINA_GESTAO: Etapa = {
  numero: 20,
  titulo: "Rotina de gestão",
  descricao: "Conte o que você já faz hoje na gestão da loja e quando. Com as suas respostas a Camilla monta o seu Planner de gestão, na ordem de prioridade.",
  campos: [
    { id: "rotina_semana", rotulo: "Como é a sua semana na loja hoje, dia a dia?", tipo: "textarea", ajuda: "Ex.: segunda: pedidos e banco; terça: vitrine; sábado: loja cheia, só atendimento." },
    { id: "fora_loja", rotulo: "Em que dias e horários você não pode estar na loja por causa da sua vida pessoal? Ou gostaria de começar a ter?", tipo: "textarea", ajuda: "Ex.: terça à tarde, levo meu filho na escola; queria ter o sábado de folga uma vez por mês." },
    { id: "meta_momentos", rotulo: "Em quais momentos você olha a meta do mês da loja e a de cada pessoa para tomar decisões e dar direção? Como você faz isso hoje?", tipo: "textarea", ajuda: "Ex.: olho todo dia de manhã no sistema; uma vez por semana mando no grupo quanto falta; ainda não acompanho." },
    // Todo dia
    ...demanda("d_comeco", "Começar o dia olhando a meta, como foi ontem e definindo as prioridades", "Em que momento você faz isso?", MOMENTOS),
    ...demanda("d_direcao", "Mensagem de direção do dia no grupo da loja (mesmo quando você está fora)", "Em que momento você manda?", [...MOMENTOS, "Não tenho equipe"]),
    ...demanda("d_loja_pronta", "Loja pronta: campeões repostos, araras e vitrine em ordem", "Em que momento isso é feito?", MOMENTOS),
    ...demanda("d_conteudo", "Verificar os conteúdos e a estratégia de atração do dia", "Em que momento você olha isso?", MOMENTOS),
    ...demanda("d_pagamentos", "Mapear os pagamentos do dia (boletos), os recebimentos e a situação da cobrança", "Em que momento você paga os boletos do dia e confere o que recebeu?", MOMENTOS),
    ...demanda("d_cadastro", "Cadastrar a cliente em toda venda (nome, WhatsApp e aniversário)", "Quem cadastra?", ["Quem vendeu", "Eu", "A pessoa do caixa", "Ninguém ainda"]),
    ...demanda("d_pos_venda", "Pós-venda em até 24 horas, sem oferecer nada", "Em que momento é feito?", ["Logo cedo, das vendas de ontem", "No fim do dia, das vendas do dia", "Não tenho momento fixo"]),
    ...demanda("d_carteira", "Contatos do dia com as clientes da carteira", "Em que momento é feito?", MOMENTOS),
    ...demanda("d_caixa", "Fechamento do caixa do dia (venda, atendimentos e peças)", "Quando você fecha o caixa?", ["No fim do dia", "No dia seguinte cedo", "Uma vez por semana", "Não tenho momento fixo"]),
    { id: "como_dia", rotulo: "Conte como você faz hoje o que marcou acima (o dia a dia)", tipo: "textarea" },
    // Toda semana
    ...demanda("s_analise", "Analisar os resultados da semana: time, marcas e produtos, Instagram e vitrine, e revisar o plano", "Existe um dia fixo? Qual?", SEMANA),
    ...demanda("s_reuniao", "Reunião semanal de resultados com o time", "Em que dia?", [...SEMANA, "Não tenho equipe"]),
    ...demanda("s_individual", "Conversa individual com cada pessoa do time", "Em que dia?", [...SEMANA, "Não tenho equipe"]),
    ...demanda("s_missao", "Definir a missão da semana das clientes para o time", "Em que dia?", [...SEMANA, "Não tenho equipe"]),
    ...demanda("s_vm", "Troca geral de vitrine e arrumação da loja", "Em que dia?", SEMANA),
    ...demanda("s_conteudo", "Planejar os conteúdos da semana", "Existe dia fixo? Qual?", SEMANA),
    ...demanda("s_gravacao", "Gravar os vídeos", "Existe dia fixo ou um melhor dia para gravar?", SEMANA),
    ...demanda("s_parados", "Ação para as peças paradas", "Em que dia?", SEMANA),
    ...demanda("s_conhecimento", "Treinamento do time (estudar e praticar um conhecimento)", "Em que dia?", [...SEMANA, "Não tenho equipe"]),
    ...demanda("s_crediario", "Conferir o crediário da semana: vendido, recebido e vencido", "Em que dia?", [...SEMANA, "Não vendo no crediário"]),
    { id: "como_semana", rotulo: "Conte como você faz hoje o que marcou acima (a semana)", tipo: "textarea" },
    // Todo mês
    ...demanda("m_analise", "Analisar o mês que fechou (meta × realizado, marcas, estoque e Instagram)", "Em que dia do mês?", MES(1, 7)),
    ...demanda("m_reuniao", "Reunião do mês com o time (o que foi bom, o que melhorar, meta e ações)", "Em que dia do mês?", [...MES(1, 10), "Não tenho equipe"]),
    ...demanda("m_feedback", "Feedback individual no meio do mês, quando ainda dá para virar o mês", "Em que dia do mês?", [...MES(10, 20), "Não tenho equipe"]),
    ...demanda("m_planejamento", "Planejar o mês seguinte: meta, datas, produtos e ações", "Até que dia do mês?", MES(5, 25)),
    ...demanda("m_aniversariantes", "Puxar as aniversariantes do mês seguinte e dividir pela carteira", "Em que dia do mês?", MES(20, 28)),
    ...demanda("m_acao", "Ação do mês (campanha) com placar", "Quando começa?", ["Na primeira semana", "Na segunda semana", "Depende da data", "Não faço"]),
    ...demanda("m_relatorios", "Tirar os relatórios do sistema (vendas, estoque e clientes)", "Em que dia do mês?", MES(1, 10)),
    { id: "como_mes", rotulo: "Conte como você faz hoje o que marcou acima (o mês)", tipo: "textarea" },
    // Compras e estoque
    ...demanda("s_compras", "Compras da semana (reposição e representantes)", "Existe um dia fixo? Qual?", SEMANA),
    { id: "c_como", rotulo: "Como funcionam as suas compras hoje? (reposição, representantes, feiras, coleções, pedidos antecipados)", tipo: "textarea" },
    { id: "c_prioridade", rotulo: "Quando você compra, o que vem primeiro?", tipo: "opcao", opcoes: ["Repor o que mais vende", "As novidades e os lançamentos", "O que o representante oferece", "Não tenho uma regra"] },
    { id: "c_orcamento", rotulo: "Você tem um orçamento (um teto) de compra por mês?", tipo: "opcao", opcoes: ["Tenho e respeito", "Tenho, mas acabo passando", "Não tenho"] },
    ...demanda("c_estoque", "Análise do estoque: o que mais vende, o que está parado e há quanto tempo", "De quanto em quanto tempo?", ["Toda semana", "Todo mês", "Na troca de coleção", "Não tenho frequência"]),
    { id: "c_estoque_como", rotulo: "Como você analisa o estoque hoje? (sistema, planilha, de olho na arara)", tipo: "textarea" },
    { id: "c_calendario_tem", rotulo: "Você tem um calendário de compras no ano?", tipo: "opcao", opcoes: ["Tenho um calendário de compras", "Compro conforme aparece", "Não sei dizer"] },
    { id: "c_calendario", rotulo: "Como é o seu calendário de compras no ano?", tipo: "textarea", ajuda: "Ex.: verão comprado em junho na feira; inverno em janeiro; reposição toda semana com o representante; Natal fechado em setembro." },
  ],
};
