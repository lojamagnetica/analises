"use client";

import Link from "next/link";
import { useState } from "react";
import { ConectarGoogle } from "@/components/ConectarGoogle";
import { NovoCompromisso } from "@/components/NovoCompromisso";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import {
  CATEGORIAS, atualizarAgora, buscarAgenda, chaveDia, diaDaSemana, diasDoEvento, fimDoDia, hojeChave, hora, inicioDoDia,
  rotuloDia, rotuloMes, rotuloDa, seloDa, somarDias, type CategoriaAgenda, type Evento,
} from "@/lib/agenda";
import { dataHora } from "@/lib/formato";
import { normalizar } from "@/lib/agenda-regras";

type Visao = "semana" | "mes" | "dia" | "lista";
const VISOES: { id: Visao; rotulo: string }[] = [{ id: "semana", rotulo: "Semana" }, { id: "mes", rotulo: "Mês" }, { id: "dia", rotulo: "Dia" }, { id: "lista", rotulo: "Lista" }];
// Uma cor por agenda (a ordem é a do cadastro em agenda_calendarios).
const CORES = ["#c0392b", "#2a7de1", "#2e9e6b", "#9b59b6", "#d98a00"];

/** Do primeiro ao último dia que a tela mostra para a visão e a data escolhidas (a semana começa no domingo). */
function periodo(visao: Visao, ancora: string) {
  if (visao === "dia") return { ini: ancora, fim: ancora };
  if (visao === "lista") return { ini: ancora, fim: somarDias(ancora, 30) };
  if (visao === "semana") { const i = somarDias(ancora, -diaDaSemana(ancora)); return { ini: i, fim: somarDias(i, 6) }; }
  const primeiro = `${ancora.slice(0, 8)}01`;
  const ultimo = somarDias(`${somarDias(primeiro, 32).slice(0, 8)}01`, -1);
  return { ini: somarDias(primeiro, -diaDaSemana(primeiro)), fim: somarDias(ultimo, 6 - diaDaSemana(ultimo)) };
}

export default function AgendaEquipe() {
  useEquipe();
  const [visao, setVisao] = useState<Visao>("semana");
  const [ancora, setAncora] = useState(hojeChave());
  const [calSel, setCalSel] = useState<string[]>([]);
  const [catSel, setCatSel] = useState<CategoriaAgenda[]>([]);
  const [lojaSel, setLojaSel] = useState("");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Evento | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const { ini, fim } = periodo(visao, ancora);
  const { dados, recarregar } = useDados(() => buscarAgenda(inicioDoDia(ini), fimDoDia(fim)), [ini, fim]);
  if (!dados) return <Carregando />;

  const alterna = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const corDe = (id: string) => CORES[Math.max(0, dados.calendarios.findIndex((c) => c.id === id)) % CORES.length];
  const nomeDe = (id: string) => dados.calendarios.find((c) => c.id === id)?.nome ?? "";
  const q = normalizar(busca);
  const visiveis = dados.eventos.filter((e) =>
    (calSel.length === 0 || calSel.includes(e.calendario_id)) && (catSel.length === 0 || catSel.includes(e.categoria)) &&
    (!lojaSel || e.portal_id === lojaSel) && (!q || normalizar(`${e.titulo} ${e.loja ?? ""}`).includes(q)));
  const porDia = new Map<string, Evento[]>();
  for (const e of visiveis) for (const d of diasDoEvento(e)) porDia.set(d, [...(porDia.get(d) ?? []), e]);
  porDia.forEach((lista) => lista.sort((a, b) => Number(b.dia_inteiro) - Number(a.dia_inteiro) || a.inicio.localeCompare(b.inicio)));

  const dias: string[] = [];
  for (let d = ini; d <= fim; d = somarDias(d, 1)) dias.push(d);
  const hoje = hojeChave();
  const passo = visao === "mes" ? 31 : visao === "dia" ? 1 : 7;
  const mover = (n: number) => setAncora(visao === "mes" ? somarDias(`${ancora.slice(0, 8)}01`, n > 0 ? 32 : -1).slice(0, 8) + "01" : somarDias(ancora, n * passo));
  const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const titulo = maiuscula(visao === "mes" ? rotuloMes(ancora) : visao === "dia" ? rotuloDia(ancora) : `${rotuloDia(ini)} a ${rotuloDia(fim)}`);
  const ultimaLeitura = dados.calendarios.map((c) => c.sincronizado_em).filter(Boolean).sort().reverse()[0] ?? null;

  const Evt = ({ e, compacto }: { e: Evento; compacto?: boolean }) => (
    <button
      type="button" onClick={() => setAberto(e)} title={e.titulo}
      style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", font: "inherit", background: "var(--soft)", color: "var(--text)", border: "1px solid var(--line)", borderLeft: `4px solid ${corDe(e.calendario_id)}`, borderRadius: 8, padding: compacto ? "3px 6px" : "8px 10px", fontSize: compacto ? 12 : 14, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: compacto ? "nowrap" : "normal" }}
    >
      <span className="mudo">{e.dia_inteiro ? "Dia todo" : hora(e.inicio)}</span> <b>{e.titulo || "(sem título)"}</b>
      {!compacto && <> <span className={`selo ${seloDa(e.categoria)}`}>{rotuloDa(e.categoria)}</span>{e.loja && <span className="mudo"> · {e.loja}</span>}</>}
    </button>
  );

  const lista = (ds: string[]) => {
    const com = ds.filter((d) => porDia.has(d));
    if (com.length === 0) return <p className="mudo">Nada na agenda neste período.</p>;
    return com.map((d) => (
      <div key={d} className="mb">
        <h3 style={{ textTransform: "capitalize", margin: "0 0 6px" }}>{rotuloDia(d)}{d === hoje && <span className="selo andamento" style={{ marginLeft: 8 }}>hoje</span>}</h3>
        {porDia.get(d)!.map((e) => <Evt key={`${e.calendario_id}-${e.gcal_id}-${d}`} e={e} />)}
      </div>
    ));
  };

  return (
    <>
      <Titulo titulo="Agenda" sub="Os Google Agendas da equipe num lugar só. Para marcar um compromisso, use o botão abaixo: ele abre o Google Agenda já preenchido." />
      <div className="mb"><NovoCompromisso /></div>

      <ConectarGoogle aoSalvar={recarregar} />

      {dados.calendarios.length === 0 && (
        <div className="aviso mb">Ainda não há agenda conectada. Quando as agendas forem compartilhadas com a conta de serviço do Google e cadastradas, os eventos aparecem aqui.</div>
      )}
      {dados.calendarios.filter((c) => c.erro).map((c) => <div key={c.id} className="aviso mb">Não consegui ler a agenda {c.nome}: {c.erro}</div>)}
      {erro && <div className="aviso mb">{erro}</div>}

      <div className="card mb">
        <div className="linha entre" style={{ flexWrap: "wrap", gap: 8 }}>
          <div className="linha" style={{ flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="btn s peq" onClick={() => setAncora(hoje)}>Hoje</button>
            <button type="button" className="btn s peq" onClick={() => mover(-1)} aria-label="Anterior">‹</button>
            <button type="button" className="btn s peq" onClick={() => mover(1)} aria-label="Próximo">›</button>
            <b>{titulo}</b>
          </div>
          <div className="chips">
            {VISOES.map((v) => <button key={v.id} type="button" className={`chip${visao === v.id ? " escolhido" : ""}`} onClick={() => setVisao(v.id)}>{v.rotulo}</button>)}
          </div>
        </div>
        <div className="chips mt">
          {dados.calendarios.map((c) => (
            <button key={c.id} type="button" className={`chip${calSel.includes(c.id) ? " escolhido" : ""}`} onClick={() => setCalSel(alterna(calSel, c.id))}>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: corDe(c.id), marginRight: 6 }} />{c.nome}
            </button>
          ))}
        </div>
        <div className="chips mt">
          {CATEGORIAS.map((c) => <button key={c.id} type="button" className={`chip${catSel.includes(c.id) ? " escolhido" : ""}`} onClick={() => setCatSel(alterna(catSel, c.id))}>{c.rotulo}</button>)}
        </div>
        <div className="linha mt" style={{ flexWrap: "wrap", gap: 8 }}>
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título ou loja" style={{ maxWidth: 280 }} />
          <select value={lojaSel} onChange={(e) => setLojaSel(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="">Todas as lojas</option>
            {dados.lojas.map((l) => <option key={l.id} value={l.id}>{l.loja}</option>)}
          </select>
          <button
            type="button" className="btn s peq" disabled={atualizando}
            onClick={async () => { setAtualizando(true); setErro(await atualizarAgora()); setAtualizando(false); recarregar(); }}
          >{atualizando ? "Atualizando…" : "Atualizar agora"}</button>
          <span className="mudo" style={{ fontSize: 13 }}>Última leitura: {ultimaLeitura ? dataHora(ultimaLeitura) : "ainda não houve"}</span>
        </div>
      </div>

      {aberto && (
        <div className="card card-borda mb" style={{ ["--c" as string]: corDe(aberto.calendario_id) }}>
          <div className="linha entre" style={{ flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0 }}>{aberto.titulo || "(sem título)"}</h3>
            <button type="button" className="btn s peq" onClick={() => setAberto(null)}>Fechar</button>
          </div>
          <p className="mudo" style={{ margin: "6px 0" }}>
            {aberto.dia_inteiro ? `Dia todo · ${rotuloDia(chaveDia(aberto.inicio))}` : `${dataHora(aberto.inicio)} às ${hora(aberto.fim)}`} · Agenda {nomeDe(aberto.calendario_id)}
          </p>
          <div className="linha" style={{ flexWrap: "wrap", gap: 8 }}>
            <span className={`selo ${seloDa(aberto.categoria)}`}>{rotuloDa(aberto.categoria)}</span>
            {aberto.portal_id && <Link href={`/equipe/portal?id=${aberto.portal_id}#ficha`}>Abrir a ficha de {aberto.loja}</Link>}
            {aberto.meet_url && <a className="btn p peq" href={aberto.meet_url} target="_blank" rel="noopener noreferrer">Entrar no Meet</a>}
            {aberto.link && <a className="btn s peq" href={aberto.link} target="_blank" rel="noopener noreferrer">Abrir no Google Agenda</a>}
          </div>
        </div>
      )}

      <div className="card">
        {(visao === "lista" || visao === "dia") && lista(dias)}
        {visao === "semana" && (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(150px, 1fr))", gap: 10 }}>
              {dias.map((d) => (
                <div key={d}>
                  <div style={{ textTransform: "capitalize", fontWeight: 700, marginBottom: 6, color: d === hoje ? "var(--red)" : undefined }}>{rotuloDia(d)}</div>
                  {(porDia.get(d) ?? []).map((e) => <Evt key={`${e.calendario_id}-${e.gcal_id}-${d}`} e={e} compacto />)}
                </div>
              ))}
            </div>
          </div>
        )}
        {visao === "mes" && (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(110px, 1fr))", gap: 6 }}>
              {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((n) => <div key={n} className="mudo" style={{ fontSize: 12, textTransform: "uppercase" }}>{n}</div>)}
              {dias.map((d) => {
                const evs = porDia.get(d) ?? [];
                return (
                  <div key={d} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 4, minHeight: 92, opacity: d.slice(0, 7) === ancora.slice(0, 7) ? 1 : 0.5 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: d === hoje ? "var(--red)" : undefined }}>{Number(d.slice(8))}</div>
                    {evs.slice(0, 3).map((e) => <Evt key={`${e.calendario_id}-${e.gcal_id}-${d}`} e={e} compacto />)}
                    {evs.length > 3 && <button type="button" className="chip" onClick={() => { setAncora(d); setVisao("dia"); }}>+{evs.length - 3}</button>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
