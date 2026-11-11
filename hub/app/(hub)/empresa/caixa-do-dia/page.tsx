"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { Excluir } from "@/components/Excluir";
import { PrecisaDeAcao } from "@/components/PrecisaDeAcao";
import { Carregando, useDados } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

// Caixa do dia: o que os agentes deixam pronto (WhatsApp, pós-reunião): resumo do grupo, respostas sugeridas e combinados da CS.
type Item = {
  id: string; data: string; contato: string; mentorado: string | null; resumo: string | null; resposta_sugerida: string | null;
  prioridade: string | null; delegar_para: string | null; origem: string | null; status: string; tempo_min: number | null;
};
type Filtro = "abertos" | "meus" | "claudia" | "feitos";
const FILTROS: [Filtro, string][] = [["abertos", "Em aberto"], ["meus", "Da Camilla"], ["claudia", "Delegados para a Claudia"], ["feitos", "Realizados"]];
const passarDia = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export default function CaixaDoDia() {
  const [data, setData] = useState(hoje());
  const [filtro, setFiltro] = useState<Filtro>("abertos");
  const { dados, recarregar } = useDados(async () => {
    const colunas = "id, data, contato, mentorado, resumo, resposta_sugerida, prioridade, delegar_para, origem, status, tempo_min";
    const sb = supabaseBrowser();
    const { data: doDia } = await sb.from("caixa_dia").select(colunas).eq("perfil", "camilla").eq("data", data).order("prioridade").order("contato");
    // Hoje: o que ficou de dias anteriores e ainda não foi realizado continua aparecendo, até alguém marcar como realizado.
    const { data: atrasados } = data === hoje()
      ? await sb.from("caixa_dia").select(colunas).eq("perfil", "camilla").lt("data", data).neq("status", "Feito").order("data").order("contato")
      : { data: [] };
    return [...((atrasados ?? []) as Item[]), ...((doDia ?? []) as Item[])];
  }, [data]);
  if (!dados) return <Carregando />;
  const feito = (i: Item) => i.status === "Feito";
  const atrasoDias = (i: Item) => Math.round((Date.parse(`${data}T12:00:00Z`) - Date.parse(`${i.data}T12:00:00Z`)) / 86_400_000);
  const lista = dados.filter((i) => filtro === "feitos" ? feito(i) : filtro === "abertos" ? !feito(i) : filtro === "claudia" ? !feito(i) && i.delegar_para === "Claudia" : !feito(i) && !i.delegar_para);
  const marcar = async (i: Item, s: string) => {
    const { error } = await supabaseBrowser().from("caixa_dia").update({ status: s, updated_at: new Date().toISOString() }).eq("id", i.id);
    if (error) alert(error.message); else recarregar();
  };

  return (
    <>
      <Titulo titulo="Caixa do dia" sub="O que os agentes deixaram pronto: resumo da reunião para o grupo, respostas sugeridas do WhatsApp e os combinados delegados para a Claudia. Tudo o que ainda não está realizado continua aparecendo todos os dias, até você ou a Claudia marcarem como realizado. Nada é enviado sozinho: você copia, ajusta e manda." />
      {data === hoje() && <PrecisaDeAcao />}

      <div className="secao">Caixa do dia</div>
      <div className="linha mb" style={{ gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn s peq" onClick={() => setData(passarDia(data, -1))}>‹</button>
        <b>{data === hoje() ? "Hoje" : dia(data)}</b>
        <button type="button" className="btn s peq" disabled={data >= hoje()} onClick={() => setData(passarDia(data, 1))}>›</button>
        <div className="chips" style={{ marginLeft: 8 }}>
          {FILTROS.map(([k, n]) => <button key={k} type="button" className={`chip ${filtro === k ? "escolhido" : ""}`} onClick={() => setFiltro(k)}>{n}</button>)}
        </div>
      </div>
      {lista.length === 0 && <p className="mudo">Nada aqui {data === hoje() ? "hoje" : "neste dia"}.</p>}
      {lista.map((i) => (
        <div key={i.id} className="card card-borda mb" style={{ ["--c" as string]: i.delegar_para ? "var(--purple)" : i.prioridade === "Hoje" ? "var(--red)" : "var(--line)" }}>
          <div className="linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
            <div>
              <b>{i.contato}</b>{i.mentorado && i.mentorado !== i.contato ? <span className="mudo"> · {i.mentorado}</span> : null}
              <div className="mudo" style={{ fontSize: 13 }}>{[i.origem, i.prioridade, i.delegar_para ? `com a ${i.delegar_para}` : null, i.tempo_min ? `${i.tempo_min} min` : null].filter(Boolean).join(" · ")}</div>
            </div>
            <span className="linha" style={{ gap: 6 }}>{!feito(i) && atrasoDias(i) > 0 && <span className="selo alerta">de {dia(i.data)} · há {atrasoDias(i)} {atrasoDias(i) === 1 ? "dia" : "dias"}</span>}<span className={`selo ${feito(i) ? "feito" : i.delegar_para ? "espera" : "andamento"}`}>{feito(i) ? "Realizado" : i.status}</span></span>
          </div>
          {i.resumo && <p style={{ margin: "8px 0" }}>{i.resumo}</p>}
          {i.resposta_sugerida && (
            <details open={!feito(i) && !i.delegar_para}>
              <summary style={{ cursor: "pointer" }}><b>{i.delegar_para ? "O que a Claudia acompanha" : "Texto pronto"}</b></summary>
              <div className="card mt" style={{ whiteSpace: "pre-wrap", background: "var(--soft)", fontSize: 14.5 }}>{i.resposta_sugerida}</div>
            </details>
          )}
          <div className="linha mt" style={{ gap: 10, flexWrap: "wrap" }}>
            {i.resposta_sugerida && <Copiar texto={i.resposta_sugerida} rotulo="Copiar texto" />}
            {feito(i)
              ? <button type="button" className="btn s peq" onClick={() => marcar(i, i.delegar_para ? "Delegado" : "A fazer")}>Reabrir</button>
              : <button type="button" className="btn p peq" onClick={() => marcar(i, "Feito")}>Marcar como realizado</button>}
            <Excluir pergunta={`Excluir "${i.contato}" da Caixa do dia?`} fazer={async () => { const { error } = await supabaseBrowser().from("caixa_dia").delete().eq("id", i.id); if (error) throw new Error(error.message); }} aoFim={recarregar} />
          </div>
        </div>
      ))}
    </>
  );
}
