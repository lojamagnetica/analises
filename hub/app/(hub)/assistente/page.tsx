import { Titulo } from "@/components/Titulo";
import { contextoPortal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { Chat } from "./Chat";

export const metadata = { title: "Assistente Magnética" };

export default async function Assistente({ searchParams }: { searchParams: Promise<{ pedir?: string }> }) {
  const { pedir } = await searchParams;
  const { portal, nome } = await contextoPortal();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("chat_mensagens").select("id, papel, conteudo").eq("portal_id", portal.id).order("created_at").limit(200);
  return (
    <>
      <Titulo titulo="✨ Assistente Magnética" sub={`Conhece o método Loja Magnética e os dados da ${portal.loja}: Personalização, Plano de Ação, reuniões e planejamento.`} />
      <Chat
        nome={nome.split(" ")[0]}
        inicial={(data ?? []).map((m) => ({ id: m.id, papel: m.papel as "user" | "assistant", conteudo: m.conteudo }))}
        pedir={pedir ?? ""}
      />
    </>
  );
}
