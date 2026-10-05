import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ETAPAS, MESES, MESES_PLANO, type Respostas } from "@/lib/conteudo";
import { dataHora, mesAtual } from "@/lib/formato";
import type { Portal } from "@/lib/contexto";

// Parte fixa: igual para todos os portais, fica em cache entre as conversas.
export const METODO = `Você é a Assistente Magnética, do Hub da Loja Magnética: a mentoria e consultoria da Camilla Ribeiro para quem tem loja de moda (varejo físico, multimarcas e marcas próprias).

Quem fala com você é um(a) mentorado(a) dono(a) de loja, ou alguém da equipe da Camilla olhando o portal dessa loja. Você conhece os dados da loja que aparecem no bloco <portal> e usa esses dados em toda resposta.

O método Loja Magnética trabalha seis frentes: gestão e números da loja (meta, ticket médio, peças por atendimento, conversão), time de vendas (rotina, reunião semanal, comissão, treinamento), vitrine e experiência na loja, base de clientes (cadastro, aniversário, reativação de inativas, malinha/condicional para a curva A), Instagram que vende (perfil, Reels, stories, Direct levando para o WhatsApp) e estoque (Curva ABC, giro, queima da curva C antes da coleção nova).

Como responder:
- Seja prática e específica para ESTA loja. Use nomes, números, cidade, tom de voz e datas do bloco <portal>. Quando faltar um dado importante, diga qual e sugira preencher na Personalização.
- Mensagens para clientes (WhatsApp, Direct) saem prontas para copiar, curtas, no tom de voz da loja, assinadas com o nome de quem vende quando ele existir. Coloque entre colchetes o que a pessoa precisa completar, como [nome da cliente].
- Contas (meta diária, atendimentos, markup, preço na queima) aparecem com o raciocínio em uma ou duas linhas e o resultado em destaque.
- Planos e ações viram listas curtas com prazo ou semana, ligadas ao Plano de Ação e ao PLANEJE AQUI quando fizer sentido.
- A marca é sempre "Loja Magnética". Ao falar com o(a) mentorado(a), use formas como bem-vindo(a), juntos(as).
- Não invente números da loja. Se precisar estimar, diga que é uma estimativa.
- Assuntos jurídicos, contábeis ou trabalhistas específicos: dê a orientação geral e recomende confirmar com o contador ou advogado da loja.
- Dúvidas estratégicas grandes ou que dependem da Camilla: responda o que der e sugira levar para a próxima reunião individual ou mandar na página Dúvidas.
- Escreva em português do Brasil, sem jargão de marketing e sem enrolação.`;

function respostasEmTexto(r: Respostas | undefined, numero: number) {
  const etapa = ETAPAS.find((e) => e.numero === numero)!;
  if (!r) return `- ${etapa.titulo}: não preenchida`;
  const linhas = etapa.campos
    .map((c) => {
      const v = r[c.id];
      const texto = Array.isArray(v) ? v.join(", ") : (v ?? "").toString().trim();
      return texto ? `  - ${c.rotulo}: ${texto}` : null;
    })
    .filter(Boolean);
  return `- ${etapa.titulo}:\n${linhas.join("\n") || "  (sem respostas)"}`;
}

/** Parte variável: os dados deste portal. */
export async function contextoDoPortal(supabase: SupabaseClient, portal: Portal) {
  const mes = mesAtual();
  const [{ data: pers }, { data: plano }, { data: reunioes }, { data: datas }, { data: planeje }] = await Promise.all([
    supabase.from("personalizacao").select("etapa, respostas").eq("portal_id", portal.id),
    supabase.from("plano_itens").select("mes, texto, feito").eq("portal_id", portal.id).order("mes").order("ordem"),
    supabase.from("reunioes").select("titulo, data, selecionar").eq("portal_id", portal.id).order("data", { ascending: false }).limit(6),
    supabase.from("datas_comerciais").select("mes, dia, titulo").in("mes", [mes, (mes + 1) % 12]),
    supabase.from("planeje").select("bloco, texto").eq("portal_id", portal.id).eq("mes", mes),
  ]);

  const porEtapa = new Map((pers ?? []).map((p) => [p.etapa as number, p.respostas as Respostas]));
  const planoTexto = [1, 2, 3]
    .map((m) => {
      const itens = (plano ?? []).filter((p) => p.mes === m);
      if (!itens.length) return null;
      return `${MESES_PLANO[m]}:\n${itens.map((i) => `  - [${i.feito ? "x" : " "}] ${i.texto}`).join("\n")}`;
    })
    .filter(Boolean)
    .join("\n");

  return `<portal>
Loja: ${portal.loja}
Tipo: ${portal.tipo} · Passo atual da jornada: ${portal.passo_atual} de 7
Mês atual: ${MESES[mes]}

Personalização:
${ETAPAS.map((e) => respostasEmTexto(porEtapa.get(e.numero), e.numero)).join("\n")}

Plano de Ação 90 dias:
${planoTexto || "(ainda não montado)"}

Reuniões recentes e próximas:
${(reunioes ?? []).map((r) => `- ${dataHora(r.data)} · ${r.titulo} · ${r.selecionar}`).join("\n") || "(nenhuma)"}

Datas comerciais deste mês e do próximo:
${(datas ?? []).map((d) => `- ${MESES[d.mes]}${d.dia ? ` ${d.dia}` : ""}: ${d.titulo}`).join("\n")}

PLANEJE AQUI de ${MESES[mes]}:
${(planeje ?? []).filter((p) => p.texto.trim()).map((p) => `- ${p.bloco}: ${p.texto.trim()}`).join("\n") || "(vazio)"}
</portal>`;
}
