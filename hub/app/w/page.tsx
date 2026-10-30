"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { supabaseBrowser } from "@/lib/supabase/client";

// O link do webinar que o parceiro posta: conta o clique de quem veio por ele e leva para a inscrição.
function Ir() {
  const apelido = (useSearchParams().get("p") ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const [erro, setErro] = useState(false);
  useEffect(() => {
    document.title = "Inscrição · Loja Magnética";
    supabaseBrowser().rpc("webinar_clique", { p_apelido: apelido }).then(({ data }) => {
      if (typeof data === "string" && /^https:\/\//.test(data)) window.location.replace(data); else setErro(true);
    });
  }, [apelido]);
  return erro
    ? <div className="card">A inscrição ainda não está aberta. Tente de novo mais tarde.</div>
    : <div className="carregando">Abrindo a inscrição…</div>;
}

export default function PaginaWebinar() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
      <div className="linha" style={{ gap: 10, marginBottom: 16 }}><Simbolo tamanho={28} /><b>Loja Magnética</b></div>
      <Suspense fallback={<div className="carregando">Abrindo a inscrição…</div>}><Ir /></Suspense>
    </main>
  );
}
