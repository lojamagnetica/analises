// O retorno do teste de perfil para a própria pessoa da equipe: o que o teste mostrou, os diferenciais,
// os desafios e como usar isso a seu favor. Textos para a Camilla revisar.
import type { Letra } from "@/lib/pessoas";

export type RetornoPerfil = { nome: string; frase: string; diferenciais: string[]; desafios: string[]; aFavor: string[] };

export const RETORNO_PERFIL: Record<Letra, RetornoPerfil> = {
  D: {
    nome: "Protagonista",
    frase: "Você gosta de desafio, de resultado e de fazer acontecer. Quando tem uma meta na frente, você vai atrás.",
    diferenciais: ["Decide rápido e não deixa a cliente esperando", "Gosta de meta e de ver o número subir", "Resolve problema sem precisar que alguém mande"],
    desafios: ["A pressa pode atropelar a cliente que precisa de mais tempo para escolher", "Pode soar direta demais com o time", "Tarefa repetitiva cansa você"],
    aFavor: ["Peça uma meta só sua e acompanhe o seu número todo dia", "Com cliente indecisa, respire e faça mais uma pergunta antes de oferecer", "Use a sua energia para puxar o time nos dias de movimento"],
  },
  I: {
    nome: "Influente",
    frase: "Você conquista pelas pessoas. A cliente gosta de ser atendida por você e volta por causa disso.",
    diferenciais: ["Cria conexão com a cliente em poucos minutos", "Deixa o clima da loja leve e animado", "Tem facilidade para gravar conteúdo e mostrar as peças"],
    desafios: ["Na conversa, pode esquecer de oferecer a segunda peça", "Rotina e detalhes (cadastro, anotações) cansam você", "Pode deixar combinados para depois"],
    aFavor: ["Use a conexão para montar o look completo: a cliente confia na sua dica", "Anote os combinados na hora, no celular ou no quadro", "Mostre a sua cara nos stories: a cliente compra de quem conhece"],
  },
  S: {
    nome: "Constante",
    frase: "Você é a pessoa de confiança da loja. Atende com calma, cuida das clientes e o time sabe que pode contar com você.",
    diferenciais: ["Atende com paciência, sem a cliente se sentir pressionada", "É fiel à rotina e aos combinados", "Cria relacionamento longo: a cliente pede por você"],
    desafios: ["Pode esperar a cliente pedir em vez de oferecer", "Mudanças rápidas deixam você insegura", "Pode ter dificuldade de falar quando algo incomoda"],
    aFavor: ["Use a confiança da cliente para indicar a peça que combina: ela vai ouvir você", "Peça para saber das mudanças com antecedência", "Fale da sua opinião nas reuniões: o time precisa do seu olhar"],
  },
  C: {
    nome: "Analista",
    frase: "Você gosta das coisas bem feitas. Repara nos detalhes, conhece as peças e passa segurança para a cliente.",
    diferenciais: ["Conhece tecido, caimento e tamanho como ninguém", "É organizada e cuidadosa com estoque e cadastro", "Passa segurança com informação certa"],
    desafios: ["Pode demorar para chegar na cliente e esperar ela se decidir", "Busca a perfeição e se cobra demais", "Pode parecer mais séria do que realmente é"],
    aFavor: ["Use o seu conhecimento para explicar por que a peça vale o preço", "Combine com você mesma um tempo para abordar: em até 1 minuto", "Acompanhe o seu PA e o seu ticket: número é o seu jeito de evoluir"],
  },
};

/** A mensagem de WhatsApp com o retorno do teste. */
export function mensagemRetorno(nome: string, loja: string, letra: Letra, segunda: Letra | null) {
  const r = RETORNO_PERFIL[letra];
  return [
    `Oi, ${nome}! Obrigada por responder o teste de perfil da ${loja} 💛`,
    "",
    `*Seu perfil: ${r.nome}*${segunda ? ` (com traços de ${RETORNO_PERFIL[segunda].nome})` : ""}`,
    r.frase,
    "",
    "✨ *Seus diferenciais*",
    ...r.diferenciais.map((x) => `• ${x}`),
    "",
    "🎯 *Seus desafios*",
    ...r.desafios.map((x) => `• ${x}`),
    "",
    "💪 *Como usar isso a seu favor*",
    ...r.aFavor.map((x) => `• ${x}`),
    "",
    "Não existe perfil melhor ou pior: cada um vende do seu jeito. Conte com a gente para crescer junto!",
  ].join("\n");
}
