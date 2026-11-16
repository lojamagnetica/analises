"use client";

// O app do celular do Fale com a Camilla: a conversa da loja em tela cheia, fora do portal.
import { useEffect } from "react";
import { FaleComACamilla } from "@/components/FaleComACamilla";
import { HubProvider, useHub } from "@/lib/hub";
import { BASE } from "@/lib/config";

function Dentro() {
  const hub = useHub();
  // Já entrou: o aviso de "voltar para o Fale com a Camilla" cumpriu o papel.
  try { localStorage.removeItem("lm_depois_login"); } catch { /* sem armazenamento */ }
  if (!hub.portal) {
    return (
      <div className="card mudo" style={{ margin: 16 }}>
        Este app é das lojas: abre a conversa da loja com a Camilla.
        <div className="mt"><a className="btn s peq" href={`${BASE}/inicio/`}>Ir para o Hub</a></div>
      </div>
    );
  }
  return <FaleComACamilla cheia />;
}

export default function Fale() {
  // Se o login for preciso (app recém-instalado), volta para a conversa depois de entrar, e não para o Início.
  useEffect(() => { try { localStorage.setItem("lm_depois_login", "/fale/"); } catch { /* sem armazenamento */ } }, []);
  return (
    <HubProvider>
      <Dentro />
    </HubProvider>
  );
}
