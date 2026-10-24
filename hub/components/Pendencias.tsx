"use client";

import { useState } from "react";
import { Copiar } from "@/components/Copiar";
import { dataHora } from "@/lib/formato";
import { Carregando, useDados } from "@/lib/hub";
import {
  STATUS_PEND, aberta, buscarPendencias, classePend, marcarPendencia, mensagemParaLoja, novaPendencia,
  type Pendencia, type PortalPend, type Quem, type StatusPend,
} from "@/lib/pendencias";

/** A lista de pendências de um portal, com o andamento de cada item e a mensagem pronta para a loja. */
export function ListaPendencias({ p, nome, recarregar, mostrarResolvidas = false }: { p: PortalPend; nome: string; recarregar: () => void; mostrarResolvidas?: boolean }) {
  const [erro, setErro] = useState("");
  const [texto, setTexto] = useState("");
  const [quem, setQuem] = useState<Quem>("Loja");
  const [verTodas, setVerTodas] = useState(mostrarResolvidas);
  const fazer = async (f: () => Promise<void>) => {
    setErro("");
    try { await f(); recarregar(); } catch (e) { setErro(e instanceof Error ? e.message : "Não deu certo."); }
  };
  const visiveis = verTodas ? p.pendencias : p.pendencias.filter(aberta);
  const daLoja = p.pendencias.filter((x) => x.quem === "Loja" && aberta(x));
  const resolvidas = p.pendencias.length - p.pendencias.filter(aberta).length;

  const Item = ({ x }: { x: Pendencia }) => (
    <div className="pend">
      <div style={{ minWidth: 0 }}>
        <div className="linha" style={{ gap: 6 }}>
          <span className={`selo ${x.quem === "Loja" ? "andamento" : "espera"}`}>{x.quem === "Loja" ? "Pedir à loja" : "Equipe"}</span>
          <b>{x.texto}</b>
        </div>
        {x.detalhe && <small className="mudo" style={{ display: "block", marginTop: 4 }}>Falta: {x.detalhe}</small>}
        {x.por_nome && x.updated_at && <small className="mudo" style={{ display: "block", marginTop: 2 }}>{STATUS_PEND.find((s) => s.v === x.status)?.rotulo} · {x.por_nome}, {dataHora(x.updated_at)}</small>}
        <input
          type="text" className="mt" placeholder="Anotação (ex.: pedido no WhatsApp em 25/10)" defaultValue={x.obs}
          onBlur={(e) => { if (e.target.value !== x.obs) fazer(() => marcarPendencia(p.id, x, { obs: e.target.value, status: x.status }, nome)); }}
        />
      </div>
      <select
        value={x.status} aria-label="Andamento" className={`sel-${classePend(x.status)}`}
        onChange={(e) => fazer(() => marcarPendencia(p.id, x, { status: e.target.value as StatusPend, obs: x.obs }, nome))}
      >
        {STATUS_PEND.map((s) => <option key={s.v} value={s.v}>{s.rotulo}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      {erro && <div className="aviso mb">{erro}</div>}
      {visiveis.length === 0 && <p className="mudo">Nada pendente{resolvidas ? "" : " neste portal"}.</p>}
      {visiveis.map((x) => <Item key={x.chave} x={x} />)}
      <div className="linha mt" style={{ gap: 8 }}>
        {daLoja.length > 0 && <Copiar texto={mensagemParaLoja(p)} rotulo="Copiar mensagem para a loja" />}
        {resolvidas > 0 && <button type="button" className="btn s peq" onClick={() => setVerTodas(!verTodas)}>{verTodas ? "Esconder resolvidas" : `Ver resolvidas (${resolvidas})`}</button>}
      </div>
      <div className="linha mt" style={{ gap: 8 }}>
        <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nova pendência (ex.: relatório de vendas de 16/06 a 14/10)" style={{ flex: 1, minWidth: 220 }} />
        <select value={quem} onChange={(e) => setQuem(e.target.value as Quem)} style={{ maxWidth: 150 }}>
          <option value="Loja">Pedir à loja</option><option value="Equipe">Equipe</option>
        </select>
        <button type="button" className="btn p peq" onClick={() => fazer(async () => { await novaPendencia(p.id, texto, quem, nome); setTexto(""); })}>Adicionar</button>
      </div>
    </div>
  );
}

/** Bloco "Pendências" no fim do portal (equipe): carrega sozinho. */
export function PendenciasDoPortal({ portalId, nome }: { portalId: string; nome: string }) {
  const { dados, recarregar } = useDados(() => buscarPendencias(portalId), [portalId]);
  const p = dados?.[0];
  const abertas = p ? p.pendencias.filter(aberta).length : 0;
  return (
    <div className="card mt" id="pendencias">
      <div className="linha entre">
        <h2 style={{ margin: 0 }}>Pendências</h2>
        {p && <span className={`selo ${abertas ? "alerta" : "feito"}`}>{abertas ? `${abertas} em aberto` : "tudo em dia"}</span>}
      </div>
      <p className="ajuda" style={{ margin: "4px 0 12px" }}>O que falta para este portal ficar completo. Os itens automáticos somem sozinhos quando o dado entra no Hub.</p>
      {!dados ? <Carregando /> : p ? <ListaPendencias p={p} nome={nome} recarregar={recarregar} /> : <p className="mudo">Portal inativo.</p>}
    </div>
  );
}
