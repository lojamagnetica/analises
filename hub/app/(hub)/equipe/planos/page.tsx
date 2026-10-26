"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { PlanoResumo } from "@/components/PlanoResumo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataCurta, dia } from "@/lib/formato";
import { STATUS_PLANO, nomeMes, prazoDoPlano, responderPlano, type LinhaPlano } from "@/lib/plano-mes";

/** Um plano: lê, escreve o retorno e aprova ou pede ajuste. */
function Plano({ p, loja, aoMudar }: { p: LinhaPlano; loja: string; aoMudar: () => void }) {
  const [aberto, setAberto] = useState(p.status === "enviado");
  const [texto, setTexto] = useState(p.retorno ?? "");
  const [erro, setErro] = useState("");
  const st = STATUS_PLANO[p.status];
  const responder = async (s: "ok" | "ajustar") => {
    setErro("");
    if (s === "ajustar" && !texto.trim()) return setErro("Escreva o que ela precisa ajustar.");
    try { await responderPlano(p.portal_id, p.mes, s, texto); aoMudar(); } catch (e) { setErro((e as Error).message); }
  };
  return (
    <div className="card mb card-borda" style={{ ["--c" as string]: p.status === "enviado" ? "var(--red)" : "var(--line)" }}>
      <div className="linha entre">
        <span><b>{loja}</b> · {nomeMes(p.mes)} <span className={`selo ${st.classe}`}>{st.texto}</span></span>
        <span className="linha" style={{ gap: 8 }}>
          <small className="mudo">{p.enviado_em ? `enviado ${dataCurta(p.enviado_em)}` : `prazo ${dia(prazoDoPlano(p.mes))}`}</small>
          <button type="button" className="btn s peq" onClick={() => setAberto(!aberto)}>{aberto ? "Fechar" : "Abrir"}</button>
        </span>
      </div>
      {aberto && (
        <div className="mt">
          <PlanoResumo linha={p} />
          <label className="rotulo mt">Seu retorno para a loja</label>
          <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: Plano ótimo! Só antecipe o esquenta da Black para a semana 2." />
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" onClick={() => responder("ok")}>Está ok ✓</button>
            <button type="button" className="btn s peq" onClick={() => responder("ajustar")}>Pedir ajuste</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Planos() {
  useEquipe();
  const [filtro, setFiltro] = useState<"revisar" | "todos">("revisar");
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: planos }, { data: portais }] = await Promise.all([
      sb.from("loja_plano_mes").select("*").neq("status", "rascunho").order("enviado_em", { ascending: false }),
      sb.from("portais").select("id, loja"),
    ]);
    return { planos: (planos ?? []) as LinhaPlano[], portais: (portais ?? []) as { id: string; loja: string }[] };
  }, []);
  if (!dados) return <Carregando />;
  const loja = (id: string) => dados.portais.find((p) => p.id === id)?.loja ?? "Loja";
  const revisar = dados.planos.filter((p) => p.status === "enviado");
  const lista = filtro === "revisar" ? revisar : dados.planos;

  return (
    <>
      <Titulo titulo="Planos do mês" sub="Os planos que as lojas montaram no PLANEJE AQUI. Leia, escreva o retorno e marque se está ok ou se precisa de ajuste. A loja vê a resposta no plano dela." />
      <div className="chips mb">
        {([["revisar", `Para revisar · ${revisar.length}`], ["todos", `Todos · ${dados.planos.length}`]] as const).map(([k, r]) => (
          <button key={k} type="button" className={`chip ${filtro === k ? "escolhido" : ""}`} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{r}</button>
        ))}
      </div>
      {!lista.length && <div className="card">{filtro === "revisar" ? "Nenhum plano esperando a sua revisão." : "Nenhuma loja mandou plano ainda."}</div>}
      {lista.map((p) => <Plano key={p.portal_id + p.mes + p.status} p={p} loja={loja(p.portal_id)} aoMudar={recarregar} />)}
    </>
  );
}
