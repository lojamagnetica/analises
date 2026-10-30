"use client";

// O formulário da oferta do webinar (Sessão Estratégica de Fim de Ano), dentro do Hub. A lojista responde pelo link
// público /sessao (sem login); as respostas ficam em webinar_sessoes e o time acompanha na aba Sessões do Webinar.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Pergunta = { id: string; pergunta: string; tipo: "texto" | "whats" | "escolha"; opcoes?: string[]; dica?: string; obrigatoria?: boolean };

export const PERGUNTAS: Pergunta[] = [
  { id: "nome", pergunta: "Seu nome", tipo: "texto", obrigatoria: true },
  { id: "whatsapp", pergunta: "Seu WhatsApp", tipo: "whats", dica: "Com DDD. É por aqui que o meu time vai te chamar.", obrigatoria: true },
  { id: "loja", pergunta: "Nome da loja", tipo: "texto", obrigatoria: true },
  { id: "instagram", pergunta: "@ do Instagram da loja", tipo: "texto" },
  { id: "cidade", pergunta: "Cidade e estado", tipo: "texto", obrigatoria: true },
  { id: "tempo_loja", pergunta: "Há quanto tempo a sua loja existe?", tipo: "escolha", opcoes: ["Menos de 1 ano", "De 1 a 3 anos", "De 3 a 5 anos", "Mais de 5 anos"], obrigatoria: true },
  { id: "equipe", pergunta: "Quantas pessoas trabalham na loja além de você?", tipo: "escolha", opcoes: ["Só eu", "1 ou 2", "De 3 a 5", "6 ou mais"], obrigatoria: true },
  { id: "faturamento", pergunta: "Quanto a loja fatura, em média, por mês?", tipo: "escolha", opcoes: ["Até R$ 30 mil", "De R$ 30 mil a R$ 60 mil", "De R$ 60 mil a R$ 100 mil", "De R$ 100 mil a R$ 200 mil", "Mais de R$ 200 mil"], obrigatoria: true },
  { id: "desafio", pergunta: "Dos 3 passos da aula, qual é o seu maior desafio hoje?", tipo: "escolha", opcoes: ["Atrair clientes novos", "Despertar o desejo de compra", "Vender para quem já é cliente"], obrigatoria: true },
  { id: "cadastro", pergunta: "As suas clientes estão cadastradas com nome e WhatsApp?", tipo: "escolha", opcoes: ["Sim, a maioria", "Só algumas", "Não"], obrigatoria: true },
  { id: "meta_dezembro", pergunta: "Quanto você quer faturar em dezembro?", tipo: "texto", dica: "Pode ser um valor aproximado." },
  { id: "interesse", pergunta: "Se a sessão mostrar um caminho claro para a sua loja, você tem interesse em ter o acompanhamento do Método Loja Magnética?", tipo: "escolha", opcoes: ["Sim", "Quero entender melhor", "Agora não"], obrigatoria: true },
];

export type Sessao = Record<string, string> & { id: string; origem: string; status: Status; obs: string; created_at: string };
export type Status = "novo" | "chamado" | "agendado" | "feito" | "sem_interesse";
export const STATUS: { v: Status; r: string; selo: string }[] = [
  { v: "novo", r: "Novo", selo: "alerta" },
  { v: "chamado", r: "Chamado no WhatsApp", selo: "andamento" },
  { v: "agendado", r: "Agendado", selo: "andamento" },
  { v: "feito", r: "Sessão feita", selo: "feito" },
  { v: "sem_interesse", r: "Sem interesse", selo: "espera" },
];

export const linkSessao = (origem = "webinar") => `${typeof window !== "undefined" ? window.location.origin : ""}/analises/portal/sessao/?o=${origem}`;

/** Envio pelo link público (sem login). */
export async function enviarSessao(respostas: Record<string, string>, origem: string) {
  const { data, error } = await supabaseBrowser().rpc("webinar_sessao_enviar", { p: { ...respostas, origem } });
  return !error && data === true;
}

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

export async function buscarSessoes() {
  const { data } = await sb().from("webinar_sessoes").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Sessao[];
}
export const salvarSessao = (id: string, campos: Partial<Sessao>) => ok(sb().from("webinar_sessoes").update(campos).eq("id", id));
export const excluirSessao = (id: string) => ok(sb().from("webinar_sessoes").delete().eq("id", id));

/** Link do WhatsApp para o time chamar a lojista, já com a apresentação de quem fala. */
export function whatsSessao(s: Sessao) {
  const n = s.whatsapp.replace(/\D/g, "");
  const tel = n.length <= 11 ? `55${n}` : n;
  const txt = `Oi, ${s.nome.split(" ")[0]}! Aqui é do time da Camilla Ribeiro, do Método Loja Magnética. Recebemos o seu pedido da Sessão Estratégica de Fim de Ano da ${s.loja || "sua loja"}. Fica melhor para você no começo ou no fim da semana?`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(txt)}`;
}
