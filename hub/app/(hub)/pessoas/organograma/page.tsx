"use client";

import { useState } from "react";
import { RascunhoComoLoja } from "@/components/RascunhoComoLoja";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarPessoas } from "@/lib/pessoas";
import {
  buscarOrganograma, modeloOrganograma, novaArea, salvarOrganograma,
  type Area, type Organograma, type PessoaOrg,
} from "@/lib/organograma";

const linhas = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

/** Uma área: nome, responsável, pessoas e o que faz; com as áreas que respondem a ela logo abaixo.
 *  Na versão para o time, somem o salário, o horário e o que a direção espera da área. */
function CaixaArea({ a, org, nivel, paraTime, mudar, tirar, criar }: {
  a: Area; org: Organograma; nivel: number; paraTime: boolean; mudar: (a: Area) => void; tirar: (id: string) => void; criar: (pai: string) => void;
}) {
  const [editando, setEditando] = useState(!a.nome);
  const [r, setR] = useState<Area>(a);
  const mudaPessoa = (i: number, x: Partial<PessoaOrg>) => setR({ ...r, pessoas: r.pessoas.map((p, j) => (j === i ? { ...p, ...x } : p)) });
  const filhas = org.areas.filter((x) => x.pai === a.id);
  const cor = nivel === 0 ? "var(--red)" : "var(--ink)";

  if (editando) {
    // Não deixa escolher como "acima" a própria área nem as que estão abaixo dela.
    const abaixo = (id: string): string[] => org.areas.filter((x) => x.pai === id).flatMap((x) => [x.id, ...abaixo(x.id)]);
    const proibidas = new Set([a.id, ...abaixo(a.id)]);
    return (
      <div className="card" style={{ borderTop: `4px solid ${cor}` }}>
        <input type="text" placeholder="Nome da área (ex.: Atacado)" value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} />
        <input type="text" placeholder="Responsável pela área" value={r.lider} onChange={(e) => setR({ ...r, lider: e.target.value })} />
        <label className="ajuda" style={{ display: "block" }}>Responde a
          <select value={r.pai ?? ""} onChange={(e) => setR({ ...r, pai: e.target.value || null })}>
            <option value="">{org.topo.nome || "Direção"} (direção)</option>
            {org.areas.filter((x) => !proibidas.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
        <div className="ajuda" style={{ marginTop: 6 }}>Pessoas da área (horário e salário só a direção vê)</div>
        {r.pessoas.map((p, i) => (
          <div key={i} className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 6, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
            <input type="text" placeholder="Nome" aria-label="Nome" value={p.nome} onChange={(e) => mudaPessoa(i, { nome: e.target.value })} />
            <input type="text" placeholder="Função" aria-label="Função" value={p.funcao} onChange={(e) => mudaPessoa(i, { funcao: e.target.value })} />
            <input type="text" placeholder="Horário" aria-label="Horário" value={p.horario ?? ""} onChange={(e) => mudaPessoa(i, { horario: e.target.value })} />
            <input type="text" placeholder="Salário e comissão" aria-label="Salário e comissão" value={p.salario ?? ""} onChange={(e) => mudaPessoa(i, { salario: e.target.value })} />
            <button type="button" className="link-loja" style={{ color: "var(--red)", justifySelf: "start" }} onClick={() => { if (confirm(`Tirar ${p.nome || "esta pessoa"} desta área?`)) setR({ ...r, pessoas: r.pessoas.filter((_, j) => j !== i) }); }}>Tirar</button>
          </div>
        ))}
        <button type="button" className="link-loja" style={{ fontSize: 12.5 }} onClick={() => setR({ ...r, pessoas: [...r.pessoas, { nome: "", funcao: "" }] })}>+ pessoa</button>
        <label className="ajuda" style={{ display: "block" }}>O que essa área faz: uma responsabilidade por linha
          <textarea rows={4} value={r.responsabilidades} onChange={(e) => setR({ ...r, responsabilidades: e.target.value })} />
        </label>
        <label className="ajuda" style={{ display: "block" }}>O que a direção espera de quem cuida desta área (não aparece na versão para o time)
          <textarea rows={3} value={r.espera ?? ""} onChange={(e) => setR({ ...r, espera: e.target.value })} />
        </label>
        <div className="linha" style={{ gap: 8 }}>
          <button type="button" className="btn p peq" disabled={!r.nome.trim()} onClick={() => {
            const pessoas = r.pessoas.map((p) => ({ ...p, nome: p.nome.trim(), funcao: p.funcao.trim(), horario: p.horario?.trim() || undefined, salario: p.salario?.trim() || undefined })).filter((p) => p.nome);
            mudar({ ...r, nome: r.nome.trim(), pessoas, espera: r.espera?.trim() || undefined }); setEditando(false);
          }}>Salvar</button>
          {a.nome && <button type="button" className="btn s peq" onClick={() => { setR(a); setEditando(false); }}>Cancelar</button>}
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => {
            if (confirm(filhas.length ? `Excluir "${a.nome || "esta área"}"? As áreas abaixo dela passam a responder à área de cima.` : `Excluir "${a.nome || "esta área"}"?`)) tirar(a.id);
          }}>Excluir</button>
        </div>
      </div>
    );
  }

  const resp = linhas(a.responsabilidades);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="card" style={{ borderTop: `4px solid ${cor}`, padding: 14 }}>
        <div className="linha entre" style={{ alignItems: "flex-start" }}>
          <h3 style={{ margin: 0, color: cor }}>{a.nome}</h3>
          <button type="button" className="link-loja" style={{ fontSize: 12.5 }} onClick={() => setEditando(true)}>Editar</button>
        </div>
        <div style={{ fontSize: 13.5, margin: "4px 0 8px" }}>Responsável: <b style={{ color: a.lider ? undefined : "var(--red)" }}>{a.lider || "a definir"}</b></div>
        {a.pessoas.map((p, i) => (
          <div key={i} style={{ fontSize: 13.5, padding: "4px 0", borderTop: "1px solid var(--line)" }}>
            <b>{p.nome}</b>{p.funcao && <span className="mudo"> · {p.funcao}</span>}
            {!paraTime && (p.horario || p.salario) && <div className="mudo" style={{ fontSize: 12.5 }}>{[p.horario, p.salario].filter(Boolean).join(" · ")}</div>}
          </div>
        ))}
        {resp.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>O que essa área faz</summary>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13.5 }}>{resp.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </details>
        )}
        {!paraTime && a.espera && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>O que a direção espera</summary>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13.5 }}>{linhas(a.espera).map((x, i) => <li key={i}>{x}</li>)}</ul>
          </details>
        )}
        <button type="button" className="link-loja" style={{ fontSize: 12.5, marginTop: 8 }} onClick={() => criar(a.id)}>+ área abaixo</button>
      </div>
      {filhas.length > 0 && (
        <div style={{ display: "grid", gap: 10, paddingLeft: 14, borderLeft: "2px solid var(--line)", marginLeft: 10 }}>
          {filhas.map((f) => <CaixaArea key={f.id} a={f} org={org} nivel={nivel + 1} paraTime={paraTime} mudar={mudar} tirar={tirar} criar={criar} />)}
        </div>
      )}
    </div>
  );
}

export default function OrganogramaPagina() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(async () => ({
    salvo: await buscarOrganograma(portal.id),
    pessoas: (await buscarPessoas(portal.id)).pessoas.filter((p) => p.ativo),
  }), [portal.id]);
  const [atual, setAtual] = useState<{ org: Organograma; liberado: boolean } | null>(null);
  const [erro, setErro] = useState("");
  const [paraTime, setParaTime] = useState(false);
  if (!dados) return <Carregando />;
  const { org, liberado } = atual ?? dados.salvo ?? { org: modeloOrganograma(portal.responsavel ?? "", dados.pessoas), liberado: false };

  if (!liberado && !equipe) {
    return (
      <>
        <Titulo titulo="Organograma" />
        <RascunhoComoLoja />
        <div className="card">O organograma da sua loja está sendo montado pela Camilla. Ele aparece aqui assim que estiver pronto.</div>
      </>
    );
  }

  const salvar = async (o: Organograma, lib = liberado) => {
    setAtual({ org: o, liberado: lib }); setErro("");
    try { await salvarOrganograma(portal.id, o, lib); } catch (e) { setErro((e as Error).message); }
  };
  const mudar = (a: Area) => salvar({ ...org, areas: org.areas.some((x) => x.id === a.id) ? org.areas.map((x) => (x.id === a.id ? a : x)) : [...org.areas, a] });
  const tirar = (id: string) => {
    const pai = org.areas.find((x) => x.id === id)?.pai ?? null;
    salvar({ ...org, areas: org.areas.filter((x) => x.id !== id).map((x) => (x.pai === id ? { ...x, pai } : x)) });
  };
  const criar = (pai: string | null) => salvar({ ...org, areas: [...org.areas, { ...novaArea(pai) }] });
  const raizes = org.areas.filter((a) => !a.pai || !org.areas.some((x) => x.id === a.pai));
  const semLider = org.areas.filter((a) => !a.lider.trim()).length;
  const total = new Set(org.areas.flatMap((a) => a.pessoas.map((p) => p.nome.toLowerCase()))).size;

  return (
    <>
      <Titulo titulo="Organograma" sub="Quem responde a quem na loja: as áreas, o responsável de cada uma, as pessoas e o que cada área faz." />
      {equipe && (
        <div className={`aviso mb ${liberado ? "ok" : ""}`}>
          {liberado
            ? <>A loja já vê o organograma. <button type="button" className="link-loja" onClick={() => salvar(org, false)}>Voltar para rascunho</button></>
            : <>Rascunho: só a equipe vê. {!dados.salvo && !atual && "Este é um modelo de partida, montado com a equipe cadastrada. "}
              <button type="button" className="btn p peq" style={{ marginLeft: 8 }} onClick={() => { if (confirm("Liberar o organograma para a loja?")) salvar(org, true); }}>Liberar para a loja</button></>}
        </div>
      )}
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="chips mb" role="group" aria-label="Versão do organograma">
        <button type="button" className={`chip ${!paraTime ? "escolhido" : ""}`} aria-pressed={!paraTime} onClick={() => setParaTime(false)}>Completo (só a direção)</button>
        <button type="button" className={`chip ${paraTime ? "escolhido" : ""}`} aria-pressed={paraTime} onClick={() => setParaTime(true)}>Para mostrar ao time</button>
        <small className="mudo" style={{ alignSelf: "center" }}>{paraTime ? "Sem salário, horário e o que a direção espera de cada área." : "Com salário, horário e o que a direção espera de cada área."}</small>
      </div>

      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)", textAlign: "center", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
        <small className="mudo" style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{org.topo.cargo || "Direção"}</small>
        <h2 style={{ margin: "2px 0 0" }}>{org.topo.nome || "Direção"}</h2>
        <details style={{ marginTop: 6 }}>
          <summary className="link-loja" style={{ cursor: "pointer", fontSize: 12.5, listStyle: "none" }}>Editar</summary>
          <div className="linha mt" style={{ gap: 8 }}>
            <input type="text" defaultValue={org.topo.nome} placeholder="Nome" aria-label="Nome da direção" onBlur={(e) => e.target.value.trim() !== org.topo.nome && salvar({ ...org, topo: { ...org.topo, nome: e.target.value.trim() } })} style={{ flex: 1 }} />
            <input type="text" defaultValue={org.topo.cargo} placeholder="Cargo" aria-label="Cargo da direção" onBlur={(e) => e.target.value.trim() !== org.topo.cargo && salvar({ ...org, topo: { ...org.topo, cargo: e.target.value.trim() } })} style={{ flex: 1 }} />
          </div>
        </details>
      </div>
      <div style={{ width: 2, height: 18, background: "var(--line)", margin: "-10px auto 8px" }} />

      <div className="grade mb" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, alignItems: "start" }}>
        {raizes.map((a) => <CaixaArea key={a.id} a={a} org={org} nivel={0} paraTime={paraTime} mudar={mudar} tirar={tirar} criar={criar} />)}
      </div>
      <div className="linha entre" style={{ flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="btn s peq" onClick={() => criar(null)}>+ área</button>
        <small className="mudo">{org.areas.length} áreas · {total} pessoas{semLider ? ` · ${semLider} sem responsável definido` : ""}</small>
      </div>
    </>
  );
}
