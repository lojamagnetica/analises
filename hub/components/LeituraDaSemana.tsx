"use client";

import Link from "next/link";
import { useState } from "react";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, moeda } from "@/lib/formato";
import { buscarLeitura, excluirLeitura, marcarAcao, numerosDaLoja, salvarLeitura, semanaDe, type Acao } from "@/lib/leitura";

/** No Início: a leitura da semana da Camilla (a loja marca as ações). A equipe escreve aqui mesmo. */
export function LeituraDaSemana() {
  const { portal, equipe, nome } = usePortal();
  const { dados, recarregar } = useDados(async () => ({
    ...(await buscarLeitura(portal.id)),
    numeros: equipe ? await numerosDaLoja(portal.id).catch(() => null) : null,
  }), [portal.id, equipe]);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [acoes, setAcoes] = useState<string[]>(["", "", ""]);
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const l = dados.leitura;

  if (equipe && (editando || !dados.dessaSemana)) {
    const n = dados.numeros;
    return (
      <div className="card card-borda mt" style={{ ["--c" as string]: "var(--purple)" }}>
        <h3 style={{ marginTop: 0 }}>✍️ A leitura da semana de {dia(semanaDe())} · {portal.loja}</h3>
        <p className="mudo" style={{ marginTop: -4 }}>Só a equipe vê esta caixa. O que você escrever aparece no topo do Início da loja, com o seu nome.</p>
        {n && (
          <div className="grade g4 mb" style={{ gap: 8 }}>
            <div className="kpi"><small>Vendeu na semana</small><b>{moeda(n.naSemana)}</b></div>
            <div className="kpi"><small>Vendeu no mês</small><b>{moeda(n.noMes)}</b></div>
            <div className="kpi"><small>Meta do mês</small><b>{n.meta ? moeda(n.meta) : "—"}</b></div>
            <div className="kpi"><small>Dias lançados no mês</small><b>{n.diasLancados}</b></div>
          </div>
        )}
        <label className="ajuda" style={{ display: "block" }}><b style={{ color: "var(--ink)" }}>O que os números mostram</b>
          <textarea rows={3} placeholder="Ex.: A semana fechou 18% abaixo do ritmo da meta. O ticket subiu, mas entraram menos clientes: o foco é trazer gente para a loja." value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <b style={{ fontSize: 14 }}>As 3 ações da semana</b>
        {acoes.map((a, i) => (
          <input key={i} type="text" placeholder={["Ex.: Mandar a campanha de novembro para 30 clientes da carteira", "Ex.: Reunião de 15 min com a equipe na terça para combinar a meta da semana", "Ex.: Lançar o caixa todo dia até sábado"][i]} value={a}
            onChange={(e) => setAcoes(acoes.map((x, j) => (j === i ? e.target.value : x)))} />
        ))}
        {erro && <div className="aviso mb">{erro}</div>}
        <div className="linha" style={{ gap: 8 }}>
          <button type="button" className="btn p peq" disabled={!texto.trim() && !acoes.some((a) => a.trim())} onClick={async () => {
            setErro("");
            const lista: Acao[] = acoes.filter((a) => a.trim()).map((t) => ({ t: t.trim(), feita: l?.acoes.find((x) => x.t === t.trim())?.feita ?? false }));
            try { await salvarLeitura(portal.id, texto, lista, nome.split(" ")[0] || "Camilla"); setEditando(false); recarregar(); } catch (e) { setErro((e as Error).message); }
          }}>Publicar para a loja</button>
          {editando && <button type="button" className="btn s peq" onClick={() => setEditando(false)}>Cancelar</button>}
        </div>
      </div>
    );
  }

  if (!l) {
    return (
      <div className="card mt linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
        <span>💬 <b>Dúvida, travou em algo?</b> <span className="mudo">Fale com a Camilla: a equipe responde em até 12 horas úteis.</span></span>
        <Link className="btn s peq" href="/assistente">Fale com a Camilla</Link>
      </div>
    );
  }

  const feitas = l.acoes.filter((a) => a.feita).length;
  return (
    <div className="card card-borda mt" style={{ ["--c" as string]: "var(--purple)" }}>
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>📊 A leitura da sua semana</h3>
        <small className="mudo">por {l.autor_nome || "Camilla"} · semana de {dia(l.semana)}{!dados.dessaSemana ? " (a desta semana chega em breve)" : ""}</small>
      </div>
      {l.texto && <p style={{ margin: "8px 0", fontSize: 15.5, whiteSpace: "pre-wrap" }}>{l.texto}</p>}
      {l.acoes.length > 0 && (
        <>
          <b style={{ fontSize: 14 }}>As ações da semana · {feitas} de {l.acoes.length}</b>
          {l.acoes.map((a, i) => (
            <label key={i} className="marcar" style={{ margin: "4px 0" }}>
              <input type="checkbox" checked={a.feita} onChange={async (e) => { try { await marcarAcao(l.id, i, e.target.checked); recarregar(); } catch (x) { setErro((x as Error).message); } }} />
              <span style={{ textDecoration: a.feita ? "line-through" : undefined }}>{a.t}</span>
            </label>
          ))}
        </>
      )}
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="btn s peq" href="/assistente">💬 Falar com a Camilla sobre isso</Link>
        {equipe && dados.dessaSemana && <>
          <button type="button" className="link-loja" onClick={() => { setTexto(l.texto); setAcoes([...l.acoes.map((a) => a.t), "", "", ""].slice(0, 3)); setEditando(true); }}>Editar</button>
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm("Excluir a leitura desta semana?")) { try { await excluirLeitura(l.id); recarregar(); } catch (x) { setErro((x as Error).message); } } }}>Excluir</button>
        </>}
      </div>
    </div>
  );
}
