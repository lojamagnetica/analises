"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { CampoEtapa } from "@/components/CampoEtapa";
import { ROTINA_BLOCOS, ROTINA_GESTAO, type Respostas } from "@/lib/conteudo";
import { supabaseBrowser } from "@/lib/supabase/client";

// O formulário da rotina de gestão pelo link da loja, sem login. As respostas montam o Planner de gestão.
type Aberto = { loja: string; responsavel: string | null; sem_equipe: boolean; respostas: Respostas };

function Formulario() {
  const t = useSearchParams().get("t") ?? "";
  const [a, setA] = useState<Aberto | null | undefined>(undefined);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    document.title = "Sua rotina de gestão · magnética.hub";
    if (!/^[0-9a-f-]{36}$/.test(t)) { setA(null); return; }
    supabaseBrowser().rpc("rotina_abrir", { p_token: t }).then(({ data }) => setA(((data ?? []) as Aberto[])[0] ?? null));
  }, [t]);

  if (a === undefined) return <div className="carregando">Carregando…</div>;
  if (a === null) return <div className="card" style={{ maxWidth: 560, margin: "40px auto" }}>Este link não abriu. Peça o link da sua loja para a Claudia.</div>;
  const primeiro = (a.responsavel ?? "").split(/[ ,]/)[0];
  if (pronto) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
        <h2>Recebido! 🎉</h2>
        <p>Obrigada{primeiro ? `, ${primeiro}` : ""}. Com as suas respostas a Camilla monta o Planner de gestão da {a.loja}.</p>
      </div>
    );
  }
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div className="linha" style={{ gap: 10, marginBottom: 12 }}><Simbolo /><b>magnética.hub</b></div>
      <h1 style={{ marginBottom: 6 }}>Sua rotina de gestão · {a.loja}</h1>
      <p className="mudo" style={{ marginTop: 0 }}>{ROTINA_GESTAO.descricao} Quanto mais detalhe, melhor o planner da sua loja.</p>
      <form action={async (form) => {
        setErro(""); setSalvando(true);
        const r: Respostas = {};
        for (const c of ROTINA_GESTAO.campos) r[c.id] = String(form.get(c.id) ?? "").trim().slice(0, 3000);
        const { error } = await supabaseBrowser().rpc("rotina_salvar", { p_token: t, p_respostas: r });
        if (error) { setErro(error.message); setSalvando(false); return; }
        setPronto(true); window.scrollTo(0, 0);
      }}>
        {ROTINA_BLOCOS.map((b) => (
          <div key={b.titulo} className="card mb">
            <h2 style={{ marginTop: 0 }}>{b.titulo}</h2>
            <p className="ajuda" style={{ marginTop: -4 }}>{b.sub}</p>
            {ROTINA_GESTAO.campos.filter(b.de).map((c) => <CampoEtapa key={c.id} c={c} r={a.respostas} padrao="" />)}
          </div>
        ))}
        {erro && <div className="aviso mb">{erro}</div>}
        <button className="btn p" type="submit" disabled={salvando}>{salvando ? "Enviando…" : "Enviar a minha rotina"}</button>
      </form>
    </main>
  );
}

export default function Pagina() {
  return <Suspense fallback={<div className="carregando">Carregando…</div>}><Formulario /></Suspense>;
}
