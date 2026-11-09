"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampoEtapa } from "@/components/CampoEtapa";
import { Titulo } from "@/components/Titulo";
import { emDemonstracao, usePortal } from "@/lib/hub";
import { ROTINA_BLOCOS, ROTINA_GESTAO } from "@/lib/conteudo";
import { salvarEtapa } from "@/lib/acoes";

// O formulário da rotina de gestão: o que a loja já faz hoje e quando. Com ele a Camilla monta o Planner de gestão.
const BLOCOS = ROTINA_BLOCOS;

export default function RotinaDeGestao() {
  const { portal, pers, recarregar } = usePortal();
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const r = pers.get(ROTINA_GESTAO.numero)?.respostas ?? {};
  const demo = emDemonstracao();

  return (
    <>
      <Titulo voltar={{ href: "/consultoria/planner", rotulo: "Planner de gestão" }} titulo="Sua rotina de gestão" sub={ROTINA_GESTAO.descricao} />
      <form
        style={{ maxWidth: 760 }}
        action={async (form) => {
          if (demo) { setErro("Aqui é só uma demonstração: no seu Hub, este botão salva a sua rotina."); return; }
          setErro(""); setSalvando(true);
          try {
            await salvarEtapa(portal.id, ROTINA_GESTAO.numero, form);
            await recarregar();
            router.push("/consultoria/planner?rotina=1");
          } catch (e) { setErro((e as Error).message); setSalvando(false); }
        }}
      >
        {BLOCOS.map((b) => (
          <div key={b.titulo} className="card mb">
            <h2 style={{ marginTop: 0 }}>{b.titulo}</h2>
            <p className="ajuda" style={{ marginTop: -4 }}>{b.sub}</p>
            {ROTINA_GESTAO.campos.filter(b.de).map((c) => <CampoEtapa key={c.id} c={c} r={r} padrao="" />)}
          </div>
        ))}
        {erro && <div className="aviso mb">{erro}</div>}
        <button className="btn p" type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Enviar a minha rotina"}</button>
      </form>
    </>
  );
}
