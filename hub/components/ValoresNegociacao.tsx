"use client";

import { useDados } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

export type PlanoNegociacao = { id: string; nome: string; meses: number | null; valor: number | null; valor_fecha: number | null; meses_call: number | null };

/** A frase da negociação de um plano: "R$ 12.000 · fecha até R$ 9.000" ou "R$ 8.000 por 4 meses · na call: 6 meses pelo mesmo valor". */
export function fraseNegociacao(p: PlanoNegociacao) {
  const partes: string[] = [];
  if (p.valor) partes.push(`${moeda(Number(p.valor))}${p.meses ? ` por ${p.meses} meses` : ""}`);
  if (p.valor_fecha) partes.push(`fecha até ${moeda(Number(p.valor_fecha))}`);
  if (p.meses_call) partes.push(`na call: ${p.meses_call} meses pelo mesmo valor`);
  return partes.join(" · ");
}

/** Os valores que a equipe comercial usa na negociação (vêm de Empresa › Planos). Só os planos à venda. */
export function ValoresNegociacao() {
  const { dados } = useDados(async () => {
    const { data } = await supabaseBrowser().from("planos").select("id, nome, meses, valor, valor_fecha, meses_call").eq("vendendo", true).order("ordem");
    return (data ?? []) as PlanoNegociacao[];
  }, []);
  const planos = (dados ?? []).filter((p) => p.valor);
  if (!planos.length) return null;
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: "var(--orange)" }}>
      <h3 style={{ margin: "0 0 6px" }}>Valores para a negociação</h3>
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        {planos.map((p) => (
          <div key={p.id}>
            <b>{p.nome}</b>
            <div className="mudo" style={{ fontSize: 13 }}>{p.meses ? `${p.meses} meses · ` : ""}tabela {moeda(Number(p.valor))}</div>
            {p.valor_fecha ? <div>Fecha até <b>{moeda(Number(p.valor_fecha))}</b></div> : null}
            {p.meses_call ? <div>Na call: <b>{p.meses_call} meses</b> pelo mesmo valor</div> : null}
          </div>
        ))}
      </div>
      <p className="ajuda" style={{ margin: "8px 0 0" }}>Comece pelo valor de tabela. O &quot;fecha até&quot; é o limite da negociação.</p>
    </div>
  );
}
