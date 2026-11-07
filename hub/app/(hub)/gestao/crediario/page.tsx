"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { CampoReais } from "@/components/CampoReais";
import { Excluir } from "@/components/Excluir";
import { EscolherCliente } from "@/components/EscolherCliente";
import { EditarParcelas, ListaParcelas } from "@/components/Parcelas";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje, moeda } from "@/lib/formato";
import { linkWhats, primeiro } from "@/lib/clientes";
import {
  atrasadas, buscarClientesSimples, buscarCrediario, emAberto, gerarParcelas, marcarParcelas, mensagemCobranca, proxima, removerConta, salvarConta, somarMeses,
  type ClienteSimples, type Conta, type Parcela,
} from "@/lib/loja-na-mao";

type Filtro = "atrasadas" | "semana" | "abertas" | "quitadas";
const FILTROS: [Filtro, string][] = [["atrasadas", "Atrasadas"], ["semana", "Vencem em 7 dias"], ["abertas", "Todas em aberto"], ["quitadas", "Quitadas"]];
type Form = { id?: string; cliente: ClienteSimples | null; descricao: string; valor: number; n: number; primeira: string; parcelas: Parcela[] | null };
const novo = (): Form => ({ cliente: null, descricao: "", valor: 0, n: 1, primeira: somarMeses(hoje(), 1), parcelas: null });

export default function Crediario() {
  const { portal } = usePortal();
  const [filtro, setFiltro] = useState<Filtro>("atrasadas");
  const [f, setF] = useState<Form | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(async () => ({ contas: await buscarCrediario(portal.id), clientes: await buscarClientesSimples(portal.id) }), [portal.id]);
  if (!dados) return <Carregando />;
  const { contas, clientes } = dados;
  const ref = hoje();
  const em7 = new Date(Date.parse(`${ref}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const abertas = contas.filter((c) => emAberto(c.parcelas) > 0);
  const comAtraso = abertas.filter((c) => atrasadas(c.parcelas, ref).length);
  const daSemana = abertas.filter((c) => c.parcelas.some((p) => !p.pago_em && p.vence >= ref && p.vence <= em7));
  const lista = (filtro === "atrasadas" ? comAtraso : filtro === "semana" ? daSemana : filtro === "abertas" ? abertas : contas.filter((c) => emAberto(c.parcelas) === 0))
    .sort((a, b) => (proxima(a.parcelas)?.vence ?? "9").localeCompare(proxima(b.parcelas)?.vence ?? "9"));
  const somaAtraso = comAtraso.reduce((s, c) => s + atrasadas(c.parcelas, ref).reduce((t, p) => t + p.valor, 0), 0);
  const quem = primeiro(portal.responsavel || "") || portal.loja;
  const mudar = (x: Partial<Form>) => setF((a) => (a ? { ...a, ...x } : a));

  async function salvar() {
    if (!f) return;
    setErro("");
    try {
      if (!f.cliente) throw new Error("Escolha ou cadastre a cliente.");
      const parcelas = f.parcelas ?? gerarParcelas(f.valor, f.n, f.primeira);
      const antiga = f.id ? contas.find((c) => c.id === f.id) : null;
      await salvarConta(portal.id, { id: f.id, cliente_id: f.cliente.id || null, nome: f.cliente.nome, whatsapp: f.cliente.whatsapp, venda_id: antiga?.venda_id ?? null, descricao: f.descricao, parcelas });
      setF(null); recarregar();
    } catch (x) { setErro((x as Error).message); }
  }

  return (
    <>
      <Titulo titulo="Crediário" sub="Quem deve, quanto e quando vence. Marque a parcela quando a cliente pagar e cobre pelo WhatsApp com a mensagem pronta." />
      <div className="grade g3 mb" style={{ gap: 12 }}>
        <div className="card"><div className="mudo">A receber</div><div style={{ fontSize: 26, fontWeight: 800 }}>{moeda(abertas.reduce((s, c) => s + emAberto(c.parcelas), 0))}</div><div className="mudo" style={{ fontSize: 13 }}>{abertas.length} {abertas.length === 1 ? "cliente" : "clientes"}</div></div>
        <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}><div className="mudo">Atrasado</div><div style={{ fontSize: 26, fontWeight: 800, color: somaAtraso ? "var(--red)" : undefined }}>{moeda(somaAtraso)}</div><div className="mudo" style={{ fontSize: 13 }}>{comAtraso.length} {comAtraso.length === 1 ? "cliente" : "clientes"}</div></div>
        <div className="card"><div className="mudo">Vence nos próximos 7 dias</div><div style={{ fontSize: 26, fontWeight: 800 }}>{moeda(daSemana.reduce((s, c) => s + c.parcelas.filter((p) => !p.pago_em && p.vence >= ref && p.vence <= em7).reduce((t, p) => t + p.valor, 0), 0))}</div><div className="mudo" style={{ fontSize: 13 }}>{daSemana.length} {daSemana.length === 1 ? "cliente" : "clientes"}</div></div>
      </div>

      {f ? (
        <div className="card mb" style={{ maxWidth: 620 }}>
          <h2 style={{ marginTop: 0 }}>{f.id ? "Corrigir conta" : "Nova conta no crediário"}</h2>
          {!f.id && <p className="ajuda" style={{ marginTop: -6 }}>Use para lançar o que já está em aberto hoje. Venda nova no crediário você registra em Vendas do dia, e a conta abre sozinha.</p>}
          <label className="rotulo">Cliente</label>
          <EscolherCliente portalId={portal.id} clientes={clientes} valor={f.cliente} mudar={(c) => mudar({ cliente: c })} aoCadastrar={recarregar} />
          <label className="rotulo">O que ela levou (opcional)</label>
          <input type="text" value={f.descricao} placeholder="Ex.: conjunto e anel" onChange={(e) => mudar({ descricao: e.target.value })} />
          {f.parcelas ? (
            <><label className="rotulo">Parcelas</label><EditarParcelas parcelas={f.parcelas} mudar={(p) => mudar({ parcelas: p })} /></>
          ) : (
            <div className="grade mt" style={{ gridTemplateColumns: "1fr 90px 1fr", gap: 10 }}>
              <CampoReais rotulo="Valor em aberto" valor={f.valor} mudar={(v) => mudar({ valor: v })} vazio />
              <div><label className="rotulo">Parcelas</label><input type="number" inputMode="numeric" min={1} max={24} value={f.n} onChange={(e) => mudar({ n: Number(e.target.value) || 1 })} /></div>
              <div><label className="rotulo">Próximo vencimento</label><input type="date" value={f.primeira} onChange={(e) => mudar({ primeira: e.target.value })} /></div>
            </div>
          )}
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt" style={{ gap: 8 }}>
            <button type="button" className="btn p" onClick={salvar}>Salvar</button>
            <button type="button" className="btn s" onClick={() => { setF(null); setErro(""); }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn p mb" onClick={() => setF(novo())}>+ Lançar conta em aberto</button>
      )}

      <div className="chips mb">
        {FILTROS.map(([k, n]) => <button key={k} type="button" className={`chip ${filtro === k ? "escolhido" : ""}`} onClick={() => setFiltro(k)}>{n}</button>)}
      </div>
      {lista.length === 0 && <p className="mudo">Nenhuma conta aqui.</p>}
      {lista.map((c: Conta) => {
        const aberto = emAberto(c.parcelas);
        const atr = atrasadas(c.parcelas, ref);
        const prox = proxima(c.parcelas);
        return (
          <div key={c.id} className="card mb">
            <div className="linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
              <div>
                <b>{c.nome}</b> <span className={`selo ${aberto === 0 ? "feito" : atr.length ? "erro" : "andamento"}`}>{aberto === 0 ? "Quitada" : atr.length ? "Atrasada" : "Em dia"}</span>
                <div className="mudo" style={{ fontSize: 13 }}>
                  {aberto > 0 ? <>Em aberto {moeda(aberto)}{prox ? ` · próxima ${dia(prox.vence)}` : ""}</> : "Tudo pago"}{c.descricao ? ` · ${c.descricao}` : ""}
                </div>
              </div>
              <div className="linha" style={{ gap: 10 }}>
                {aberto > 0 && linkWhats(c.whatsapp, "") && <a className="btn s peq" href={linkWhats(c.whatsapp, mensagemCobranca(c, quem, portal.loja, ref)) ?? undefined} target="_blank" rel="noreferrer">Cobrar no WhatsApp</a>}
                <button type="button" className="link-loja" onClick={() => setAberta(aberta === c.id ? null : c.id)}>{aberta === c.id ? "fechar" : "parcelas"}</button>
              </div>
            </div>
            {aberta === c.id && (
              <div className="mt">
                <ListaParcelas parcelas={c.parcelas} mudar={async (p) => { await marcarParcelas(c.id, p).catch((x) => alert(x.message)); recarregar(); }} />
                <div className="linha mt" style={{ gap: 14 }}>
                  <button type="button" className="link-loja" onClick={() => { setF({ id: c.id, cliente: clientes.find((x) => x.id === c.cliente_id) ?? { id: c.cliente_id ?? "", nome: c.nome, whatsapp: c.whatsapp, aniversario: null, ultima_compra: null, n_compras: 0, total: 0 }, descricao: c.descricao ?? "", valor: 0, n: 1, primeira: ref, parcelas: c.parcelas }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                  <Excluir pergunta={`Excluir a conta de ${c.nome} do crediário? As parcelas somem.`} fazer={() => removerConta(c.id)} aoFim={recarregar} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
