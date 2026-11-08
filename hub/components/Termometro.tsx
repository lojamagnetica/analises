"use client";

import { useState } from "react";
import { corTermometro } from "@/lib/carteira";

/** A regra do termômetro (aprovada pela Camilla): quando a loja é Verde, Amarela ou Vermelha. */
export const REGRA_TERMOMETRO: { cor: "Verde" | "Amarelo" | "Vermelho"; quando: string }[] = [
  { cor: "Verde", quando: "Entra no Hub toda semana, cumpre os combinados no prazo, lança o caixa e os números estão subindo ou estáveis." },
  { cor: "Amarelo", quando: "Qualquer um destes: 7 a 14 dias sem entrar no Hub; 1 combinado atrasado; caixa sem lançar há uma semana; some do grupo; reclama de falta de tempo." },
  { cor: "Vermelho", quando: "Qualquer um destes: mais de 14 dias sem entrar no Hub; 2 ou mais combinados atrasados; fala em cancelar, \"não recebi\" ou \"estou perdida\"; atraso no pagamento; resultado caindo 2 meses seguidos." },
];

/** O selo do termômetro com a setinha que abre a regra (a cor atual em destaque). */
export function Termometro({ valor, desde, semSelo }: { valor: string | null | undefined; desde?: string | null; semSelo?: boolean }) {
  const [aberta, setAberta] = useState(false);
  return (
    <span style={{ display: "inline-block" }}>
      {!semSelo && (valor ? <span className={`selo ${corTermometro(valor)}`}>{valor}</span> : <span className="mudo">—</span>)}
      {desde && valor ? <small className="mudo"> desde {desde}</small> : null}
      <button type="button" className="link-loja" aria-expanded={aberta} title="Ver a regra do termômetro"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAberta(!aberta); }}
        style={{ marginLeft: 6, fontSize: 13, textDecoration: "none" }}>{aberta ? "▾" : "▸"}{semSelo ? " regra do termômetro" : ""}</button>
      {aberta && (
        <span className="card" style={{ display: "block", marginTop: 6, padding: "10px 12px", fontSize: 13, maxWidth: 380, whiteSpace: "normal", textAlign: "left" }}>
          {REGRA_TERMOMETRO.map((r) => (
            <span key={r.cor} style={{ display: "block", marginBottom: 6, opacity: valor && valor !== r.cor ? 0.6 : 1, fontWeight: valor === r.cor ? 600 : 400 }}>
              <span className={`selo ${corTermometro(r.cor)}`}>{r.cor}</span> {r.quando}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
