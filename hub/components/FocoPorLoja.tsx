"use client";

import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { FUNDAMENTOS } from "@/lib/carteira";
import { dataHora } from "@/lib/formato";
import { listarFocosDasLojas, salvarFocoDaLoja } from "@/lib/foco";

/** Equipe: portal com mais de uma loja tem um Contrato de Foco para cada loja (necessidades e gestões diferentes). */
export function FocoPorLoja({ portalId, lojas }: { portalId: string; lojas: string[] }) {
  const { dados, recarregar } = useDados(() => listarFocosDasLojas(portalId), [portalId]);
  const [aviso, setAviso] = useState<{ loja?: string; ok?: string; erro?: string }>({});
  if (!dados) return <Carregando />;
  return (
    <div className="card mb">
      <h2 style={{ marginTop: 0 }}>Contrato de Foco de cada loja</h2>
      <p className="ajuda" style={{ marginTop: -4 }}>Cada loja vê o seu contrato quando escolhe a loja no topo do portal. Loja sem contrato próprio mostra o geral (da ficha). Mudar o resultado ou o indicador pede o de acordo de novo.</p>
      {lojas.map((loja) => {
        const f = dados.find((x) => x.loja === loja);
        return (
          <details key={loja} className="card mb" open={!f?.resultado}>
            <summary style={{ cursor: "pointer" }}>
              <b>{loja}</b> <span className="mudo">· {f?.resultado ? (f.de_acordo_em ? `de acordo em ${dataHora(f.de_acordo_em)}` : "esperando o de acordo") : "sem contrato próprio"}</span>
            </summary>
            <form className="mt" action={async (form) => {
              setAviso({});
              try {
                await salvarFocoDaLoja(portalId, {
                  loja, resultado: String(form.get("resultado") ?? ""), indicador: String(form.get("indicador") ?? ""), curto: String(form.get("curto") ?? ""),
                  trabalhando: FUNDAMENTOS.filter((x) => form.get(`t:${x}`) === "on"),
                });
                setAviso({ loja, ok: "Contrato salvo." }); recarregar();
              } catch (e) { setAviso({ loja, erro: (e as Error).message }); }
            }}>
              <label className="rotulo">Resultado Nº 1 (90 dias)</label>
              <input type="text" name="resultado" defaultValue={f?.resultado ?? ""} />
              <label className="rotulo">Resumo para o Início (uma linha)</label>
              <input type="text" name="curto" maxLength={90} defaultValue={f?.curto ?? ""} />
              <label className="rotulo">Indicador (início · hoje · meta)</label>
              <input type="text" name="indicador" defaultValue={f?.indicador ?? ""} placeholder="Ex.: R$ 80 mil · R$ 95 mil · R$ 120 mil" />
              <label className="rotulo">Os 4 fundamentos que esta loja está trabalhando</label>
              <div className="grade g2" style={{ gap: "2px 16px" }}>
                {FUNDAMENTOS.map((x) => (
                  <label key={x} className="linha" style={{ gap: 8 }}><input type="checkbox" name={`t:${x}`} defaultChecked={f?.trabalhando?.includes(x)} /> {x}</label>
                ))}
              </div>
              {aviso.loja === loja && aviso.ok && <div className="aviso ok mt">{aviso.ok}</div>}
              {aviso.loja === loja && aviso.erro && <div className="aviso mt">{aviso.erro}</div>}
              <button className="btn p mt" type="submit">Salvar o contrato da {loja}</button>
            </form>
          </details>
        );
      })}
    </div>
  );
}
