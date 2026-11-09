"use client";

import { useState } from "react";
import { useDados } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { mesDeHoje, nomeMes, numeroDe } from "@/lib/caixa";
import { buscarPlano, metaDoPlano } from "@/lib/plano-mes";
import { buscarBoletosMes, salvarBoletosMes } from "@/lib/rotina";

/** Os boletos do mês em dois números por loja: quanto vence no mês e quanto já foi pago. */
export function BoletosMes({ portalId, lojas }: { portalId: string; lojas: string[] }) {
  const nomes = lojas.length ? lojas : [""];
  const mes = mesDeHoje();
  const { dados, recarregar } = useDados(async () => {
    const [lista, plano] = await Promise.all([buscarBoletosMes(portalId, mes), buscarPlano(portalId, mes)]);
    return { lista, meta: plano ? metaDoPlano(plano.dados) : null };
  }, [portalId, mes]);
  const [edit, setEdit] = useState<Record<string, { v: string; p: string }>>({});
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState("");
  if (!dados) return null;

  const valores = (l: string) => {
    const x = dados.lista.find((b) => b.loja === l);
    return { v: edit[l]?.v ?? (x ? String(x.a_vencer).replace(".", ",") : ""), p: edit[l]?.p ?? (x ? String(x.pago).replace(".", ",") : "") };
  };
  const num = (s: string) => numeroDe(s) ?? 0;
  const totalVencer = nomes.reduce((s, l) => s + num(valores(l).v), 0);
  const totalPago = nomes.reduce((s, l) => s + num(valores(l).p), 0);

  async function salvar(l: string) {
    setErro(""); setSalvo("");
    try {
      const v = valores(l);
      await salvarBoletosMes(portalId, l, mes, num(v.v), num(v.p));
      setSalvo(l || "ok"); recarregar();
    } catch (e) { setErro((e as Error).message); }
  }

  return (
    <div className="card mb">
      <div className="linha entre" style={{ flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Boletos do mês · {nomeMes(mes)}</h3>
        <span className="mudo">Dois números por loja</span>
      </div>
      <p className="ajuda">Coloque no começo do mês quanto vence, e atualize o que já foi pago toda sexta.</p>
      {nomes.map((l) => {
        const v = valores(l); const falta = Math.max(num(v.v) - num(v.p), 0);
        return (
          <form key={l || "loja"} className="mt" onSubmit={(e) => { e.preventDefault(); salvar(l); }} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            {l && <b>{l}</b>}
            <div className="grade g3" style={{ marginTop: 6 }}>
              <div><label className="rotulo" htmlFor={`bv-${l}`}>A vencer no mês (R$)</label>
                <input id={`bv-${l}`} type="text" inputMode="decimal" value={v.v} placeholder="0,00" onChange={(e) => setEdit({ ...edit, [l]: { ...v, v: e.target.value } })} /></div>
              <div><label className="rotulo" htmlFor={`bp-${l}`}>Pago no mês (R$)</label>
                <input id={`bp-${l}`} type="text" inputMode="decimal" value={v.p} placeholder="0,00" onChange={(e) => setEdit({ ...edit, [l]: { ...v, p: e.target.value } })} /></div>
              <div><span className="rotulo">Falta pagar</span><div style={{ fontWeight: 700, paddingTop: 8 }}>{moeda(falta)}</div></div>
            </div>
            <div className="linha mt" style={{ gap: 8, alignItems: "center" }}>
              <button className="btn p peq" type="submit">Salvar</button>
              {salvo === (l || "ok") && <span className="mudo">Salvo ✓</span>}
            </div>
          </form>
        );
      })}
      {dados.meta ? (
        <p className="mt" style={{ margin: "12px 0 0" }}>
          Boletos do mês: <b>{moeda(totalVencer)}</b>, que são <b>{Math.round((totalVencer / dados.meta) * 100)}%</b> da meta do mês ({moeda(dados.meta)}), do Planeje o mês.
        </p>
      ) : <p className="ajuda">Com a meta do mês no Planeje o mês, o Hub mostra aqui quanto dela os boletos pedem.</p>}
      {erro && <div className="aviso mt">{erro}</div>}
    </div>
  );
}
