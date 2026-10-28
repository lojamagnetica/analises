"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { TextosSecoes } from "@/components/TextosSecoes";
import { FIDELIZACAO_PADRAO } from "@/lib/varejo";

/** Programa de fidelização: os níveis, os benefícios, o aniversário e como acompanhar. */
export default function Fidelizacao() {
  return (
    <>
      <Titulo titulo="Programa de fidelização" sub="As regras do programa de clientes da loja: como entra, os níveis, os benefícios de cada um, o aniversário e como acompanhar. O time inteiro explica do mesmo jeito." />
      <div className="card mb linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
        <span className="mudo">As clientes, os tipos e o resgate das sumidas ficam em <b>De cliente a fã</b>.</span>
        <span className="linha" style={{ gap: 8 }}><Link className="btn s peq" href="/clientes">Minhas clientes</Link><Link className="btn s peq" href="/clientes/resgate">Resgate</Link></span>
      </div>
      <TextosSecoes chave="fidelizacao" padrao={FIDELIZACAO_PADRAO} />
    </>
  );
}
