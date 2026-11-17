"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora, haQuanto } from "@/lib/formato";
import { linkZap, painelCs, type AlertaCs, type LojaCs, type Nivel } from "@/lib/cs";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PendenciasPorCliente } from "@/components/PendenciasPorCliente";
import { ContatosDoDia } from "@/components/ContatosDoDia";
import { contatosDoDia } from "@/lib/contatos";
import { aprovadasHoje, aprovar, chaveAlerta, chaveGrupo, liberarDirecao, painelDia, registrarEmLote, type GrupoAlerta } from "@/lib/painel-cs";
import { buscarLembretes, marcarLembrete } from "@/lib/conversas";
import { hoje } from "@/lib/formato";

const COR: Record<Nivel, string> = { vermelho: "var(--red)", amarelo: "var(--orange)", verde: "var(--feito)" };
const ROTULO: Record<Nivel, string> = { vermelho: "Precisa de você hoje", amarelo: "Atenção", verde: "Em dia" };

function Ponto({ nivel }: { nivel: Nivel }) {
  return <span aria-hidden style={{ display: "inline-block", width: 11, height: 11, borderRadius: "50%", background: COR[nivel], marginRight: 7, flex: "none" }} />;
}

/** Registrar a conversa com a loja: o que ela respondeu, se precisa de ajuda e o próximo passo. Fecha o alerta que pediu o contato. */
function RegistrarConversa({ loja, registro, nome, feito }: { loja: LojaCs; registro: { tipo: string; ref: string }; nome: string; feito: () => void }) {
  const [resumo, setResumo] = useState("");
  const [ajuda, setAjuda] = useState(false);
  const [passo, setPasso] = useState("");
  const [quando, setQuando] = useState("");
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    const { error } = await supabaseBrowser().from("cs_contatos").insert({ portal_id: loja.id, tipo: registro.tipo, ref: registro.ref, feito_em: new Date().toISOString(), feito_por: nome || null, resumo: resumo.trim() || null, precisa_ajuda: ajuda, proximo_passo: passo.trim() || null, proximo_em: quando || null });
    setSalvando(false);
    if (error) { alert(error.message); return; }
    feito();
  };
  return (
    <div className="card mt" style={{ background: "var(--soft)" }}>
      <label className="rotulo">O que a loja respondeu?</label>
      <textarea rows={2} value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Ex.: viu, entendeu, vai começar pela vitrine" />
      <label className="marcar"><input type="checkbox" checked={ajuda} onChange={(e) => setAjuda(e.target.checked)} /><span>Tem uma dificuldade em que precisamos ajudar</span></label>
      <div className="grade g2" style={{ gap: 10 }}>
        <div><label className="rotulo">Próximo passo</label><input type="text" value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="Ex.: ligar na quinta" /></div>
        <div><label className="rotulo">Quando</label><input type="date" value={quando} onChange={(e) => setQuando(e.target.value)} /></div>
      </div>
      <div className="linha mt" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar a conversa"}</button>
      </div>
    </div>
  );
}

/** Um cartão por loja: tudo o que ela precisa hoje, cada item com a mensagem pronta e o registro da conversa. */
function CartaoLoja({ l, nome, abrir, recarregar, aprov }: { l: LojaCs; nome: string; abrir: (id: string, destino?: string) => void; recarregar: () => void; aprov?: (alerta: string) => Aprov }) {
  const [copiada, setCopiada] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const alertas = [...l.alertas].sort((a, b) => Number(b.grave) - Number(a.grave));
  const copiar = async (id: string, msg: string) => { try { await navigator.clipboard.writeText(msg); setCopiada(id); setTimeout(() => setCopiada(""), 2000); } catch { /* sem permissão */ } };
  const item = (a: AlertaCs) => (
    <div key={a.chave} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ color: a.grave ? "var(--red)" : "inherit" }}>{a.txt}</div>
      <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
        {a.msg && <a className="btn p peq" href={linkZap(l.whatsapp, a.msg)} target="_blank" rel="noopener">Mandar no WhatsApp</a>}
        {a.msg && <button type="button" className="btn s peq" onClick={() => copiar(`${l.id}-${a.chave}`, a.msg as string)}>{copiada === `${l.id}-${a.chave}` ? "Copiada ✓" : "Copiar a mensagem"}</button>}
        {a.registro && <button type="button" className="btn s peq" onClick={() => setAberto(aberto === a.chave ? null : a.chave)}>Conversei</button>}
        {a.chave === "pendencias" && <a className="btn s peq" href="#pendencias">Ver as pendências</a>}
        {a.destino && !a.msg && a.chave !== "pendencias" && <button type="button" className="btn s peq" onClick={() => abrir(l.id, a.destino)}>Abrir</button>}
        <BotaoAprovar a={aprov?.(a.chave)} />
      </div>
      {a.registro && aberto === a.chave && <RegistrarConversa loja={l} registro={a.registro} nome={nome} feito={() => { setAberto(null); recarregar(); }} />}
    </div>
  );
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: COR[l.nivel] }}>
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className="linha" style={{ alignItems: "center" }}><Ponto nivel={l.nivel} /><b style={{ fontSize: 16 }}>{l.loja}</b></span>
        <small className="mudo">{l.ultimo ? `acesso ${haQuanto(l.ultimo)}` : "nunca entrou"}{l.contato ? ` · conversamos ${haQuanto(l.contato.feito_em)}` : ""}{l.contato?.precisa_ajuda ? " · pediu ajuda" : ""}</small>
      </div>
      {l.contato?.resumo && <small className="mudo" style={{ display: "block", marginTop: 2 }}>Última conversa: {l.contato.resumo}</small>}
      {l.combinados.length > 0 && (
        <small className="mudo" style={{ display: "block", marginTop: 4 }}>Combinados: {l.combinados.map((c) => `${c.status === "feito" ? "✓ " : ""}${c.texto}`).join(" · ")}</small>
      )}
      {alertas.map(item)}
      <div className="linha mt"><button type="button" className="btn s peq" onClick={() => abrir(l.id, "/inicio")}>Abrir a loja</button></div>
    </div>
  );
}

/** Para a Camilla: aprova (ou desfaz) uma demanda de hoje para a Claudia. */
type Aprov = { ok: boolean; trocar: () => void };
function BotaoAprovar({ a }: { a?: Aprov }) {
  if (!a) return null;
  return a.ok
    ? <button type="button" className="btn s peq" onClick={a.trocar} title="Tirar da lista da Claudia">✓ Aprovado para a Claudia</button>
    : <button type="button" className="btn p peq" onClick={a.trocar}>Aprovar para a Claudia</button>;
}

const COR_GRUPO = { laranja: "var(--orange)", vermelho: "var(--red)", verde: "var(--feito)" } as const;

/** Um assunto, várias lojas: a CS fala com todas de uma vez, com a mesma mensagem, e marca "falei com todas". */
function CartaoAssunto({ g, nome, recarregar, aprov }: { g: GrupoAlerta; nome: string; recarregar: () => void; aprov?: Aprov }) {
  const [copiada, setCopiada] = useState("");
  const [salvando, setSalvando] = useState(false);
  const verde = g.cor === "verde";
  const copiar = async (id: string, msg: string) => { try { await navigator.clipboard.writeText(msg); setCopiada(id); setTimeout(() => setCopiada(""), 2000); } catch { /* sem permissão */ } };
  if (!g.lojas.length) return verde ? null : <div className="card mb mudo">✓ {g.titulo}: nenhuma loja agora ({g.ok} em dia).</div>;
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: COR_GRUPO[g.cor] }}>
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 16 }}>{verde ? "🎉 " : ""}{g.lojas.length} {g.lojas.length === 1 ? "loja" : "lojas"} · {g.titulo}</b>
        <BotaoAprovar a={aprov} />
        <span className={`selo ${verde ? "feito" : g.cor === "vermelho" ? "erro" : "alerta"}`}>{verde ? `${g.ok} de ${g.total} fizeram` : `${g.ok} de ${g.total} em dia`}</span>
      </div>
      <p className="mudo" style={{ margin: "4px 0 8px" }}>{g.detalhe}</p>
      {g.lojas.map((l) => (
        <div key={l.id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
          <b>{l.loja}</b>
          <span className="linha" style={{ gap: 6 }}>
            <a className="btn p peq" href={linkZap(l.whatsapp, l.msg)} target="_blank" rel="noopener">Mandar no WhatsApp</a>
            <button type="button" className="btn s peq" onClick={() => copiar(`${g.chave}-${l.id}`, l.msg)}>{copiada === `${g.chave}-${l.id}` ? "Copiada ✓" : "Copiar"}</button>
          </span>
        </div>
      ))}
      <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
        {g.grupo && <button type="button" className="btn s peq" onClick={() => copiar(`${g.chave}-grupo`, g.grupo as string)}>{copiada === `${g.chave}-grupo` ? "Copiado ✓" : "Copiar o parabéns para o grupo"}</button>}
        <button type="button" className="btn p peq" disabled={salvando} onClick={async () => { setSalvando(true); try { await registrarEmLote(g, nome); recarregar(); } catch (e) { alert((e as Error).message); } setSalvando(false); }}>{verde ? "Parabenizei todas" : "Falei com todas"}</button>
      </div>
    </div>
  );
}

/** Faça agora da CS: uma loja, um cartão, os mais urgentes primeiro. Cada alerta some sozinho quando o dado entra ou a conversa é registrada. */
export default function InicioCs() {
  const { nome, abrirPortal, userId, conversas, aprova } = useEquipe();
  const { dados, recarregar } = useDados(() => painelCs(), []);
  const [ver, setVer] = useState<"painel" | "agora" | "depois" | "todas" | "contatos">("painel");
  const { dados: pd, recarregar: recarregarPd } = useDados(() => painelDia(), []);
  const { dados: ct, recarregar: recarregarCt } = useDados(() => contatosDoDia(), []);
  // As demandas do dia passam pela Camilla: ela vê tudo e aprova; a Claudia só vê o que foi aprovado hoje.
  const { dados: aprovadas, recarregar: recarregarAprov } = useDados(() => aprovadasHoje(), []);
  const { dados: lembretes, recarregar: recarregarLembretes } = useDados(async () => (conversas ? (await buscarLembretes(null)).filter((l) => (!l.responsavel || l.responsavel === userId) && (!l.quando || l.quando <= hoje())) : []), [conversas, userId]);
  if (!dados || !aprovadas) return <Carregando />;

  const trocar = (chaves: string[], sim: boolean) => async () => { try { await aprovar(chaves, sim, nome ?? ""); recarregarAprov(); } catch (e) { alert((e as Error).message); } };
  const aprovGrupo = (g: GrupoAlerta): Aprov | undefined => (aprova ? { ok: aprovadas.has(chaveGrupo(g)), trocar: trocar([chaveGrupo(g)], !aprovadas.has(chaveGrupo(g))) } : undefined);
  const aprovLoja = (id: string) => (aprova ? (alerta: string): Aprov => { const k = chaveAlerta(id, alerta); return { ok: aprovadas.has(k), trocar: trocar([k], !aprovadas.has(k)) }; } : undefined);
  const lojas: LojaCs[] = aprova ? dados.lojas : dados.lojas.map((l) => {
    const alertas = l.alertas.filter((a) => aprovadas.has(chaveAlerta(l.id, a.chave)));
    return { ...l, alertas, nivel: alertas.some((a) => a.grave) ? "vermelho" : alertas.length ? "amarelo" : "verde" } as LojaCs;
  });
  const grupos = (pd?.grupos ?? []).filter((g) => aprova || aprovadas.has(chaveGrupo(g)));
  const pendentesAprov = aprova ? [
    ...(pd?.grupos ?? []).filter((g) => g.lojas.length && !aprovadas.has(chaveGrupo(g))).map(chaveGrupo),
    ...dados.lojas.flatMap((l) => l.alertas.map((a) => chaveAlerta(l.id, a.chave)).filter((k) => !aprovadas.has(k))),
  ] : [];
  const { reunioes } = dados;
  const vermelhas = lojas.filter((l) => l.nivel === "vermelho");
  const amarelas = lojas.filter((l) => l.nivel === "amarelo");
  const comCaixa = lojas.filter((l) => l.caixaCompleto !== null);
  const caixaOk = comCaixa.filter((l) => l.caixaCompleto).length;
  const depois = lojas.filter((l) => l.nivel !== "vermelho" && l.alertas.length);
  const nomeCs = nome?.split(" ")[0] ?? "";

  return (
    <>
      <Titulo titulo={`Bom dia${nome ? `, ${nome.split(" ")[0]}` : ""}`} sub="Uma loja, um cartão. Resolva de cima para baixo: cada item traz a mensagem pronta, e a conversa que você registrar fecha o alerta." />

      {aprova && (
        <div className={`aviso mb ${pendentesAprov.length ? "" : "ok"}`}>
          {pendentesAprov.length
            ? <>Você está vendo as demandas de hoje da Claudia. Só aparece para ela o que você aprovar. Faltam <b>{pendentesAprov.length}</b> para revisar. <button type="button" className="btn s peq" onClick={trocar(pendentesAprov, true)}>Aprovar todas</button></>
            : "Tudo o que está aqui hoje já foi aprovado para a Claudia."}
        </div>
      )}
      {!aprova && !aprovadas.size && <div className="aviso mb">A Camilla ainda está revisando as demandas de hoje. Elas aparecem aqui assim que ela aprovar.</div>}
      <div className="grade g4 mb">
        <div className="kpi"><small>Precisam de você hoje</small><b style={{ fontSize: 28, color: vermelhas.length ? "var(--red)" : "var(--feito)" }}>{vermelhas.length}</b><small className="mudo">de {lojas.length} lojas</small></div>
        <div className="kpi"><small>Em atenção</small><b style={{ fontSize: 28 }}>{amarelas.length}</b></div>
        <div className="kpi"><small>Caixa da semana completo</small><b style={{ fontSize: 28 }}>{caixaOk}<span className="mudo" style={{ fontSize: 16 }}> de {comCaixa.length}</span></b></div>
        <div className="kpi"><small>Reuniões nos próximos 7 dias</small><b style={{ fontSize: 28 }}>{reunioes.length}</b></div>
      </div>

      {lembretes && lembretes.length > 0 && (
        <div className="card card-borda mb" style={{ ["--c" as string]: "var(--purple)" }}>
          <b>Lembretes de hoje · {lembretes.length}</b>
          {lembretes.map((l) => (
            <div key={l.id} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <span>{l.texto}{l.quando && l.quando < hoje() ? <span className="selo alerta" style={{ marginLeft: 6 }}>atrasado</span> : null}</span>
              <button type="button" className="btn s peq" onClick={async () => { await marcarLembrete(l.id, true); recarregarLembretes(); }}>Feito</button>
            </div>
          ))}
        </div>
      )}

      <p className="mb" style={{ marginTop: 0 }}><Link className="btn p peq" href="/equipe/contatos#novo">+ Registrar contato</Link></p>

      <div className="chips mb">
        <button type="button" className={`chip${ver === "painel" ? " escolhido" : ""}`} onClick={() => setVer("painel")}>Painel do dia</button>
        <button type="button" className={`chip${ver === "agora" ? " escolhido" : ""}`} onClick={() => setVer("agora")}>Por loja · {vermelhas.length}</button>
        <button type="button" className={`chip${ver === "depois" ? " escolhido" : ""}`} onClick={() => setVer("depois")}>Depois · {depois.length}</button>
        <button type="button" className={`chip${ver === "todas" ? " escolhido" : ""}`} onClick={() => setVer("todas")}>Todas as lojas · {lojas.length}</button>
        <button type="button" className={`chip${ver === "contatos" ? " escolhido" : ""}`} onClick={() => setVer("contatos")}>Contatos registrados hoje · {ct?.hoje.length ?? 0}{ct?.proximos.length ? ` · ${ct.proximos.length} próximos passos` : ""}</button>
        <button type="button" className="chip" onClick={() => { recarregar(); recarregarCt(); }}>Atualizar</button>
      </div>

      {ver === "painel" && (
        !pd ? <Carregando /> : (
          <>
            {pd.acompanhadas === 0 && <div className="card mudo">Nenhuma loja no acompanhamento ainda.</div>}
            <p className="ajuda" style={{ marginTop: 0 }}>{pd.acompanhadas} {pd.acompanhadas === 1 ? "loja acompanhada" : "lojas acompanhadas"}. Cada alerta junta as lojas com o mesmo assunto: fale com todas de uma vez.</p>
            {grupos.filter((g) => g.cor !== "verde").map((g) => <CartaoAssunto key={g.chave} g={g} nome={nomeCs} recarregar={recarregarPd} aprov={aprovGrupo(g)} />)}
            {grupos.some((g) => g.cor === "verde" && g.lojas.length) && <div className="secao">Parabéns da semana passada</div>}
            {grupos.filter((g) => g.cor === "verde").map((g) => <CartaoAssunto key={g.chave} g={g} nome={nomeCs} recarregar={recarregarPd} aprov={aprovGrupo(g)} />)}
            {aprova && pd.direcao.length > 0 && (
              <details className="card mt">
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>Mensagem de direção do dia: liberar a cobrança da CS · {pd.direcao.filter((d) => d.ligada).length} de {pd.direcao.length}</summary>
                <p className="ajuda">Só você vê. Libere a loja quando o time dela já estiver usando o Hub: a partir daí a Claudia passa a acompanhar se a mensagem foi marcada.</p>
                {pd.direcao.map((d) => (
                  <div key={d.id} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                    <span>{d.loja} {d.ligada ? <span className="selo feito">liberada</span> : <span className="selo espera">desligada</span>}</span>
                    <button type="button" className={`btn ${d.ligada ? "s" : "p"} peq`} onClick={async () => { try { await liberarDirecao(d.id, !d.ligada); recarregarPd(); } catch (e) { alert((e as Error).message); } }}>{d.ligada ? "Desligar" : "Liberar"}</button>
                  </div>
                ))}
              </details>
            )}
          </>
        )
      )}
      {ver === "agora" && (
        <>
          {!vermelhas.length && <div className="card mudo">Nada urgente agora. Todas as lojas estão em dia. 🎉</div>}
          {vermelhas.map((l) => <CartaoLoja key={l.id} l={l} nome={nomeCs} abrir={abrirPortal} recarregar={recarregar} aprov={aprovLoja(l.id)} />)}
        </>
      )}
      {ver === "depois" && (
        <>
          {!depois.length && <div className="card mudo">Nada para depois.</div>}
          {depois.map((l) => <CartaoLoja key={l.id} l={l} nome={nomeCs} abrir={abrirPortal} recarregar={recarregar} aprov={aprovLoja(l.id)} />)}
        </>
      )}
      {ver === "todas" && <Lojas lojas={lojas} abrir={abrirPortal} />}
      {ver === "contatos" && (ct ? <ContatosDoDia dados={ct} recarregar={recarregarCt} /> : <Carregando />)}

      {reunioes.length > 0 && (
        <>
          <div className="secao">Reuniões desta semana</div>
          <div className="card mb">
            {reunioes.map((r, i) => (
              <div key={i} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: i ? "1px solid var(--line)" : 0 }}>
                <span><b>{r.loja}</b> <span className="mudo">· {r.titulo || "Reunião"}</span></span>
                <span style={{ textTransform: "capitalize" }}>{dataHora(r.data)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="secao" id="pendencias">Pendências por cliente</div>
      <p className="ajuda" style={{ marginTop: 0 }}>O que falta pedir a cada loja e o que falta a equipe fazer. Os itens automáticos somem sozinhos quando o dado entra no Hub.</p>
      <PendenciasPorCliente />

      <p className="ajuda"><Link href="/equipe/controle">Voltar ao Controle de clientes</Link></p>
    </>
  );
}

function Lojas({ lojas, abrir }: { lojas: LojaCs[]; abrir: (id: string, destino?: string) => void }) {
  return (
    <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {lojas.map((l) => (
        <div key={l.id} className="card card-borda" style={{ ["--c" as string]: COR[l.nivel] }}>
          <div className="linha" style={{ alignItems: "center" }}><Ponto nivel={l.nivel} /><b style={{ fontSize: 16 }}>{l.loja}</b></div>
          <small className="mudo">{ROTULO[l.nivel]} · {l.ultimo ? `acesso ${haQuanto(l.ultimo)}` : "nunca entrou"}{l.proxReuniao ? ` · reunião ${dataHora(l.proxReuniao)}` : ""}</small>
          <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 14 }}>
            {l.alertas.map((a) => <li key={a.chave} style={{ color: a.grave ? "var(--red)" : "var(--muted)" }}>{a.txt}</li>)}
            {!l.alertas.length && <li className="mudo">Tudo em dia ✓</li>}
          </ul>
          <button type="button" className="btn s peq" onClick={() => abrir(l.id, "/inicio")}>Abrir a loja</button>
        </div>
      ))}
    </div>
  );
}
