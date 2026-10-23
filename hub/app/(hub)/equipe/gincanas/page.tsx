"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { INDICADORES, buscarGincanas, gincanaSalvar, type Gincana } from "@/lib/gincanas";

function CamposGincana({ g }: { g?: Gincana }) {
  return (
    <>
      <div className="grade g4" style={{ gap: 12 }}>
        <div style={{ gridColumn: "span 2" }}><label className="rotulo">Nome</label><input type="text" name="nome" required defaultValue={g?.nome ?? ""} /></div>
        <div><label className="rotulo">Ordem</label><input type="number" name="ordem" defaultValue={g?.ordem ?? 99} /></div>
        <div><label className="rotulo">Duração</label><input type="text" name="duracao" defaultValue={g?.duracao ?? ""} placeholder="um dia ou um fim de semana" /></div>
      </div>
      <label className="rotulo">Categoria</label><input type="text" name="categoria" defaultValue={g?.categoria ?? ""} placeholder="COMPETIÇÃO INDIVIDUAL · P.A." />
      <label className="rotulo">Objetivo</label><textarea name="objetivo" rows={2} defaultValue={g?.objetivo ?? ""} />
      <label className="rotulo">O que trabalha</label>
      <div className="chips">{INDICADORES.map((i) => <label key={i} className="chip"><input type="checkbox" name="indicadores" value={i} defaultChecked={g?.indicadores.includes(i)} /> {i}</label>)}</div>
      <label className="rotulo">Como funciona (um passo por linha)</label><textarea name="como_funciona" rows={4} defaultValue={g?.como_funciona.join("\n") ?? ""} />
      <label className="rotulo">Regras (uma por linha)</label><textarea name="regras" rows={3} defaultValue={g?.regras.join("\n") ?? ""} />
      <label className="rotulo">Premiação</label><input type="text" name="premiacao" defaultValue={g?.premiacao ?? ""} />
      <label className="rotulo">Materiais (um por linha)</label><textarea name="materiais" rows={2} defaultValue={g?.materiais.join("\n") ?? ""} />
      <label className="rotulo">Dica</label><textarea name="dica" rows={2} defaultValue={g?.dica ?? ""} />
      <div className="linha mt">
        <label className="marcar"><input type="checkbox" name="comece" defaultChecked={g?.comece} /><span>Comece por aqui</span></label>
        <label className="marcar"><input type="checkbox" name="publicada" defaultChecked={g?.publicada ?? true} /><span>Aparece nos portais</span></label>
      </div>
    </>
  );
}

export default function GincanasEquipe() {
  useEquipe();
  const [aviso, setAviso] = useState<{ ok?: string; erro?: string }>({});
  const { dados, recarregar } = useDados(() => buscarGincanas(null), []);
  if (!dados) return <Carregando />;
  const salvar = async (id: string | null, f: FormData) => {
    setAviso({});
    try { await gincanaSalvar(id, f); setAviso({ ok: "Gincana salva." }); recarregar(); } catch (e) { setAviso({ erro: (e as Error).message }); }
  };
  return (
    <>
      <Titulo titulo="Gincanas" sub={`A biblioteca que aparece em Gestão de pessoas nos portais · ${dados.gincanas.length} gincanas. O lojista escolhe o que quer trabalhar e vê as que servem.`} />
      {aviso.ok && <div className="aviso ok mb">{aviso.ok}</div>}
      {aviso.erro && <div className="aviso mb">{aviso.erro}</div>}
      <details className="card mb">
        <summary className="btn p peq" style={{ display: "inline-flex" }}>+ Nova gincana</summary>
        <form className="mt" action={(f) => salvar(null, f)}><CamposGincana /><div className="linha mt"><button className="btn p" type="submit">Criar gincana</button></div></form>
      </details>
      <div className="card">
        {dados.gincanas.map((g) => (
          <details key={g.id} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer" }}>{g.ordem}. <b>{g.nome}</b> · {g.indicadores.join(", ")}{g.comece ? " · comece por aqui" : ""}{g.publicada ? "" : " · oculta"}</summary>
            <form className="mt" action={(f) => salvar(g.id, f)}><CamposGincana g={g} /><div className="linha mt"><button className="btn p peq" type="submit">Salvar</button></div></form>
          </details>
        ))}
      </div>
    </>
  );
}
