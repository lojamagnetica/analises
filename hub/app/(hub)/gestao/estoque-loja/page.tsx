"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { CampoReais } from "@/components/CampoReais";
import { Excluir } from "@/components/Excluir";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, moeda } from "@/lib/formato";
import {
  CATEGORIAS, LINHAS, buscarEstoque, entradaEstoque, removerItemEstoque, salvarItemEstoque, type ItemEstoque,
} from "@/lib/loja-na-mao";

type Form = { id?: string; categoria: string; linha: string; preco: number; qtd: string; obs: string };
const NUM = { fontVariantNumeric: "tabular-nums" } as const;

export default function EstoqueDaLoja() {
  const { portal } = usePortal();
  const [f, setF] = useState<Form>({ categoria: "", linha: "", preco: 0, qtd: "", obs: "" });
  const [chave, setChave] = useState(0);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const { dados, recarregar } = useDados(() => buscarEstoque(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const itens = dados;
  const mudar = (x: Partial<Form>) => setF((a) => ({ ...a, ...x }));
  const pecas = itens.reduce((s, i) => s + Math.max(0, i.atual), 0);
  const valor = itens.reduce((s, i) => s + Math.max(0, i.atual) * i.preco, 0);
  const acabando = itens.filter((i) => i.atual <= 2);
  const porTipo = CATEGORIAS.concat([...new Set(itens.map((i) => i.categoria))].filter((c) => !CATEGORIAS.includes(c)))
    .map((c) => ({ c, lista: itens.filter((i) => i.categoria === c) })).filter((x) => x.lista.length);

  async function salvar() {
    setErro(""); setAviso("");
    try {
      await salvarItemEstoque(portal.id, { id: f.id, categoria: f.categoria, linha: f.linha || null, preco: f.preco, qtd: Number(f.qtd), obs: f.obs });
      setAviso(`${f.categoria}${f.linha ? ` · ${f.linha}` : ""} · ${moeda(f.preco)} · ${f.qtd} ${Number(f.qtd) === 1 ? "peça" : "peças"} ✓ Pode lançar o próximo preço.`);
      // Continua no mesmo tipo e linha: a contagem é preço a preço.
      setF({ categoria: f.categoria, linha: f.linha, preco: 0, qtd: "", obs: "" }); setChave((k) => k + 1);
      recarregar();
    } catch (x) { setErro((x as Error).message); }
  }

  async function perguntar(texto: string, fazer: (n: number) => Promise<unknown>) {
    const r = prompt(texto);
    if (r == null) return;
    const n = Number(r.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) { alert("Escreva só o número."); return; }
    try { await fazer(n); recarregar(); } catch (x) { alert((x as Error).message); }
  }

  return (
    <>
      <Titulo titulo="Estoque" sub="Conte por tipo de peça, linha e preço, sem cadastrar peça a peça. Ex.: anéis de prata a R$ 89, 10 peças. Cada venda registrada com o grupo do estoque já baixa sozinha." />
      <div className="grade g3 mb" style={{ gap: 12, ...NUM }}>
        <div className="card"><div className="mudo">Peças na loja</div><div style={{ fontSize: 26, fontWeight: 800 }}>{pecas}</div><div className="mudo" style={{ fontSize: 13 }}>{itens.length} {itens.length === 1 ? "grupo" : "grupos"} contados</div></div>
        <div className="card"><div className="mudo">Valor em estoque (preço de venda)</div><div style={{ fontSize: 26, fontWeight: 800 }}>{moeda(valor)}</div></div>
        <div className="card card-borda" style={{ ["--c" as string]: acabando.length ? "var(--orange)" : "var(--green)" }}><div className="mudo">Acabando (2 peças ou menos)</div><div style={{ fontSize: 26, fontWeight: 800 }}>{acabando.length}</div><div className="mudo" style={{ fontSize: 13 }}>{acabando.length ? "veja antes da próxima compra" : "nada acabando"}</div></div>
      </div>

      <div className="card mb" style={{ maxWidth: 620 }}>
        <h2 style={{ marginTop: 0 }}>{f.id ? "Corrigir grupo" : "Contar"}</h2>
        <label className="rotulo">Tipo de peça</label>
        <div className="chips">{CATEGORIAS.filter((c) => c !== "Outro").concat("Outro").map((c) => <button key={c} type="button" className={`chip ${f.categoria === c ? "escolhido" : ""}`} onClick={() => mudar({ categoria: c })}>{c}</button>)}</div>
        <label className="rotulo">Linha</label>
        <div className="chips">{LINHAS.map((l) => <button key={l} type="button" className={`chip ${f.linha === l ? "escolhido" : ""}`} onClick={() => mudar({ linha: f.linha === l ? "" : l })}>{l}</button>)}</div>
        <div className="grade" style={{ gridTemplateColumns: "1fr 120px", gap: 10 }} key={chave}>
          <CampoReais rotulo="Preço de venda" valor={f.preco} mudar={(v) => mudar({ preco: v })} vazio />
          <div><label className="rotulo">Quantas peças</label><input type="number" inputMode="numeric" min={0} value={f.qtd} onChange={(e) => mudar({ qtd: e.target.value })} /></div>
        </div>
        <label className="rotulo">Observação (opcional)</label>
        <input type="text" value={f.obs} placeholder="Ex.: modelo solitário, vitrine 2" onChange={(e) => mudar({ obs: e.target.value })} />
        {erro && <div className="aviso mt">{erro}</div>}
        {aviso && <div className="aviso ok mt">{aviso}</div>}
        <div className="linha mt" style={{ gap: 8 }}>
          <button type="button" className="btn p" onClick={salvar}>{f.id ? "Salvar correção" : "Salvar e lançar o próximo"}</button>
          {f.id && <button type="button" className="btn s" onClick={() => { setF({ categoria: "", linha: "", preco: 0, qtd: "", obs: "" }); setChave((k) => k + 1); }}>Cancelar</button>}
        </div>
        <p className="ajuda" style={{ marginBottom: 0 }}>Não sabe o número exato? Coloque o que você acha: dá para contar de novo depois. O que importa é começar.</p>
      </div>

      {porTipo.length === 0 && <p className="mudo">Nenhum grupo contado ainda. Comece pelo tipo de peça que mais vende.</p>}
      {porTipo.map(({ c, lista }) => {
        const tot = lista.reduce((s, i) => s + Math.max(0, i.atual), 0);
        return (
          <div key={c} className="card mb">
            <div className="linha entre"><h3 style={{ margin: 0 }}>{c}</h3><span className="mudo" style={NUM}>{tot} {tot === 1 ? "peça" : "peças"} · {moeda(lista.reduce((s, i) => s + Math.max(0, i.atual) * i.preco, 0))}</span></div>
            {lista.map((i: ItemEstoque) => (
              <div key={i.id} className="linha entre" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", gap: 10, flexWrap: "wrap" }}>
                <div style={NUM}>
                  <b>{moeda(i.preco)}</b>{i.linha ? ` · ${i.linha}` : ""}{i.obs ? <span className="mudo"> · {i.obs}</span> : null}
                  <div className="mudo" style={{ fontSize: 13 }}>
                    Tem <b style={{ color: i.atual <= 2 ? "var(--red)" : "var(--ink)" }}>{i.atual}</b> · contou {i.qtd} em {dia(i.contado_em)}{i.entradas ? ` · chegaram ${i.entradas}` : ""}{i.vendidas ? ` · vendeu ${i.vendidas}` : ""}
                  </div>
                </div>
                <div className="linha" style={{ gap: 12, flexWrap: "wrap" }}>
                  <button type="button" className="link-loja" onClick={() => perguntar(`Quantas peças de ${c} ${moeda(i.preco)} chegaram?`, (n) => entradaEstoque(i, n))}>+ chegou</button>
                  <button type="button" className="link-loja" onClick={() => perguntar(`Contando de novo: quantas peças de ${c} ${moeda(i.preco)} tem agora?`, (n) => salvarItemEstoque(portal.id, { ...i, qtd: n, recontar: true }))}>contar de novo</button>
                  <button type="button" className="link-loja" onClick={() => { setF({ id: i.id, categoria: i.categoria, linha: i.linha ?? "", preco: i.preco, qtd: String(i.qtd), obs: i.obs ?? "" }); setChave((k) => k + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>editar</button>
                  <Excluir pergunta={`Excluir o grupo ${c} ${moeda(i.preco)} do estoque?`} fazer={() => removerItemEstoque(i.id)} aoFim={recarregar} />
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
