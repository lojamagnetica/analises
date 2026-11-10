"use client";

import { useState } from "react";
import { moeda } from "@/lib/formato";
import { dia as dataBr } from "@/lib/formato";
import { lerListaDeVendas, type DiaLido } from "@/lib/lista-vendas";
import { textoDoPdf } from "@/lib/pdf-linhas";
import { salvarCaixa, type Forma } from "@/lib/caixa";
import { salvarItens } from "@/lib/caixa-itens";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const bonito = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** Lê o relatório "Lista de Vendas" do sistema (PDF) no próprio aparelho e lança o caixa dos dias: por vendedora, formas de pagamento e produtos. */
export function LerRelatorioDoCaixa({ portalId, loja, equipe, aoLancar }: { portalId: string; loja: string; equipe: { id: string; nome: string }[]; aoLancar: () => void }) {
  const [dias, setDias] = useState<DiaLido[] | null>(null);
  const [emitido, setEmitido] = useState("");
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  async function ler(arqs: File[]) {
    setErro(""); setOk(""); setDias(null); setLendo(true);
    try {
      let texto = "";
      for (const a of arqs.slice(0, 3)) texto += "\n" + await textoDoPdf(a);
      const lidos = lerListaDeVendas(texto);
      if (!lidos.length) throw new Error("Não achei vendas neste arquivo. Use o relatório \"Lista de Vendas\" do sistema, em PDF.");
      const m = /Emitido em (\d\d\/\d\d\/\d{4}) às (\d\d:\d\d)/.exec(texto);
      setEmitido(m ? m[2].replace(":", "h") : "");
      setDias(lidos);
    } catch (e) { setErro((e as Error).message || "Não deu para ler o arquivo."); } finally { setLendo(false); }
  }

  async function lancar() {
    if (!dias) return;
    setErro(""); setSalvando(true);
    try {
      for (const d of dias) {
        const vendedoras = d.vendedoras.map((v) => {
          const p = equipe.find((e) => semAcento(e.nome).split(/\s+/)[0] === semAcento(v.nome).split(/\s+/)[0]);
          return { pessoa_id: p?.id ?? null, nome: p ? p.nome : bonito(v.nome), faturamento: v.faturamento, vendas: v.vendas, pecas: v.pecas };
        });
        const obs = `Lido do relatório do sistema${emitido ? ` (emitido às ${emitido})` : ""}.${d.vale > 0 ? ` Vale-troca/devolução usado: ${moeda(d.vale)}.` : ""}`;
        await salvarCaixa(portalId, { loja, dia: d.dia, faturamento: d.faturamento, vendas: d.vendas, pecas: d.pecas, obs, pagamentos: d.pagamentos as Partial<Record<Forma, number>>, vendedoras, malinha: null });
      }
      await salvarItens(portalId, loja, dias);
      setOk(`${dias.length === 1 ? "1 dia lançado" : `${dias.length} dias lançados`} com os produtos vendidos.`);
      setDias(null);
      aoLancar();
    } catch (e) { setErro((e as Error).message); } finally { setSalvando(false); }
  }

  return (
    <div className="card mb">
      <h3 style={{ margin: 0 }}>Lançar pelo relatório do sistema</h3>
      <p className="ajuda" style={{ margin: "4px 0 8px" }}>Suba o PDF &quot;Lista de Vendas&quot; (de um dia ou da semana). O Hub lê no seu aparelho e lança o caixa de cada dia, por vendedora e forma de pagamento, e guarda os produtos para os mais vendidos da semana. Você confere antes de lançar.</p>
      <label className="btn s peq" style={{ cursor: lendo ? "wait" : "pointer", margin: 0 }}>
        {lendo ? "Lendo…" : "Escolher o PDF (até 3)"}
        <input type="file" hidden multiple accept=".pdf,application/pdf" disabled={lendo || salvando} onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) ler(f); }} />
      </label>
      {erro && <div className="aviso mt" role="alert">{erro}</div>}
      {ok && <div className="aviso ok mt">{ok}</div>}
      {dias && (
        <>
          <div className="tabela-wrap mt">
            <table className="tabela">
              <thead><tr><th>Dia</th><th>Faturamento</th><th>Vendas</th><th>Peças</th></tr></thead>
              <tbody>
                {dias.map((d) => (
                  <tr key={d.dia} style={NUM}>
                    <td>{dataBr(d.dia)}<div className="mudo" style={{ fontSize: 11.5 }}>{d.vendedoras.map((v) => `${bonito(v.nome.split(" ")[0])} ${moeda(v.faturamento)}`).join(" · ")}</div></td><td>{moeda(d.faturamento)}</td><td>{d.vendas}</td><td>{d.pecas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ajuda" style={{ margin: "6px 0 0" }}>Total: <b>{moeda(dias.reduce((t, d) => t + d.faturamento, 0))}</b> em {dias.reduce((t, d) => t + d.vendas, 0)} vendas. Se algum desses dias já estava lançado, ele é trocado pelos números do relatório. Confira com o total do sistema.</p>
          <div className="linha mt" style={{ gap: 8 }}>
            <button type="button" className="btn p peq" disabled={salvando} onClick={lancar}>{salvando ? "Lançando…" : `Lançar ${dias.length === 1 ? "o dia" : `os ${dias.length} dias`}`}</button>
            <button type="button" className="btn s peq" disabled={salvando} onClick={() => setDias(null)}>Cancelar</button>
          </div>
        </>
      )}
    </div>
  );
}
