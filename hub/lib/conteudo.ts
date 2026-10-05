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
};

export type Etapa = { numero: number; titulo: string; descricao: string; campos: Campo[] };

export const ETAPAS: Etapa[] = [
  {
    numero: 1,
    titulo: "Diagnóstico da loja",
    descricao: "As respostas que montam o seu Plano de Ação.",
    campos: [
      { id: "tempo_loja", rotulo: "Há quanto tempo a loja existe?", tipo: "texto" },
      { id: "segmento", rotulo: "Segmento", tipo: "opcao", opcoes: ["Multimarca feminina", "Multimarca masculina", "Moda praia", "Infantil", "Plus size", "Marca própria", "Outro"] },
      { id: "faturamento_medio", rotulo: "Faturamento médio mensal (R$)", tipo: "numero" },
      { id: "maior_desafio", rotulo: "Hoje, qual é o maior desafio da loja?", tipo: "textarea" },
      { id: "o_que_funciona", rotulo: "O que já funciona bem?", tipo: "textarea" },
      { id: "onde_quer_chegar", rotulo: "Onde você quer que a loja esteja daqui a 12 meses?", tipo: "textarea" },
    ],
  },
  {
    numero: 2,
    titulo: "Sua loja e tom de voz",
    descricao: "Nome, cidade, Instagram e como você fala com a cliente. Personaliza os scripts.",
    campos: [
      { id: "loja", rotulo: "Nome da loja", tipo: "texto" },
      { id: "seu_nome", rotulo: "Seu primeiro nome (como assina as mensagens)", tipo: "texto" },
      { id: "cidade", rotulo: "Cidade", tipo: "texto" },
      { id: "instagram", rotulo: "Instagram da loja", tipo: "texto", ajuda: "Ex.: @minhaloja" },
      { id: "whatsapp", rotulo: "Link ou número do WhatsApp da loja", tipo: "texto" },
      { id: "tom", rotulo: "Tom de voz", tipo: "opcao", opcoes: ["Próximo e carinhoso", "Elegante e sofisticado", "Descontraído e divertido", "Direto e objetivo"] },
      { id: "palavras", rotulo: "Palavras e expressões que são a sua cara", tipo: "textarea" },
    ],
  },
  {
    numero: 3,
    titulo: "Cliente ideal",
    descricao: "Quem compra, quanto gasta, o que valoriza.",
    campos: [
      { id: "idade", rotulo: "Faixa de idade", tipo: "texto" },
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
      { id: "marcas", rotulo: "Principais marcas", tipo: "textarea" },
      { id: "categorias", rotulo: "Categorias que mais vendem", tipo: "textarea" },
      { id: "faixa_preco", rotulo: "Faixa de preço (da peça mais barata à mais cara)", tipo: "texto" },
      { id: "markup", rotulo: "Markup médio", tipo: "numero", ajuda: "Ex.: 2,6" },
      { id: "estoque", rotulo: "Como está o estoque hoje?", tipo: "opcao", opcoes: ["Equilibrado", "Muita peça parada", "Falta peça boa", "Não sei"] },
    ],
  },
  {
    numero: 5,
    titulo: "Time de vendas",
    descricao: "Quem atende, metas individuais e rotina.",
    campos: [
      { id: "tamanho_time", rotulo: "Quantas pessoas atendem?", tipo: "numero" },
      { id: "quem", rotulo: "Nomes e funções", tipo: "textarea" },
      { id: "comissao", rotulo: "Como funciona a comissão?", tipo: "textarea" },
      { id: "rotina", rotulo: "Existe reunião ou rotina com o time?", tipo: "opcao", opcoes: ["Sim, toda semana", "Às vezes", "Não"] },
    ],
  },
  {
    numero: 6,
    titulo: "Metas e números",
    descricao: "Faturamento, ticket médio, peças por atendimento.",
    campos: [
      { id: "meta_mensal", rotulo: "Meta de faturamento do mês (R$)", tipo: "numero" },
      { id: "dias_abertos", rotulo: "Dias de loja aberta no mês", tipo: "numero" },
      { id: "ticket", rotulo: "Ticket médio (R$)", tipo: "numero" },
      { id: "pa", rotulo: "Peças por atendimento", tipo: "numero" },
      { id: "conversao", rotulo: "Conversão (% de quem entra e compra)", tipo: "numero" },
    ],
  },
  {
    numero: 7,
    titulo: "Canais de venda",
    descricao: "Loja física, WhatsApp, Instagram, site, malinha.",
    campos: [
      { id: "canais", rotulo: "Onde você vende hoje?", tipo: "multi", opcoes: ["Loja física", "WhatsApp", "Instagram (Direct)", "Site / e-commerce", "Malinha / condicional"] },
      { id: "principal", rotulo: "Qual canal traz mais faturamento?", tipo: "texto" },
      { id: "base_clientes", rotulo: "Quantas clientes tem na base (com WhatsApp)?", tipo: "numero" },
    ],
  },
];

export type Respostas = Record<string, string | string[]>;
