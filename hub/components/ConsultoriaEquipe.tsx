"use client";

import { useState } from "react";
import {
  acaoCriar, acaoEditar, acaoRemover, entregaCriar, entregaEditar, salvarEstrutura,
  type Acao, type DadosConsultoria, type Entrega, type Frente,
} from "@/lib/consultoria";

// Edição da consultoria pela equipe, direto no portal da loja. A loja nunca vê estes formulários.

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function Erro({ msg }: { msg: string }) {
  return msg ? <div className="aviso mt">{msg}</div> : null;
}

function SeletorLoja({ lojas, valor }: { lojas: string[]; valor?: string | null }) {
  if (lojas.length < 2) return null;
  return (
    <div>
      <label className="rotulo">Loja</label>
      <select name="loja" defaultValue={valor ?? ""}>
        <option value="">As duas lojas</option>
        {lojas.map((l) => <option key={l}>{l}</option>)}
      </select>
    </div>
  );
}

/** A estrutura da consultoria: período, meses com o foco, frentes, agenda e "como funciona". */
export function EstruturaEditor({ portalId, c, aoSalvar, aberto = false }: { portalId: string; c: DadosConsultoria; aoSalvar: () => void; aberto?: boolean }) {
  const [frentes, setFrentes] = useState<Frente[]>(c.frentes.length ? c.frentes : [{ n: 1, nome: "", oque: "" }]);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <details className="card mb" open={aberto}>
      <summary style={{ cursor: "pointer" }}><b>Editar a estrutura da consultoria</b> <small className="mudo">(só a equipe vê)</small></summary>
      <form className="mt" action={async (f) => {
        setErro(""); setOk(false);
        const meses = c.meses.map((m, i) => ({ ...m, foco: txt(f, `foco${i}`) }));
        const dados: DadosConsultoria = {
          ...c,
          inicio: txt(f, "inicio") || c.inicio,
          fim: txt(f, "fim") || c.fim,
          cidade: txt(f, "cidade"),
          instagram: txt(f, "instagram").split(",").map((x) => x.trim()).filter(Boolean),
          visita: txt(f, "visita"),
          encerramento: txt(f, "encerramento"),
          meses,
          frentes: frentes.map((fr, i) => ({ n: i + 1, nome: txt(f, `fnome${i}`), oque: txt(f, `foque${i}`) })).filter((fr) => fr.nome),
          como: c.como.map((x, i) => ({ titulo: txt(f, `ctit${i}`) || x.titulo, texto: txt(f, `ctxt${i}`) })),
        };
        try { await salvarEstrutura(portalId, dados); setOk(true); aoSalvar(); } catch (e) { setErro((e as Error).message); }
      }}>
        <div className="grade g2" style={{ gap: 12 }}>
          <div><label className="rotulo">Início</label><input type="date" name="inicio" defaultValue={c.inicio} /></div>
          <div><label className="rotulo">Fim</label><input type="date" name="fim" defaultValue={c.fim} /></div>
          <div><label className="rotulo">Cidade</label><input type="text" name="cidade" defaultValue={c.cidade ?? ""} /></div>
          <div><label className="rotulo">Instagram (separados por vírgula)</label><input type="text" name="instagram" defaultValue={(c.instagram ?? []).join(", ")} /></div>
          <div><label className="rotulo">Agenda (aparece no topo)</label><input type="text" name="visita" defaultValue={c.visita ?? ""} placeholder="Ex.: Visita presencial: 02 a 04/11" /></div>
          <div><label className="rotulo">Encerramento</label><input type="text" name="encerramento" defaultValue={c.encerramento ?? ""} /></div>
        </div>
        <h4>Foco de cada mês</h4>
        <div className="grade g2" style={{ gap: 12 }}>
          {c.meses.map((m, i) => (
            <div key={m.mes}><label className="rotulo">Mês {i + 1} · {m.nome}</label><input type="text" name={`foco${i}`} defaultValue={m.foco} /></div>
          ))}
        </div>
        <h4>Frentes</h4>
        {frentes.map((fr, i) => (
          <div key={i} className="grade g2" style={{ gap: 12 }}>
            <div><label className="rotulo">Frente {i + 1}</label><input type="text" name={`fnome${i}`} defaultValue={fr.nome} placeholder="Ex.: Gestão" /></div>
            <div><label className="rotulo">O que é</label><input type="text" name={`foque${i}`} defaultValue={fr.oque} /></div>
          </div>
        ))}
        <button type="button" className="btn s peq mt" onClick={() => setFrentes([...frentes, { n: frentes.length + 1, nome: "", oque: "" }])}>+ Frente</button>
        <h4>Como funciona</h4>
        {c.como.map((x, i) => (
          <div key={i} className="grade g2" style={{ gap: 12 }}>
            <div><label className="rotulo">Título</label><input type="text" name={`ctit${i}`} defaultValue={x.titulo} /></div>
            <div><label className="rotulo">Texto</label><input type="text" name={`ctxt${i}`} defaultValue={x.texto} /></div>
          </div>
        ))}
        <Erro msg={erro} />
        {ok && <div className="aviso ok mt">Estrutura salva.</div>}
        <button className="btn p peq mt" type="submit">Salvar estrutura</button>
      </form>
    </details>
  );
}

/** Campos de uma ação da quinzena (criar e editar). */
function CamposAcao({ a, lojas }: { a?: Acao; lojas: string[] }) {
  return (
    <>
      <label className="rotulo">Ação</label>
      <input type="text" name="acao" required defaultValue={a?.acao ?? ""} />
      <div className="grade g2" style={{ gap: 10 }}>
        <div><label className="rotulo">Quem faz</label><input type="text" name="quem" defaultValue={a?.quem ?? ""} /></div>
        <div><label className="rotulo">Até quando</label><input type="date" name="prazo" defaultValue={a?.prazo ?? ""} /></div>
        <SeletorLoja lojas={lojas} valor={a?.loja} />
      </div>
      <label className="rotulo">Observação (opcional)</label>
      <input type="text" name="obs" defaultValue={a?.obs ?? ""} />
    </>
  );
}

const lerAcao = (f: FormData) => ({
  acao: txt(f, "acao").slice(0, 300), quem: txt(f, "quem") || null, prazo: txt(f, "prazo") || null,
  obs: txt(f, "obs") || null, loja: txt(f, "loja") || null,
});

export function NovaAcao({ portalId, tipo, lojas, aoSalvar }: { portalId: string; tipo: string; lojas: string[]; aoSalvar: () => void }) {
  const [erro, setErro] = useState("");
  return (
    <details className="mt">
      <summary className="btn s peq" style={{ display: "inline-flex" }}>+ Nova ação</summary>
      <form className="mt" action={async (f) => {
        setErro("");
        try { await acaoCriar(portalId, { ...lerAcao(f), tipo }); aoSalvar(); } catch (e) { setErro((e as Error).message); }
      }}>
        <CamposAcao lojas={lojas} />
        <Erro msg={erro} />
        <button className="btn p peq mt" type="submit">Criar ação</button>
      </form>
    </details>
  );
}

export function EditarAcao({ a, lojas, aoSalvar }: { a: Acao; lojas: string[]; aoSalvar: () => void }) {
  const [erro, setErro] = useState("");
  return (
    <details>
      <summary className="mudo" style={{ cursor: "pointer", fontSize: 12.5 }}>editar</summary>
      <form className="mt" action={async (f) => {
        setErro("");
        try { await acaoEditar(a.id, lerAcao(f)); aoSalvar(); } catch (e) { setErro((e as Error).message); }
      }}>
        <CamposAcao a={a} lojas={lojas} />
        <Erro msg={erro} />
        <div className="linha mt" style={{ gap: 8 }}>
          <button className="btn p peq" type="submit">Salvar</button>
          <button className="btn s peq" type="button" onClick={async () => { if (confirm(`Apagar a ação "${a.acao}"?`)) { await acaoRemover(a.id); aoSalvar(); } }}>Apagar</button>
        </div>
      </form>
    </details>
  );
}

/** Campos de uma entrega (criar e editar). */
function CamposEntrega({ e, c, lojas, mes }: { e?: Entrega; c: DadosConsultoria; lojas: string[]; mes: string }) {
  return (
    <>
      <label className="rotulo">Entrega</label>
      <input type="text" name="entrega" required defaultValue={e?.entrega ?? ""} />
      <div className="grade g2" style={{ gap: 10 }}>
        <div>
          <label className="rotulo">Frente</label>
          <select name="frente" defaultValue={e?.frente ?? c.frentes[0]?.n ?? 1}>
            {c.frentes.map((f) => <option key={f.n} value={f.n}>{String(f.n).padStart(2, "0")} · {f.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo">Mês</label>
          <select name="mes" defaultValue={e?.mes ?? mes}>
            {c.meses.map((m) => <option key={m.mes} value={m.mes}>{m.nome}</option>)}
          </select>
        </div>
        <SeletorLoja lojas={lojas} valor={e?.loja} />
        <div><label className="rotulo">Link do material (opcional)</label><input type="url" name="material_url" defaultValue={e?.material_url ?? ""} /></div>
      </div>
    </>
  );
}

const lerEntrega = (f: FormData) => ({
  entrega: txt(f, "entrega").slice(0, 300), frente: Number(txt(f, "frente")) || 1, mes: txt(f, "mes"),
  loja: txt(f, "loja") || null, material_url: txt(f, "material_url") || null,
});

export function NovaEntrega({ portalId, c, lojas, mes, ordem, aoSalvar }: { portalId: string; c: DadosConsultoria; lojas: string[]; mes: string; ordem: number; aoSalvar: () => void }) {
  const [erro, setErro] = useState("");
  if (!c.frentes.length) return <p className="ajuda">Cadastre as frentes na estrutura para criar entregas.</p>;
  return (
    <details className="mt">
      <summary className="btn s peq" style={{ display: "inline-flex" }}>+ Entrega</summary>
      <form className="mt" action={async (f) => {
        setErro("");
        try { await entregaCriar(portalId, { ...lerEntrega(f), ordem }); aoSalvar(); } catch (e) { setErro((e as Error).message); }
      }}>
        <CamposEntrega c={c} lojas={lojas} mes={mes} />
        <Erro msg={erro} />
        <button className="btn p peq mt" type="submit">Criar entrega</button>
      </form>
    </details>
  );
}

export function EditarEntrega({ e, c, lojas, aoSalvar }: { e: Entrega; c: DadosConsultoria; lojas: string[]; aoSalvar: () => void }) {
  const [erro, setErro] = useState("");
  return (
    <details>
      <summary className="mudo" style={{ cursor: "pointer", fontSize: 12.5 }}>editar</summary>
      <form className="mt" action={async (f) => {
        setErro("");
        try { await entregaEditar(e.id, lerEntrega(f)); aoSalvar(); } catch (x) { setErro((x as Error).message); }
      }}>
        <CamposEntrega e={e} c={c} lojas={lojas} mes={e.mes} />
        <Erro msg={erro} />
        <button className="btn p peq mt" type="submit">Salvar</button>
      </form>
    </details>
  );
}
