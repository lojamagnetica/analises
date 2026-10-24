"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import {
  CAMPOS, CLASSE_TIPO, REGRAS, TIPOS, buscarClientes, classificar, clienteRemover, clienteSalvar, contarTipos, detectarColunas, diaMes,
  importar, lerTabela, linhasDaTabela, planoImportacao, semAcento, telefoneBonito,
  type Campo, type Cliente, type Linha, type TipoOuSem,
} from "@/lib/clientes";

const PASSO = 100;

export default function MinhasClientes() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarClientes(portal.id), [portal.id]);
  const [busca, setBusca] = useState("");
  const [loja, setLoja] = useState("");
  const [tipo, setTipo] = useState<TipoOuSem | "">("");
  const [editando, setEditando] = useState<Cliente | "nova" | null>(null);
  const [importando, setImportando] = useState(false);
  const [mostrar, setMostrar] = useState(PASSO);
  const ref = hoje();
  const leituras = useMemo(() => classificar(dados ?? [], ref), [dados, ref]);
  if (!dados) return <Carregando />;

  const lojas = portal.lojas ?? [];
  const varias = lojas.length > 1;
  const daLoja = dados.filter((c) => !loja || c.loja === loja);
  const n = contarTipos(leituras, daLoja.map((c) => c.id));
  const termo = semAcento(busca);
  const lista = daLoja
    .filter((c) => !tipo || leituras.get(c.id)?.tipo === tipo)
    .filter((c) => !termo || semAcento(c.nome).includes(termo));

  return (
    <>
      <Titulo titulo="Minhas clientes" sub="De cliente a fã: quem compra com você, quando comprou pela última vez e quanto já gastou. O Hub separa cada cliente por tipo para você saber com quem falar." />

      <div className="grade g3 mb" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {([
          ["/clientes/tipos", "Ações por tipo", "O que fazer com cada grupo e a mensagem pronta"],
          ["/clientes/resgate", "Resgate", "Quem sumiu, com a mensagem para chamar de volta"],
          ["/clientes/campanhas", "Top 10 campanhas", "Campanhas para a cliente voltar e comprar mais"],
          ["/clientes/experiencia", "Experiência do cliente", "Antes, durante e depois da compra"],
        ] as const).map(([href, t, s]) => (
          <Link key={href} href={href} className="card card-borda" style={{ textDecoration: "none", color: "inherit" }}>
            <b style={{ color: "var(--ink)" }}>{t}</b><div className="mudo" style={{ fontSize: 13.5 }}>{s}</div>
          </Link>
        ))}
      </div>

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

      <div className="secao">Seus tipos de cliente</div>
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        {TIPOS.map((t) => (
          <button key={t} type="button" className="card kpi" aria-pressed={tipo === t} onClick={() => { setTipo(tipo === t ? "" : t); setMostrar(PASSO); }}
            style={{ textAlign: "left", cursor: "pointer", font: "inherit", borderColor: tipo === t ? "var(--red)" : undefined }}>
            <b>{n[t]}</b>
            <span className={`selo ${CLASSE_TIPO[t]}`} style={{ margin: "4px 0 6px" }}>{t}</span>
            <small style={{ display: "block", fontSize: 12.5 }}>{REGRAS[t]}</small>
          </button>
        ))}
      </div>
      {n["Sem data"] > 0 && (
        <p className="ajuda">
          <button type="button" className="chip" aria-pressed={tipo === "Sem data"} onClick={() => setTipo(tipo === "Sem data" ? "" : "Sem data")}>
            {n["Sem data"]} sem data da última compra
          </button>{" "}
          {REGRAS["Sem data"]}
        </p>
      )}

      <div className="linha entre" style={{ margin: "28px 0 12px" }}>
        <div className="secao" style={{ margin: 0 }}>
          {tipo ? `${tipo} · ` : ""}{lista.length} {lista.length === 1 ? "cliente" : "clientes"}
          {tipo && <button type="button" className="btn s peq" style={{ marginLeft: 8 }} onClick={() => setTipo("")}>ver todas</button>}
        </div>
        <div className="linha">
          <button className="btn s" type="button" onClick={() => { setImportando(!importando); setEditando(null); }}>Importar planilha</button>
          <button className="btn p" type="button" onClick={() => { setEditando(editando === "nova" ? null : "nova"); setImportando(false); }}>+ Adicionar cliente</button>
        </div>
      </div>

      {importando && (
        <Importar portalId={portal.id} existentes={dados} lojas={lojas} lojaInicial={loja || lojas[0] || ""}
          aoTerminar={() => { setImportando(false); recarregar(); }} />
      )}
      {editando && (
        <FormCliente key={editando === "nova" ? "nova" : editando.id} c={editando === "nova" ? null : editando} lojas={lojas} lojaInicial={loja || lojas[0] || ""}
          salvar={async (f) => { await clienteSalvar(portal.id, editando === "nova" ? null : editando.id, f); setEditando(null); recarregar(); }}
          cancelar={() => setEditando(null)} />
      )}

      <input type="text" placeholder="Buscar pelo nome" value={busca} onChange={(e) => { setBusca(e.target.value); setMostrar(PASSO); }} className="mb" aria-label="Buscar pelo nome" />

      {dados.length === 0 ? (
        <div className="card">
          <h2>Comece pela sua base de clientes</h2>
          <p className="mudo">Exporte a lista de clientes do sistema da loja e use &quot;Importar planilha&quot;, ou cadastre uma por uma. Com a data da última compra, o número de compras e o total gasto, o Hub mostra quem é nova, recorrente, VIP, em risco ou sumida.</p>
        </div>
      ) : lista.length === 0 ? (
        <div className="card mudo">Nenhuma cliente encontrada.</div>
      ) : (
        <div className="card tabela-wrap" style={{ padding: 8 }}>
          <table className="tabela">
            <thead>
              <tr><th>Cliente</th><th>Tipo</th><th>Última compra</th><th>Compras</th><th>Total</th><th>Vendedora</th><th /></tr>
            </thead>
            <tbody>
              {lista.slice(0, mostrar).map((c) => {
                const l = leituras.get(c.id);
                return (
                  <tr key={c.id}>
                    <td>
                      <b>{c.nome}</b>
                      <div className="mudo" style={{ fontSize: 12.5 }}>
                        {[telefoneBonito(c.whatsapp), c.aniversario ? `aniversário ${diaMes(c.aniversario)}` : "", varias ? c.loja ?? "sem loja" : ""].filter(Boolean).join(" · ") || "—"}
                      </div>
                      {c.obs && <div className="ajuda" style={{ margin: 0 }}>{c.obs}</div>}
                    </td>
                    <td>{l && <span className={`selo ${CLASSE_TIPO[l.tipo]}`}>{l.tipo}</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{dia(c.ultima_compra)}{l?.dias != null && <div className="mudo" style={{ fontSize: 12.5 }}>{l.dias <= 0 ? "hoje" : `há ${l.dias} dias`}</div>}</td>
                    <td>{c.n_compras}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{moeda(Number(c.total))}</td>
                    <td>{c.vendedora ?? "—"}</td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <button type="button" className="btn s peq" onClick={() => { setEditando(c); setImportando(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>{" "}
                      <button type="button" className="btn s peq" aria-label={`Remover ${c.nome}`}
                        onClick={async () => { if (confirm(`Remover ${c.nome} da base?`)) { await clienteRemover(c.id); recarregar(); } }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lista.length > mostrar && (
            <div className="linha" style={{ justifyContent: "center", padding: 12 }}>
              <button type="button" className="btn s" onClick={() => setMostrar(mostrar + PASSO)}>Mostrar mais ({lista.length - mostrar})</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function FormCliente({ c, lojas, lojaInicial, salvar, cancelar }: {
  c: Cliente | null; lojas: string[]; lojaInicial: string; salvar: (f: FormData) => Promise<void>; cancelar: () => void;
}) {
  const [erro, setErro] = useState("");
  return (
    <form className="card mb" onSubmit={async (e) => {
      e.preventDefault();
      setErro("");
      try { await salvar(new FormData(e.currentTarget)); } catch (x) { setErro((x as Error).message); }
    }}>
      <h3>{c ? `Editar ${c.nome}` : "Nova cliente"}</h3>
      <div className="grade g3" style={{ gap: "0 16px" }}>
        <div><label className="rotulo" htmlFor="c-nome">Nome</label><input id="c-nome" name="nome" type="text" defaultValue={c?.nome ?? ""} required /></div>
        <div><label className="rotulo" htmlFor="c-whats">WhatsApp</label><input id="c-whats" name="whatsapp" type="text" inputMode="tel" placeholder="(81) 99999-0000" defaultValue={c?.whatsapp ?? ""} /></div>
        <div><label className="rotulo" htmlFor="c-aniv">Aniversário (opcional)</label><input id="c-aniv" name="aniversario" type="text" placeholder="dd/mm" defaultValue={c?.aniversario ? diaMes(c.aniversario) : ""} /></div>
        <div><label className="rotulo" htmlFor="c-ultima">Data da última compra</label><input id="c-ultima" name="ultima_compra" type="date" defaultValue={c?.ultima_compra ?? ""} /></div>
        <div><label className="rotulo" htmlFor="c-n">Número de compras</label><input id="c-n" name="n_compras" type="number" min={0} defaultValue={c?.n_compras ?? 1} /></div>
        <div><label className="rotulo" htmlFor="c-total">Total gasto (R$)</label><input id="c-total" name="total" type="text" inputMode="decimal" placeholder="0,00" defaultValue={c ? String(c.total).replace(".", ",") : ""} /></div>
        <div><label className="rotulo" htmlFor="c-vend">Vendedora</label><input id="c-vend" name="vendedora" type="text" defaultValue={c?.vendedora ?? ""} /></div>
        {lojas.length > 1 && (
          <div>
            <label className="rotulo" htmlFor="c-loja">Loja</label>
            <select id="c-loja" name="loja" defaultValue={c ? c.loja ?? "" : lojaInicial}>
              {lojas.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        )}
      </div>
      <label className="rotulo" htmlFor="c-obs">Observação</label>
      <textarea id="c-obs" name="obs" defaultValue={c?.obs ?? ""} placeholder="Tamanho, estilo, o que ela gosta…" style={{ minHeight: 60 }} />
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt">
        <button className="btn p" type="submit">Salvar</button>
        <button className="btn s" type="button" onClick={cancelar}>Cancelar</button>
      </div>
    </form>
  );
}

/** Arquivo do sistema da loja: tenta UTF-8 e, se não der, o padrão do Windows (comum em exportações). */
async function lerArquivo(f: File) {
  const buf = await f.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { return new TextDecoder("windows-1252").decode(buf); }
}

function Importar({ portalId, existentes, lojas, lojaInicial, aoTerminar }: {
  portalId: string; existentes: Cliente[]; lojas: string[]; lojaInicial: string; aoTerminar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [tab, setTab] = useState<string[][] | null>(null);
  const [colunas, setColunas] = useState<(Campo | null)[]>([]);
  const [lojaPadrao, setLojaPadrao] = useState(lojaInicial);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const varias = lojas.length > 1;

  const ler = (t: string) => {
    setErro("");
    const linhas = lerTabela(t);
    if (linhas.length < 2) { setTab(null); setErro("Não encontrei linhas. A primeira linha precisa ter os nomes das colunas (nome, telefone, última compra…)."); return; }
    setTab(linhas);
    setColunas(detectarColunas(linhas[0]));
  };

  const lojaDe = (l: Linha) => {
    if (!varias) return null;
    const achada = l.loja ? lojas.find((x) => semAcento(x) === semAcento(l.loja!)) : undefined;
    return achada ?? lojaPadrao;
  };
  const lido = tab && colunas.includes("nome") ? linhasDaTabela(tab, colunas) : null;
  const plano = lido ? planoImportacao(existentes, lido.linhas, lojaDe) : null;
  const previa = plano ? [...plano.inserir.map((c) => ({ ...c, nova: true })), ...plano.atualizar.map((c) => ({ ...c, nova: false }))] : [];

  return (
    <div className="card mb">
      <h3>Importar planilha</h3>
      <p className="mudo" style={{ marginTop: -4 }}>
        Exporte a lista de clientes do sistema da loja. Cole aqui (copiando do Excel ou do Google Planilhas) ou escolha o arquivo .csv.
        A primeira linha precisa ter os nomes das colunas. Nada é salvo antes de você conferir.
      </p>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={"Nome;Celular;Última compra;Compras;Total\nAna Exemplo;(81) 99999-0000;12/09/2026;3;R$ 890,00"} style={{ fontFamily: "monospace", fontSize: 13 }} />
      <div className="linha mt">
        <button type="button" className="btn p peq" onClick={() => ler(texto)} disabled={!texto.trim()}>Ler o que colei</button>
        <label className="btn s peq" style={{ cursor: "pointer" }}>
          Escolher arquivo .csv
          <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" hidden
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const t = await lerArquivo(f); setTexto(t); ler(t); } e.target.value = ""; }} />
        </label>
        <span className="ajuda" style={{ margin: 0 }}>Arquivo .xlsx: abra, selecione tudo, copie e cole aqui, ou salve como CSV.</span>
      </div>
      {erro && <div className="aviso mt">{erro}</div>}

      {tab && (
        <>
          <div className="secao">Confira as colunas</div>
          <p className="ajuda" style={{ marginTop: -6 }}>O Hub reconheceu as colunas pelo nome. Corrija o que estiver errado ou marque &quot;não usar&quot;.</p>
          <div className="grade g3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {tab[0].map((cab, i) => (
              <div key={i}>
                <label className="rotulo" style={{ marginTop: 0 }} htmlFor={`col-${i}`}>{cab || `Coluna ${i + 1}`}</label>
                <select id={`col-${i}`} value={colunas[i] ?? ""}
                  onChange={(e) => {
                    const v = (e.target.value || null) as Campo | null;
                    setColunas(colunas.map((c, j) => (j === i ? v : c === v ? null : c)));
                  }}>
                  <option value="">não usar</option>
                  {CAMPOS.map((c) => <option key={c.campo} value={c.campo}>{c.rotulo}</option>)}
                </select>
                <div className="ajuda" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>ex.: {tab[1]?.[i] || "—"}</div>
              </div>
            ))}
          </div>
          {varias && (
            <>
              <label className="rotulo" htmlFor="imp-loja">De qual loja são estas clientes?</label>
              <select id="imp-loja" value={lojaPadrao} onChange={(e) => setLojaPadrao(e.target.value)} style={{ maxWidth: 320 }}>
                {lojas.map((l) => <option key={l}>{l}</option>)}
              </select>
              {colunas.includes("loja") && <div className="ajuda">Quando a coluna Loja tiver o nome de uma das lojas, vale o que está na planilha.</div>}
            </>
          )}

          {!colunas.includes("nome") ? (
            <div className="aviso mt">Escolha qual coluna tem o nome da cliente.</div>
          ) : plano && lido && (
            <>
              <div className="secao">Prévia</div>
              <p style={{ marginTop: -6 }}>
                <b>{plano.inserir.length}</b> {plano.inserir.length === 1 ? "cliente nova" : "clientes novas"} · <b>{plano.atualizar.length}</b> já {plano.atualizar.length === 1 ? "está" : "estão"} na base e {plano.atualizar.length === 1 ? "será atualizada" : "serão atualizadas"}
                {lido.ignoradas > 0 && <> · {lido.ignoradas} {lido.ignoradas === 1 ? "linha sem nome ficou" : "linhas sem nome ficaram"} de fora</>}
              </p>
              <p className="ajuda">
                Planilha com uma linha por venda? O Hub junta as vendas da mesma cliente (mesmo WhatsApp ou mesmo nome). Quem já está na base
                mantém o que foi anotado, e compras, total e última compra nunca diminuem.
              </p>
              {!colunas.includes("ultima_compra") && <div className="aviso mb">Sem a coluna da última compra, as clientes ficam &quot;sem data&quot; e não entram nos tipos.</div>}
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead><tr><th /><th>Nome</th><th>WhatsApp</th><th>Última compra</th><th>Compras</th><th>Total</th>{varias && <th>Loja</th>}</tr></thead>
                  <tbody>
                    {previa.slice(0, 12).map((c, i) => (
                      <tr key={i}>
                        <td><span className={`selo ${c.nova ? "feito" : "espera"}`}>{c.nova ? "nova" : "atualiza"}</span></td>
                        <td><b>{c.nome}</b></td><td>{telefoneBonito(c.whatsapp) || "—"}</td><td>{dia(c.ultima_compra)}</td>
                        <td>{c.n_compras}</td><td>{moeda(Number(c.total))}</td>{varias && <td>{c.loja ?? "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previa.length > 12 && <p className="ajuda">E mais {previa.length - 12}.</p>}
              <div className="linha mt">
                <button type="button" className="btn p" disabled={salvando || !previa.length}
                  onClick={async () => {
                    setSalvando(true); setErro("");
                    try { await importar(portalId, plano); aoTerminar(); } catch (e) { setErro((e as Error).message); } finally { setSalvando(false); }
                  }}>
                  {salvando ? "Salvando…" : `Salvar ${previa.length} ${previa.length === 1 ? "cliente" : "clientes"}`}
                </button>
                <button type="button" className="btn s" onClick={() => { setTab(null); setTexto(""); }}>Começar de novo</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
