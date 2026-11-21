"use client";

import { useState } from "react";
import { Excluir } from "@/components/Excluir";
import { useDados } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { mesDeHoje, nomeMes, somarMes } from "@/lib/caixa";
import {
  RELATORIOS_MES, RELATORIOS_SEMANA, abrirEnvio, excluirEnvio, listarEnvios, semanaAtual, subirEnvio,
  type Envio, type SlotRelatorio,
} from "@/lib/rotina";

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
type PorLoja = Record<string, { sem: Envio[]; mes: Envio[] }>;

/** Os relatórios que alimentam a análise: da semana (sábado) e do mês que fechou. Sobem direto aqui, por loja. */
export function RelatoriosGestao({ portalId, lojas }: { portalId: string; lojas: string[] }) {
  const nomes = lojas.length ? lojas : [""];
  const [lojaSel, setLojaSel] = useState(nomes[0]);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");
  const semana = semanaAtual();
  const mesFechado = somarMes(mesDeHoje(), -1);
  const { dados, recarregar } = useDados(async () => {
    const pares = await Promise.all(nomes.map(async (l) => [l, { sem: await listarEnvios(portalId, l, semana), mes: await listarEnvios(portalId, l, mesFechado) }] as const));
    return Object.fromEntries(pares) as PorLoja;
  }, [portalId, semana, mesFechado]);
  if (!dados) return null;

  const faltam = (l: string) => {
    const d = dados[l] ?? { sem: [], mes: [] };
    return RELATORIOS_SEMANA.filter((s) => !d.sem.some((e) => e.slot === s.chave)).length + RELATORIOS_MES.filter((s) => !d.mes.some((e) => e.slot === s.chave)).length;
  };
  const total = nomes.reduce((n, l) => n + faltam(l), 0);
  const atual = dados[lojaSel] ?? { sem: [], mes: [] };

  async function enviar(periodo: string, slot: string, arquivo: File, antigo?: Envio) {
    const chave = `${periodo}|${slot}`;
    setOcupado(chave); setErro("");
    try {
      await subirEnvio(portalId, lojaSel, periodo, slot, arquivo);
      if (antigo) await excluirEnvio(antigo.caminho);
      recarregar();
    } catch (e) { setErro((e as Error).message); } finally { setOcupado(""); }
  }

  const Grupo = ({ titulo, sub, slots, envios, periodo }: { titulo: string; sub: string; slots: SlotRelatorio[]; envios: Envio[]; periodo: string }) => (
    <div className="mt">
      <div className="linha entre" style={{ flexWrap: "wrap", gap: 6 }}><b>{titulo}</b><span className="ajuda" style={{ margin: 0 }}>{sub}</span></div>
      {slots.map((s) => {
        const e = envios.find((x) => x.slot === s.chave);
        const chave = `${periodo}|${s.chave}`;
        return (
          <div key={s.chave} className="linha entre" style={{ gap: 12, flexWrap: "wrap", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div>{s.titulo}</div>
              <div className="ajuda" style={{ margin: 0 }}>{e ? `${e.nome} · ${mb(e.tamanho)} · enviado em ${dataCurta(e.em)}` : s.oque}</div>
            </div>
            <div className="linha" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className={`selo ${e ? "feito" : "espera"}`}>{e ? "recebido" : "pendente"}</span>
              {e && <button type="button" className="btn s peq" onClick={() => abrirEnvio(e.caminho)}>Abrir</button>}
              <label className="btn s peq" style={{ cursor: ocupado ? "wait" : "pointer", margin: 0 }}>
                {ocupado === chave ? "Enviando…" : e ? "Trocar" : "Subir arquivo"}
                <input type="file" hidden disabled={!!ocupado} accept=".pdf,.xlsx,.xls,.csv,application/pdf"
                  onChange={(ev) => { const f = ev.target.files?.[0]; ev.target.value = ""; if (f) enviar(periodo, s.chave, f, e); }} />
              </label>
              {e && <Excluir pergunta={`Excluir o arquivo "${e.nome}"?`} fazer={() => excluirEnvio(e.caminho)} aoFim={recarregar} />}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="card mb">
      <div className="linha entre" style={{ flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Relatórios para a análise</h3>
        <span className={`selo ${total ? "alerta" : "feito"}`}>{total ? `${total} para enviar` : "tudo enviado"}</span>
      </div>
      <p className="ajuda">Suba aqui os relatórios do sistema da loja, em PDF ou Excel. Com eles a análise da semana e do mês já tem o que olhar.</p>
      {nomes.length > 1 && (
        <div className="chips mt">
          {nomes.map((l) => <button key={l} type="button" className={`chip ${l === lojaSel ? "escolhido" : ""}`} onClick={() => setLojaSel(l)}>{l}{faltam(l) ? ` · ${faltam(l)}` : ""}</button>)}
        </div>
      )}
      <Grupo titulo="Da semana" sub="Vence no sábado. Sem eles, a análise da semana só vem na semana seguinte" slots={RELATORIOS_SEMANA} envios={atual.sem} periodo={semana} />
      <Grupo titulo={`Do mês que fechou · ${nomeMes(mesFechado)}`} sub="Vence no dia 5" slots={RELATORIOS_MES} envios={atual.mes} periodo={mesFechado} />
      {erro && <div className="aviso mt">{erro}</div>}
    </div>
  );
}
