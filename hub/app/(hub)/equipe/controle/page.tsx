"use client";

// O Controle de clientes virou o Meu dia: quem abre o endereço antigo vai direto para lá.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Carregando } from "@/lib/hub";

export default function Controle() {
  const router = useRouter();
  useEffect(() => { router.replace("/empresa/cs"); }, [router]);
  return <Carregando />;
}
