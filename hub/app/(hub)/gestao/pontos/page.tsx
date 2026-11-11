"use client";

// Gamificação vigente: as regras dos pontos e o saldo de cada pessoa, com a entrega do voucher.
import { PontosGestao } from "@/components/PontosGestao";
import { Titulo } from "@/components/Titulo";
import { useEffect } from "react";

export default function Gamificacao() {
  useEffect(() => { document.title = "Gamificação · magnética.hub"; }, []);
  return (
    <>
      <Titulo titulo="Gamificação do time" sub="Pontos, estrelas e vouchers de quem usa a Lista da vez e cumpre as missões em dia. Vale para todo o time." />
      <PontosGestao />
    </>
  );
}
