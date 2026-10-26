"use client";

import { useState } from "react";
import { Excluir } from "@/components/Excluir";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { ETAPAS } from "@/lib/conteudo";
import { COR_OBJETIVO, OBJETIVOS, segundaDe, type Objetivo } from "@/lib/instagram";
import { excluirPauta, pautasDaEquipe, salvarPauta, type Pauta } from "@/lib/pautas";

const SEGMENTOS = ETAPAS.find((e) => e.numero === 1)?.campos.find((c) => c.id === "segmento")?.opcoes ?? [];

function Formulario({ p, semana, ordem, aoFim }: { p: Pauta | null; semana: string; ordem: number; aoFim: () => void }) {
  const [segs, setSegs] = useState<string[]>(p?.segmentos ?? []);
  const [erro, setErro] = useState("");
  return (
    <form className="card mb" action={async (f) => {
      setErro("");
      const titulo = String(f.get("titulo") ?? "").trim();
      if (!titulo) { setErro("Preencha o título."); return; }
      try {
        await salvarPauta({
          id: p?.id, semana, titulo, porque: String(f.get("porque") ?? "").trim(), angulo: String(f.get("angulo") ?? "").trim(),
          objetivo: String(f.get("objetivo")) as Objetivo, segmentos: segs, ordem: p?.ordem ?? ordem,
        });
        aoFim();
      } catch (e) { setErro((e as Error).message); }
    }}>
      <h3 style={{ marginTop: 0 }}>{p ? "Editar pauta" : "Nova pauta"}</h3>
      <label className="rotulo" htmlFor="titulo">O assunto</label>
      <input id="titulo" name="titulo" type="text" defaultValue={p?.titulo ?? ""} placeholder="Ex.: a cor que está em todo lugar nesta semana" />
      <label className="rotulo" htmlFor="porque">Por que está em alta agora</label>
      <textarea id="porque" name="porque" rows={2} defaultValue={p?.porque ?? ""} />
      <label className="rotulo" htmlFor="angulo">O ângulo da loja (a primeira frase vira o gancho)</label>
      <textarea id="angulo" name="angulo" rows={3} defaultValue={p?.angulo ?? ""} placeholder="Como a loja entra no assunto com as peças dela" />
      <div className="grade g2" style={{ gap: 12 }}>
        <div>
          <label className="rotulo" htmlFor="objetivo">Objetivo</label>
          <select id="objetivo" name="objetivo" defaultValue={p?.objetivo ?? "Atrair"}>{OBJETIVOS.map((o) => <option key={o}>{o}</option>)}</select>
        </div>
        <div>
          <label className="rotulo">Segmentos <small className="mudo">(nenhum = todas as lojas)</small></label>
          <div className="chips">
            {SEGMENTOS.map((s) => {
              const on = segs.includes(s);
              return <button key={s} type="button" className={`chip ${on ? "escolhido" : ""}`} aria-pressed={on} onClick={() => setSegs(on ? segs.filter((x) => x !== s) : [...segs, s])}>{s}</button>;
            })}
          </div>
        </div>
      </div>
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt" style={{ gap: 6 }}>
        <button className="btn p peq" type="submit">Salvar como rascunho</button>
        <button className="btn s peq" type="button" onClick={aoFim}>Cancelar</button>
      </div>
    </form>
  );
}

export default function PautasDaEquipe() {
  useEquipe();
  const [semana, setSemana] = useState(segundaDe(hoje()));
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [erro, setErro] = useState("");
  const { dados, recarregar } = useDados(() => pautasDaEquipe(semana), [semana]);
  const fim = () => { setEditando(null); recarregar(); };
  const acao = async (f: () => Promise<unknown>) => { setErro(""); try { await f(); recarregar(); } catch (e) { setErro((e as Error).message); } };

  return (
    <>
      <Titulo titulo="Pautas quentes da semana" voltar={{ href: "/empresa/conteudo", rotulo: "Conteúdo da casa" }}
        sub="Os assuntos do momento com o ângulo para as lojas. Ficam como rascunho até a Camilla liberar; as 3 primeiras aparecem no topo da Programação." />
      <div className="aviso mb">Sem notícias de política ou fofoca. Só assuntos que ajudam a loja a atrair, conectar ou vender.</div>

      <div className="card mb linha entre">
        <div className="linha" style={{ gap: 6 }}>
          <button type="button" className="btn s peq" aria-label="Semana anterior" onClick={() => setSemana(somarDias(semana, -7))}>←</button>
          <b>Semana de {dia(semana).slice(0, 5)} a {dia(somarDias(semana, 6)).slice(0, 5)}</b>
          <button type="button" className="btn s peq" aria-label="Próxima semana" onClick={() => setSemana(somarDias(semana, 7))}>→</button>
        </div>
        <button type="button" className="btn p peq" onClick={() => setEditando("nova")}>+ Nova pauta</button>
      </div>
      {erro && <div className="aviso mb">{erro}</div>}
      {editando === "nova" && <Formulario p={null} semana={semana} ordem={(dados?.length ?? 0) + 1} aoFim={fim} />}

      {!dados ? <Carregando /> : !dados.length && editando !== "nova" ? (
        <div className="card mudo">Nenhuma pauta nesta semana ainda.</div>
      ) : dados.map((p, i) => editando === p.id ? <Formulario key={p.id} p={p} semana={semana} ordem={p.ordem} aoFim={fim} /> : (
        <div key={p.id} className="card card-borda mb" style={{ ["--c" as string]: COR_OBJETIVO[p.objetivo] }}>
          <div className="linha entre">
            <b>{i + 1}. {p.titulo || "(sem título)"}</b>
            <span className="linha" style={{ gap: 6 }}>
              <span className="selo espera">{p.objetivo}</span>
              <span className={`selo ${p.liberada ? "feito" : "alerta"}`}>{p.liberada ? "Liberada" : "Rascunho"}</span>
            </span>
          </div>
          {p.porque && <p className="mudo" style={{ margin: "6px 0 0", fontSize: 14 }}><b>Por que agora:</b> {p.porque}</p>}
          {p.angulo && <p style={{ margin: "6px 0 0", fontSize: 14 }}><b>Ângulo:</b> {p.angulo}</p>}
          <small className="mudo">{p.segmentos?.length ? p.segmentos.join(", ") : "Todas as lojas"}</small>
          <div className="linha mt" style={{ gap: 8 }}>
            <button type="button" className={`btn ${p.liberada ? "s" : "p"} peq`} onClick={() => acao(() => salvarPauta({ id: p.id, semana, liberada: !p.liberada }))}>{p.liberada ? "Voltar para rascunho" : "Liberar para as lojas"}</button>
            <button type="button" className="btn s peq" onClick={() => setEditando(p.id)}>Editar</button>
            <button type="button" className="btn s peq" disabled={i === 0} aria-label="Subir" onClick={() => acao(async () => { const a = dados[i - 1]; await salvarPauta({ id: p.id, semana, ordem: a.ordem }); await salvarPauta({ id: a.id, semana, ordem: p.ordem === a.ordem ? a.ordem + 1 : p.ordem }); })}>↑</button>
            <button type="button" className="btn s peq" disabled={i === dados.length - 1} aria-label="Descer" onClick={() => acao(async () => { const b = dados[i + 1]; await salvarPauta({ id: p.id, semana, ordem: b.ordem }); await salvarPauta({ id: b.id, semana, ordem: p.ordem === b.ordem ? b.ordem - 1 : p.ordem }); })}>↓</button>
            <Excluir pergunta={`Excluir a pauta "${p.titulo}"?`} fazer={() => excluirPauta(p.id)} aoFim={recarregar} />
          </div>
        </div>
      ))}
    </>
  );
}
