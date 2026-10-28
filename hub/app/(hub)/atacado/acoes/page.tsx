"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, moeda } from "@/lib/formato";
import { buscarAtacado, curvaAbc, diasSemPedido, registrarContato, situacao, type ClienteAtacado } from "@/lib/atacado";

type Acao = { id: string; titulo: string; porque: string; fazer: string[]; lista: ClienteAtacado[] };

/** Ações sugeridas: o Hub separa a carteira em grupos e diz o que fazer com cada um. Começa pelos melhores clientes do ano. */
export default function AcoesAtacado() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarAtacado(portal.id), [portal.id]);
  const [aberta, setAberta] = useState("melhores");
  if (!dados) return <Carregando />;
  const cs = dados.clientes;
  const curva = curvaAbc(cs);
  const melhores = [...cs].sort((a, b) => Number(b.total_ano) - Number(a.total_ano)).slice(0, 20);
  const totalAno = cs.reduce((s, c) => s + Number(c.total_ano), 0) || 1;
  const fezContato = (c: ClienteAtacado) => dados.contatos.some((k) => k.cliente_id === c.id);
  const novos = cs.filter((c) => c.aberto_em && (diasSemPedido({ ultimo_pedido: c.aberto_em }) ?? 999) <= 90);
  const acoes: Acao[] = [
    { id: "melhores", titulo: "Melhores clientes do ano", porque: `Os 20 que mais compraram somam ${Math.round((melhores.reduce((s, c) => s + Number(c.total_ano), 0) / totalAno) * 100)}% do atacado. Perder um deles pesa mais do que abrir três novos.`,
      fazer: ["Mostrar a coleção nova antes de todo mundo (pré-venda ou visita).", "Condição de cliente especial: prazo, reserva de grade ou reposição garantida.", "Ligação da supervisão uma vez por coleção para saber como a marca gira na loja.", "Mimo ou reconhecimento no fim do ano (\"cliente destaque\")."], lista: melhores },
    { id: "risco-a", titulo: "Clientes A esfriando", porque: "Compram muito e estão há 31 a 60 dias sem pedido: é a hora mais barata de segurar.",
      fazer: ["Ligar com a novidade da semana e fotos do que mais saiu na praça dela.", "Oferecer reposição do que vendeu bem no último pedido.", "Combinar a data do próximo pedido."], lista: cs.filter((c) => curva.get(c.id) === "A" && situacao(c) === "risco") },
    { id: "parados-grandes", titulo: "Parados que compravam bem", porque: "Sem pedido há mais de 60 dias, do maior para o menor. Venda que já existiu.",
      fazer: ["Descobrir o motivo (estoque parado, preço, entrega, concorrente).", "Registrar na Reativação e decidir: reativar, substituir a praça ou encerrar.", "Condição de retorno só com a política na mão."], lista: cs.filter((c) => situacao(c) === "parado" && curva.get(c.id) !== "C") },
    { id: "novos", titulo: "Abertos nos últimos 90 dias", porque: "O segundo pedido é o que transforma lojista novo em cliente da carteira.",
      fazer: ["Ligar 15 dias depois da entrega: chegou certo? Como a cliente dela reagiu?", "Mandar dicas de exposição e o conteúdo da marca para ela postar.", "Combinar o segundo pedido antes de 45 dias."], lista: novos },
    { id: "sem-contato", titulo: "Clientes A e B sem contato no mês", porque: "Cliente bom que ninguém procurou nos últimos 35 dias.",
      fazer: ["Distribuir entre as vendedoras e ligar nesta semana.", "Registrar o contato aqui para a supervisão acompanhar."], lista: cs.filter((c) => curva.get(c.id) !== "C" && !fezContato(c) && situacao(c) !== "parado") },
    { id: "exclusivos", titulo: "Exclusivos parados", porque: "Exclusividade com a praça sem venda trava a cidade inteira.",
      fazer: ["Rever pela política de exclusividade (compra mínima por coleção).", "Conversa franca: volta a comprar ou a praça abre para outro lojista."], lista: cs.filter((c) => c.exclusivo && situacao(c) === "parado") },
  ];

  return (
    <>
      <Titulo titulo="Ações sugeridas" sub="O Hub separa a carteira em grupos e mostra o que fazer com cada um. Comece pelos melhores clientes do ano." />
      {!cs.length && <div className="card mudo mb">Importe a carteira de lojistas para o Hub sugerir as ações.</div>}
      <div className="chips mb">
        {acoes.map((a) => <button key={a.id} type="button" className={`chip${aberta === a.id ? " escolhido" : ""}`} onClick={() => setAberta(a.id)}>{a.titulo} ({a.lista.length})</button>)}
      </div>
      {acoes.filter((a) => a.id === aberta).map((a) => (
        <div key={a.id} className="card">
          <h3 style={{ marginTop: 0 }}>{a.titulo}</h3>
          <p className="mudo" style={{ marginTop: 0 }}>{a.porque}</p>
          <b>O que fazer</b>
          <ol style={{ margin: "4px 0 12px", paddingLeft: 20 }}>{a.fazer.map((f) => <li key={f}>{f}</li>)}</ol>
          {!a.lista.length && <p className="mudo">Ninguém neste grupo agora. ✓</p>}
          {a.lista.map((c, i) => {
            const ultimo = dados.contatos.find((k) => k.cliente_id === c.id);
            return (
              <div key={c.id} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0", gap: 8, flexWrap: "wrap" }}>
                <span>{a.id === "melhores" && <b className="mudo" style={{ marginRight: 6 }}>{i + 1}º</b>}<b>{c.nome}</b> <span className="selo espera" style={{ fontSize: 11 }}>{curva.get(c.id)}</span>
                  <br /><small className="mudo">{[c.cidade, c.uf].filter(Boolean).join("/")} · {c.vendedora || "sem vendedora"} · {diasSemPedido(c) != null ? `último pedido há ${diasSemPedido(c)} dias` : "sem pedido"}{ultimo ? ` · contato ${dia(ultimo.dia)}: ${ultimo.resultado}` : ""}</small></span>
                <span className="linha" style={{ gap: 10 }}>
                  <b>{moeda(Number(c.total_ano))}</b>
                  {c.telefone && <a className="btn s peq" href={`https://wa.me/55${c.telefone.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noopener">WhatsApp</a>}
                  <button type="button" className="btn p peq" onClick={async () => { await registrarContato(portal.id, c.id, c.vendedora, a.titulo, "Ação sugerida"); recarregar(); }}>Fiz contato</button>
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
