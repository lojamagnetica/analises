"use client";

import { useEffect, useState } from "react";
import { AbasBussola } from "@/components/AbasBussola";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { quemVende } from "@/lib/pessoas";
import { DIAS_NOME, FUNCOES, dispoVazia, montarRotina, buscarBussola, salvarBussola, type Bloco, type Dispo, type Funcao } from "@/lib/bussola";

const SECOES = [
  { freq: "diaria", titulo: "Todo dia" },
  { freq: "semanal", titulo: "Toda semana" },
  { freq: "mensal", titulo: "Todo mês" },
] as const;

export default function Rotina() {
  const { portal } = usePortal();
  const { dados } = useDados(async () => {
    const [b, { data: equipe }] = await Promise.all([
      buscarBussola(portal.id),
      supabaseBrowser().from("loja_equipe").select("id, funcao").eq("portal_id", portal.id).eq("ativo", true),
    ]);
    return { b, comTime: quemVende((equipe ?? []) as { id: string; funcao: string | null }[]).length > 0 };
  }, [portal.id]);
  const [d, setD] = useState<Dispo>(dispoVazia());
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => { if (dados) { setD(dados.b.dispo); setBlocos(dados.b.blocos); } }, [dados]);
  if (!dados) return <Carregando />;

  const pref = (f: Funcao, x: Partial<NonNullable<Dispo["prefs"][Funcao]>>) => {
    const base = FUNCOES.find((y) => y.id === f)!;
    setD({ ...d, prefs: { ...d.prefs, [f]: { dia: base.dia, hora: base.hora, ...d.prefs[f], ...x } } });
  };
  const alternarDia = (n: number) => setD({ ...d, dias: d.dias.includes(n) ? d.dias.filter((x) => x !== n) : [...d.dias, n].sort() });

  async function gravar(novos: Bloco[], dispo = d) {
    setErro(""); setAviso("");
    try { await salvarBussola(portal.id, { ...dados!.b, dispo, blocos: novos }); setBlocos(novos); setAviso("Salvo."); } catch (e) { setErro((e as Error).message); }
  }
  async function montar() {
    if (blocos.length && !confirm("Montar de novo vai trocar a rotina que você já tem. Continuar?")) return;
    if (d.dias.length === 0) return setErro("Marque pelo menos um dia em que você está na loja.");
    if (d.fim <= d.inicio) return setErro("O horário de terminar precisa ser depois do de começar.");
    await gravar(montarRotina(d, dados!.comTime));
  }
  const semana = [1, 2, 3, 4, 5, 6, 0];
  const naoCabem = FUNCOES.filter((f) => f.freq !== "mensal" && !d.prefs[f.id]?.fora && (!f.soComTime || dados.comTime) && blocos.length > 0 && !blocos.some((b) => b.funcao === f.id));

  return (
    <>
      <Titulo titulo="Minha rotina" sub="Conte quando você pode e como prefere. A Bússola monta a semana ideal dentro do seu horário, sem duas coisas ao mesmo tempo." aba="Minha rotina" />
      <AbasBussola />
      {erro && <div className="aviso erro mb">{erro}</div>}
      {aviso && <div className="aviso ok mb">{aviso}</div>}

      <div className="card mb">
        <h2 style={{ marginTop: 0 }}>1. Quando você está na loja</h2>
        <div className="chips mb">
          {semana.map((n) => <button key={n} type="button" className={`chip ${d.dias.includes(n) ? "escolhido" : ""}`} onClick={() => alternarDia(n)}>{DIAS_NOME[n].slice(0, 3)}</button>)}
        </div>
        <div className="linha" style={{ gap: 10 }}>
          <label>Começa às <input type="time" value={d.inicio} onChange={(e) => setD({ ...d, inicio: e.target.value })} /></label>
          <label>Termina às <input type="time" value={d.fim} onChange={(e) => setD({ ...d, fim: e.target.value })} /></label>
        </div>
      </div>

      <div className="card mb">
        <h2 style={{ marginTop: 0 }}>2. Melhor dia e horário de cada tarefa</h2>
        <p className="mudo" style={{ marginTop: 0 }}>Já deixei um horário sugerido pelo método. Mude o que não combina com você, ou marque “não faço” para passar para alguém.{!dados.comTime && " Como a sua equipe de vendas ainda não está cadastrada, as tarefas de time ficam de fora."}</p>
        {SECOES.map((s) => (
          <div key={s.freq}>
            <div className="secao">{s.titulo}</div>
            {FUNCOES.filter((f) => f.freq === s.freq && (!f.soComTime || dados.comTime)).map((f) => {
              const p = d.prefs[f.id];
              return (
                <div key={f.id} className="linha" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0", opacity: p?.fora ? 0.5 : 1 }}>
                  <div style={{ flex: "1 1 220px" }}><b>{f.nome}</b><br /><small className="mudo">{f.ajuda}</small></div>
                  {f.freq === "diaria" && <span className="mudo">todo dia de loja</span>}
                  {f.freq === "semanal" && (
                    <select value={p?.dia ?? f.dia} onChange={(e) => pref(f.id, { dia: Number(e.target.value) })} aria-label={`Dia: ${f.nome}`}>
                      {semana.map((n) => <option key={n} value={n}>{DIAS_NOME[n]}</option>)}
                    </select>
                  )}
                  {f.freq === "mensal" && (
                    <select value={p?.dia ?? f.dia} onChange={(e) => pref(f.id, { dia: Number(e.target.value) })} aria-label={`Dia do mês: ${f.nome}`}>
                      <option value={0}>Último dia do mês</option>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Dia {n}</option>)}
                    </select>
                  )}
                  <input type="time" value={p?.hora ?? f.hora} onChange={(e) => pref(f.id, { hora: e.target.value })} aria-label={`Hora: ${f.nome}`} />
                  <label style={{ fontSize: 13 }}><input type="checkbox" checked={!!p?.fora} onChange={(e) => pref(f.id, { fora: e.target.checked })} /> não faço</label>
                </div>
              );
            })}
          </div>
        ))}
        <button type="button" className="btn p mt" onClick={montar}>{blocos.length ? "Montar de novo a minha semana" : "Montar a minha semana"}</button>
      </div>

      {naoCabem.length > 0 && (
        <div className="aviso mb">Não coube no seu horário: {naoCabem.map((f) => f.nome.toLowerCase()).join(", ")}. Aumente o horário na loja, tire alguma tarefa ou marque “não faço”.</div>
      )}

      {blocos.length > 0 && (
        <>
          <div className="secao">Sua semana</div>
          {semana.map((n) => {
            const doDia = blocos.filter((b) => b.freq !== "mensal" && b.dia === n);
            if (!doDia.length) return null;
            return (
              <div key={n} className="card mb">
                <b>{DIAS_NOME[n]}</b>
                {doDia.map((b) => (
                  <div key={b.id} className="linha entre" style={{ padding: "4px 0" }}>
                    <span><b>{b.hora}</b> · {b.titulo} <small className="mudo">({b.minutos} min)</small></span>
                    <button type="button" className="link-loja" style={{ color: "var(--red)", fontSize: 13.5 }}
                      onClick={() => { if (confirm(`Tirar “${b.titulo}” de ${DIAS_NOME[n].toLowerCase()}?`)) gravar(blocos.filter((x) => x.id !== b.id)); }}>Remover</button>
                  </div>
                ))}
              </div>
            );
          })}
          {blocos.some((b) => b.freq === "mensal") && (
            <>
              <div className="secao">Do mês</div>
              <div className="card mb">
                {blocos.filter((b) => b.freq === "mensal").map((b) => (
                  <div key={b.id} className="linha entre" style={{ padding: "4px 0" }}>
                    <span><b>{b.dia === 0 ? "Último dia" : `Dia ${b.dia}`}</b> · {b.titulo} <small className="mudo">({b.hora}, {b.minutos} min)</small></span>
                    <button type="button" className="link-loja" style={{ color: "var(--red)", fontSize: 13.5 }}
                      onClick={() => { if (confirm(`Tirar “${b.titulo}” da rotina do mês?`)) gravar(blocos.filter((x) => x.id !== b.id)); }}>Remover</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
