"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Carregando, useHub } from "@/lib/hub";

export default function Raiz() {
  const hub = useHub();
  const router = useRouter();
  useEffect(() => {
    router.replace(hub.equipe && !hub.portal ? "/equipe" : hub.portal ? "/inicio" : "/sem-portal");
  }, [hub, router]);
  return <Carregando />;
}
