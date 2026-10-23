"use client";

import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Quadro } from "./Quadro";

export default function Kanban() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(
    async () => (await supabaseBrowser().from("kanban_cards").select("id, titulo, coluna").eq("portal_id", portal.id).order("created_at")).data ?? [],
    [portal.id],
  );
  if (!dados) return <Carregando />;
  return (
    <>
      <Titulo titulo="Kanban de conteúdo" sub="Da ideia ao post publicado. Use as setas para mover os cards." />
      <Quadro portalId={portal.id} cards={dados} aoMudar={recarregar} />
    </>
  );
}
