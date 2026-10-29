"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  aplicarHub, apagarArquivo, buscarPreparo, conferirParada, excluirPreparo, importarDrive, linkArquivo, listarArquivos, rodarParada, salvarPreparo, subirArquivo,
  type Escolha, type Parada, type Preparo,
} from "@/lib/diagnostico-preparo";

const NOMES: Record<Parada, string> = { raiox: "Raio-X e proposta", perguntas: "Perguntas do gargalo", solucao: "Solução, roteiro e PDF", hub: "Diagnóstico da loja no Hub" };
const semPrefixo = (n: string) => n.replace(/^\d{13}-/, "").replace(/^drive-[A-Za-z0-9_-]{20,}?-/, "");
const kb = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** O botão que chama o agente numa parada, com o pedido de ajuste para refazer. */
function Rodar({ p, parada, rotulo, ocupado, pode, aoPedir }: { p: Preparo | null; parada: Parada; rotulo: string; ocupado: boolean; pode: boolean; aoPedir: (ajuste: string) => Promise<void> }) {
  const [ajuste, setAjuste] = useState(p?.ajustes?.[parada] ?? "");
  const feito = parada === "raiox" ? !!p?.raiox : parada === "perguntas" ? !!p?.perguntas?.length : parada === "solucao" ? !!p?.solucao : !!p?.hub;
  return (
    <div className="mt">
      {feito && (
        <label className="ajuda" style={{ display: "block" }}>O que ajustar ao refazer (o agente segue à risca)
          <textarea rows={2} value={ajuste} placeholder="Ex.: a nota de Processos Comerciais está alta demais; o crediário é o ponto mais grave" onChange={(e) => setAjuste(e.target.value)} />
        </label>
      )}
      <button type="button" className="btn p peq" disabled={ocupado || !pode} onClick={() => aoPedir(feito ? ajuste : "")}>
        {ocupado ? "O agente está trabalhando…" : feito ? `Refazer: ${rotulo}` : `✨ ${rotulo}`}
      </button>
    </div>
  );
}

function Preparar({ portalId }: { portalId: string }) {
  const { abrirPortal } = useEquipe();
  const { dados, recarregar } = useDados(async () => {
    const [p, arquivos, { data: portal }] = await Promise.all([
      buscarPreparo(portalId), listarArquivos(portalId),
      supabaseBrowser().from("portais").select("loja, responsavel").eq("id", portalId).single(),
    ]);
    return { p, arquivos, loja: (portal?.loja as string) ?? "Loja", responsavel: (portal?.responsavel as string) ?? "" };
  }, [portalId]);
  const [tr, setTr] = useState<Preparo["transcricoes"] | null>(null);
  const [esc, setEsc] = useState<Escolha | null>(null);
  const [perg, setPerg] = useState<string[] | null>(null);
  const [resp, setResp] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [subindo, setSubindo] = useState(0);
  const [drive, setDrive] = useState(false);
  const [pulados, setPulados] = useState<string[]>([]);
  const p = dados?.p ?? null;
  // Sem lote entregue há mais de 5 minutos, a entrega caiu no meio: libera para pedir de novo.
  const caiu = p?.agente?.estado === "trabalhando" && !p.agente.lote && Date.now() - Date.parse(p.agente.inicio ?? "0") > 5 * 60_000;
  const ocupado = p?.agente?.estado === "trabalhando" && !caiu;
  // Enquanto o agente trabalha, a tela confere o lote a cada 20 segundos.
  useEffect(() => {
    if (!ocupado) return;
    const t = setInterval(async () => { await conferirParada(portalId).catch(() => null); recarregar(); }, 20000);
    return () => clearInterval(t);
  }, [ocupado, recarregar, portalId]);
  if (!dados) return <Carregando />;

  const salvar = async (x: Partial<Preparo>, aviso = "Salvo ✓") => { setMsg(""); try { await salvarPreparo(portalId, x); setMsg(aviso); recarregar(); } catch (e) { setMsg((e as Error).message); } };
  const pedir = (parada: Parada) => async (ajuste: string) => {
    setMsg("");
    try {
      await salvarPreparo(portalId, { ajustes: { ...(p?.ajustes ?? {}), [parada]: ajuste } });
      await rodarParada(portalId, parada); recarregar();
    } catch (e) { setMsg((e as Error).message); }
  };
  const r = p?.raiox, s = p?.solucao, ag = p?.agente;
  const t = tr ?? p?.transcricoes ?? {};
  const e = esc ?? p?.escolha ?? (r ? { gargalo: `${r.gargalo.pilar}: ${r.gargalo.tema}`, alavanca: r.alavanca.tipo, obs: "" } : { gargalo: "", alavanca: "Base de clientes", obs: "" });
  const pergs = perg ?? p?.perguntas ?? [];

  return (
    <>
      <Link className="voltar" href="/empresa/minha-central/diagnostico">← Diagnósticos</Link>
      <Titulo titulo={`Preparar o diagnóstico · ${dados.loja}`} sub={`O agente prepara, você estuda, revisa e decide em cada parada. Nada daqui vai para ${dados.responsavel || "a loja"} sem você liberar.`} />
      {ag?.estado && (
        <div className={`aviso mb${ag.estado === "pronto" ? " ok" : ""}`}>
          {ag.estado === "trabalhando" && !caiu && <>⏳ O agente está fazendo <b>{NOMES[ag.parada ?? "raiox"]}</b> (começou {dataHora(ag.inicio)}). Costuma levar de 5 a 20 minutos (com muito material, pode passar disso). Pode fechar a tela: ele continua, e a resposta fica guardada aqui.</>}
          {caiu && <>⚠️ {NOMES[ag.parada ?? "raiox"]} parou no meio. Peça de novo no botão da parada.</>}
          {ag.estado === "pronto" && <>✓ <b>{NOMES[ag.parada ?? "raiox"]}</b> pronto em {dataHora(ag.fim)}.</>}
          {ag.estado === "erro" && <>⚠️ {NOMES[ag.parada ?? "raiox"]}: {ag.msg}</>}
          {(ag.avisos ?? []).length > 0 && <div style={{ marginTop: 4 }}><small>Arquivos: {ag.avisos!.join(" · ")}</small></div>}
        </div>
      )}
      {msg && <div className="aviso mb">{msg}</div>}

      <div className="card mb">
        <h2 style={{ marginTop: 0 }}>Material para o agente ler</h2>
        <p className="ajuda" style={{ marginTop: 0 }}>Ele já lê do Hub: a passagem do Comercial (com o Resultado Nº 1 da venda), os Dados da loja, o caixa, a equipe e a Análise do Instagram. Aqui você completa com os relatórios e as conversas.</p>
        <b style={{ fontSize: 14 }}>Relatórios e prints ({dados.arquivos.length})</b>
        <p className="ajuda" style={{ margin: "2px 0 6px" }}>PDF, Word, planilha (Excel ou CSV) ou imagem. Planilha do Google: baixe como Excel antes de subir. Os que a loja subiu em Estoque e relatórios também aparecem aqui.</p>
        {dados.arquivos.map((a) => (
          <div key={a.nome} className="linha entre marcar" style={{ cursor: "default" }}>
            <span style={{ wordBreak: "break-all" }}>{semPrefixo(a.nome)} <small className="mudo">· {kb(a.tamanho)}</small></span>
            <span className="linha" style={{ gap: 8 }}>
              <button type="button" className="link-loja" onClick={async () => { const u = await linkArquivo(portalId, a.nome); if (u) window.open(u, "_blank"); }}>Abrir</button>
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir "${semPrefixo(a.nome)}"? A loja também deixa de ver.`)) { await apagarArquivo(portalId, a.nome); recarregar(); } }}>Excluir</button>
            </span>
          </div>
        ))}
        <label className="btn s peq mt" style={{ display: "inline-block", cursor: "pointer" }}>
          {subindo ? `Subindo… faltam ${subindo}` : "+ Subir arquivos"}
          <input type="file" multiple hidden accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.ods,image/*" disabled={subindo > 0} onChange={async (ev) => {
            const fs = Array.from(ev.target.files ?? []); ev.target.value = ""; setSubindo(fs.length); setMsg("");
            for (const f of fs) { try { await subirArquivo(portalId, f); } catch (x) { setMsg((x as Error).message); } setSubindo((n) => n - 1); }
            recarregar();
          }} />
        </label>{" "}
        <button type="button" className="btn s peq mt" disabled={drive} onClick={async () => {
          setDrive(true); setMsg(""); setPulados([]);
          try {
            const x = await importarDrive(portalId);
            setMsg(x.importados.length ? `Vieram ${x.importados.length} arquivos do Drive ✓` : "Nada novo na pasta do Drive.");
            setPulados(x.pulados.filter((y) => !y.endsWith("(já estava no Hub)")));
            recarregar();
          } catch (x) { setMsg((x as Error).message); }
          setDrive(false);
        }}>{drive ? "Lendo a pasta do Drive… (pode levar 1 ou 2 minutos)" : "Trazer da pasta do Drive"}</button>
        {pulados.length > 0 && (
          <details className="mt"><summary className="ajuda" style={{ cursor: "pointer" }}>Ficaram de fora ({pulados.length})</summary>
            <ul className="ajuda">{pulados.map((y) => <li key={y}>{y}</li>)}</ul>
          </details>
        )}
        <div className="grade g2 mt" style={{ gap: "0 12px" }}>
          <label className="ajuda">Transcrição da reunião do Comercial<textarea rows={5} value={t.comercial ?? ""} onChange={(x) => setTr({ ...t, comercial: x.target.value })} /></label>
          <label className="ajuda">Transcrição do onboarding com a CS<textarea rows={5} value={t.onboarding ?? ""} onChange={(x) => setTr({ ...t, onboarding: x.target.value })} /></label>
        </div>
        <label className="ajuda" style={{ display: "block" }}>Outras anotações (formulário de diagnóstico, conversas do grupo, o que você já sabe da loja)<textarea rows={3} value={t.outras ?? ""} onChange={(x) => setTr({ ...t, outras: x.target.value })} /></label>
        {tr && <button type="button" className="btn p peq" onClick={async () => { await salvar({ transcricoes: tr }); setTr(null); }}>Salvar o material</button>}
      </div>

      <div className="card card-borda mb" style={{ ["--c" as string]: r ? "var(--green)" : "var(--orange)" }}>
        <h2 style={{ marginTop: 0 }}>1 · Raio-X e proposta</h2>
        {r && <>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.resumo}</p>
          <div className="grade g4 mb">
            {r.pilares.map((x) => <div key={x.pilar} className="kpi"><small>{x.pilar}</small><b style={{ fontSize: 26 }}>{x.nota}</b></div>)}
          </div>
          {r.pilares.map((x) => (
            <div key={x.pilar} className="mb"><b>{x.pilar} · {x.nota}/10</b><br />{x.justificativa}<br /><small><b>Faz bem:</b> {x.bem}</small><br /><small><b>Ponto fraco:</b> {x.fraco}</small></div>
          ))}
          <details className="mb"><summary className="ajuda" style={{ cursor: "pointer" }}>Números-chave ({r.numeros.length})</summary>
            <div className="tabela-wrap"><table className="tabela"><tbody>{r.numeros.map((x, i) => <tr key={i}><td>{x.rotulo}</td><td><b>{x.valor}</b></td><td><small className="mudo">{x.fonte}</small></td></tr>)}</tbody></table></div>
          </details>
          {r.inconsistencias.length > 0 && <div className="aviso mb"><b>Inconsistências nos dados (viram perguntas):</b><ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{r.inconsistencias.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {r.faltando.length > 0 && <div className="aviso mb"><b>O que falta:</b><ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{r.faltando.map((x, i) => <li key={i}><b>{x.item}</b>: {x.para_que}</li>)}</ul></div>}
          <div className="grade g2 mb" style={{ gap: 10 }}>
            <div style={{ background: "var(--soft)", borderRadius: 12, padding: 12 }}><small className="mudo">Gargalo sugerido</small><br /><b>{r.gargalo.pilar}: {r.gargalo.tema}</b><p style={{ margin: "4px 0" }}>{r.gargalo.porque}</p><small><b>Alternativa:</b> {r.gargalo.alternativa}</small></div>
            <div style={{ background: "var(--soft)", borderRadius: 12, padding: 12 }}><small className="mudo">Alavanca rápida sugerida</small><br /><b>{r.alavanca.tipo}</b><p style={{ margin: "4px 0" }}>{r.alavanca.porque}</p></div>
          </div>
          <h3>A sua decisão</h3>
          <label className="ajuda" style={{ display: "block" }}>Gargalo (pilar e tema)<input type="text" value={e.gargalo} onChange={(x) => setEsc({ ...e, gargalo: x.target.value })} /></label>
          <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="link-loja" onClick={() => setEsc({ ...e, gargalo: `${r.gargalo.pilar}: ${r.gargalo.tema}` })}>Usar o sugerido</button>
            <button type="button" className="link-loja" onClick={() => setEsc({ ...e, gargalo: r.gargalo.alternativa })}>Usar a alternativa</button>
          </div>
          <label className="ajuda" style={{ display: "block" }}>Alavanca rápida<select value={e.alavanca} onChange={(x) => setEsc({ ...e, alavanca: x.target.value })}><option>Base de clientes</option><option>Instagram</option></select></label>
          <label className="ajuda" style={{ display: "block" }}>Observação para o agente (opcional)<input type="text" value={e.obs} placeholder="Ex.: o foco é a política de prazo, não a cobrança" onChange={(x) => setEsc({ ...e, obs: x.target.value })} /></label>
          <button type="button" className="btn p peq" disabled={!e.gargalo.trim()} onClick={async () => { await salvar({ escolha: e }, "Escolha salva ✓ Agora o agente pode fazer as perguntas do gargalo."); setEsc(null); }}>{p?.escolha ? "Salvar a escolha" : "Escolher e seguir"}</button>
          {p?.escolha && !esc && <small className="mudo"> · Escolhido: {p.escolha.gargalo} + {p.escolha.alavanca}</small>}
        </>}
        <Rodar p={p} parada="raiox" rotulo="Montar o Raio-X" ocupado={ocupado} pode aoPedir={pedir("raiox")} />
      </div>

      <div className="card card-borda mb" style={{ ["--c" as string]: p?.perguntas_liberadas ? "var(--green)" : pergs.length ? "var(--orange)" : "var(--line)", opacity: p?.escolha ? 1 : 0.6 }}>
        <h2 style={{ marginTop: 0 }}>2 · Perguntas do gargalo</h2>
        {!p?.escolha && <p className="mudo">Primeiro escolha o gargalo e a alavanca no Raio-X.</p>}
        {pergs.map((q, i) => (
          <div key={i} className="linha mb" style={{ gap: 8 }}>
            <b>{i + 1}.</b><input type="text" value={q} style={{ marginTop: 0 }} onChange={(x) => setPerg(pergs.map((y, j) => (j === i ? x.target.value : y)))} />
            <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => setPerg(pergs.filter((_, j) => j !== i))}>Tirar</button>
          </div>
        ))}
        {pergs.length > 0 && <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn s peq" onClick={() => setPerg([...pergs, ""])}>+ Pergunta</button>
          {perg && <button type="button" className="btn p peq" onClick={async () => { await salvar({ perguntas: perg.filter((x) => x.trim()) }); setPerg(null); }}>Salvar as perguntas</button>}
          <Copiar texto={pergs.map((q, i) => `${i + 1}. ${q}`).join("\n")} rotulo="Copiar" />
          {p?.perguntas_liberadas
            ? <button type="button" className="link-loja" onClick={() => salvar({ perguntas_liberadas: false })}>Tirar da Claudia</button>
            : <button type="button" className="btn p peq" disabled={!!perg} onClick={() => { if (confirm("Liberar as perguntas para a Claudia mandar para a loja?")) salvar({ perguntas_liberadas: true }, "Liberado ✓ A Claudia vê as perguntas na ficha da loja, na Jornada das clientes."); }}>Liberar para a Claudia mandar</button>}
        </div>}
        {p?.perguntas_liberadas && <p className="ajuda">A Claudia vê as perguntas na ficha da loja (Jornada das clientes) e cola aqui as respostas quando a loja mandar.</p>}
        {pergs.length > 0 && <label className="ajuda" style={{ display: "block" }}><b style={{ color: "var(--ink)" }}>Respostas da loja</b> (a Claudia cola, ou você)
          <textarea rows={6} value={resp ?? p?.respostas ?? ""} onChange={(x) => setResp(x.target.value)} />
        </label>}
        {resp !== null && <button type="button" className="btn p peq" onClick={async () => { await salvar({ respostas: resp }); setResp(null); }}>Salvar as respostas</button>}
        <Rodar p={p} parada="perguntas" rotulo="Fazer as perguntas do gargalo" ocupado={ocupado} pode={!!p?.escolha} aoPedir={pedir("perguntas")} />
      </div>

      <div className="card card-borda mb" style={{ ["--c" as string]: s ? "var(--green)" : "var(--line)", opacity: p?.escolha ? 1 : 0.6 }}>
        <h2 style={{ marginTop: 0 }}>3 · Solução, roteiro e PDF</h2>
        {!p?.respostas && p?.escolha && <p className="ajuda">Dá para montar sem as respostas, mas fica melhor com elas.</p>}
        {s && <>
          <div className="aviso ok mb"><b>Frase do diagnóstico:</b> {s.frase}</div>
          <p><b>Resultado Nº 1 · {s.resultado1.pilar}</b><br />{s.resultado1.numeros}<br /><small><b>Hoje:</b> {s.resultado1.hoje} · <b>Meta em 90 dias (a calibrar):</b> {s.resultado1.meta}</small></p>
          <h3>{s.solucao.titulo}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{s.solucao.texto}</p>
          {s.solucao.decisoes.length > 0 && <><b>Perguntas de decisão (você fecha ao vivo):</b><ul>{s.solucao.decisoes.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          <h3>Roteiro da reunião (1h30)</h3>
          <div className="tabela-wrap mb"><table className="tabela"><tbody>{s.roteiro.map((x, i) => <tr key={i}><td style={{ whiteSpace: "nowrap" }}><b>{x.tempo}</b></td><td><b>{x.bloco}</b><br /><span style={{ whiteSpace: "pre-wrap" }}>{x.falas}</span></td></tr>)}</tbody></table></div>
          <h3>As 2 missões</h3>
          {s.missoes.map((m, i) => <div key={i} className="mb"><span className={`selo ${m.tipo === "correcao" ? "alerta" : "feito"}`}>{m.tipo === "correcao" ? "Correção" : "Aceleração"}</span> <b>{m.titulo}</b><ol style={{ margin: "4px 0" }}>{m.passos.map((x, j) => <li key={j}>{x}</li>)}</ol><small className="mudo">{m.responsavel} · {m.prazo}</small></div>)}
          <div className="aviso mb"><b>O que ela faz amanhã:</b> {s.amanha}</div>
          <details className="mb"><summary className="ajuda" style={{ cursor: "pointer" }}>Filtro anti-excesso</summary>{s.filtro.map((x, i) => <p key={i} style={{ margin: "4px 0" }}><b>{x.pergunta}</b><br />{x.resposta}</p>)}</details>
          <details className="mb"><summary className="ajuda" style={{ cursor: "pointer" }}>O que fica para depois ({s.estacionamento.length})</summary>{s.estacionamento.map((x, i) => <p key={i} style={{ margin: "4px 0" }}><b>{x.tema}</b> · {x.quando}<br /><small>{x.porque}</small></p>)}</details>
          <details className="mb"><summary className="ajuda" style={{ cursor: "pointer" }}>Conteúdo do PDF Raio-X Loja Magnética</summary>
            <p>{s.pdf.notas.map((x) => `${x.pilar} ${x.nota}`).join(" · ")}</p><p><b>{s.pdf.frase}</b></p><p>{s.pdf.resultado}</p><ul>{s.pdf.missoes.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </details>
          {s.faltando.length > 0 && <div className="aviso mb"><b>Ainda falta:</b> {s.faltando.join(" · ")}</div>}
        </>}
        <Rodar p={p} parada="solucao" rotulo="Montar a solução e o roteiro" ocupado={ocupado} pode={!!p?.escolha} aoPedir={pedir("solucao")} />
      </div>

      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--purple)", opacity: s ? 1 : 0.6 }}>
        <h2 style={{ marginTop: 0 }}>4 · Depois da reunião: o Diagnóstico da loja</h2>
        <p className="ajuda" style={{ marginTop: 0 }}>Escreva nos ajustes o que mudou na reunião (o que foi decidido, as metas calibradas). O agente monta a versão do Diagnóstico que {dados.responsavel || "a loja"} vai ver. Ela fica guardada aqui: você compara com o que já existe e só aplica se quiser.</p>
        {p?.hub && (() => {
          const h = p.hub as { cenario?: { resumo?: string; foco?: string[] }; alertas?: { nivel: string; alerta: string; acao: string }[]; performance?: { leitura?: string }; estoque?: { leitura?: string } };
          return (
            <div className="mb">
              <p style={{ whiteSpace: "pre-wrap" }}><b>Cenário:</b> {h.cenario?.resumo}</p>
              {(h.cenario?.foco ?? []).length > 0 && <p><b>Foco:</b> {h.cenario!.foco!.join(" · ")}</p>}
              {h.performance?.leitura && <p><b>Performance:</b> {h.performance.leitura}</p>}
              {h.estoque?.leitura && <p><b>Estoque:</b> {h.estoque.leitura}</p>}
              {(h.alertas ?? []).length > 0 && <><b>Alertas ({h.alertas!.length})</b><ul>{h.alertas!.map((a, i) => <li key={i}><b>{a.alerta}</b> → {a.acao}</li>)}</ul></>}
              <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn p peq" onClick={async () => {
                  if (!confirm("Aplicar esta versão no Diagnóstico da loja? O rascunho que está lá hoje é trocado por esta. A loja só vê depois que você liberar.")) return;
                  try { await aplicarHub(portalId, p.hub!); setMsg("Aplicado ✓ Abra o Diagnóstico para revisar e liberar."); } catch (x) { setMsg((x as Error).message); }
                }}>Aplicar no Diagnóstico da loja</button>
                <button type="button" className="btn s peq" onClick={() => abrirPortal(portalId, "/painel")}>Abrir o Diagnóstico atual</button>
              </div>
            </div>
          );
        })()}
        <Rodar p={p} parada="hub" rotulo="Montar a versão do Diagnóstico da loja" ocupado={ocupado} pode={!!s} aoPedir={pedir("hub")} />
      </div>

      <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm("Apagar toda a preparação desta loja (Raio-X, escolha, perguntas e solução)? Os arquivos e o Diagnóstico do Hub ficam.")) { await excluirPreparo(portalId); recarregar(); } }}>Apagar a preparação</button>
    </>
  );
}

/** A lista das lojas para preparar: primeiro as que estão na etapa do Diagnóstico. */
function Lista() {
  const router = useRouter();
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: portais }, { data: preparos }] = await Promise.all([
      sb.from("portais").select("id, loja, tipo, fichas(etapa)").eq("ativo", true).neq("tipo", "Curso").order("loja"),
      sb.from("diagnostico_preparo").select("portal_id, raiox, escolha, solucao, agente, updated_at"),
    ]);
    return { portais: (portais ?? []) as { id: string; loja: string; fichas: { etapa: number | null } | { etapa: number | null }[] | null }[], preparos: preparos ?? [] };
  }, []);
  if (!dados) return <Carregando />;
  const etapa = (f: (typeof dados.portais)[number]["fichas"]) => (Array.isArray(f) ? f[0]?.etapa : f?.etapa) ?? -1;
  const prep = (id: string) => dados.preparos.find((x) => x.portal_id === id);
  const passo = (id: string) => { const x = prep(id); return !x ? "" : x.solucao ? "solução pronta" : x.escolha ? "gargalo escolhido" : x.raiox ? "Raio-X pronto" : "começado"; };
  const ordem = [...dados.portais].sort((a, b) => Number(!!prep(b.id)) - Number(!!prep(a.id)) || Number(etapa(b.fichas) <= 2 && etapa(b.fichas) >= 1) - Number(etapa(a.fichas) <= 2 && etapa(a.fichas) >= 1) || a.loja.localeCompare(b.loja));
  return (
    <>
      <Titulo titulo="Diagnósticos com o agente" sub="Escolha a loja. O agente prepara a sua reunião de diagnóstico em paradas, seguindo o seu método, e você decide em cada uma." />
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {ordem.map((x) => (
          <button key={x.id} type="button" className="card card-borda" style={{ ["--c" as string]: prep(x.id) ? "var(--orange)" : "var(--line)", textAlign: "left", cursor: "pointer" }} onClick={() => router.push(`/empresa/minha-central/diagnostico?p=${x.id}`)}>
            <b>{x.loja}</b><br /><small className="mudo">{passo(x.id) || (etapa(x.fichas) === 2 ? "na etapa do Diagnóstico" : etapa(x.fichas) === 1 ? "nos primeiros passos" : "")}</small>
          </button>
        ))}
      </div>
    </>
  );
}

function Pagina() {
  const p = useSearchParams().get("p") ?? "";
  return /^[0-9a-f-]{36}$/.test(p) ? <Preparar key={p} portalId={p} /> : <Lista />;
}
export default function DiagnosticoAgente() {
  return <Suspense fallback={<Carregando />}><Pagina /></Suspense>;
}
