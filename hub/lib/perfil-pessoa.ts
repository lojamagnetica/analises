// Relatório de Perfil Comportamental para a própria pessoa da equipe: o que o teste mostrou, os diferenciais,
// os pontos de desenvolvimento e como potencializar o resultado. Duas versões: quem atende cliente e quem é de apoio
// (caixa, financeiro, estoque, marketing). Textos para a Camilla revisar.
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Letra } from "@/lib/pessoas";

export type Versao = "venda" | "apoio";
type Textos = { diferenciais: string[]; atencao: string[]; potencializar: string[] };
export type TextoPerfil = { nome: string; sintese: string } & Record<Versao, Textos>;

export const RELATORIO_PERFIL: Record<Letra, TextoPerfil> = {
  D: {
    nome: "Protagonista",
    sintese: "Seu perfil é orientado a resultado. Você se motiva com objetivos claros, toma decisões com rapidez e assume a iniciativa diante de desafios.",
    venda: {
      diferenciais: ["Agilidade no atendimento e na tomada de decisão", "Foco em meta e em resultado mensurável", "Iniciativa para resolver situações sem depender de orientação"],
      atencao: ["Respeitar o tempo de decisão de clientes mais cautelosas", "Cuidar do tom na comunicação com a equipe", "Manter constância nas tarefas de rotina"],
      potencializar: ["Acompanhe diariamente a sua meta individual e o seu PA", "Antes de apresentar a oferta, faça mais uma pergunta sobre a necessidade da cliente", "Assuma o protagonismo nos dias de maior movimento e nas ações de venda"],
    },
    apoio: {
      diferenciais: ["Agilidade para resolver pendências", "Foco em prazo e em entrega", "Iniciativa e autonomia na função"],
      atencao: ["Alinhar decisões com a equipe antes de executar", "Cuidar do tom em momentos de pressão", "Atenção aos detalhes nas tarefas repetitivas"],
      potencializar: ["Defina com a liderança indicadores claros para a sua função", "Use checklists nas rotinas que exigem precisão", "Seja referência em prazo e solução para o time"],
    },
  },
  I: {
    nome: "Influente",
    sintese: "Seu perfil é orientado a pessoas. Você cria conexão com facilidade, comunica com entusiasmo e contribui para um ambiente positivo.",
    venda: {
      diferenciais: ["Facilidade para criar vínculo e fidelizar clientes", "Comunicação envolvente, inclusive em conteúdo para as redes", "Contribuição para o clima e a energia da equipe"],
      atencao: ["Conduzir o atendimento até a oferta de peças complementares", "Organização de registros e combinados", "Constância nas tarefas de rotina"],
      potencializar: ["Use a confiança da cliente para apresentar o look completo", "Registre combinados e cadastros no momento do atendimento", "Participe da produção de conteúdo: a sua comunicação é um diferencial da loja"],
    },
    apoio: {
      diferenciais: ["Facilidade de relacionamento com a equipe e com parceiros", "Comunicação clara e motivadora", "Abertura para novas ideias"],
      atencao: ["Organização e registro das informações", "Cumprimento de prazos em tarefas detalhadas", "Foco diante de muitas demandas ao mesmo tempo"],
      potencializar: ["Organize o dia com uma lista de prioridades", "Use a sua comunicação para integrar as áreas da loja", "Contribua com ideias nas reuniões da equipe"],
    },
  },
  S: {
    nome: "Constante",
    sintese: "Seu perfil é orientado à estabilidade e ao cuidado. Você transmite confiança, valoriza a rotina e constrói relacionamentos duradouros.",
    venda: {
      diferenciais: ["Atendimento paciente e acolhedor", "Comprometimento com processos e combinados", "Relacionamento de longo prazo com as clientes"],
      atencao: ["Tomar a iniciativa de oferecer, sem aguardar a solicitação da cliente", "Adaptação a mudanças rápidas", "Expressar opiniões e desconfortos com clareza"],
      potencializar: ["Use a confiança da cliente para recomendar peças complementares", "Peça antecipação sobre mudanças de rotina e de metas", "Compartilhe a sua percepção nas reuniões: o seu olhar fortalece a equipe"],
    },
    apoio: {
      diferenciais: ["Confiabilidade e constância na execução", "Cuidado com os processos e com as pessoas", "Apoio consistente à equipe"],
      atencao: ["Iniciativa diante de situações novas", "Adaptação a mudanças de prioridade", "Comunicar dificuldades logo no início"],
      potencializar: ["Registre os processos que você domina: eles viram o padrão da loja", "Combine com a liderança como as mudanças serão comunicadas", "Posicione-se nas reuniões: a sua experiência é referência"],
    },
  },
  C: {
    nome: "Analista",
    sintese: "Seu perfil é orientado à qualidade e à precisão. Você valoriza o conhecimento técnico, a organização e o trabalho bem feito.",
    venda: {
      diferenciais: ["Domínio técnico sobre produto, tecido, caimento e numeração", "Organização e cuidado com estoque e cadastro", "Segurança na orientação à cliente"],
      atencao: ["Agilidade na abordagem inicial da cliente", "Equilíbrio entre perfeição e prazo", "Proximidade e simpatia no atendimento"],
      potencializar: ["Use o seu conhecimento para mostrar o valor da peça antes do preço", "Tenha como padrão abordar a cliente em até 1 minuto", "Acompanhe os seus indicadores (PA e ticket médio): os dados orientam a sua evolução"],
    },
    apoio: {
      diferenciais: ["Precisão e atenção aos detalhes", "Organização e controle das informações", "Análise criteriosa antes de decidir"],
      atencao: ["Agilidade em decisões com pouca informação", "Flexibilidade diante de mudanças", "Comunicação mais próxima com a equipe"],
      potencializar: ["Seja referência nos controles da loja (caixa, estoque, cadastro)", "Defina prazos realistas e compartilhe o andamento", "Transforme as suas análises em informações simples para a equipe"],
    },
  },
};

/** Quem atende cliente recebe a versão de venda; caixa, financeiro, estoque e marketing, a de apoio. */
export function versaoDaFuncao(funcao: string | null | undefined): Versao {
  const f = (funcao ?? "").toLowerCase();
  if (!f || /vend|consult|atend|gerente|líder|lider/.test(f)) return "venda";
  return /caixa|financ|estoque|mkt|marketing|conte[uú]do|administr|compras|log[ií]stica|limpeza|cadastro/.test(f) ? "apoio" : "venda";
}

/** O link do relatório: cria a chave na primeira vez e depois reaproveita. */
export async function linkDoRelatorio(pessoaId: string, base: string) {
  const sb = supabaseBrowser();
  const { data } = await sb.from("loja_equipe").select("retorno_token").eq("id", pessoaId).single();
  let token = data?.retorno_token as string | null;
  if (!token) {
    token = crypto.randomUUID();
    const { error } = await sb.from("loja_equipe").update({ retorno_token: token }).eq("id", pessoaId);
    if (error) throw new Error(error.message);
  }
  return `${base}/perfil/?t=${token}`;
}

/** A mensagem curta de WhatsApp com o link do relatório. */
export function mensagemRelatorio(nome: string, loja: string, link: string) {
  return `Oi, ${nome}! O seu Relatório de Perfil Comportamental está pronto. Nele você encontra os seus diferenciais, os pontos de desenvolvimento e como potencializar o seu resultado na ${loja}.\n\n${link}`;
}
