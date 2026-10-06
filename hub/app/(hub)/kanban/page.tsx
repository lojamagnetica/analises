import { Titulo } from "@/components/Titulo";
import { contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { Quadro } from "./Quadro";

export const metadata = { title: "Kanban de conteúdo" };

export default async function Kanban() {
  const { portal } = await contextoPortal();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("kanban_cards").select("id, titulo, coluna").eq("portal_id", portal.id).order("created_at");
  return (
    <>
      <Titulo titulo="Kanban de conteúdo" sub="Da ideia ao post publicado. Use as setas para mover os cards." />
      <Quadro cards={data ?? []} />
    </>
  );
}
