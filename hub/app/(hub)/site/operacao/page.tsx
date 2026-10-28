"use client";

import { ChecklistRotina } from "@/components/ChecklistRotina";
import { OPERACAO_PADRAO } from "@/lib/site";

/** Operação do site: o checklist do que precisa ser feito todo dia, semana e mês, com quem faz. */
export default function OperacaoSite() {
  return (
    <ChecklistRotina area="site" freqs={["diaria", "semanal", "mensal"]} padrao={OPERACAO_PADRAO} titulo="Operação do site"
      sub="O checklist da rotina do site. Marque quando fizer: o item volta a ficar pendente quando chega a próxima vez (dia, semana ou mês)."
      comeco="Comece com o checklist sugerido (pedidos, estoque, novidades, régua de recompra, números do mês). Depois é só editar, tirar e colocar o que for da sua rotina." />
  );
}
