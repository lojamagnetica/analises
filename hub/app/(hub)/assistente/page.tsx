"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { usePortal } from "@/lib/hub";

export default function Assistente() {
  const { portal } = usePortal();
  return (
    <>
      <Titulo titulo="✨ Assistente Magnética" aba="Assistente" sub={`Vai conhecer o método Loja Magnética e os dados da ${portal.loja}.`} />
      <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)", maxWidth: 720 }}>
        <span className="selo espera">em breve</span>
        <h3 className="mt">O Assistente está sendo ligado</h3>
        <p className="mudo">
          Em breve você vai poder pedir mensagens para clientes, ações para as datas comerciais e contas da sua meta,
          tudo com base na sua Personalização e no seu Plano de Ação. Enquanto isso, use os scripts prontos.
        </p>
        <Link className="btn p" href="/scripts">Abrir os scripts de venda</Link>
      </div>
    </>
  );
}
