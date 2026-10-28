"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { LinhaLojista } from "@/components/ClienteAtacado";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { hoje, moeda } from "@/lib/formato";
import { buscarAtacado, salvarMetas, situacao } from "@/lib/atacado";

/** Carteira por vendedora: quantos lojistas cada uma cuida, quantos parados e os contatos do dia e da semana contra a meta. */
export default function Vendedoras() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarAtacado(portal.id), [portal.id]);
  const [aberta, setAberta] = useState("");
  const [metas, setMetas] = useState<Record<string, number> | null>(null);
  if (!dados) return <Carregando />;
  const m = metas ?? dados.metas;
  const cs = dados.clientes;
  const nomes = [...new Set([...cs.map((c) => c.vendedora).filter(Boolean), ...Object.keys(dados.metas)])].sort();
  const dia = hoje();
  const seg = (() => { const d = new Date(dia + "T12:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();

  return (
    <>
      <Titulo titulo="Carteira por vendedor" sub="Cada vendedora com a sua carteira individual: quantos lojistas, quanto compram, os parados dela, a projeção e os contatos do dia contra a meta." />
      {!nomes.length && <div className="card mudo">Ainda não tem vendedora nos lojistas. Importe a carteira com a coluna de vendedora ou edite os lojistas.</div>}
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {nomes.map((v) => {
          const meus = cs.filter((c) => c.vendedora === v);
          const parados = meus.filter((c) => situacao(c) === "parado");
          const k = dados.contatos.filter((x) => x.vendedora === v);
          const hojeN = k.filter((x) => x.dia === dia).length;
          const semana = k.filter((x) => x.dia >= seg).length;
          const meta = Number(m[v] ?? 0);
          return (
            <div key={v} className="card card-borda" style={{ ["--c" as string]: meta && hojeN < meta ? "var(--red)" : "var(--line)" }}>
              <div className="linha entre"><b style={{ fontSize: 16 }}>{v}</b><small className="mudo">{meus.length} lojistas</small></div>
              <small className="mudo">{moeda(meus.reduce((s, c) => s + Number(c.total_ano), 0))} no ano · projeção {moeda(meus.reduce((s, c) => s + Number(c.projecao ?? 0), 0))} · {meus.filter((c) => situacao(c) === "ativo").length} ativos · <span style={{ color: parados.length ? "var(--red)" : undefined }}>{parados.length} parados</span></small>
              <div className="grade g2 mt" style={{ gap: 8 }}>
                <div className="kpi"><small>Contatos hoje</small><b style={{ fontSize: 22 }}>{hojeN}{meta ? ` / ${meta}` : ""}</b></div>
                <div className="kpi"><small>Na semana</small><b style={{ fontSize: 22 }}>{semana}{meta ? ` / ${meta * 5}` : ""}</b></div>
              </div>
              <label className="ajuda" style={{ display: "block", marginTop: 8 }}>Meta de contatos por dia
                <input type="number" min={0} value={m[v] ?? ""} onChange={(e) => setMetas({ ...m, [v]: Number(e.target.value) })} />
              </label>
              <button type="button" className="link-loja" onClick={() => setAberta(aberta === v ? "" : v)}>{aberta === v ? "Fechar" : `Ver os ${parados.length} parados dela`}</button>
            </div>
          );
        })}
      </div>
      {metas && (
        <div className="linha mt" style={{ gap: 8 }}>
          <button type="button" className="btn p" onClick={async () => { await salvarMetas(portal.id, metas); setMetas(null); recarregar(); }}>Salvar as metas</button>
          <button type="button" className="btn s" onClick={() => setMetas(null)}>Cancelar</button>
        </div>
      )}
      {aberta && (
        <div className="card mt">
          <h3 style={{ marginTop: 0 }}>Parados de {aberta}</h3>
          {cs.filter((c) => c.vendedora === aberta && situacao(c) === "parado").map((c) => (
            <LinhaLojista key={c.id} c={c} contatos={dados.contatos} portalId={portal.id} recarregar={recarregar} reativacao />
          ))}
        </div>
      )}
    </>
  );
}
