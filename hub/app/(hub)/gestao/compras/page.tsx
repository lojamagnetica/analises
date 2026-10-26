"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Carregando } from "@/lib/hub";

// Esta parte agora fica dentro do Diagnóstico de estoque.
export default function Antiga() {
  const router = useRouter();
  useEffect(() => { router.replace("/estoque?parte=compras"); }, [router]);
  return <Carregando />;
}
