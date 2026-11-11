"use client";

// Reuniões para revisar: o que o agente tirou das gravações do Tactiq. A Camilla revisa, edita e aprova; nada vai para a loja antes.
import { useEffect, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataCurta } from "@/lib/formato";
import { aprovarGravada, buscarGravadas, descartarGravada, salvarGravada, type CombinadoRascunho, type Gravada } from "@/lib/gravadas";

type Loja = { id: string; loja: string };
const QUEM = [["loja", "A loja"], ["claudia", "A Claudia"], ["camilla", "A Camilla"]] as const;

function Cartao({ g0, lojas, csId, recarregar, aoResultado }: { g0: Gravada; lojas: Loja[]; csId: string | null; recarregar: () => void; aoResultado: (m: string) => void }) {
  const { aprova, nome } = useEquipe();
  const [g, setG] = useState<Gravada>(g0);
  const [liberar, setLiberar] = useState(false);
  const [msg, setMsg] = useState("");
  const [aberto, setAberto] = useState(g0.status !== "aprovada" && g0.status !== "descartada");
  const decidida = g.status === "aprovada" || g.status === "descartada";
  const por = nome.split(" ")[0];
  const mudarComb = (i: number, p: Partial<CombinadoRascunho>) => setG({ ...g, combinados: g.combinados.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const tenta = async (fn: () => Promise<string | void>) => { setMsg(""); try { const r = await fn(); if (r) { setMsg(r); aoResultado(`${g.titulo ?? "Reunião"}: ${r}`); } recarregar(); } catch (e) { setMsg((e as Error).message); } };
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: g.status === "aprovada" ? "var(--feito)" : g.status === "descartada" ? "var(--muted)" : g.status === "sem_loja" ? "var(--orange)" : "var(--red)" }}>
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap", cursor: "pointer" }} onClick={() => setAberto(!aberto)}>
        <span><b>{g.titulo ?? "Reunião"}</b> <span className="mudo">· {g.data ? dataCurta(g.data) : ""}{g.duracao_min ? ` · ${g.duracao_min} min` : ""}</span></span>
        <span className={`selo ${g.status === "aprovada" ? "feito" : g.status === "descartada" ? "espera" : "alerta"}`}>{g.status === "sem_loja" ? "interna ou escolher a loja" : g.status === "rascunho" ? "para revisar" : g.status}</span>
      </div>
      {aberto && (
        <>
          <div className="linha mt" style={{ gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div><label className="rotulo">Loja</label>
              <select value={g.portal_id ?? ""} disabled={decidida} onChange={(e) => setG({ ...g, portal_id: e.target.value || null })}>
                <option value="">Sem loja (reunião interna)</option>{lojas.map((l) => <option key={l.id} value={l.id}>{l.loja}</option>)}
              </select></div>
            {g.tactiq_url && <a className="btn s peq" href={g.tactiq_url} target="_blank" rel="noopener">Abrir no Tactiq</a>}
          </div>
          <label className="rotulo">Resumo para a loja (ela só lê se você liberar)</label>
          <textarea rows={8} value={g.resumo_loja ?? ""} disabled={decidida} onChange={(e) => setG({ ...g, resumo_loja: e.target.value })} />
          <label className="rotulo">Só para a equipe</label>
          <textarea rows={3} value={g.interno ?? ""} disabled={decidida} onChange={(e) => setG({ ...g, interno: e.target.value })} />

          <label className="rotulo">Combinados (saem da loja, com as palavras dela)</label>
          {g.combinados.map((c, i) => (
            <div key={i} className="grade g3" style={{ gap: 8, alignItems: "end", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ gridColumn: "span 3" }}><input type="text" value={c.texto} disabled={decidida} onChange={(e) => mudarComb(i, { texto: e.target.value })} /></div>
              <div><label className="rotulo">Prazo</label><input type="date" value={c.prazo ?? ""} disabled={decidida} onChange={(e) => mudarComb(i, { prazo: e.target.value || null })} /></div>
              <div><label className="rotulo">Quem faz</label><select value={c.quem} disabled={decidida} onChange={(e) => mudarComb(i, { quem: e.target.value as CombinadoRascunho["quem"] })}>{QUEM.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
              {!decidida && <div><button type="button" className="btn s peq" onClick={() => setG({ ...g, combinados: g.combinados.filter((_, j) => j !== i) })}>Tirar</button></div>}
            </div>
          ))}
          {!decidida && <button type="button" className="btn s peq mt" onClick={() => setG({ ...g, combinados: [...g.combinados, { texto: "", quem: "loja", prazo: null }] })}>+ Combinado</button>}

          <label className="rotulo">Para a Claudia acompanhar (vira lembrete dela)</label>
          {g.para_claudia.map((c, i) => (
            <div key={i} className="linha" style={{ gap: 8, padding: "4px 0", flexWrap: "wrap" }}>
              <input type="text" value={c.texto} disabled={decidida} style={{ flex: "1 1 300px" }} onChange={(e) => setG({ ...g, para_claudia: g.para_claudia.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
              <input type="date" value={c.prazo ?? ""} disabled={decidida} onChange={(e) => setG({ ...g, para_claudia: g.para_claudia.map((x, j) => (j === i ? { ...x, prazo: e.target.value || null } : x)) })} />
              {!decidida && <button type="button" className="btn s peq" onClick={() => setG({ ...g, para_claudia: g.para_claudia.filter((_, j) => j !== i) })}>Tirar</button>}
            </div>
          ))}
          {!decidida && <button type="button" className="btn s peq mt" onClick={() => setG({ ...g, para_claudia: [...g.para_claudia, { texto: "", prazo: null }] })}>+ Para a Claudia</button>}

          {msg && <div className="aviso mt">{msg}</div>}
          {!decidida && (
            <div className="linha mt" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="btn s" onClick={() => tenta(async () => { await salvarGravada(g); return "Edição salva."; })}>Salvar edição</button>
              {aprova && (
                <>
                  <label className="marcar"><input type="checkbox" checked={liberar} onChange={(e) => setLiberar(e.target.checked)} /><span>Liberar o resumo para a loja</span></label>
                  <button type="button" className="btn p" onClick={() => tenta(async () => {
                    if (!confirm("Aprovar? Os combinados entram na loja e os lembretes vão para a Claudia.")) return;
                    await salvarGravada(g);
                    const feitos = await aprovarGravada(g, { por, liberarResumo: liberar, csId });
                    return `Aprovado: ${feitos.join(", ") || "nada a enviar"}.`;
                  })}>Aprovar</button>
                </>
              )}
              <button type="button" className="btn s" onClick={() => tenta(async () => { if (confirm("Descartar esta reunião?")) await descartarGravada(g.id, por); })}>Descartar</button>
              {!aprova && <small className="mudo">Quem aprova é a Camilla.</small>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReunioesParaRevisar() {
  useEffect(() => { document.title = "Reuniões para revisar · magnética.hub"; }, []);
  const { dados, recarregar } = useDados(async () => {
    const [g, { data: l }, { data: cs }] = await Promise.all([
      buscarGravadas(),
      supabaseBrowser().from("portais").select("id, loja").eq("ativo", true).order("loja"),
      supabaseBrowser().from("perfis").select("id").eq("conversas_equipe", true).eq("aprova", false).limit(1),
    ]);
    return { g, lojas: (l ?? []) as Loja[], csId: ((cs ?? [])[0] as { id: string } | undefined)?.id ?? null };
  }, []);
  const [resultado, setResultado] = useState("");
  if (!dados) return <Carregando />;
  const abertas = dados.g.filter((x) => x.status === "rascunho" || x.status === "sem_loja");
  const decididas = dados.g.filter((x) => x.status === "aprovada" || x.status === "descartada");
  return (
    <>
      <Titulo titulo="Reuniões para revisar" sub="O agente lê as gravações do Tactiq e deixa aqui o resumo, os combinados e o que a Claudia acompanha. Você revisa, edita e aprova: nada vai para a loja antes." />
      {resultado && <div className="aviso ok mb">{resultado}</div>}
      {abertas.length === 0 && <div className="card mudo">Nenhuma reunião esperando revisão. 🎉</div>}
      {abertas.map((g) => <Cartao key={g.id + g.status} g0={g} lojas={dados.lojas} csId={dados.csId} recarregar={recarregar} aoResultado={setResultado} />)}
      {decididas.length > 0 && (
        <>
          <div className="secao">Já decididas</div>
          {decididas.map((g) => <Cartao key={g.id + g.status} g0={g} lojas={dados.lojas} csId={dados.csId} recarregar={recarregar} aoResultado={setResultado} />)}
        </>
      )}
    </>
  );
}
