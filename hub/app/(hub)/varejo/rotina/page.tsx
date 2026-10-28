"use client";

import { ChecklistRotina } from "@/components/ChecklistRotina";
import { ROTINA_LOJA_PADRAO } from "@/lib/site";

/** Rotina da loja: o checklist do time na abertura, durante o dia, no fechamento, na semana e no mês. */
export default function RotinaLoja() {
  return (
    <ChecklistRotina area="loja" freqs={["abertura", "durante", "fechamento", "semanal", "mensal"]} padrao={ROTINA_LOJA_PADRAO} titulo="Rotina da loja"
      sub="O checklist do time no dia a dia da loja: abertura, durante o dia e fechamento, mais o que é de toda semana e de todo mês. Marque quando fizer: volta a ficar pendente na próxima vez."
      comeco="Comece com a rotina sugerida (loja pronta, abordagem, cadastro de clientes, contatos da carteira, fechamento do caixa). Depois edite, tire e coloque o que for do jeito da loja, com quem faz cada item." />
  );
}
