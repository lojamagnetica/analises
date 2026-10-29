"use client";

import { useMemo, useState } from "react";
import { RascunhoClientes } from "@/components/RascunhoClientes";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { Icone } from "@/components/Icone";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import {
  CLASSE_TIPO, MENSAGEM_SIMPLES, REGRAS, TIPOS, buscarClientes, buscarMetodoClientes, classificar, contarTipos, estadoConteudo,
  linkWhats, mensagemDoTipo, ordenarDoTipo, type Tipo,
} from "@/lib/clientes";

const PASSO = 50;

export default function AcoesPorTipo() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(async () => {
    const [cs, m] = await Promise.all([buscarClientes(portal.id), buscarMetodoClientes()]);
    return { cs, m };
  }, [portal.id]);
  const [tipo, setTipo] = useState<Tipo>("Nova");
  const [loja, setLoja] = useState("");
  const [mostrar, setMostrar] = useState(PASSO);
  const ref = hoje();
  const leituras = useMemo(() => classificar(dados?.cs ?? [], ref), [dados, ref]);
  if (!dados) return <Carregando />;

  const { m } = dados;
  const estado = estadoConteudo(m, equipe);
  const lojas = portal.lojas ?? [];
  const varias = lojas.length > 1;
  const daLoja = dados.cs.filter((c) => !loja || c.loja === loja);
  const n = contarTipos(leituras, daLoja.map((c) => c.id));
  const doTipo = ordenarDoTipo(tipo, daLoja.filter((c) => leituras.get(c.id)?.tipo === tipo));
  const conteudo = estado !== "preparo" ? m?.tipos?.[tipo] : null;

  return (
    <>
      <Titulo titulo="Ações por tipo de cliente" voltar={{ href: "/clientes", rotulo: "Minhas clientes" }}
        sub={(estado !== "preparo" && m?.textos?.tipos_sub) || "Cada tipo pede uma conversa diferente. Escolha o tipo, veja quem está nele e mande a mensagem pelo WhatsApp."} />

      {estado === "rascunho" && <RascunhoClientes />}

      {varias && (
        <div className="linha mb" style={{ gap: 8 }} role="group" aria-label="Ver por loja">
          {["", ...lojas].map((l) => (
            <button key={l || "todas"} type="button" className="chip" aria-pressed={loja === l} onClick={() => setLoja(l)}
              style={loja === l ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)" } : undefined}>
              {l || "Todas as lojas"}
            </button>
          ))}
        </div>
      )}

      <div className="linha mb" style={{ gap: 8 }} role="tablist" aria-label="Tipo de cliente">
        {TIPOS.map((t) => (
          <button key={t} type="button" role="tab" className="chip" aria-selected={tipo === t} onClick={() => { setTipo(t); setMostrar(PASSO); }}
            style={tipo === t ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)" } : undefined}>
            {t} · {n[t]}
          </button>
        ))}
      </div>

      <div className="card card-borda mb">
        <div className="linha entre">
          <h2 style={{ margin: 0 }}>{tipo}</h2>
          <span className={`selo ${CLASSE_TIPO[tipo]}`}>{n[tipo]} {n[tipo] === 1 ? "cliente" : "clientes"}</span>
        </div>
        <p className="mudo" style={{ margin: "4px 0 0" }}>{REGRAS[tipo]}</p>

        {conteudo ? (
          <div className="grade g2 mt">
            <div>
              <h3>Objetivo</h3>
              <p>{conteudo.objetivo}</p>
              <h3 style={{ marginTop: 14 }}>O que fazer</h3>
              <ul style={{ margin: 0, paddingLeft: "1.2em" }}>{conteudo.acoes.map((a) => <li key={a} style={{ marginBottom: 4 }}>{a}</li>)}</ul>
            </div>
            <div className="script">
              <h3>Mensagem modelo</h3>
              <pre>{conteudo.mensagem}</pre>
              <p className="ajuda">{"{nome}"} vira o primeiro nome da cliente e {"{loja}"} o nome da loja.</p>
            </div>
          </div>
        ) : (
          <div className="mt" style={{ background: "var(--soft)", borderRadius: 12, padding: 14 }}>
            <b>Em preparação pela equipe</b>
            <p className="mudo" style={{ margin: "4px 0 0" }}>
              Em breve aqui: o objetivo, o que fazer e a mensagem pronta para este tipo de cliente. A lista abaixo já funciona, com uma mensagem simples:
              &quot;{MENSAGEM_SIMPLES.replace("{nome}", "Ana").replace("{loja}", portal.loja)}&quot;
            </p>
          </div>
        )}
      </div>

      <div className="secao">Quem está em {tipo}</div>
      {doTipo.length === 0 ? (
        <div className="card mudo">Nenhuma cliente neste tipo agora.</div>
      ) : (
        <div className="card" style={{ padding: "6px 20px" }}>
          {doTipo.slice(0, mostrar).map((c) => {
            const texto = mensagemDoTipo(m, equipe, tipo, { nome: c.nome, loja: c.loja ?? portal.loja, consultora: c.vendedora });
            const link = linkWhats(c.whatsapp, texto);
            const l = leituras.get(c.id);
            return (
              <div key={c.id} className="marcar" style={{ cursor: "default", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ color: "var(--ink)" }}>{c.nome}</b>
                  <div className="mudo" style={{ fontSize: 13 }}>
                    {[
                      `última compra ${dia(c.ultima_compra)}${l?.dias != null && l.dias > 0 ? ` (há ${l.dias} dias)` : ""}`,
                      `${c.n_compras} ${c.n_compras === 1 ? "compra" : "compras"}`, moeda(Number(c.total)), c.vendedora ?? "", varias ? c.loja ?? "" : "",
                    ].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="linha" style={{ gap: 6 }}>
                  {link
                    ? <a className="btn p peq" href={link} target="_blank" rel="noopener"><Icone nome="wpp" /> WhatsApp</a>
                    : <span className="ajuda" style={{ margin: 0 }}>sem WhatsApp</span>}
                  <Copiar texto={texto} rotulo="Copiar mensagem" />
                </div>
              </div>
            );
          })}
          {doTipo.length > mostrar && (
            <div className="linha" style={{ justifyContent: "center", padding: 12 }}>
              <button type="button" className="btn s" onClick={() => setMostrar(mostrar + PASSO)}>Mostrar mais ({doTipo.length - mostrar})</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
