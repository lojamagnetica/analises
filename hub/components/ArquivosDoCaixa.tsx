"use client";

import { useState } from "react";
import { Excluir } from "@/components/Excluir";
import { useDados } from "@/lib/hub";
import { dataCurta, dia as dataBr } from "@/lib/formato";
import { abrirEnvio, excluirEnvio, listarEnvios, subirEnvio, type Envio } from "@/lib/rotina";
import { semanaDoDia } from "@/lib/envios";
import { somarDias } from "@/lib/acoes-mes";

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
/** Até dois arquivos por dia: o que o sistema da loja entrega no fechamento (ex.: o resumo do caixa e o relatório de vendas do dia). */
const SLOTS = [{ chave: "caixa_1", titulo: "Arquivo 1" }, { chave: "caixa_2", titulo: "Arquivo 2" }];

/** Quem tem sistema sobe os arquivos do caixa do dia (até 2). Quem não tem digita os números no formulário acima. */
export function ArquivosDoCaixa({ portalId, dia, loja }: { portalId: string; dia: string; loja: string }) {
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");
  const { dados, recarregar } = useDados(() => listarEnvios(portalId, loja, dia), [portalId, loja, dia]);
  if (!dados) return null;

  async function enviar(slot: string, arquivo: File, antigo?: Envio) {
    setOcupado(slot); setErro("");
    try {
      await subirEnvio(portalId, loja, dia, slot, arquivo);
      if (antigo) await excluirEnvio(antigo.caminho);
      recarregar();
    } catch (e) { setErro((e as Error).message); } finally { setOcupado(""); }
  }

  return (
    <div className="card mb">
      <div className="linha entre" style={{ flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Arquivos do caixa de {dataBr(dia)}{loja ? ` · ${loja}` : ""}</h3>
        <span className={`selo ${dados.length ? "feito" : "espera"}`}>{dados.length ? `${dados.length} de 2 enviados` : "nenhum enviado"}</span>
      </div>
      <p className="ajuda" style={{ margin: "4px 0 0" }}>Já fecha o caixa no sistema? Então é só subir até 2 arquivos do fechamento do dia (PDF, Excel ou foto) com todas as informações: não precisa digitar nada, e o dia conta como enviado. Não tem sistema? Digite os números no formulário acima.</p>
      {SLOTS.map((s) => {
        const e = dados.find((x) => x.slot === s.chave);
        return (
          <div key={s.chave} className="linha entre" style={{ gap: 12, flexWrap: "wrap", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div>{s.titulo}</div>
              <div className="ajuda" style={{ margin: 0 }}>{e ? `${e.nome} · ${mb(e.tamanho)} · enviado em ${dataCurta(e.em)}` : "Ainda não enviado."}</div>
            </div>
            <div className="linha" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {e && <button type="button" className="btn s peq" onClick={() => abrirEnvio(e.caminho)}>Abrir</button>}
              <label className="btn s peq" style={{ cursor: ocupado ? "wait" : "pointer", margin: 0 }}>
                {ocupado === s.chave ? "Enviando…" : e ? "Trocar" : "Subir arquivo"}
                <input type="file" hidden disabled={!!ocupado} accept=".pdf,.xlsx,.xls,.csv,application/pdf,image/*"
                  onChange={(ev) => { const f = ev.target.files?.[0]; ev.target.value = ""; if (f) enviar(s.chave, f, e); }} />
              </label>
              {e && <Excluir pergunta={`Excluir o arquivo "${e.nome}"?`} fazer={() => excluirEnvio(e.caminho)} aoFim={recarregar} />}
            </div>
          </div>
        );
      })}
      {erro && <div className="aviso mt" role="alert">{erro}</div>}
    </div>
  );
}

/** Na página de Envios: em quais dias da semana a loja já mandou os arquivos do caixa. */
export function ArquivosDaSemana({ portalId, loja, hoje }: { portalId: string; loja: string; hoje: string }) {
  const { de } = semanaDoDia(hoje);
  const dias = [0, 1, 2, 3, 4, 5].map((i) => somarDias(de, i));
  const { dados } = useDados(async () => Promise.all(dias.map(async (d) => ({ d, n: (await listarEnvios(portalId, loja, d)).length }))), [portalId, loja, de]);
  if (!dados) return null;
  const ROT = ["seg", "ter", "qua", "qui", "sex", "sáb"];
  return (
    <p className="ajuda" style={{ margin: "8px 0 0" }}>
      Arquivos do caixa: {dados.map((x, i) => <span key={x.d} style={{ marginRight: 10 }}>{ROT[i]} {x.n ? `✓${x.n}` : x.d <= hoje ? "–" : ""}</span>)}
    </p>
  );
}
