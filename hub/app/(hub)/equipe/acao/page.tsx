"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CamposAcao } from "@/components/CamposAcao";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dia, moeda } from "@/lib/formato";
import {
  TIPOS_MATERIAL, acaoPublicar, acaoSalvar, buscarAcao, dataDaEtapa, etapaApagar, etapaSalvar, materialApagar, materialSalvar,
  resultadosDaAcao, type Etapa, type Material,
} from "@/lib/acoes-mes";

function CamposEtapa({ e }: { e?: Etapa }) {
  return (
    <>
      <div className="grade g4" style={{ gap: 12 }}>
        <div><label className="rotulo">Ordem</label><input type="number" name="ordem" defaultValue={e?.ordem ?? 1} /></div>
        <div><label className="rotulo">Quando (como aparece)</label><input type="text" name="quando" required defaultValue={e?.quando ?? ""} placeholder="Até 31/10" /></div>
        <div><label className="rotulo">Dias em relação ao dia principal</label><input type="number" name="dias" defaultValue={e?.dias ?? ""} placeholder="-27" /></div>
        <div><label className="rotulo">Título</label><input type="text" name="titulo" required defaultValue={e?.titulo ?? ""} /></div>
      </div>
      <label className="rotulo">Tarefas (uma por linha)</label>
      <textarea name="tarefas" rows={4} defaultValue={e?.tarefas.join("\n") ?? ""} />
    </>
  );
}

function CamposMaterial({ m }: { m?: Material }) {
  return (
    <>
      <div className="grade g4" style={{ gap: 12 }}>
        <div><label className="rotulo">Tipo</label><select name="tipo" defaultValue={m?.tipo ?? "Mensagem"}>{TIPOS_MATERIAL.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div><label className="rotulo">Ordem</label><input type="number" name="ordem" defaultValue={m?.ordem ?? 1} /></div>
        <div style={{ gridColumn: "span 2" }}><label className="rotulo">Título</label><input type="text" name="titulo" required defaultValue={m?.titulo ?? ""} /></div>
      </div>
      <label className="rotulo">Texto</label>
      <textarea name="texto" rows={6} required defaultValue={m?.texto ?? ""} />
      <p className="ajuda">Preenchidos sozinhos: {"{loja}"}, {"{seu_nome}"}, {"{instagram}"}, {"{whatsapp}"}, {"{cidade}"}. Qualquer outro, como {"{cliente}"}, aparece para a loja completar.</p>
    </>
  );
}

function EditarAcao() {
  const id = useSearchParams().get("id") ?? "";
  useEquipe();
  const [aviso, setAviso] = useState<{ ok?: string; erro?: string }>({});
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarAcao(id, null)), resultados: await resultadosDaAcao(id) }), [id]);
  if (!dados) return <Carregando />;
  const a = dados.acao;
  if (!a) return <div className="card">Ação não encontrada.</div>;
  const fazer = async (f: () => Promise<unknown>, ok: string) => {
    setAviso({});
    try { await f(); setAviso({ ok }); recarregar(); } catch (e) { setAviso({ erro: (e as Error).message }); }
  };

  return (
    <>
      <Titulo voltar={{ href: "/equipe/acoes", rotulo: "Ações do Mês" }} titulo={a.titulo} sub={`Dia principal ${dia(a.data_acao)} · ${dados.etapas.length} etapas · ${dados.materiais.length} materiais`} />
      <div className="card card-borda mb" style={{ ["--c" as string]: a.publicada ? "var(--green)" : "var(--orange)" }}>
        <div className="linha entre">
          <div><b>{a.publicada ? "Publicada: todos os portais veem esta ação." : "Rascunho: só a equipe vê."}</b></div>
          <button className={`btn ${a.publicada ? "s" : "p"}`} type="button" onClick={() => fazer(() => acaoPublicar(a.id, !a.publicada), a.publicada ? "Voltou para rascunho." : "Publicada nos portais.")}>{a.publicada ? "Despublicar" : "Publicar nos portais"}</button>
        </div>
      </div>
      {aviso.ok && <div className="aviso ok mb">{aviso.ok}</div>}
      {aviso.erro && <div className="aviso mb">{aviso.erro}</div>}

      <div className="secao">Resultado das lojas · {dados.resultados.length} ativaram</div>
      <div className="card tabela-wrap mb">
        {dados.resultados.length === 0 ? <p className="mudo">Nenhuma loja ativou ainda.</p> : (
          <table className="tabela">
            <thead><tr><th>Loja</th><th>Plano</th><th>Faturamento</th><th>PA</th><th>Cadastros</th><th>Tarefas</th><th /></tr></thead>
            <tbody>
              {dados.resultados.sort((x, y) => (y.placar.pct ?? 0) - (x.placar.pct ?? 0)).map((r) => (
                <tr key={r.id}>
                  <td><b>{r.loja}</b>{r.concluida && <div><span className="selo feito">concluída</span></div>}</td>
                  <td style={{ fontSize: 13 }}>{Object.values(r.plano).join(" · ") || "—"}</td>
                  <td>{moeda(r.placar.total)}{r.meta ? <div className="mudo" style={{ fontSize: 12.5 }}>{r.placar.pct}% de {moeda(Number(r.meta))}</div> : null}</td>
                  <td>{r.placar.pa != null ? r.placar.pa.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}{r.meta_pa ? <span className="mudo"> / {Number(r.meta_pa)}</span> : null}</td>
                  <td>{r.placar.cadastros}{r.meta_cadastros ? <span className="mudo"> / {r.meta_cadastros}</span> : null}</td>
                  <td>{r.feitas.length}/{dados.etapas.reduce((n, e) => n + e.tarefas.length, 0)}</td>
                  <td><Link className="btn s peq" href={`/equipe/portal?id=${r.portal_id}`}>Portal</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <details className="card mb">
        <summary style={{ cursor: "pointer" }}><b>Dados da ação</b></summary>
        <form className="mt" action={(f) => fazer(() => acaoSalvar(a.id, f), "Ação salva.")}>
          <CamposAcao a={a} />
          <div className="linha mt"><button className="btn p" type="submit">Salvar</button></div>
        </form>
      </details>

      <div className="secao">Cronograma</div>
      <div className="card mb">
        {dados.etapas.map((e) => (
          <details key={e.id} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer" }}><b>{e.quando}</b> · {e.titulo} · {e.tarefas.length} tarefas{dataDaEtapa(a, e) ? ` · ${dia(dataDaEtapa(a, e)!)}` : ""}</summary>
            <form className="mt" action={(f) => fazer(() => etapaSalvar(a.id, e.id, f), "Etapa salva.")}>
              <CamposEtapa e={e} />
              <div className="linha mt">
                <button className="btn p peq" type="submit">Salvar</button>
                <button className="btn s peq" type="button" onClick={() => { if (confirm("Apagar esta etapa?")) fazer(() => etapaApagar(e.id), "Etapa apagada."); }}>Apagar</button>
              </div>
            </form>
          </details>
        ))}
        <details className="mt"><summary className="btn s peq" style={{ display: "inline-flex" }}>+ Nova etapa</summary>
          <form className="mt" action={(f) => fazer(() => etapaSalvar(a.id, null, f), "Etapa criada.")}><CamposEtapa /><div className="linha mt"><button className="btn p peq" type="submit">Criar etapa</button></div></form>
        </details>
      </div>

      <div className="secao">Materiais prontos</div>
      <div className="card">
        {dados.materiais.map((m) => (
          <details key={m.id} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer" }}><span className="selo espera" style={{ marginRight: 8 }}>{m.tipo}</span>{m.titulo}</summary>
            <form className="mt" action={(f) => fazer(() => materialSalvar(a.id, m.id, f), "Material salvo.")}>
              <CamposMaterial m={m} />
              <div className="linha mt">
                <button className="btn p peq" type="submit">Salvar</button>
                <button className="btn s peq" type="button" onClick={() => { if (confirm("Apagar este material?")) fazer(() => materialApagar(m.id), "Material apagado."); }}>Apagar</button>
              </div>
            </form>
          </details>
        ))}
        <details className="mt"><summary className="btn s peq" style={{ display: "inline-flex" }}>+ Novo material</summary>
          <form className="mt" action={(f) => fazer(() => materialSalvar(a.id, null, f), "Material criado.")}><CamposMaterial /><div className="linha mt"><button className="btn p peq" type="submit">Criar material</button></div></form>
        </details>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><EditarAcao /></Suspense>;
}
