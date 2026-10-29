"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { Icone } from "@/components/Icone";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import {
  CLASSE_TIPO, REGRAS, buscarClientes, buscarMetodoClientes, classificar, contatada, estadoConteudo, lerValor, linkWhats,
  marcarContato, mensagemDoTipo, registrarCompra, resumoResgate, type Cliente,
} from "@/lib/clientes";

const PASSO = 50;
type Filtro = "todas" | "falta" | "mandei";

export default function Resgate() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(async () => {
    const [cs, m] = await Promise.all([buscarClientes(portal.id), buscarMetodoClientes()]);
    return { cs, m };
  }, [portal.id]);
  // Alterações feitas aqui entram na hora, sem buscar a base inteira de novo.
  const [ajustes, setAjustes] = useState<Record<string, Partial<Cliente>>>({});
  const [loja, setLoja] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [mostrar, setMostrar] = useState(PASSO);
  const [compra, setCompra] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const ref = hoje();
  const cs = useMemo(() => (dados?.cs ?? []).map((c) => (ajustes[c.id] ? { ...c, ...ajustes[c.id] } : c)), [dados, ajustes]);
  const leituras = useMemo(() => classificar(cs, ref), [cs, ref]);
  if (!dados) return <Carregando />;

  const { m } = dados;
  const estado = estadoConteudo(m, equipe);
  const lojas = portal.lojas ?? [];
  const varias = lojas.length > 1;
  const daLoja = cs.filter((c) => !loja || c.loja === loja);
  const emResgate = daLoja
    .filter((c) => { const t = leituras.get(c.id)?.tipo; return t === "Em risco" || t === "Sumida"; })
    .sort((a, b) => (a.ultima_compra ?? "").localeCompare(b.ultima_compra ?? ""));
  const lista = emResgate.filter((c) => filtro === "todas" || (filtro === "mandei") === contatada(c));
  const faltam = emResgate.filter((c) => !contatada(c)).length;
  const { resgatadasMes, contatadasSemana } = resumoResgate(daLoja, ref);
  const ajustar = (id: string, p: Partial<Cliente>) => setAjustes((a) => ({ ...a, [id]: { ...a[id], ...p } }));

  return (
    <>
      <Titulo titulo="Resgate" voltar={{ href: "/clientes", rotulo: "Minhas clientes" }}
        sub={(estado !== "preparo" && m?.textos?.resgate_sub) || "Clientes que não compram há mais de 90 dias, da mais antiga para a mais recente. Mande a mensagem, marque quem recebeu e acompanhe quem voltou."} />

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

      <div className="grade g3 mb">
        <div className="card kpi card-borda"><b>{resgatadasMes.length}</b><small>{resgatadasMes.length === 1 ? "cliente resgatada" : "clientes resgatadas"} este mês</small></div>
        <div className="card kpi"><b>{contatadasSemana}</b><small>{contatadasSemana === 1 ? "mensagem mandada" : "mensagens mandadas"} esta semana</small></div>
        <div className="card kpi"><b>{faltam}</b><small>{faltam === 1 ? "cliente ainda sem mensagem" : "clientes ainda sem mensagem"}</small></div>
      </div>
      <p className="ajuda" style={{ marginTop: -6 }}>
        <span className={`selo ${CLASSE_TIPO["Em risco"]}`}>Em risco</span> {REGRAS["Em risco"]}{" "}
        <span className={`selo ${CLASSE_TIPO.Sumida}`}>Sumida</span> {REGRAS.Sumida}{" "}
        Conta como resgatada quando a cliente compra de novo depois da mensagem. <Link href="/clientes/tipos">O que fazer com cada tipo</Link>
      </p>

      <div className="linha mb" style={{ gap: 8 }} role="group" aria-label="Filtrar">
        {([["todas", `Todas · ${emResgate.length}`], ["falta", `Falta mandar · ${faltam}`], ["mandei", `Já mandei · ${emResgate.length - faltam}`]] as const).map(([f, r]) => (
          <button key={f} type="button" className="chip" aria-pressed={filtro === f} onClick={() => { setFiltro(f); setMostrar(PASSO); }}
            style={filtro === f ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)" } : undefined}>{r}</button>
        ))}
      </div>
      {erro && <div className="aviso mb">{erro}</div>}

      {emResgate.length === 0 ? (
        <div className="card mudo">{dados.cs.length ? "Nenhuma cliente em risco ou sumida. Continue cuidando de quem comprou nos últimos 90 dias." : "Cadastre ou importe suas clientes em Minhas clientes para ver quem precisa de resgate."}</div>
      ) : lista.length === 0 ? (
        <div className="card mudo">Nenhuma cliente neste filtro.</div>
      ) : (
        <div className="card" style={{ padding: "6px 20px" }}>
          {lista.slice(0, mostrar).map((c) => {
            const l = leituras.get(c.id)!;
            const texto = mensagemDoTipo(m, equipe, l.tipo, { nome: c.nome, loja: c.loja ?? portal.loja, consultora: c.vendedora });
            const link = linkWhats(c.whatsapp, texto);
            const mandei = contatada(c);
            return (
              <div key={c.id} className="marcar" style={{ cursor: "default", flexWrap: "wrap", alignItems: "center" }}>
                <label className="linha" style={{ gap: 8, cursor: "pointer", flexWrap: "nowrap" }}>
                  <input type="checkbox" checked={mandei} aria-label={`Mandei mensagem para ${c.nome}`}
                    onChange={async (e) => {
                      setErro("");
                      const data = e.target.checked ? ref : null;
                      try { await marcarContato(c.id, data); ajustar(c.id, { contato_em: data }); } catch (x) { setErro((x as Error).message); }
                    }} />
                  <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{mandei ? `Mandei ${dia(c.contato_em).slice(0, 5)}` : "Mandei"}</span>
                </label>
                <div style={{ minWidth: 200, flex: 1 }}>
                  <b style={{ color: "var(--ink)" }}>{c.nome}</b>{" "}
                  <span className={`selo ${CLASSE_TIPO[l.tipo]}`}>{l.tipo}</span>
                  {l.top && <> <span className="selo andamento">entre as que mais gastaram</span></>}
                  <div className="mudo" style={{ fontSize: 13 }}>
                    {[`última compra ${dia(c.ultima_compra)} (há ${l.dias} dias)`, `${c.n_compras} ${c.n_compras === 1 ? "compra" : "compras"}`, moeda(Number(c.total)), c.vendedora ?? "", varias ? c.loja ?? "" : ""].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="linha" style={{ gap: 6 }}>
                  {link
                    ? <a className="btn p peq" href={link} target="_blank" rel="noopener"><Icone nome="wpp" /> WhatsApp</a>
                    : <span className="ajuda" style={{ margin: 0 }}>sem WhatsApp</span>}
                  <Copiar texto={texto} rotulo="Copiar mensagem" />
                  {mandei && <button type="button" className="btn s peq" onClick={() => setCompra(compra === c.id ? null : c.id)}>Voltou a comprar</button>}
                </div>
                {compra === c.id && (
                  <form className="linha" style={{ width: "100%", gap: 8, paddingLeft: 27 }}
                    action={async (f) => {
                      setErro("");
                      const data = String(f.get("data") ?? "") || ref;
                      const valor = lerValor(String(f.get("valor") ?? "")) ?? 0;
                      try {
                        await registrarCompra(c, data, valor);
                        ajustar(c.id, { ultima_compra: data > (c.ultima_compra ?? "") ? data : c.ultima_compra, n_compras: c.n_compras + 1, total: Number(c.total) + valor });
                        setCompra(null);
                      } catch (x) { setErro((x as Error).message); }
                    }}>
                    <input name="data" type="date" defaultValue={ref} min={c.contato_em ?? undefined} aria-label="Data da compra" style={{ width: "auto" }} />
                    <input name="valor" type="text" inputMode="decimal" placeholder="Valor (R$)" aria-label="Valor da compra" style={{ width: 140 }} />
                    <button type="submit" className="btn p peq">Salvar compra</button>
                  </form>
                )}
              </div>
            );
          })}
          {lista.length > mostrar && (
            <div className="linha" style={{ justifyContent: "center", padding: 12 }}>
              <button type="button" className="btn s" onClick={() => setMostrar(mostrar + PASSO)}>Mostrar mais ({lista.length - mostrar})</button>
            </div>
          )}
        </div>
      )}

      {resgatadasMes.length > 0 && (
        <>
          <div className="secao">Resgatadas este mês</div>
          <div className="card" style={{ padding: "6px 20px" }}>
            {resgatadasMes.map((c) => (
              <div key={c.id} className="marcar" style={{ cursor: "default" }}>
                <Icone nome="check" />
                <div><b style={{ color: "var(--ink)" }}>{c.nome}</b>
                  <div className="mudo" style={{ fontSize: 13 }}>mensagem em {dia(c.contato_em)} · voltou em {dia(c.ultima_compra)}{c.vendedora ? ` · ${c.vendedora}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
