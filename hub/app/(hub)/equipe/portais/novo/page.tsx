"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CamposPortal } from "@/components/CamposPortal";
import { Titulo } from "@/components/Titulo";
import { CHAVE_RESULTADO, useEquipe } from "@/lib/hub";
import { criarPortal } from "@/lib/acoes";


export default function NovoPortal() {
  useEquipe();
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [criando, setCriando] = useState(false);
  return (
    <>
      <Titulo voltar={{ href: "/equipe", rotulo: "Painel" }} titulo="Novo portal" sub="Cria o PORTAL DA MENTORIA com os 7 passos, o Plano de Ação do modelo, PLANEJE AQUI e Reuniões." />
      <form
        className="card"
        style={{ maxWidth: 760 }}
        action={async (f) => {
          setCriando(true);
          setErro("");
          try {
            const r = await criarPortal(f);
            try { sessionStorage.setItem(CHAVE_RESULTADO, JSON.stringify({ criado: true, link: r.link, aviso: r.aviso })); } catch { /* sem armazenamento */ }
            router.push(`/equipe/portal?id=${r.id}`);
          } catch (e) {
            setErro((e as Error).message);
            setCriando(false);
          }
        }}
      >
        <CamposPortal />
        <p className="ajuda mt">Com o e-mail preenchido, o Hub cria o acesso da mentorada e te dá um link para mandar pelo WhatsApp.</p>
        {erro && <div className="aviso mt">{erro}</div>}
        <div className="linha mt"><button className="btn p" type="submit" disabled={criando}>{criando ? "Criando…" : "Criar portal"}</button></div>
      </form>
    </>
  );
}
