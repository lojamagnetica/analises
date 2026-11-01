"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/bussola", rotulo: "Hoje" },
  { href: "/bussola/rotina", rotulo: "Minha rotina" },
  { href: "/bussola/estoque", rotulo: "Estoque parado" },
  { href: "/bussola/boletos", rotulo: "Boletos" },
];

/** Os quatro cantos da Bússola do gestor. */
export function AbasBussola() {
  const caminho = usePathname().replace(/(.)\/$/, "$1");
  return (
    <div className="chips mb">
      {ABAS.map((a) => <Link key={a.href} href={a.href} className={`chip ${caminho === a.href ? "escolhido" : ""}`}>{a.rotulo}</Link>)}
    </div>
  );
}
