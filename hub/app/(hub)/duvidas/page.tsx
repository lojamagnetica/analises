"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Carregando } from "@/lib/hub";

// As dúvidas agora chegam pelo Fale com a Camilla.
export default function Duvidas() {
  const router = useRouter();
  useEffect(() => { router.replace("/assistente"); }, [router]);
  return <Carregando />;
}
