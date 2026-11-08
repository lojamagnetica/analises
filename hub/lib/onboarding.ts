// Mensagens do onboarding que a equipe manda no grupo da cliente (ficam na Central, não na apresentação).
import { BASE } from "@/lib/config";
import { dataCurta } from "@/lib/formato";

const primeiro = (n: string | null | undefined) => (n ?? "").trim().split(" ")[0] || "";

/** Resumo do onboarding para o grupo da cliente, com o prazo de envio combinado na call. */
export function resumoOnboarding(responsavel: string | null, prazo: string | null) {
  const site = typeof window !== "undefined" ? `${location.origin}${BASE}` : "";
  return `${primeiro(responsavel) || "Oi"}, que bom ter você com a gente! Resumo do nosso onboarding:

1. Entre no Hub (${site}/) e assista ao vídeo de boas-vindas em Comece aqui.
2. Preencha os Dados da loja, etapa por etapa. Não tem algum arquivo ou número? Escreva o que souber ou marque "Ainda não tenho".
3. ${prazo ? `Combinado: tudo enviado até ${dataCurta(prazo)}.` : "Envie tudo nos próximos dias, no seu ritmo."}
4. Com tudo recebido e sem pendências, a equipe monta o seu Diagnóstico e marcamos a sua reunião com a Camilla.

Qualquer dúvida, é só chamar no Fale com a Camilla.`;
}
