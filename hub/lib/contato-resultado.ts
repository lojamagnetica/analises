"use client";

// O que aconteceu em cada item do dia da CS. Toda opção vira registro no histórico da loja (cs_contatos).
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";

export type Resultado = "conversei" | "nao_necessario" | "aguardando" | "nao_consegui" | "adiado" | "loja_resolveu" | "para_camilla";

/** As opções, na ordem em que aparecem. campo: o que pedir; obrigatorio: sem o texto não salva; volta: em quantos dias o item volta (null = não volta). */
export const RESULTADOS: { chave: Resultado; rotulo: string; campo: string; dica: string; obrigatorio: boolean; volta: number | null; data?: boolean }[] = [
  { chave: "conversei", rotulo: "Conversei", campo: "Resumo da conversa", dica: "Ex.: viu a análise, vai começar pela vitrine", obrigatorio: true, volta: null },
  { chave: "aguardando", rotulo: "Mandei mensagem, aguardando", campo: "O que você mandou", dica: "Ex.: mandei a mensagem pronta no WhatsApp", obrigatorio: false, volta: 1 },
  { chave: "nao_consegui", rotulo: "Não consegui falar", campo: "Por onde tentou", dica: "Ex.: liguei 2 vezes e não atendeu", obrigatorio: false, volta: 1, data: true },
  { chave: "adiado", rotulo: "Adiar para…", campo: "Por que adiar", dica: "Ex.: a dona está viajando até sexta", obrigatorio: true, volta: 1, data: true },
  { chave: "loja_resolveu", rotulo: "A loja resolveu sozinha", campo: "Observação (opcional)", dica: "Ex.: lançou o caixa antes da conversa", obrigatorio: false, volta: null },
  { chave: "nao_necessario", rotulo: "Não foi necessário", campo: "Motivo", dica: "Ex.: já falamos disso na reunião de ontem", obrigatorio: true, volta: null },
  { chave: "para_camilla", rotulo: "Passar para a Camilla", campo: "O que você precisa da Camilla", dica: "Ex.: ela quer mudar a meta do mês", obrigatorio: true, volta: null },
];
export const rotuloResultado = (r: string | null | undefined) => RESULTADOS.find((x) => x.chave === r)?.rotulo ?? "Conversei";

/** O registro fecha o alerta? Os que "voltam" só fecham até a data de retomar. */
export const fechaAlerta = (c: { resultado?: string | null; retomar_em?: string | null }) => !c.retomar_em || c.retomar_em > hoje();
/** Conta como conversa de verdade (para "sem conversar há X dias"). */
export const foiConversa = (c: { resultado?: string | null }) => !c.resultado || c.resultado === "conversei";

export type Registro = { portalId: string; tipo: string; ref: string; loja?: string };
export type Preenchido = { resultado: Resultado; texto: string; ajuda: boolean; passo: string; proximoEm: string; retomarEm: string; canal?: string };

export async function registrarResultado(r: Registro, p: Preenchido, por: { id: string; nome: string }) {
  const sb = supabaseBrowser();
  const op = RESULTADOS.find((x) => x.chave === p.resultado)!;
  const retomar = op.volta == null ? null : (p.retomarEm || somarDias(hoje(), op.volta));
  const { error } = await sb.from("cs_contatos").insert({
    portal_id: r.portalId, tipo: r.tipo, ref: r.ref, feito_em: new Date().toISOString(), feito_por: por.nome || null,
    resumo: p.texto.trim() || null, precisa_ajuda: p.ajuda, proximo_passo: p.passo.trim() || null, proximo_em: p.proximoEm || null,
    resultado: p.resultado, retomar_em: retomar, canal: p.canal ?? null,
  });
  if (error) throw new Error(error.message);
  // Próximo passo com data: lembrete para quem registrou, no dia marcado.
  if (p.resultado === "conversei" && p.passo.trim()) {
    await sb.from("equipe_lembretes").insert({ portal_id: r.portalId, texto: p.passo.trim(), quando: p.proximoEm || somarDias(hoje(), 1), responsavel: por.id, criado_por: por.nome });
  }
  // Passar para a Camilla: vira lembrete para quem aprova (a Camilla), com o resumo.
  if (p.resultado === "para_camilla") {
    const { data: quem } = await sb.from("perfis").select("id").eq("aprova", true);
    for (const q of (quem ?? []) as { id: string }[]) {
      await sb.from("equipe_lembretes").insert({ portal_id: r.portalId, texto: `Da ${por.nome || "CS"}: ${p.texto.trim()}`, quando: hoje(), responsavel: q.id, criado_por: por.nome });
    }
  }
  return retomar;
}
