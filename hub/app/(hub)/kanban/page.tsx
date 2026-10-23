"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Carregando } from "@/lib/hub";

/** O Kanban de conteúdo virou a Programação da semana (com as mesmas etapas, da ideia ao publicado). */
export default function Kanban() {
  const router = useRouter();
  useEffect(() => { router.replace("/conteudo/semana"); }, [router]);
  return <Carregando />;
}
