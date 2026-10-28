"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { SITUACOES, buscarAtacado, diasSemPedido, situacao, type Situacao } from "@/lib/atacado";

/** O painel do atacado: quem está ativo, em risco e parado, por canal e por vendedora. */
export default function PainelAtacado() {
  const { portal } = usePortal();
  const { dados } = useDados(() => buscarAtacado(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const cs = dados.clientes;
  const conta = (s: Situacao) => cs.filter((c) => situacao(c) === s);
  const parados = conta("parado");
  const valorParado = parados.reduce((s, c) => s + Number(c.total_ano), 0);
  const agrupa = (campo: "canal" | "vendedora") => [...new Set(cs.map((c) => c[campo] || "(sem)"))].map((k) => {
    const l = cs.filter((c) => (c[campo] || "(sem)") === k);
    return { k, n: l.length, total: l.reduce((s, c) => s + Number(c.total_ano), 0), ativos: l.filter((c) => situacao(c) === "ativo").length, parados: l.filter((c) => situacao(c) === "parado").length };
  }).sort((a, b) => b.total - a.total);
  const semPraca = cs.filter((c) => !c.cidade || !c.uf).length;
  const semVendedora = cs.filter((c) => !c.vendedora).length;

  if (!cs.length) {
    return (
      <>
        <Titulo titulo="Painel do atacado" />
        <div className="card">
          <p style={{ marginTop: 0 }}>Ainda não tem lojistas no Hub. Comece importando a planilha de clientes do sistema (com cidade, UF, vendedora, último pedido e total do ano).</p>
          <Link className="btn p" href="/atacado/carteira">Importar a carteira</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Titulo titulo="Painel do atacado" sub="A carteira de lojistas pelo último pedido: quem está comprando, quem está esfriando e quem parou." />
      <div className="grade g4 mb">
        {(["ativo", "risco", "parado", "sem"] as Situacao[]).map((s) => (
          <div key={s} className="kpi"><small>{SITUACOES[s].nome}{s === "ativo" ? " (até 30 dias)" : s === "risco" ? " (31 a 60 dias)" : s === "parado" ? " (mais de 60 dias)" : ""}</small>
            <b style={{ fontSize: 26, color: s === "parado" ? "var(--red)" : undefined }}>{conta(s).length}</b></div>
        ))}
      </div>
      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
        <b>{parados.length} lojistas parados compraram {moeda(valorParado)} no ano.</b>
        <p className="mudo" style={{ margin: "4px 0 8px" }}>É venda que já existiu: reativar quem já comprou é mais rápido do que achar cliente novo.</p>
        <Link className="btn p peq" href="/atacado/reativacao">Abrir a reativação</Link>
      </div>
      {(semPraca > 0 || semVendedora > 0) && (
        <div className="aviso mb">Cadastro: {semPraca} lojista{semPraca === 1 ? "" : "s"} sem cidade ou UF e {semVendedora} sem vendedora. <Link href="/atacado/carteira">Corrigir na carteira</Link></div>
      )}
      <div className="grade g2 mb">
        {(["canal", "vendedora"] as const).map((campo) => (
          <div key={campo} className="card">
            <h3 style={{ marginTop: 0 }}>Por {campo}</h3>
            <div className="tabela-wrap"><table className="tabela">
              <thead><tr><th>{campo === "canal" ? "Canal" : "Vendedora"}</th><th>Lojistas</th><th>Ativos</th><th>Parados</th><th>No ano</th></tr></thead>
              <tbody>{agrupa(campo).map((x) => <tr key={x.k}><td><b>{x.k}</b></td><td>{x.n}</td><td>{x.ativos}</td><td style={{ color: x.parados ? "var(--red)" : undefined }}>{x.parados}</td><td>{moeda(x.total)}</td></tr>)}</tbody>
            </table></div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Os 10 parados que mais compraram</h3>
        {parados.slice(0, 10).map((c) => (
          <div key={c.id} className="linha entre" style={{ borderTop: "1px solid var(--line)", padding: "6px 0", gap: 8 }}>
            <span><b>{c.nome}</b> <small className="mudo">{[c.cidade, c.uf].filter(Boolean).join("/")} · {c.vendedora || "sem vendedora"} · {diasSemPedido(c)} dias</small></span>
            <b>{moeda(Number(c.total_ano))}</b>
          </div>
        ))}
      </div>
    </>
  );
}
