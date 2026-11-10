"use client";

import { useEffect } from "react";
import { useDados, useLojaFoco, usePortal } from "@/lib/hub";
import { buscarContagemVez } from "@/lib/vez";
import type { ContaVez } from "@/lib/vez-calculo";

const texto = (c: ContaVez) => (c.total ? `${c.total} · ${c.vendeu}✓ ${c.naoVendeu}✗` : "—");

/** Dentro do atalho da Lista da vez (Início): por vendedora, os atendimentos de hoje e do mês, e quantos viraram venda ou não. */
export function VezNoAtalho() {
  const { portal } = usePortal();
  const [lojaFoco] = useLojaFoco();
  const loja = (portal.lojas?.length ?? 0) > 1 ? lojaFoco : null; // com as lojas juntas, todas
  const { dados, recarregar } = useDados(() => buscarContagemVez(portal.id, loja), [portal.id, loja]);
  useEffect(() => { const t = setInterval(recarregar, 30000); return () => clearInterval(t); }, [recarregar]);
  if (!dados) return null;
  const { linhas } = dados;
  if (!linhas.length) return null;
  if (linhas.every((l) => !l.mes.total)) return <small className="mudo" style={{ fontWeight: 500, lineHeight: 1.3 }}>Ainda sem atendimentos registrados.</small>;
  return (
    <>
    <table style={{ width: "100%", fontSize: 11.5, fontWeight: 500, borderCollapse: "collapse", textAlign: "left" }}>
      <thead><tr className="mudo"><th style={{ fontWeight: 600 }} /><th style={{ fontWeight: 600 }}>Hoje</th><th style={{ fontWeight: 600 }}>No mês</th></tr></thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.pessoa_id} style={{ borderTop: "1px solid var(--line)" }}>
            <td style={{ padding: "3px 4px 3px 0", fontWeight: 700 }}>{l.nome}</td>
            <td style={{ padding: "3px 4px" }}>{texto(l.hoje)}</td>
            <td style={{ padding: "3px 0 3px 4px" }}>{texto(l.mes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <small className="mudo" style={{ fontWeight: 500, fontSize: 10.5 }}>atendimentos · ✓ vendeu · ✗ não vendeu</small>
    </>
  );
}
