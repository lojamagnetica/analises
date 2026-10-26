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

export const MESES_PLANO = ["", "Mês 1 · Arrumar a casa", "Mês 2 · Vender mais para quem já compra", "Mês 3 · Escalar e medir"];

export type Campo = {
  id: string;
  rotulo: string;
  tipo: "texto" | "textarea" | "numero" | "opcao" | "multi";
  opcoes?: string[];
  ajuda?: string;
  /** Dado de número ou de relatório: a loja pode marcar "É uma estimativa" ou "Ainda não tenho". */
  dado?: boolean;
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
    ],
  },
];

export type Respostas = Record<string, string | string[]>;
