"use client";

import Link from "next/link";
import { useState } from "react";
import { AbasBussola } from "@/components/AbasBussola";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import {
  DIAS_NOME, agoraEDepois, alertas, buscarHoje, diaDaSemana, estaFeita, marcarFeita, novoId, registroDe, salvarBussola, sugestoesDeConteudo, sugestoesDePrioridade, tarefasDoDia,
  type Bussola as DadosBussola, type RegistroDia, type Tarefa,
} from "@/lib/bussola";

const COR = { alerta: "var(--red)", atencao: "var(--orange)" } as const;

export default function Bussola() {
  const { portal } = usePortal();
  const { dados } = useDados(() => buscarHoje(portal.id), [portal.id]);
  const [bs, setBs] = useState<DadosBussola | null>(null);
  const [erro, setErro] = useState("");
  const [novaTarefa, setNovaTarefa] = useState("");
  if (!dados) return <Carregando />;
  const h = hoje();
  const b = bs ?? dados.b;
  const reg = registroDe(b, h);
  const ontem = registroDe(b, somarDias(h, -1));

  /** Guarda na tela agora e no banco em seguida. */
  async function gravar(nova: DadosBussola) {
    setBs(nova); setErro("");
    try { await salvarBussola(portal.id, nova); } catch (e) { setErro((e as Error).message); }
  }
  const mudarReg = (x: Partial<RegistroDia>, salvar = true) => {
    const nova = { ...b, dia: { ...b.dia, [h]: { ...reg, ...x } } };
    return salvar ? gravar(nova) : setBs(nova);
  };

  const tarefas = tarefasDoDia(b, h);
  const feita = (t: Tarefa) => estaFeita(b, t, h);
  const doDia = tarefas.filter((t) => t.tipo === "rotina" || t.tipo === "extra");
  const atrasadas = tarefas.filter((t) => t.tipo === "atraso" && !feita(t));
  const doMes = tarefas.filter((t) => t.tipo === "mes");
  const abertasTotal = [...doDia, ...atrasadas, ...doMes].filter((t) => !feita(t));
  const { agora, proxima } = agoraEDepois(tarefas, feita);
  const todosAvisos = alertas(dados);
  const avisos = todosAvisos.filter((a) => !reg.ocultos.includes(a.chave));
  const ideias = sugestoesDeConteudo(dados);
  const sugestoes = sugestoesDePrioridade(avisos, atrasadas, dados).filter((s) => !reg.prioridades.includes(s));
  const minutosHoje = doDia.filter((t) => !feita(t)).reduce((a, t) => a + t.minutos, 0);

  const linhaTarefa = (t: Tarefa) => (
    <div key={t.chave + t.tipo} className="linha entre" style={{ gap: 10, padding: "6px 0", alignItems: "center" }}>
      <label style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: feita(t) ? "line-through" : undefined, opacity: feita(t) ? 0.6 : 1 }}>
        <input type="checkbox" checked={feita(t)} onChange={(e) => gravar(marcarFeita(b, t, e.target.checked, h))} />
        <span>
          {t.hora && <b>{t.hora} · </b>}{t.titulo}
          {t.minutos > 0 && <small className="mudo"> ({t.minutos} min)</small>}
          {t.quando && <small className="mudo"> · {t.quando}</small>}
        </span>
      </label>
      <span style={{ display: "flex", gap: 12 }}>
        {t.link && <Link className="link-loja" href={t.link}>Abrir</Link>}
        {t.tipo === "extra" && (
          <button type="button" className="link-loja" style={{ color: "var(--red)", fontSize: 13.5 }}
            onClick={() => { if (confirm(`Tirar “${t.titulo}” de hoje?`)) mudarReg({ extras: reg.extras.filter((x) => x.id !== t.chave) }); }}>Remover</button>
        )}
      </span>
    </div>
  );

  return (
    <>
      <Titulo titulo="Onde está o meu tempo" sub={`${DIAS_NOME[diaDaSemana(h)]}: o que fazer agora, o que importa mais e o que os números estão pedindo.`} aba="Bússola do gestor" />
      <AbasBussola />
      {erro && <div className="aviso erro mb">{erro}</div>}

      {ontem.fechamento && (
        <div className="aviso ok mb"><b>Ontem você deixou combinado:</b> {ontem.fechamento}</div>
      )}

      {(agora || proxima) && (
        <div className="card card-borda mb" style={{ ["--c" as string]: "var(--green)" }}>
          {agora && <p style={{ margin: 0 }}><b>Agora:</b> {agora.titulo} <small className="mudo">(até {fimDe(agora)})</small></p>}
          {proxima && <p style={{ margin: agora ? "6px 0 0" : 0 }}><b>Depois:</b> {proxima.hora} · {proxima.titulo}</p>}
        </div>
      )}

      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
        <h2 style={{ marginTop: 0 }}>🎯 As 3 coisas que importam hoje</h2>
        <p className="mudo" style={{ marginTop: 0 }}>Quando parece que não dá tempo de nada, comece por aqui. Só 3.</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="linha mb" style={{ gap: 8, alignItems: "center" }}>
            <input type="checkbox" aria-label={`Prioridade ${i + 1} feita`} checked={!!reg.feitas[i]}
              onChange={(e) => mudarReg({ feitas: reg.feitas.map((x, j) => (j === i ? e.target.checked : x)) })} />
            <input type="text" placeholder={`Prioridade ${i + 1}`} value={reg.prioridades[i] ?? ""} style={{ flex: 1, margin: 0, textDecoration: reg.feitas[i] ? "line-through" : undefined }}
              onChange={(e) => mudarReg({ prioridades: reg.prioridades.map((x, j) => (j === i ? e.target.value : x)) }, false)}
              onBlur={() => gravar(b)} />
          </div>
        ))}
        {sugestoes.length > 0 && reg.prioridades.some((x) => !x.trim()) && (
          <div className="chips">
            <small className="mudo" style={{ alignSelf: "center" }}>Sugestões:</small>
            {sugestoes.slice(0, 4).map((s) => (
              <button key={s} type="button" className="chip" onClick={() => { const i = reg.prioridades.findIndex((x) => !x.trim()); mudarReg({ prioridades: reg.prioridades.map((x, j) => (j === i ? s : x)) }); }}>+ {s}</button>
            ))}
          </div>
        )}
      </div>

      <div className="secao">Sua rotina de hoje {minutosHoje > 0 && <small className="mudo">· faltam {minutosHoje >= 60 ? `${Math.floor(minutosHoje / 60)}h${String(minutosHoje % 60).padStart(2, "0")}` : `${minutosHoje} min`}</small>}</div>
      {b.blocos.length === 0 && reg.extras.length === 0 ? (
        <div className="card mb">
          <p style={{ marginTop: 0 }}>Você ainda não montou sua rotina. Conte quando você está disponível e a Bússola monta a semana ideal.</p>
          <Link className="btn p peq" href="/bussola/rotina">Montar minha rotina</Link>
        </div>
      ) : (
        <div className="card mb">
          {doDia.length === 0 && <p className="mudo" style={{ margin: 0 }}>Nada marcado para hoje na rotina. <Link href="/bussola/rotina">Ver a semana</Link></p>}
          {doDia.map(linhaTarefa)}
          <form className="linha" style={{ gap: 8, marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); if (!novaTarefa.trim()) return; mudarReg({ extras: [...reg.extras, { id: novoId(), titulo: novaTarefa.trim() }] }); setNovaTarefa(""); }}>
            <input type="text" placeholder="+ Algo que apareceu hoje" value={novaTarefa} onChange={(e) => setNovaTarefa(e.target.value)} style={{ flex: 1, margin: 0 }} />
            <button type="submit" className="btn s peq">Adicionar</button>
          </form>
        </div>
      )}

      {atrasadas.length > 0 && (
        <>
          <div className="secao">Ficou para trás</div>
          <div className="card card-borda mb" style={{ ["--c" as string]: "var(--orange)" }}>{atrasadas.map(linhaTarefa)}</div>
        </>
      )}
      {doMes.length > 0 && (
        <>
          <div className="secao">Do mês</div>
          <div className="card mb">{doMes.map(linhaTarefa)}</div>
        </>
      )}

      <div className="secao">O que os números pedem</div>
      {avisos.length === 0 ? (
        <div className="card mb"><p style={{ margin: 0 }}>Nenhum alerta agora. Lance o caixa por vendedora, o estoque parado e os boletos para a Bússola avisar você.</p></div>
      ) : avisos.map((a) => (
        <div key={a.chave} className="card card-borda mb" style={{ ["--c" as string]: COR[a.nivel] }}>
          <div className="linha entre">
            <b>{a.titulo}</b>
            <button type="button" className="link-loja" onClick={() => mudarReg({ ocultos: [...reg.ocultos, a.chave] })}>Ocultar hoje</button>
          </div>
          <p style={{ margin: "6px 0" }}>{a.texto}</p>
          {a.href && <Link className="btn s peq" href={a.href}>{a.botao ?? "Abrir"}</Link>}
        </div>
      ))}

      {ideias.length > 0 && (
        <>
          <div className="secao">Para o conteúdo desta semana</div>
          {ideias.map((s) => (
            <div key={s.chave} className="card mb">
              <b>{s.titulo}</b>
              <p style={{ margin: "6px 0" }}>{s.texto}</p>
              <Link className="btn s peq" href={s.href}>{s.origem === "pauta" ? "Ver pautas" : "Criar o roteiro"}</Link>
            </div>
          ))}
        </>
      )}

      <div className="secao">Fechar o dia</div>
      <div className="card mb">
        <p className="mudo" style={{ marginTop: 0 }}>{abertasTotal.length > 0 ? `Ficaram ${abertasTotal.length} coisa(s) em aberto.` : "Tudo o que estava na rotina foi feito."} Escreva o que fica combinado para amanhã: amanhã cedo isso aparece aqui para você.</p>
        <textarea rows={3} value={reg.fechamento} placeholder="Ex.: Ligar para o fornecedor, conversar com a Ana sobre a meta, gravar o vídeo do vestido." style={{ width: "100%" }}
          onChange={(e) => mudarReg({ fechamento: e.target.value }, false)} onBlur={() => gravar(b)} />
      </div>

      <div className="grade g3">
        <Link href="/gestao/tempo" className="card"><b>Tirar tudo da cabeça</b><p className="mudo" style={{ margin: "4px 0 0" }}>Separe o que só você faz do que pode passar para alguém.</p></Link>
        <Link href="/gestao/caixa" className="card"><b>Fechar o caixa</b><p className="mudo" style={{ margin: "4px 0 0" }}>Por vendedora, para a Bússola enxergar quedas.</p></Link>
        <Link href="/inicio" className="card"><b>Meu dia</b><p className="mudo" style={{ margin: "4px 0 0" }}>Placar, time e atitudes de atração no Início.</p></Link>
      </div>
    </>
  );
}

function fimDe(t: Tarefa) {
  const [hh, mm] = t.hora.split(":").map(Number);
  const n = hh * 60 + mm + t.minutos;
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
