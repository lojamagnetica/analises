"use client";

import { useState } from "react";
import { liberarMetodoClientes } from "@/lib/clientes";

/** Aviso de rascunho de "De cliente a fã" (só a equipe vê), com o botão de liberar para todas as lojas. */
export function RascunhoClientes() {
  const [feito, setFeito] = useState("");
  const [erro, setErro] = useState("");
  if (feito) return <div className="aviso ok mb">{feito}</div>;
  return (
    <div className="aviso mb">
      <b>Rascunho:</b> as lojas ainda não veem as ações por tipo de cliente, o Top 10 campanhas e a experiência do cliente.{" "}
      <button type="button" className="btn p peq" style={{ marginLeft: 8 }} onClick={async () => {
        if (!confirm("Liberar De cliente a fã (ações por tipo, Top 10 campanhas e experiência) para todas as lojas?")) return;
        try { await liberarMetodoClientes(true); setFeito("Liberado: todas as lojas já veem este conteúdo."); } catch (e) { setErro((e as Error).message); }
      }}>Liberar para as lojas</button>
      {erro && <div className="mt">{erro}</div>}
    </div>
  );
}
