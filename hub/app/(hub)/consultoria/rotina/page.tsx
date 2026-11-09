"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Carregando } from "@/lib/hub";

/** A Rotina da gestão agora fica dentro do Planner de gestão, no topo. Links antigos vêm para cá e seguem para lá. */
export default function RotinaNoPlanner() {
  const router = useRouter();
  useEffect(() => { router.replace("/consultoria/planner"); }, [router]);
  return <Carregando />;
}
