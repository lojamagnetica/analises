"use client";

// Painel da CS: os contatos registrados hoje (com editar e excluir) e os próximos passos que vencem hoje.
import Link from "next/link";
import { useState } from "react";
import { useDados } from "@/lib/hub";
import { contatosDaLoja, type contatosDoDia, editarContato, excluirContato, type ContatoDoDia } from "@/lib/contatos";
import { hoje } from "@/lib/formato";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Recife" });
const dia = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

function Linha({ c, mudou, comHora }: { c: ContatoDoDia; mudou: () => void; comHora: boolean }) {
  const [ed, setEd] = useState(false);
  const [f, setF] = useState({ resumo: c.resumo ?? "", proximo_passo: c.proximo_passo ?? "", proximo_em: c.proximo_em ?? "", precisa_ajuda: c.precisa_ajuda });
  const salvar = async () => { try { await editarContato(c.id, f); setEd(false); mudou(); } catch (e) { alert((e as Error).message); } };
  const excluir = async () => { if (!confirm(`Excluir este contato com a ${c.loja}?`)) return; try { await excluirContato(c.id); mudou(); } catch (e) { alert((e as Error).message); } };
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <span><b>{c.loja}</b> <small className="mudo">· {comHora ? (c.feito_em.slice(0, 10) === hoje() ? hora(c.feito_em) : `${dia(c.feito_em.slice(0, 10))} ${hora(c.feito_em)}`) : `conversa de ${dia(c.feito_em.slice(0, 10))}`}{c.canal ? ` · ${c.canal}` : ""}{c.feito_por ? ` · ${c.feito_por}` : ""}</small>{c.precisa_ajuda && <span className="selo alerta" style={{ marginLeft: 6 }}>pediu ajuda</span>}</span>
        {comHora && !ed && <span className="linha" style={{ gap: 6 }}><button type="button" className="btn s peq" onClick={() => setEd(true)}>Editar</button><button type="button" className="btn s peq" onClick={excluir}>Excluir</button></span>}
      </div>
      {ed ? (
        <div className="mt">
          <textarea rows={3} value={f.resumo} onChange={(e) => setF({ ...f, resumo: e.target.value })} placeholder="O que conversaram" style={{ width: "100%" }} />
          <div className="grade g2" style={{ gap: 8, marginTop: 6 }}>
            <input type="text" value={f.proximo_passo} onChange={(e) => setF({ ...f, proximo_passo: e.target.value })} placeholder="Próximo passo" />
            <input type="date" value={f.proximo_em} onChange={(e) => setF({ ...f, proximo_em: e.target.value })} />
          </div>
          <label className="marcar mt"><input type="checkbox" checked={f.precisa_ajuda} onChange={(e) => setF({ ...f, precisa_ajuda: e.target.checked })} /><span>Pediu ajuda</span></label>
          <div className="linha mt" style={{ gap: 6 }}><button type="button" className="btn p peq" onClick={salvar}>Salvar</button><button type="button" className="btn s peq" onClick={() => setEd(false)}>Cancelar</button></div>
        </div>
      ) : (
        <>
          {c.resumo && <div style={{ whiteSpace: "pre-wrap", marginTop: 2 }}>{c.resumo}</div>}
          {c.proximo_passo && <small className="mudo" style={{ display: "block", marginTop: 2 }}>Próximo passo: {c.proximo_passo}{c.proximo_em ? ` (${dia(c.proximo_em)}${c.proximo_em < hoje() ? ", atrasado" : ""})` : ""}</small>}
        </>
      )}
    </div>
  );
}

export type DadosContatos = Awaited<ReturnType<typeof contatosDoDia>>;
export function ContatosDoDia({ dados, recarregar }: { dados: DadosContatos | null; recarregar: () => void }) {
  if (!dados) return null;
  return (
    <>
      {dados.proximos.length > 0 && (
        <div className="card card-borda mb" style={{ ["--c" as string]: "var(--orange)" }}>
          <b>Próximos passos para hoje · {dados.proximos.length}</b>
          <small className="mudo" style={{ display: "block" }}>Saem daqui quando você registrar um novo contato com a loja.</small>
          {dados.proximos.map((c) => <Linha key={c.id} c={c} mudou={recarregar} comHora={false} />)}
        </div>
      )}
      <div className="card mb">
        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
          <b>Contatos registrados hoje · {dados.hoje.length}</b>
          <Link className="btn p peq" href="/equipe/contatos#novo">+ Registrar contato</Link>
        </div>
        {!dados.hoje.length && <small className="mudo" style={{ display: "block", marginTop: 4 }}>Nenhum contato registrado hoje ainda.</small>}
        {dados.hoje.map((c) => <Linha key={c.id} c={c} mudou={recarregar} comHora />)}
      </div>
    </>
  );
}

/** Na ficha da cliente: os últimos contatos com a loja, com editar e excluir. */
export function ContatosDaLoja({ portalId, loja }: { portalId: string; loja: string }) {
  const { dados, recarregar } = useDados(() => contatosDaLoja(portalId, loja), [portalId, loja]);
  if (!dados) return null;
  return (
    <div className="card mb">
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <b>Contatos com a loja · {dados.length}</b>
        <Link className="btn p peq" href="/equipe/contatos#novo">+ Registrar contato</Link>
      </div>
      {!dados.length && <small className="mudo" style={{ display: "block", marginTop: 4 }}>Nenhum contato registrado ainda.</small>}
      {dados.map((c) => <Linha key={c.id} c={c} mudou={recarregar} comHora />)}
    </div>
  );
}
