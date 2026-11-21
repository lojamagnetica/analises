"use client";

// Régua "Pronta para a Claudia" de uma loja: o que já está completo e o que falta antes de passar para a CS.
import { useDados } from "@/lib/hub";
import { Recolhivel } from "@/components/Recolhivel";
import { buscarProntas } from "@/lib/pronta";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ProntaCs({ portalId, acompanhada, aprova, mudou }: { portalId: string; acompanhada: boolean; aprova: boolean; mudou: () => void }) {
  const { dados } = useDados(async () => (await buscarProntas([portalId])).get(portalId) ?? null, [portalId]);
  if (!dados) return null;
  const pronta = dados.feitos === dados.total;
  const passar = async (sim: boolean) => {
    if (!confirm(sim ? "Passar esta loja para o acompanhamento da Claudia?" : "Tirar esta loja do acompanhamento da Claudia (volta para você)?")) return;
    const { error } = await supabaseBrowser().from("portais").update({ cs_acompanha: sim }).eq("id", portalId);
    if (error) alert(error.message); else mudou();
  };
  return (
    <Recolhivel id="ficha-pronta" cor={pronta ? "var(--feito)" : "var(--orange)"} titulo={`Pronta para a Claudia · ${dados.feitos} de ${dados.total}`}
      extra={<span className={`selo ${acompanhada ? "feito" : "espera"}`}>{acompanhada ? "com a Claudia" : "com você (a caminho)"}</span>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "2px 12px", marginTop: 6 }}>
        {dados.itens.map((i) => <span key={i.chave} style={{ color: i.ok ? "inherit" : "var(--red)" }}>{i.ok ? "✓" : "○"} {i.rotulo}</span>)}
      </div>
      {aprova && (
        <div className="linha mt" style={{ gap: 8 }}>
          {!acompanhada && <button type="button" className={`btn ${pronta ? "p" : "s"} peq`} onClick={() => passar(true)}>Passar para a Claudia{pronta ? "" : " mesmo assim"}</button>}
          {acompanhada && <button type="button" className="btn s peq" onClick={() => passar(false)}>Voltar para mim</button>}
        </div>
      )}
    </Recolhivel>
  );
}
