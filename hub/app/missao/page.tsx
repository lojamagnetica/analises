"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Simbolo } from "@/components/Simbolo";
import { Copiar } from "@/components/Copiar";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FOCOS } from "@/lib/missoes";

type Aberta = { pessoa: string; loja: string; semana: string; foco: string; criterio: string; mensagem: string; meta: number; obs: string; enviadas: number; respostas: number; vendas: number };
type Campo = "enviadas" | "respostas" | "vendas";

// A missão da semana que cada pessoa do time abre no celular, sem entrar no Hub:
// puxa as clientes no sistema, manda a mensagem do modelo (com o nome dela) e conta o que fez.
function Missao() {
  const token = useSearchParams().get("t") ?? "";
  const [m, setM] = useState<Aberta | null | undefined>(undefined);
  useEffect(() => {
    document.title = "Missão da semana · magnética.hub";
    if (!/^[0-9a-f-]{36}$/.test(token)) { setM(null); return; }
    supabaseBrowser().rpc("missao_abrir", { p_token: token }).then(({ data }) => setM((data as Aberta | null) ?? null));
  }, [token]);
  if (m === undefined) return <div className="carregando">Carregando…</div>;
  if (!m) return <div className="card">Este link de missão não vale mais. Peça o da semana para a sua gestora.</div>;
  // Uma ou mais mensagens (separadas por "---"); com mais de uma, a primeira linha de cada é o momento de mandar.
  const blocos = m.mensagem.split("\n---\n").map((b) => b.replace(/\{consultora\}/g, m.pessoa).replace(/\{loja\}/g, m.loja).replace(/\{nome\}/g, "[nome da cliente]"));
  const varias = blocos.length > 1;
  const contar = async (campo: Campo, delta: number) => {
    setM({ ...m, [campo]: Math.max(0, m[campo] + delta) });
    const { data } = await supabaseBrowser().rpc("missao_contar", { p_token: token, p_campo: campo, p_delta: delta });
    if (data) setM((x) => (x ? { ...x, ...(data as Pick<Aberta, Campo>) } : x));
  };
  const Contador = ({ campo, rotulo, grande }: { campo: Campo; rotulo: string; grande?: boolean }) => (
    <div style={{ textAlign: "center", flex: 1 }}>
      <small className="mudo">{rotulo}</small>
      <div style={{ fontSize: grande ? 40 : 28, fontWeight: 800 }}>{m[campo]}{grande && <span className="mudo" style={{ fontSize: 18 }}> de {m.meta}</span>}</div>
      <div className="linha" style={{ gap: 6, justifyContent: "center" }}>
        <button type="button" className="btn s peq" disabled={!m[campo]} onClick={() => contar(campo, -1)}>−1</button>
        <button type="button" className="btn p peq" onClick={() => contar(campo, 1)}>+1</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="card mb">
        <small className="mudo">Missão da semana · {m.loja}</small>
        <h2 style={{ margin: "2px 0 4px" }}>{m.pessoa}: {FOCOS.find((f) => f.id === m.foco)?.nome ?? m.foco}</h2>
        <p style={{ margin: 0 }}>Meta: <b>{m.meta} mensagens</b> até sábado.{m.obs ? ` ${m.obs}` : ""}</p>
      </div>
      <div className="card mb"><b>1. Puxe as clientes</b><p style={{ margin: "4px 0 0" }}>{m.criterio}</p></div>
      <div className="card mb">
        <b>2. Mande {varias ? "as mensagens do modelo" : "a mensagem do modelo"}</b>
        {blocos.map((b, i) => {
          const [titulo, ...resto] = varias ? b.split("\n") : ["", b];
          const corpo = varias ? resto.join("\n") : b;
          return (
            <div key={i} style={{ marginTop: 8, paddingTop: i ? 8 : 0, borderTop: i ? "1px solid var(--line)" : undefined }}>
              {varias && <small><b>{titulo}</b></small>}
              <p style={{ margin: "4px 0 8px", whiteSpace: "pre-wrap" }}>{corpo}</p>
              <Copiar texto={corpo} rotulo="Copiar" />
            </div>
          );
        })}
        <p className="ajuda" style={{ marginBottom: 0 }}>Troque o [nome da cliente] em cada envio. O time todo usa o mesmo modelo.</p>
      </div>
      <div className="card mb">
        <b>3. Marque o que aconteceu</b>
        <div className="barra mt"><i style={{ width: `${m.meta ? Math.min(100, Math.round((m.enviadas / m.meta) * 100)) : 0}%` }} /></div>
        <div className="linha mt" style={{ gap: 10, alignItems: "flex-end" }}>
          <Contador campo="enviadas" rotulo="Mandei" grande />
          <Contador campo="respostas" rotulo="Responderam" />
          <Contador campo="vendas" rotulo="Compraram" />
        </div>
        {m.enviadas >= m.meta && <p style={{ margin: "10px 0 0", textAlign: "center" }}>Meta da semana batida! 🎉</p>}
      </div>
    </>
  );
}

export default function PaginaMissao() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
      <div className="linha" style={{ gap: 10, marginBottom: 16 }}><Simbolo tamanho={28} /><b>magnética.hub</b></div>
      <Suspense fallback={<div className="carregando">Carregando…</div>}><Missao /></Suspense>
    </main>
  );
}
