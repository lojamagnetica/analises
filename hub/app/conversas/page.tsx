"use client";

// O app do celular das Conversas da equipe: chat em tela cheia, só para a Camilla e a CS.
import { useEffect } from "react";
import { ConversaAberta } from "@/components/ConversaAberta";
import { Carregando, HubProvider, useHub } from "@/lib/hub";

function Dentro() {
  const hub = useHub();
  if (!hub.conversas) return <div className="card mudo" style={{ margin: 16 }}>Este app é só da Camilla e da CS.</div>;
  // Já entrou: o aviso de "voltar para as Conversas" cumpriu o papel.
  try { localStorage.removeItem("lm_depois_login"); } catch { /* sem armazenamento */ }
  return <ConversaAberta cheia />;
}

export default function Conversas() {
  // Se o login for preciso (app recém-instalado), volta para as Conversas depois de entrar, e não para o Hub.
  useEffect(() => { try { localStorage.setItem("lm_depois_login", "/conversas/"); } catch { /* sem armazenamento */ } }, []);
  return (
    <HubProvider>
      <Dentro />
    </HubProvider>
  );
}
