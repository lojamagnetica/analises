"use client";

// Conversas da equipe: o canal interno só da Camilla e da CS, por loja. Cada mensagem vira lembrete, pendência, combinado ou contato.
import { useEffect, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataCurta, dataHora, hoje } from "@/lib/formato";
import { AcoesDaMensagem } from "@/components/AcoesDaMensagem";
import { TIPOS_CONVERSA, abertasPorLoja, buscarLembretes, buscarMensagens, buscarPessoas, enviarMensagem, marcarLembrete, type TipoConversa } from "@/lib/conversas";

type LojaLista = { id: string; loja: string };

export default function ConversasDaEquipe() {
  const { userId, nome, conversas } = useEquipe();
  const [loja, setLoja] = useState<string>("geral");
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<TipoConversa>("Alinhamento");
  const [para, setPara] = useState("");
  useEffect(() => { document.title = "Conversas da equipe · magnética.hub"; }, []);
  const { dados: base } = useDados(async () => {
    const [{ data: lojas }, pessoas] = await Promise.all([supabaseBrowser().from("portais").select("id, loja").eq("ativo", true).order("loja"), buscarPessoas()]);
    return { lojas: (lojas ?? []) as LojaLista[], pessoas };
  }, []);
  const { dados: abertas, recarregar: recarregarAbertas } = useDados(() => abertasPorLoja(), []);
  const { dados: msgs, recarregar: recarregarMsgs } = useDados(() => buscarMensagens(loja === "geral" ? null : loja), [loja]);
  const { dados: lembretes, recarregar: recarregarLembretes } = useDados(() => buscarLembretes(null), []);
  if (!conversas) return <div className="card mudo">Este espaço é só da Camilla e da CS.</div>;
  if (!base || !msgs || !lembretes) return <Carregando />;
  const nomeLoja = (id: string | null) => (id ? base.lojas.find((l) => l.id === id)?.loja ?? "Loja" : "Geral");
  const pessoa = (id: string | null) => base.pessoas.find((p) => p.id === id)?.nome.split(" ")[0] ?? null;
  const tudo = () => { recarregarMsgs(); recarregarAbertas(); recarregarLembretes(); };
  const enviar = async () => {
    if (!texto.trim()) return;
    try { await enviarMensagem(loja === "geral" ? null : loja, tipo, texto, { id: userId, nome: nome.split(" ")[0] }, para || null); setTexto(""); tudo(); } catch (e) { alert((e as Error).message); }
  };
  return (
    <>
      <Titulo titulo="Conversas da equipe" sub="O canal só da Camilla e da CS. Cada conversa fica ligada a uma loja e vira lembrete, pendência, combinado ou contato com 1 toque." />

      {lembretes.length > 0 && (
        <>
          <div className="secao">Lembretes abertos</div>
          <div className="card mb">
            {lembretes.map((l, i) => (
              <div key={l.id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0", borderTop: i ? "1px solid var(--line)" : 0 }}>
                <span><span className={`selo ${l.quando && l.quando < hoje() ? "alerta" : "espera"}`}>{l.quando ? dataCurta(l.quando) : "sem data"}</span> {l.texto} <span className="mudo">· {nomeLoja(l.portal_id)} · {pessoa(l.responsavel) ?? "as duas"}</span></span>
                <button type="button" className="btn s peq" onClick={async () => { await marcarLembrete(l.id, true); recarregarLembretes(); }}>Feito</button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="linha mb" style={{ gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <div><label className="rotulo">Conversa</label>
          <select value={loja} onChange={(e) => setLoja(e.target.value)}>
            <option value="geral">Geral{abertas?.geral ? ` (${abertas.geral})` : ""}</option>
            {base.lojas.map((l) => <option key={l.id} value={l.id}>{l.loja}{abertas?.[l.id] ? ` (${abertas[l.id]})` : ""}</option>)}
          </select>
        </div>
      </div>

      <div className="card mb">
        {msgs.length === 0 && <p className="mudo" style={{ margin: 0 }}>Nenhuma mensagem nesta conversa ainda.</p>}
        {msgs.map((m, i) => (
          <div key={m.id} style={{ padding: "8px 0", borderTop: i ? "1px solid var(--line)" : 0, opacity: m.status === "concluida" ? 0.6 : 1 }}>
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span><b>{m.autor_nome ?? "—"}</b> <span className="mudo">· {dataHora(m.created_at)}</span>{m.para ? <span className="mudo"> · para {pessoa(m.para)}</span> : null}</span>
              <span className="linha" style={{ gap: 6 }}><span className={`selo ${m.tipo === "Urgente" ? "erro" : m.tipo === "Pedido" ? "andamento" : "espera"}`}>{m.tipo}</span>{m.status === "concluida" && <span className="selo feito">concluída</span>}</span>
            </div>
            <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>{m.texto}</p>
            <AcoesDaMensagem m={m} pessoas={base.pessoas} por={nome.split(" ")[0]} aoFeito={tudo} />
          </div>
        ))}
      </div>

      <div className="card">
        <label className="rotulo">Nova mensagem{loja === "geral" ? " (geral)" : ` · ${nomeLoja(loja)}`}</label>
        <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva o alinhamento, o pedido ou o que a loja disse" />
        <div className="linha mt" style={{ gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div><label className="rotulo">Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value as TipoConversa)}>{TIPOS_CONVERSA.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className="rotulo">Para</label><select value={para} onChange={(e) => setPara(e.target.value)}><option value="">As duas</option>{base.pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <button type="button" className="btn p" onClick={enviar}>Enviar</button>
        </div>
      </div>
    </>
  );
}
