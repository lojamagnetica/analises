"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Excluir } from "@/components/Excluir";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataCurta, hoje, moeda } from "@/lib/formato";
import { segundaDa } from "@/lib/rotina";
import {
  CAMPOS_ANALISE, CAMPOS_PLANO, CAMPOS_SEMANA, TIPOS_COMBINADO, buscarReunioesGestao, nomeMes, numerosDaSemana, reuniaoGestaoExcluir, reuniaoGestaoSalvar, somarMes, textoDaReuniao,
  type Combinado, type DadosGestao, type ReuniaoGestao, type TipoGestao,
} from "@/lib/reunioes-gestao";

const NOME: Record<TipoGestao, string> = { analise: "Análise do mês", planejamento: "Planejamento do mês", analise_semana: "Análise da semana" };
const CAMPOS_DO: Record<TipoGestao, typeof CAMPOS_ANALISE> = { analise: CAMPOS_ANALISE, planejamento: CAMPOS_PLANO, analise_semana: CAMPOS_SEMANA };
const COR: Record<TipoGestao, string> = { analise: "var(--blue)", planejamento: "var(--green)", analise_semana: "var(--red)" };
const ddmm = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`;
/** O nome da reunião no registro: o mês, ou a loja e a semana. */
const rotuloDe = (t: TipoGestao, d: DadosGestao) => (t === "analise_semana" ? `${NOME[t]}${d.loja ? ` · ${d.loja}` : ""} · semana de ${ddmm(d.semana ?? "")}` : `${NOME[t]} · ${nomeMes(d.mes)}`);

/** Os números da semana da loja, do Fechamento de caixa. */
function NumerosDaSemana({ portalId, loja, semana }: { portalId: string; loja: string; semana: string }) {
  const { dados } = useDados(() => numerosDaSemana(portalId, loja, semana), [portalId, loja, semana]);
  if (!dados) return <p className="ajuda">Buscando os números do caixa…</p>;
  if (!dados.dias) return <div className="aviso mt">Ainda não há fechamento de caixa lançado nesta semana{loja ? ` para ${loja}` : ""}. Com o caixa em dia, os números aparecem aqui.</div>;
  const pa = (p: number, v: number) => (v ? (p / v).toFixed(2).replace(".", ",") : "—");
  const tk = (f: number, v: number) => (v ? moeda(f / v) : "—");
  return (
    <div className="mt" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 420 }}>
        <thead><tr><th style={{ textAlign: "left" }}>Semana de {ddmm(semana)}</th><th>Venda</th><th>Atendimentos</th><th>PA</th><th>Ticket</th></tr></thead>
        <tbody>
          {dados.vendedoras.map((v) => <tr key={v.nome}><td>{v.nome}</td><td>{moeda(v.fat)}</td><td>{v.vendas}</td><td>{pa(v.pecas, v.vendas)}</td><td>{tk(v.fat, v.vendas)}</td></tr>)}
          <tr style={{ fontWeight: 700 }}><td>Loja · {dados.dias} {dados.dias === 1 ? "dia" : "dias"}</td><td>{moeda(dados.fat)}</td><td>{dados.vendas}</td><td>{pa(dados.pecas, dados.vendas)}</td><td>{tk(dados.fat, dados.vendas)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

/** Preencher (ou editar) uma reunião de gestão. */
function Editor({ portalId, lojas, tipo, r, aoFim }: { portalId: string; lojas: string[]; tipo: TipoGestao; r: ReuniaoGestao | null; aoFim: (salvou: boolean) => void }) {
  const mesHoje = hoje().slice(0, 7);
  const [data, setData] = useState(r?.data ?? hoje());
  const [d, setD] = useState<DadosGestao>(r?.dados ?? (tipo === "analise_semana"
    ? { mes: segundaDa(hoje()).slice(0, 7), loja: lojas[0] ?? "", semana: segundaDa(hoje()), campos: {}, combinados: [] }
    : { mes: tipo === "analise" ? somarMes(mesHoje, -1) : mesHoje, campos: {}, combinados: [], conferencia: "" }));
  const [erro, setErro] = useState("");
  const campos = CAMPOS_DO[tipo];
  const mudarComb = (i: number, c: Partial<Combinado>) => setD({ ...d, combinados: d.combinados.map((x, j) => (j === i ? { ...x, ...c } : x)) });

  return (
    <form className="card card-borda mb" style={{ ["--c" as string]: COR[tipo] }} onSubmit={async (e) => {
      e.preventDefault(); setErro("");
      try { await reuniaoGestaoSalvar(portalId, r?.id ?? null, tipo, data, { ...d, combinados: d.combinados.filter((c) => c.oque.trim()) }); aoFim(true); } catch (x) { setErro((x as Error).message); }
    }}>
      <h2 style={{ marginTop: 0 }}>{NOME[tipo]}</h2>
      <div className="grade g3">
        {tipo === "analise_semana" ? (
          <>
            {lojas.length > 1 && <div><label className="rotulo" htmlFor="as-loja">Loja</label>
              <select id="as-loja" value={d.loja ?? ""} onChange={(e) => setD({ ...d, loja: e.target.value })}>{lojas.map((l) => <option key={l}>{l}</option>)}</select></div>}
            <div><label className="rotulo" htmlFor="as-sem">Qualquer dia da semana analisada</label>
              <input id="as-sem" type="date" value={d.semana ?? ""} onChange={(e) => { const s = segundaDa(e.target.value || hoje()); setD({ ...d, semana: s, mes: s.slice(0, 7) }); }} required /></div>
          </>
        ) : (
          <div><label className="rotulo">{tipo === "analise" ? "Mês analisado" : "Mês planejado"}</label><input type="month" value={d.mes} onChange={(e) => setD({ ...d, mes: e.target.value })} required /></div>
        )}
        <div><label className="rotulo">Dia da reunião</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} required /></div>
      </div>

      {tipo === "planejamento" && (
        <div className="grade g3 mt">
          <div><label className="rotulo">Venda do mesmo mês no ano passado (R$)</label>
            <input type="number" min={0} value={d.meta_ano_passado ?? ""} onChange={(e) => { const v = Number(e.target.value) || 0; setD({ ...d, meta_ano_passado: v, meta: d.meta && d.meta !== Math.round((d.meta_ano_passado ?? 0) * 1.2) ? d.meta : Math.round(v * 1.2) }); }} /></div>
          <div><label className="rotulo">Meta do mês (R$)</label>
            <input type="number" min={0} value={d.meta ?? ""} onChange={(e) => setD({ ...d, meta: Number(e.target.value) || 0 })} />
            {!!d.meta_ano_passado && <p className="ajuda">Ano passado + 20% = {moeda(Math.round(d.meta_ano_passado * 1.2))}</p>}</div>
          <div><label className="rotulo">Conferido com a análise do mês anterior</label>
            <select value={d.conferencia ?? ""} onChange={(e) => setD({ ...d, conferencia: e.target.value as DadosGestao["conferencia"] })}>
              <option value="">Ainda não</option><option value="segue">Está batendo: segue o plano</option><option value="ajusta">Algo piorou: plano ajustado</option>
            </select></div>
        </div>
      )}

      {tipo === "analise_semana" && d.semana && <NumerosDaSemana portalId={portalId} loja={d.loja ?? ""} semana={d.semana} />}

      {campos.map((c) => (
        <div key={c.chave} className="mt">
          <label className="rotulo">{c.titulo}</label>
          <p className="ajuda" style={{ margin: "0 0 4px" }}>{c.ajuda}</p>
          <textarea rows={3} value={d.campos[c.chave] ?? ""} onChange={(e) => setD({ ...d, campos: { ...d.campos, [c.chave]: e.target.value } })} />
        </div>
      ))}

      {tipo === "analise" && (
        <>
          <h3 className="mt">Os 3 combinados do mês</h3>
          <p className="ajuda">O combinado sai de vocês: o quê, quem faz e até quando. A próxima análise começa conferindo estes combinados.</p>
          {TIPOS_COMBINADO.map((t) => (
            <div key={t.tipo} className="mt">
              <label className="rotulo">{t.titulo}</label>
              {d.combinados.map((c, i) => c.tipo !== t.tipo ? null : (
                <div key={i} className="linha" style={{ gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <input type="text" value={c.oque} placeholder="O quê" onChange={(e) => mudarComb(i, { oque: e.target.value })} style={{ flex: "2 1 220px" }} />
                  <input type="text" value={c.quem} placeholder="Quem" onChange={(e) => mudarComb(i, { quem: e.target.value })} style={{ flex: "1 1 120px" }} />
                  <input type="text" value={c.ate} placeholder="Até quando" onChange={(e) => mudarComb(i, { ate: e.target.value })} style={{ flex: "1 1 120px" }} />
                  <button type="button" className="btn s peq" onClick={() => setD({ ...d, combinados: d.combinados.filter((_, j) => j !== i) })}>Tirar</button>
                </div>
              ))}
              <button type="button" className="btn s peq" onClick={() => setD({ ...d, combinados: [...d.combinados, { tipo: t.tipo, oque: "", quem: "", ate: "" }] })}>+ Combinado</button>
            </div>
          ))}
        </>
      )}

      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt" style={{ gap: 8 }}>
        <button className="btn p" type="submit">Salvar</button>
        <button className="btn s" type="button" onClick={() => aoFim(false)}>Cancelar</button>
      </div>
    </form>
  );
}

/** Uma reunião registrada: o que foi decidido, com editar, excluir e a validação da Camilla. */
function Registro({ r, equipe, aoEditar, aoMudar }: { r: ReuniaoGestao; equipe: boolean; aoEditar: () => void; aoMudar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const campos = CAMPOS_DO[r.tipo];
  const validar = async (v: boolean) => { try { await reuniaoGestaoSalvar("", r.id, r.tipo, r.data, { ...r.dados, validado: v }); aoMudar(); } catch (x) { alert((x as Error).message); } };
  return (
    <div className="card mb">
      <div className="linha entre" style={{ flexWrap: "wrap", gap: 8 }}>
        <span><b>{rotuloDe(r.tipo, r.dados)}</b> <span className="mudo">· reunião em {dataCurta(r.data)}</span></span>
        <span className={`selo ${r.dados.validado ? "feito" : "espera"}`}>{r.dados.validado ? "validada pela Camilla" : "aguardando a Camilla"}</span>
      </div>
      {aberto && (
        <div className="mt">
          {r.tipo === "planejamento" && !!r.dados.meta && <p><b>Meta:</b> {moeda(r.dados.meta)}{r.dados.meta_ano_passado ? <span className="mudo"> · ano passado {moeda(r.dados.meta_ano_passado)}</span> : null}</p>}
          {campos.filter((c) => r.dados.campos[c.chave]?.trim()).map((c) => (
            <div key={c.chave} className="mb"><b>{c.titulo}</b><p style={{ margin: "2px 0 0", whiteSpace: "pre-line" }}>{r.dados.campos[c.chave]}</p></div>
          ))}
          {r.dados.combinados.length > 0 && TIPOS_COMBINADO.map((t) => {
            const lista = r.dados.combinados.filter((c) => c.tipo === t.tipo);
            return lista.length ? (
              <div key={t.tipo} className="mb"><b>{t.titulo}</b>
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{lista.map((c, i) => <li key={i}>{c.oque}{c.quem && <span className="mudo"> · {c.quem}</span>}{c.ate && <span className="mudo"> · até {c.ate}</span>}</li>)}</ul>
              </div>
            ) : null;
          })}
        </div>
      )}
      <div className="linha mt" style={{ gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn s peq" onClick={() => setAberto(!aberto)}>{aberto ? "Fechar" : "Ver"}</button>
        <button type="button" className="btn s peq" onClick={aoEditar}>Editar</button>
        <Copiar texto={textoDaReuniao(r.tipo, r.dados)} rotulo="Copiar" />
        {equipe && (r.dados.validado
          ? <button type="button" className="btn s peq" onClick={() => validar(false)}>Tirar a validação</button>
          : <button type="button" className="btn p peq" onClick={() => validar(true)}>Validar</button>)}
        <Excluir pergunta={`Excluir: ${rotuloDe(r.tipo, r.dados).toLowerCase()}?`} fazer={() => reuniaoGestaoExcluir(r.id)} aoFim={aoMudar} />
      </div>
    </div>
  );
}

export default function ReunioesGestao() {
  const { portal, equipe } = usePortal();
  const { dados, recarregar } = useDados(() => buscarReunioesGestao(portal.id), [portal.id]);
  const [editando, setEditando] = useState<{ tipo: TipoGestao; r: ReuniaoGestao | null } | null>(null);
  if (!dados) return <Carregando />;

  return (
    <>
      <Titulo titulo="Reuniões de gestão" sub="Vocês são os gestores das lojas e fazem essa gestão juntos. Todo mês, duas reuniões dos donos e, depois, a reunião do mês com o time." />

      <div className="grade g3 mb">
        <div className="card card-borda" style={{ ["--c" as string]: "var(--green)" }}>
          <small className="mudo">Até o dia 20</small>
          <h3 style={{ margin: "4px 0" }}>Planejamento do mês seguinte</h3>
          <p className="mudo" style={{ margin: 0 }}>Transformar em ação: estoque, o mesmo mês do ano passado, desejo e giro, meta, datas, calendário e ações.</p>
        </div>
        <div className="card card-borda" style={{ ["--c" as string]: "var(--blue)" }}>
          <small className="mudo">No começo do mês</small>
          <h3 style={{ margin: "4px 0" }}>Análise do mês que fechou</h3>
          <p className="mudo" style={{ margin: 0 }}>Entender: o que está bom, o que está ruim e onde redobrar a atenção. Confere o plano: segue ou ajusta. Saem os 3 combinados.</p>
        </div>
        <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
          <small className="mudo">Logo depois da análise</small>
          <h3 style={{ margin: "4px 0" }}>Reunião do mês com o time</h3>
          <p className="mudo" style={{ margin: 0 }}>A junção das duas: o que foi bom, o que precisa melhorar, a meta e as ações.</p>
          <Link className="btn s peq mt" href="/pessoas/reuniao-mensal">Montar a reunião do mês →</Link>
        </div>
      </div>

      {editando
        ? <Editor portalId={portal.id} lojas={portal.lojas ?? []} tipo={editando.tipo} r={editando.r} aoFim={(s) => { setEditando(null); if (s) recarregar(); }} />
        : (
          <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn p" onClick={() => setEditando({ tipo: "analise", r: null })}>+ Análise do mês</button>
            <button type="button" className="btn p" onClick={() => setEditando({ tipo: "planejamento", r: null })}>+ Planejamento do mês</button>
            <button type="button" className="btn p" onClick={() => setEditando({ tipo: "analise_semana", r: null })}>+ Análise da semana</button>
          </div>
        )}

      <div className="secao">Reuniões registradas</div>
      {dados.length
        ? dados.map((r) => <Registro key={r.id} r={r} equipe={equipe} aoEditar={() => { setEditando({ tipo: r.tipo, r }); window.scrollTo({ top: 0, behavior: "smooth" }); }} aoMudar={recarregar} />)
        : <div className="card mudo">Nenhuma reunião registrada ainda. Comece pela análise do mês que fechou.</div>}
    </>
  );
}
