"use client";

import { useEffect, useState } from "react";
import { AbasBussola } from "@/components/AbasBussola";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { DIAS_NOME, FUNCOES, dispoVazia, montarRotina, buscarBussola, salvarBussola, type Bloco, type Dispo, type Funcao } from "@/lib/bussola";

export default function Rotina() {
  const { portal } = usePortal();
  const { dados } = useDados(() => buscarBussola(portal.id), [portal.id]);
  const [d, setD] = useState<Dispo>(dispoVazia());
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => { if (dados) { setD(dados.dispo); setBlocos(dados.blocos); } }, [dados]);
  if (!dados) return <Carregando />;

  const pref = (f: Funcao, x: Partial<NonNullable<Dispo["prefs"][Funcao]>>) => {
    const base = FUNCOES.find((y) => y.id === f)!;
    setD({ ...d, prefs: { ...d.prefs, [f]: { dia: base.dia, hora: base.hora, ...d.prefs[f], ...x } } });
  };
  const alternarDia = (n: number) => setD({ ...d, dias: d.dias.includes(n) ? d.dias.filter((x) => x !== n) : [...d.dias, n].sort() });

  async function gravar(novos: Bloco[]) {
    setErro(""); setAviso("");
    try { await salvarBussola(portal.id, { dispo: d, blocos: novos, feitos: dados!.feitos }); setBlocos(novos); setAviso("Salvo."); } catch (e) { setErro((e as Error).message); }
  }
  async function montar() {
    if (blocos.length && !confirm("Montar de novo vai trocar a rotina que você já tem. Continuar?")) return;
    await gravar(montarRotina(d));
  }
  const semana = [1, 2, 3, 4, 5, 6, 0];

  return (
    <>
      <Titulo titulo="Minha rotina" sub="Conte quando você pode e como prefere. A Bússola monta a semana ideal em cima da sua realidade." aba="Minha rotina" />
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
        <p className="mudo" style={{ marginTop: 0 }}>Já deixei um horário sugerido pelo método. Mude o que não combina com você, ou marque “não faço” para passar para alguém.</p>
        {FUNCOES.map((f) => {
          const p = d.prefs[f.id];
          return (
            <div key={f.id} className="linha" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0", opacity: p?.fora ? 0.5 : 1 }}>
              <div style={{ flex: "1 1 220px" }}><b>{f.nome}</b><br /><small className="mudo">{f.ajuda}</small></div>
              <select value={p?.dia ?? f.dia} onChange={(e) => pref(f.id, { dia: Number(e.target.value) })} aria-label={`Dia: ${f.nome}`}>
                {f.id === "caixa" && <option value={-1}>Todo dia útil</option>}
                {semana.map((n) => <option key={n} value={n}>{DIAS_NOME[n]}</option>)}
              </select>
              <input type="time" value={p?.hora ?? f.hora} onChange={(e) => pref(f.id, { hora: e.target.value })} aria-label={`Hora: ${f.nome}`} />
              <label style={{ fontSize: 13 }}><input type="checkbox" checked={!!p?.fora} onChange={(e) => pref(f.id, { fora: e.target.checked })} /> não faço</label>
            </div>
          );
        })}
        <button type="button" className="btn p mt" onClick={montar}>{blocos.length ? "Montar de novo a minha semana" : "Montar a minha semana"}</button>
      </div>

      {blocos.length > 0 && (
        <>
          <div className="secao">Sua semana</div>
          {semana.map((n) => {
            const doDia = blocos.filter((b) => b.dia === n);
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
        </>
      )}
    </>
  );
}
