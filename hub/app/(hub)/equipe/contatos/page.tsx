"use client";

// Contatos das lojas: onde a CS registra a conversa do dia com cada loja (sem precisar de alerta) e vê a linha do tempo da loja.
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { AnexoDaMensagem } from "@/components/AnexoDaMensagem";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora, hoje } from "@/lib/formato";
import { CANAIS, buscarLojas, buscarResumo, linhaDoTempo, registrarContato, type Canal } from "@/lib/contatos";
import { subirAnexo } from "@/lib/conversas";
import { suportaDitado, useDitado } from "@/lib/ditado";

const ROTULO = { contato: "Contato", combinado: "Combinado", conversa: "Conversa interna" } as const;

function Contatos() {
  const { nome, userId, conversas } = useEquipe();
  const inicial = useSearchParams().get("loja") ?? "";
  const [loja, setLoja] = useState(inicial);
  const [resumo, setResumo] = useState("");
  const [canal, setCanal] = useState<Canal>("WhatsApp");
  const [ajuda, setAjuda] = useState(false);
  const [passo, setPasso] = useState("");
  const [quando, setQuando] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const seletor = useRef<HTMLInputElement>(null);
  const ditado = useDitado(setResumo);
  useEffect(() => { document.title = "Contatos das lojas · magnética.hub"; }, []);
  const { dados: lojas } = useDados(() => buscarLojas(), []);
  const { dados: resumoDia, recarregar: recarregarResumo } = useDados(async () => (lojas ? buscarResumo(lojas) : null), [lojas]);
  const { dados: linha, recarregar: recarregarLinha } = useDados(async () => (loja ? linhaDoTempo(loja, conversas) : []), [loja, conversas]);
  if (!lojas) return <Carregando />;
  const nomeLoja = lojas.find((l) => l.id === loja)?.loja;

  const salvar = async () => {
    if (!loja) { setMsg("Escolha a loja."); return; }
    if (!resumo.trim() && !anexos.length) { setMsg("Escreva (ou fale) o que foi combinado."); return; }
    setSalvando(true); setMsg("");
    try {
      const arquivos = await Promise.all(anexos.map((f) => subirAnexo(f, userId)));
      await registrarContato({ portalId: loja, resumo, canal, precisaAjuda: ajuda, proximoPasso: passo, proximoEm: quando, arquivos }, { id: userId, nome: nome.split(" ")[0] }, conversas);
      setResumo(""); setAjuda(false); setPasso(""); setQuando(""); setAnexos([]);
      setMsg(passo.trim() && conversas ? "Contato registrado e lembrete criado ✓" : "Contato registrado ✓");
      recarregarLinha(); recarregarResumo();
    } catch (e) { setMsg((e as Error).message); }
    setSalvando(false);
  };

  return (
    <>
      <Titulo titulo="Contatos das lojas" sub="Registre cada conversa com a loja a qualquer hora, pelo canal que usou. Cada loja tem a sua linha do tempo: contatos, combinados e conversas." />

      {resumoDia && (
        <div className="grade g3 mb">
          <div className="card card-borda kpi" style={{ ["--c" as string]: "var(--feito)" }}><b>{resumoDia.contatosHoje}</b><small>contatos registrados hoje · {resumoDia.lojasHoje} {resumoDia.lojasHoje === 1 ? "loja" : "lojas"}</small></div>
          <div className="card card-borda kpi" style={{ ["--c" as string]: resumoDia.parados.length ? "var(--orange)" : "var(--feito)" }}><b>{resumoDia.parados.length}</b><small>lojas sem conversa há 7 dias ou mais</small></div>
        </div>
      )}
      {resumoDia && resumoDia.parados.length > 0 && (
        <div className="card mb">
          <b>Há mais tempo sem contato</b>
          <div className="chips mt">
            {resumoDia.parados.slice(0, 8).map(({ l, dias }) => <button key={l.id} type="button" className="chip" onClick={() => setLoja(l.id)}>{l.loja} · {dias === null ? "nunca" : `${dias} dias`}</button>)}
          </div>
        </div>
      )}

      <div className="card card-borda mb" id="novo" style={{ ["--c" as string]: "var(--red)" }}>
        <h3 style={{ marginTop: 0 }}>Registrar contato</h3>
        <div className="grade g2" style={{ gap: 10 }}>
          <div><label className="rotulo">Loja</label>
            <select value={loja} onChange={(e) => setLoja(e.target.value)}>
              <option value="">Escolha a loja</option>
              {lojas.map((l) => <option key={l.id} value={l.id}>{l.loja}{l.acompanhada ? "" : " (ainda na entrega)"}</option>)}
            </select></div>
          <div><label className="rotulo">Por onde foi</label>
            <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>{CANAIS.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <label className="rotulo">O que a loja disse e o que ficou combinado</label>
        <div className="linha" style={{ gap: 6, alignItems: "flex-start" }}>
          <textarea rows={3} value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder={ditado.gravando ? "Ouvindo… fale agora" : "Com as palavras dela: o que fez, o que travou, o que vai fazer"} style={{ flex: 1 }} />
          <button type="button" onClick={() => (ditado.gravando ? ditado.parar() : ditado.iniciar(resumo))} aria-label={ditado.gravando ? "Parar de gravar" : "Falar o contato"} title={suportaDitado() ? "Falar: vira texto" : "Use o microfone do teclado"} className="btn s peq">{ditado.gravando ? "■" : "🎙"}</button>
          <button type="button" onClick={() => seletor.current?.click()} aria-label="Anexar print ou arquivo" title="Anexar print ou arquivo" className="btn s peq">📎</button>
        </div>
        {ditado.erro && <div className="aviso mt">{ditado.erro}</div>}
        <input ref={seletor} type="file" multiple hidden onChange={(e) => { setAnexos((l) => [...l, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
        {anexos.length > 0 && <div className="chips mt">{anexos.map((f, i) => <span key={i} className="chip">📎 {f.name} <button type="button" aria-label={`Tirar ${f.name}`} onClick={() => setAnexos((l) => l.filter((_, j) => j !== i))} style={{ border: 0, background: "transparent", cursor: "pointer" }}>✕</button></span>)}</div>}
        <label className="marcar mt"><input type="checkbox" checked={ajuda} onChange={(e) => setAjuda(e.target.checked)} /><span>Tem uma dificuldade em que precisamos ajudar</span></label>
        <div className="grade g2" style={{ gap: 10 }}>
          <div><label className="rotulo">Próximo passo (vira lembrete seu)</label><input type="text" value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="Ex.: perguntar se lançou o caixa" /></div>
          <div><label className="rotulo">Quando</label><input type="date" value={quando} min={hoje()} onChange={(e) => setQuando(e.target.value)} /></div>
        </div>
        {msg && <div className={`aviso mt${msg.endsWith("✓") ? " ok" : ""}`}>{msg}</div>}
        <div className="linha mt"><button type="button" className="btn p" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Registrar contato"}</button></div>
      </div>

      <div className="secao">Linha do tempo{nomeLoja ? ` · ${nomeLoja}` : ""}</div>
      {!loja && <div className="card mudo">Escolha uma loja acima para ver o histórico dela.</div>}
      {loja && !linha && <Carregando />}
      {loja && linha && linha.length === 0 && <div className="card mudo">Nada registrado com esta loja ainda.</div>}
      {loja && linha && linha.length > 0 && (
        <div className="card mb">
          {linha.map((i, k) => (
            <div key={k} style={{ padding: "8px 0", borderTop: k ? "1px solid var(--line)" : 0 }}>
              <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
                <span><span className={`selo ${i.tipo === "contato" ? "feito" : i.tipo === "combinado" ? "andamento" : "espera"}`}>{ROTULO[i.tipo]}</span> <b>{i.titulo}</b>{i.ajuda ? <span className="selo alerta" style={{ marginLeft: 6 }}>pediu ajuda</span> : null}</span>
                <small className="mudo">{dataHora(i.quando)}{i.extra ? ` · ${i.extra}` : ""}</small>
              </div>
              {i.texto && <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>{i.texto}</p>}
              {(i.arquivos ?? []).map((a) => <AnexoDaMensagem key={a.caminho} a={a} />)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Contatos /></Suspense>;
}
