"use client";

// Atalho do menu: liga o "Ver como a Claudia" e leva para o Faça agora dela.
import { useEffect } from "react";
import { Carregando, useEquipe } from "@/lib/hub";

export default function VerComoCs() {
  const { podeVerComoCs, comoCs, verComoCs } = useEquipe();
  useEffect(() => { if (podeVerComoCs && !comoCs) verComoCs(true); }, [podeVerComoCs, comoCs]);
  if (!podeVerComoCs && !comoCs) return <div className="card">Só a Camilla pode ver o Hub como a CS.</div>;
  return <Carregando />;
}
