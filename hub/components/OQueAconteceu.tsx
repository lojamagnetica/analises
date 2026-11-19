"use client";

// "O que aconteceu?": as opções de cada item do dia da CS. Toda opção grava no histórico da loja.
import { useState } from "react";
import { RESULTADOS, registrarResultado, type Registro, type Resultado } from "@/lib/contato-resultado";
import { CANAIS } from "@/lib/contatos";
import { useEquipe } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";

export function OQueAconteceu({ registro, feito, inicial, comCanal = false, rotulo = "O que aconteceu?" }: {
  registro: Registro; feito: (resultado: Resultado, retomar: string | null) => void; inicial?: Resultado; comCanal?: boolean; rotulo?: string;
}) {
  const { nome, userId } = useEquipe();
  const [aberto, setAberto] = useState(!!inicial);
  const [res, setRes] = useState<Resultado>(inicial ?? "conversei");
  const [texto, setTexto] = useState("");
  const [ajuda, setAjuda] = useState(false);
  const [passo, setPasso] = useState("");
  const [proximoEm, setProximoEm] = useState("");
  const [retomarEm, setRetomarEm] = useState("");
  const [canal, setCanal] = useState<string>("WhatsApp");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const op = RESULTADOS.find((x) => x.chave === res)!;

  if (!aberto) return <button type="button" className="btn s peq" onClick={() => setAberto(true)}>{rotulo}</button>;

  const salvar = async () => {
    if (op.obrigatorio && !texto.trim()) { setErro(`Escreva: ${op.campo.toLowerCase()}.`); return; }
    setSalvando(true); setErro("");
    try {
      const retomar = await registrarResultado(registro, { resultado: res, texto, ajuda, passo, proximoEm, retomarEm, canal: comCanal ? canal : undefined }, { id: userId, nome });
      feito(res, retomar);
    } catch (e) { setErro((e as Error).message); }
    setSalvando(false);
  };

  return (
    <div className="card mt" style={{ background: "var(--soft)", width: "100%" }}>
      <div className="chips" role="group" aria-label="O que aconteceu">
        {RESULTADOS.map((x) => (
          <button key={x.chave} type="button" className={`chip${res === x.chave ? " escolhido" : ""}`} aria-pressed={res === x.chave} onClick={() => { setRes(x.chave); setErro(""); }}>{x.rotulo}</button>
        ))}
      </div>
      {comCanal && res !== "nao_necessario" && res !== "loja_resolveu" && res !== "para_camilla" && (
        <div className="chips mt" role="group" aria-label="Canal">
          {CANAIS.map((c) => <button key={c} type="button" className={`chip${canal === c ? " escolhido" : ""}`} onClick={() => setCanal(c)}>{c}</button>)}
        </div>
      )}
      <label className="rotulo mt">{op.campo}{op.obrigatorio ? "" : ""}</label>
      <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={op.dica} />
      {res === "conversei" && (
        <>
          <label className="marcar"><input type="checkbox" checked={ajuda} onChange={(e) => setAjuda(e.target.checked)} /><span>Tem uma dificuldade em que precisamos ajudar</span></label>
          <div className="grade g2" style={{ gap: 10 }}>
            <div><label className="rotulo">Próximo passo (opcional)</label><input type="text" value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="Ex.: confirmar a reunião de sexta" /></div>
            <div><label className="rotulo">Quando</label><input type="date" value={proximoEm} min={hoje()} onChange={(e) => setProximoEm(e.target.value)} /></div>
          </div>
        </>
      )}
      {op.data && (
        <div style={{ maxWidth: 220 }}>
          <label className="rotulo">{res === "adiado" ? "Adiar até" : "Tentar de novo em"}</label>
          <input type="date" value={retomarEm || somarDias(hoje(), op.volta ?? 1)} min={somarDias(hoje(), 1)} onChange={(e) => setRetomarEm(e.target.value)} />
        </div>
      )}
      {res === "aguardando" && <p className="ajuda" style={{ margin: "4px 0 0" }}>Se a loja não responder, o item volta amanhã.</p>}
      {res === "para_camilla" && <p className="ajuda" style={{ margin: "4px 0 0" }}>Sai da sua lista e vai para os lembretes da Camilla, com o que você escreveu.</p>}
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar"}</button>
        <button type="button" className="btn s peq" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
      <small className="mudo">Fica no histórico da loja{registro.loja ? ` (${registro.loja})` : ""}.</small>
    </div>
  );
}
