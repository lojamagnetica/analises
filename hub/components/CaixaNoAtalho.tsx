"use client";

import { useEffect } from "react";
import { buscarCaixa, mesDeHoje } from "@/lib/caixa";
import { hoje } from "@/lib/formato";
import { useDados, useLojaFoco, usePortal } from "@/lib/hub";

/** Dentro do atalho "Fechar o caixa" (Início): verde quando o caixa de hoje já foi enviado, vermelho quando ainda não. */
export function CaixaNoAtalho() {
  const { portal } = usePortal();
  const [lojaFoco] = useLojaFoco();
  const loja = (portal.lojas?.length ?? 0) > 1 ? lojaFoco : null;
  const { dados, recarregar } = useDados(() => buscarCaixa(portal.id, mesDeHoje()), [portal.id]);
  useEffect(() => { const t = setInterval(recarregar, 60000); return () => clearInterval(t); }, [recarregar]);
  if (!dados) return null;
  const enviado = dados.some((c) => c.dia === hoje() && (!loja || c.loja === loja));
  return enviado
    ? <small className="caixa-ok" style={{ color: "var(--feito)", fontWeight: 800, fontSize: 11.5 }}>✓ Caixa de hoje enviado</small>
    : <small className="caixa-falta" style={{ color: "var(--red)", fontWeight: 800, fontSize: 11.5 }}>Caixa de hoje não enviado</small>;
}
