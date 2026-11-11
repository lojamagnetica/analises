// Programa Loja Magnética · Brasil: a Missão do Mês (índice de 0 a 500) e como cada ação é comprovada.
// Só regras. Nomes de lojas ficam no banco, nunca aqui.

export type AcaoMissao = { acao: string; pontos: number; regra: string; prova: "automatico" | "print" | "conferencia" };
export type PilarMissao = { nome: string; total: number; acoes: AcaoMissao[] };

export const MISSAO_DO_MES: PilarMissao[] = [
  {
    nome: "Gestão", total: 130,
    acoes: [
      { acao: "Caixa da semana lançado até o sábado", pontos: 80, regra: "20 por semana; até a segunda, 10", prova: "automatico" },
      { acao: "Planejamento do mês feito, com a meta cadastrada até o dia 5", pontos: 30, regra: "Registrar no Hub e marcar a mentoria no Instagram", prova: "conferencia" },
      { acao: "Feedback individual do time registrado no meio do mês", pontos: 20, regra: "Registrar no Hub e marcar a mentoria no Instagram", prova: "conferencia" },
    ],
  },
  {
    nome: "Execução", total: 170,
    acoes: [
      { acao: "Missão da semana enviada todos os dias pelo Hub", pontos: 80, regra: "20 por semana; 10 se mandar em 4 ou 5 dias", prova: "automatico" },
      { acao: "Mensagens pelo Hub: pós-venda em até 24h, aniversariantes e clientes que sumiram", pontos: 60, regra: "15 por semana", prova: "print" },
      { acao: "Cadastros completos (telefone e aniversário) 20% acima do mês anterior", pontos: 30, regra: "Comparado com o mês passado", prova: "automatico" },
    ],
  },
  {
    nome: "Resultado", total: 200,
    acoes: [
      { acao: "Meta do mês batida, com post e marcação da mentoria", pontos: 80, regra: "Sem o post, 40", prova: "conferencia" },
      { acao: "Crescimento sobre o mesmo mês do ano anterior", pontos: 40, regra: "Pelo caixa do Hub", prova: "automatico" },
      { acao: "Clientes que sumiram e voltaram a comprar pela mensagem", pontos: 60, regra: "Print da conversa e compra em até 15 dias", prova: "conferencia" },
      { acao: "Compartilhar a vitória do mês (Card de Resultado)", pontos: 20, regra: "Segundo post, marcando o programa", prova: "conferencia" },
    ],
  },
];

export const PROVAS: Record<AcaoMissao["prova"], { selo: string; texto: string }> = {
  automatico: { selo: "Automático", texto: "O Hub confere sozinho, pelo que a loja lança." },
  print: { selo: "Print por amostragem", texto: "O Hub registra o envio; a equipe confere alguns prints." },
  conferencia: { selo: "Conferência", texto: "A loja registra no Hub e marca a mentoria no Instagram; a equipe confere e libera os pontos." },
};

export const totalMissao = () => MISSAO_DO_MES.reduce((s, p) => s + p.total, 0);
