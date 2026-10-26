"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AnaliseDaGestao } from "@/components/AnaliseGestao";
import { GuiaCompras } from "@/components/GuiaCompras";
import { Titulo } from "@/components/Titulo";
import { Carregando } from "@/lib/hub";
import type { Area } from "@/lib/gestao";

// O Diagnóstico de estoque junta, numa página só, a foto do estoque, as linhas, os fornecedores e o Guia de compras (OTB).
const PARTES: { id: Area; rotulo: string; titulo: string; oque: string }[] = [
  { id: "estoque", rotulo: "A foto do estoque", titulo: "A foto do estoque", oque: "Quanto você tem, quanto está parado e o que fazer com cada parte: o que repor, o que girar, o que liquidar e o que não comprar de novo (curva ABC, idade das peças e meses de estoque)." },
  { id: "linhas", rotulo: "Linhas", titulo: "Linhas", oque: "Cada linha da loja (vestidos, alfaiataria, jeans…) com quanto vende e quanto tem parado: onde o estoque está pesado e onde falta peça boa." },
  { id: "fornecedores", rotulo: "Fornecedores", titulo: "Fornecedores", oque: "Quanto você compra de cada fornecedor e quanto cada um vende de volta: de quem comprar mais, de quem comprar menos e a dependência de uma marca só." },
  { id: "compras", rotulo: "Guia de compras (OTB)", titulo: "Guia de compras", oque: "Quando a equipe revisar o seu plano de compra, a orientação dela aparece aqui." },
];

function Pagina() {
  const params = useSearchParams();
  const router = useRouter();
  const parte = PARTES.find((p) => p.id === params.get("parte")) ?? PARTES[0];
  return (
    <>
      <Titulo titulo="Diagnóstico de estoque" sub="A foto do estoque, as linhas, os fornecedores e quanto você pode comprar em cada um dos próximos 6 meses." />
      <div className="chips mb" role="tablist">
        {PARTES.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={p.id === parte.id} className={`chip ${p.id === parte.id ? "escolhido" : ""}`}
            onClick={() => router.replace(p.id === "estoque" ? "/estoque" : `/estoque?parte=${p.id}`, { scroll: false })}>{p.rotulo}</button>
        ))}
      </div>
      {parte.id === "compras" ? (
        <>
          <GuiaCompras />
          <div className="secao" style={{ marginTop: 28 }}>A orientação da equipe</div>
          <AnaliseDaGestao key="compras" area="compras" titulo={parte.titulo} sub="" oque={parte.oque} embutida />
        </>
      ) : (
        <AnaliseDaGestao key={parte.id} area={parte.id} titulo={parte.titulo} sub="" oque={parte.oque} embutida />
      )}
    </>
  );
}

export default function DiagnosticoDeEstoque() {
  return <Suspense fallback={<Carregando />}><Pagina /></Suspense>;
}
