"use client";

import { useState } from "react";
import { AbasBussola } from "@/components/AbasBussola";
import { Excluir } from "@/components/Excluir";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataCurta, diasAte, hoje, moeda } from "@/lib/formato";
import { numeroDe } from "@/lib/caixa";
import { buscarBoletos, removerBoleto, salvarBoleto, type Boleto } from "@/lib/bussola";

type Form = { id?: string; descricao: string; valor: string; vence: string };
const vazio = (): Form => ({ descricao: "", valor: "", vence: hoje() });

export default function Boletos() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarBoletos(portal.id), [portal.id]);
  const [f, setF] = useState<Form>(vazio());
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const abertos = dados.filter((b) => !b.pago);
  const total = abertos.reduce((a, b) => a + b.valor, 0);

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setErro("");
    if (!f.descricao.trim() || !f.vence) return setErro("Escreva o que é o boleto e o dia do vencimento.");
    const valor = numeroDe(f.valor);
    if (valor == null || valor < 0) return setErro("Confira o valor.");
    try { await salvarBoleto(portal.id, { id: f.id, descricao: f.descricao, valor, vence: f.vence, pago: f.id ? dados!.find((b) => b.id === f.id)?.pago : false }); setF(vazio()); recarregar(); }
    catch (x) { setErro((x as Error).message); }
  }
  const pagar = (b: Boleto) => salvarBoleto(portal.id, { ...b, pago: !b.pago }).then(recarregar).catch((e) => setErro(e.message));

  return (
    <>
      <Titulo titulo="Boletos e pagamentos" sub="Veja o que vence e organize os pagamentos no dia e hora da sua rotina." aba="Boletos" />
      <AbasBussola />
      {erro && <div className="aviso erro mb">{erro}</div>}
      <form className="card mb" onSubmit={salvar}>
        <h2 style={{ marginTop: 0 }}>{f.id ? "Editar boleto" : "Adicionar boleto"}</h2>
        <div className="grade g3">
          <label>O que é<input type="text" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Ex.: Fornecedor Aurora" /></label>
          <label>Valor<input type="text" inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder="1.250,00" /></label>
          <label>Vence em<input type="date" value={f.vence} onChange={(e) => setF({ ...f, vence: e.target.value })} /></label>
        </div>
        <button className="btn p mt" type="submit">{f.id ? "Salvar" : "Adicionar"}</button>
        {f.id && <button className="btn s mt" type="button" style={{ marginLeft: 8 }} onClick={() => setF(vazio())}>Cancelar</button>}
      </form>

      <p className="mudo">Em aberto: <b>{moeda(total)}</b> em {abertos.length} boleto(s).</p>
      {dados.length === 0 ? <div className="card"><p style={{ margin: 0 }}>Nenhum boleto cadastrado.</p></div> : dados.map((b) => {
        const d = diasAte(b.vence);
        const cor = b.pago ? "var(--green)" : d < 0 ? "var(--red)" : d <= 3 ? "var(--orange)" : "var(--blue)";
        return (
          <div key={b.id} className="card card-borda mb" style={{ ["--c" as string]: cor }}>
            <div className="linha entre"><b>{b.descricao}</b><b>{moeda(b.valor)}</b></div>
            <p className="mudo" style={{ margin: "4px 0" }}>{b.pago ? "Pago" : d < 0 ? `Venceu há ${-d} dia(s)` : d === 0 ? "Vence hoje" : `Vence em ${d} dia(s)`} · {dataCurta(b.vence)}</p>
            <div className="linha" style={{ gap: 12 }}>
              <button type="button" className="link-loja" onClick={() => pagar(b)}>{b.pago ? "Marcar como não pago" : "Marcar como pago"}</button>
              <button type="button" className="link-loja" onClick={() => setF({ id: b.id, descricao: b.descricao, valor: String(b.valor).replace(".", ","), vence: b.vence })}>Editar</button>
              <Excluir pergunta={`Excluir o boleto “${b.descricao}”?`} fazer={() => removerBoleto(b.id)} aoFim={recarregar} />
            </div>
          </div>
        );
      })}
    </>
  );
}
