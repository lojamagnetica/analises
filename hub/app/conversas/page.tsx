"use client";

// O app do celular das Conversas da equipe: chat em tela cheia, só para a Camilla e a CS.
import { ConversaAberta } from "@/components/ConversaAberta";
import { Carregando, HubProvider, useHub } from "@/lib/hub";

function Dentro() {
  const hub = useHub();
  if (!hub.conversas) return <div className="card mudo" style={{ margin: 16 }}>Este app é só da Camilla e da CS.</div>;
  return <ConversaAberta cheia />;
}

export default function Conversas() {
  return (
    <HubProvider>
      <Dentro />
    </HubProvider>
  );
}
