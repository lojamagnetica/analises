"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { LinhaLojista } from "@/components/ClienteAtacado";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { DECISOES, buscarAtacado, situacao } from "@/lib/atacado";

/** Reativação dos parados: do maior para o menor, com o motivo, a decisão e o contato de cada um. */
export default function Reativacao() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarAtacado(portal.id), [portal.id]);
  const [vend, setVend] = useState("");
  const [dec, setDec] = useState("pendente");
  const [incluirRisco, setIncluirRisco] = useState(false);
  const [qtd, setQtd] = useState(40);
  if (!dados) return <Carregando />;
  const alvo = dados.clientes.filter((c) => situacao(c) === "parado" || (incluirRisco && situacao(c) === "risco"));
  const vendedoras = [...new Set(alvo.map((c) => c.vendedora).filter(Boolean))].sort();
  const lista = alvo.filter((c) => (!vend || c.vendedora === vend) && (dec === "todas" || (dec === "pendente" ? !c.decisao : c.decisao === dec)));
  const comContato = alvo.filter((c) => dados.contatos.some((k) => k.cliente_id === c.id)).length;
  const voltaram = alvo.filter((c) => dados.contatos.some((k) => k.cliente_id === c.id && k.resultado === "Fez pedido")).length;
  const total = alvo.reduce((s, c) => s + Number(c.total_ano), 0);

  return (
    <>
      <Titulo titulo="Reativação dos parados" sub="Lojistas sem pedido há mais de 60 dias, do que mais comprou para o que menos comprou. Para cada um: por que parou, o que fazer e o contato." />
      <div className="grade g4 mb">
        <div className="kpi"><small>Para reativar</small><b style={{ fontSize: 26, color: "var(--red)" }}>{alvo.length}</b></div>
        <div className="kpi"><small>Compraram no ano</small><b>{moeda(total)}</b></div>
        <div className="kpi"><small>Com contato nos últimos 35 dias</small><b style={{ fontSize: 26 }}>{comContato}</b></div>
        <div className="kpi"><small>Voltaram a pedir</small><b style={{ fontSize: 26, color: voltaram ? "var(--green, #2f7d4f)" : undefined }}>{voltaram}</b></div>
      </div>
      <div className="card mb ajuda" style={{ margin: "0 0 16px" }}>
        <b>Como usar:</b> comece pelos maiores. Ligue, registre o resultado e marque o motivo. Na decisão: <b>Reativar</b> (vale insistir), <b>Substituir a praça</b> (buscar outro lojista na mesma cidade), <b>Encerrar</b> ou <b>Corrigir cadastro</b> (duplicado, sem dado).
      </div>
      <div className="card">
        <div className="chips mb">
          {[["pendente", "Sem decisão"], ...DECISOES.filter(Boolean).map((d) => [d, d]), ["todas", "Todas"]].map(([k, rot]) => (
            <button key={k} type="button" className={`chip${dec === k ? " escolhido" : ""}`} onClick={() => setDec(k)}>
              {rot} ({k === "todas" ? alvo.length : alvo.filter((c) => (k === "pendente" ? !c.decisao : c.decisao === k)).length})
            </button>
          ))}
        </div>
        <div className="linha" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={vend} onChange={(e) => setVend(e.target.value)} style={{ width: "auto", margin: 0 }}><option value="">Todas as vendedoras</option>{vendedoras.map((v) => <option key={v}>{v}</option>)}</select>
          <label className="mudo" style={{ fontSize: 14 }}><input type="checkbox" checked={incluirRisco} onChange={(e) => setIncluirRisco(e.target.checked)} /> Incluir os em risco (31 a 60 dias)</label>
        </div>
        {!lista.length && <p className="mudo">Nenhum lojista neste filtro.</p>}
        {lista.slice(0, qtd).map((c) => <LinhaLojista key={c.id} c={c} contatos={dados.contatos} portalId={portal.id} recarregar={recarregar} reativacao />)}
        {lista.length > qtd && <button type="button" className="btn s peq mt" onClick={() => setQtd(qtd + 60)}>Mostrar mais</button>}
      </div>
    </>
  );
}
