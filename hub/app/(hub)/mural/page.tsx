"use client";

// Mural da loja: as folhas da parede (missão/visão/valores, versículo, cartaz de valores, metas da semana e calendário).
// Cada folha tem Imprimir; cada texto tem Copiar. O texto de cada loja fica no banco.
import { useEffect, useMemo, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal, useLojaFoco } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { semanaDe } from "@/lib/leitura";
import { buscarCaixa, fimDoMes, nomeMes, somarMes, type Caixa } from "@/lib/caixa";
import { buscarPlano, metaDoPlano, metasDoTime } from "@/lib/plano-mes";
import { quemVende, type Pessoa } from "@/lib/pessoas";
import { CORES_EVENTO, bolinha, buscarMural, completarMural, gradeDoMes, salvarMural, semanasDoMes, sortear, type DadosMural } from "@/lib/mural";

const somaDias = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmt1 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const COR_BOLA = { verde: "#2E9D57", amarela: "#F2C230", vermelha: "#D9332B" };

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn s peq" onClick={async () => { try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* sem permissão */ } }}>{ok ? "Copiado ✓" : "Copiar"}</button>;
}
function imprimir(id: string, retrato: boolean) {
  const st = document.createElement("style");
  st.textContent = `@page{size:A4 ${retrato ? "portrait" : "landscape"};margin:0}`;
  document.head.appendChild(st);
  document.body.dataset.imprimir = id;
  const fim = () => { delete document.body.dataset.imprimir; st.remove(); window.removeEventListener("afterprint", fim); };
  window.addEventListener("afterprint", fim);
  setTimeout(() => window.print(), 50);
}

export default function Mural() {
  const { portal } = usePortal();
  const lojas = portal.lojas?.length ? portal.lojas : [""];
  const [loja, setLoja] = useLojaFoco(true);
  const { dados: base, recarregar } = useDados(() => buscarMural(portal.id, loja), [portal.id, loja]);
  const [d, setD] = useState<DadosMural | null>(null);
  const [editando, setEditando] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (base) setD(base); }, [base]);

  async function guardar(novo: DadosMural) {
    setD(novo);
    try { await salvarMural(portal.id, loja, novo); setMsg("Salvo ✓"); } catch (e) { setMsg(`Não salvou: ${(e as Error).message}`); }
    setTimeout(() => setMsg(""), 2000);
  }
  if (!d) return <Carregando />;
  const c = d.cores;
  const vazio = !d.missao && !d.visao && !d.valores.length;

  return (
    <>
      <style>{CSS}</style>
      <Titulo titulo="Mural" sub="As folhas para imprimir e colocar na parede. Edite o texto, copie ou imprima cada folha." />
      {lojas.length > 1 && (
        <div className="chips mb">{lojas.map((l) => <button key={l} type="button" className={`chip ${l === loja ? "on" : ""}`} onClick={() => { setD(null); setEditando(false); setLoja(l); }}>{l}</button>)}</div>
      )}
      <div className="linha entre mb">
        <span className="mudo">{msg}</span>
        <button type="button" className="btn s peq" onClick={() => setEditando(!editando)}>{editando ? "Fechar edição" : "Editar textos"}</button>
      </div>
      {vazio && !editando && <div className="aviso mb">O mural desta loja ainda não tem texto. Clique em "Editar textos" para escrever a missão, a visão e os valores.</div>}

      {editando && (
        <div className="card mb">
          {([["missao", "Missão"], ["visao", "Visão"], ["versiculo", "Versículo (opcional)"], ["versiculo_ref", "Onde fica o versículo (ex.: Salmos 125:1)"]] as const).map(([k, r]) => (
            <label key={k} style={{ display: "block", marginBottom: 10 }}><b>{r}</b>
              <textarea rows={k === "versiculo_ref" ? 1 : 3} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} onBlur={() => guardar(d)} style={{ width: "100%" }} /></label>
          ))}
          <label style={{ display: "block" }}><b>Valores (uma frase por linha)</b>
            <textarea rows={5} value={d.valores.join("\n")} onChange={(e) => setD({ ...d, valores: e.target.value.split("\n") })} onBlur={() => guardar({ ...d, valores: d.valores.filter((v) => v.trim()) })} style={{ width: "100%" }} /></label>
        </div>
      )}

      {/* Folha 1: missão, visão e valores */}
      {(d.missao || d.visao || d.valores.length > 0) && (
        <Folha id="mvv" titulo="Missão, visão e valores" paisagem onCopiar={[["Missão", d.missao], ["Visão", d.visao], ["Valores", d.valores.join("\n")]]}>
          <div className="mu-pag mu-mvv" style={{ fontFamily: "Poppins, Arial, sans-serif" }}>
            {([["MISSÃO", d.missao, c.f1, c.f1 === c.f1 ? c.texto : c.texto, "alvo"], ["VISÃO", d.visao, c.f2, c.claro, "olho"], ["VALORES", d.valores.join("\n"), c.f3, c.texto, "coracao"]] as const).map(([r, t, fundo, cor, ic]) => (
              <div key={r} className="mu-faixa" style={{ background: fundo, color: cor }}>
                <div className="mu-ic"><Icone ic={ic} cor={r === "MISSÃO" ? c.claro : cor} /><b style={{ color: r === "MISSÃO" ? "#EFE6DD" : cor }}>{r}</b></div>
                <p style={{ whiteSpace: "pre-line" }}>{t}</p>
              </div>
            ))}
            {d.simbolo && <img className="mu-simb" src={d.simbolo} alt="" />}
          </div>
        </Folha>
      )}

      {/* Folha 2: versículo */}
      {d.versiculo && (
        <Folha id="verso" titulo="Versículo" paisagem onCopiar={[["Versículo", `${d.versiculo} ${d.versiculo_ref}`.trim()]]}>
          <div className="mu-pag mu-verso" style={{ background: c.f3, fontFamily: "Poppins, Arial, sans-serif" }}>
            <p>{d.versiculo}</p><b>{d.versiculo_ref}</b>
            {d.simbolo && <img className="mu-simb" src={d.simbolo} alt="" />}
          </div>
        </Folha>
      )}

      {/* Folha 3: cartaz Nossos valores */}
      {d.cartaz.itens.length > 0 && (
        <Folha id="cartaz" titulo="Cartaz: nossos valores" onCopiar={d.cartaz.itens.map((i) => [i.nome, `${i.nome}\n${i.frase}\n${i.pontos.map((p) => `• ${p}`).join("\n")}`])}>
          <div className="mu-pag mu-cartaz" style={{ background: c.fundo, color: c.tinta }}>
            <header style={{ background: c.destaque, color: c.claro }}>
              {d.cartaz.simbolos[0] && <img src={d.cartaz.simbolos[0]} alt="" />}<h1>{d.cartaz.titulo}</h1>{d.cartaz.simbolos[1] && <img src={d.cartaz.simbolos[1]} alt="" />}
            </header>
            <div className="mu-grade">
              {d.cartaz.itens.map((i) => (
                <section key={i.nome} style={{ borderColor: c.suave }}>
                  <p className="mu-pre" style={{ color: c.destaque }}>{i.pre}</p>
                  <h2 style={{ background: c.suave, color: c.destaque }}>{i.nome}</h2>
                  <p className="mu-d">{i.frase}</p>
                  <ul>{i.pontos.map((p) => <li key={p} style={{ color: c.destaque }}><span style={{ color: c.tinta }}>{p}</span></li>)}</ul>
                </section>
              ))}
            </div>
            <footer style={{ color: c.destaque }}>{d.cartaz.rodape}</footer>
          </div>
        </Folha>
      )}

      <Metas portalId={portal.id} loja={loja} varias={lojas.length > 1} d={d} guardar={guardar} />
      <DiaDoConhecimento portalId={portal.id} loja={loja} varias={lojas.length > 1} d={d} guardar={guardar} />
      <Calendario d={d} guardar={guardar} />
      {!!recarregar && null}
    </>
  );
}

function Icone({ ic, cor }: { ic: "alvo" | "olho" | "coracao"; cor: string }) {
  const p = { width: 90, height: 90, viewBox: "0 0 24 24", fill: "none", stroke: cor, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (ic === "alvo") return <svg {...p}><circle cx="11" cy="13" r="8" /><circle cx="11" cy="13" r="3.5" fill={cor} /><path d="M12 12l8-8M16 4h4v4" /></svg>;
  if (ic === "olho") return <svg {...p}><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3.6" /></svg>;
  return <svg {...p}><path d="M12 20.5S3 14.5 3 8.8A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 9 1.8c0 5.7-9 11.7-9 11.7z" strokeWidth="1.8" /></svg>;
}

function Folha({ id, titulo, paisagem, onCopiar, children }: { id: string; titulo: string; paisagem?: boolean; onCopiar?: [string, string][]; children: React.ReactNode }) {
  return (
    <div className="card mb mu-folha" data-folha={id}>
      <div className="linha entre mb" style={{ flexWrap: "wrap", gap: 8 }}>
        <b>{titulo}</b>
        <span className="linha" style={{ gap: 6, flexWrap: "wrap" }}>
          {onCopiar?.filter(([, t]) => t).map(([r, t]) => <span key={r} className="linha" style={{ gap: 4 }}><span className="mudo">{r}</span><Copiar texto={t} /></span>)}
          <button type="button" className="btn p peq" onClick={() => imprimir(id, !paisagem)}>Imprimir esta folha</button>
        </span>
      </div>
      <div className="mu-moldura">{children}</div>
    </div>
  );
}

function Metas({ portalId, loja, varias, d, guardar }: { portalId: string; loja: string; varias: boolean; d: DadosMural; guardar: (n: DadosMural) => void }) {
  const [semana, setSemana] = useState(semanaDe(hoje()));
  const mes = semana.slice(0, 7);
  const { dados } = useDados(async () => {
    const meses = [...new Set([mes, somaDias(semana, 6).slice(0, 7)])];
    const [plano, caixas, time] = await Promise.all([
      buscarPlano(portalId, mes),
      Promise.all(meses.map((m) => buscarCaixa(portalId, m))).then((r) => r.flat()),
      supabaseBrowser().from("loja_equipe").select("id, portal_id, nome, funcao, entrada, ativo, loja, respostas, perfil, respondido_por, perfil_em, motor").eq("portal_id", portalId).eq("ativo", true).then((r) => (r.data ?? []) as unknown as Pessoa[]),
    ]);
    return { plano, caixas, time };
  }, [portalId, semana]);
  const linhas = useMemo(() => {
    if (!dados) return [];
    const todas = varias && !!d.metas_todas;
    const time = quemVende(dados.time.filter((p) => !varias || todas || !p.loja || p.loja === loja));
    const dp = dados.plano?.dados ?? {};
    // A meta de cada pessoa vem da meta da loja dela (com todas as lojas na folha, cada uma na sua).
    const lojaDe = (p: Pessoa) => (varias ? (p.loja || loja) : "");
    const metaDe = (l: string) => (varias ? (dp.canais?.find((x) => x.canal === l)?.faixas[0]?.valor || null) : metaDoPlano(dp));
    const metas: Record<string, number> = {};
    for (const l of [...new Set(time.map(lojaDe))]) Object.assign(metas, metasDoTime(metaDe(l), time.filter((p) => lojaDe(p) === l).map((p) => p.id), dp.metas));
    const dias = Number(fimDoMes(mes).slice(8));
    const fim = somaDias(semana, 6);
    const doDia = dados.caixas.filter((x: Caixa) => (!varias || todas || x.loja === loja) && x.dia >= semana && x.dia <= fim);
    return time.map((p) => {
      let fat = 0, vendas = 0, pecas = 0;
      for (const x of doDia) for (const v of x.vendedoras ?? []) if (v.pessoa_id === p.id) { fat += Number(v.faturamento); vendas += Number(v.vendas); pecas += Number(v.pecas); }
      const pa = vendas ? pecas / vendas : null, tkm = vendas ? fat / vendas : null;
      const semanal = metas[p.id] ? Math.round((metas[p.id] / (dias / 7)) / 10) * 10 : null;
      return { id: p.id, nome: p.nome.split(" ")[0], loja: todas ? lojaDe(p) : "", pa, tkm, semanal, b: bolinha(pa, tkm, d.pa, d.tkm) };
    });
  }, [dados, loja, varias, semana, mes, d.pa, d.tkm, d.metas_todas]);
  if (!dados) return <Carregando />;
  const vazias = Math.max(0, 6 - linhas.length);
  return (
    <div className="card mb mu-folha" data-folha="metas">
      <div className="linha entre mb" style={{ flexWrap: "wrap", gap: 8 }}>
        <b>Metas da semana</b>
        <span className="linha" style={{ gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="btn s peq" onClick={() => setSemana(somaDias(semana, -7))}>‹</button>
          <span>{semana.slice(8)}/{semana.slice(5, 7)} a {somaDias(semana, 6).slice(8)}/{somaDias(semana, 6).slice(5, 7)}</span>
          <button type="button" className="btn s peq" onClick={() => setSemana(somaDias(semana, 7))}>›</button>
          <button type="button" className="btn p peq" onClick={() => imprimir("metas", false)}>Imprimir esta folha</button>
        </span>
      </div>
      {varias && (
        <div className="chips mb">
          <button type="button" className={`chip ${!d.metas_todas ? "on" : ""}`} onClick={() => guardar({ ...d, metas_todas: false })}>Só as vendedoras desta loja</button>
          <button type="button" className={`chip ${d.metas_todas ? "on" : ""}`} onClick={() => guardar({ ...d, metas_todas: true })}>Todas as vendedoras, das duas lojas</button>
        </div>
      )}
      <div className="linha mb" style={{ gap: 14, flexWrap: "wrap" }}>
        <label>P.A. meta <input type="number" step="0.1" value={d.pa} onChange={(e) => guardar({ ...d, pa: Number(e.target.value) })} style={{ width: 70 }} /></label>
        <label>TKM meta (R$) <input type="number" step="10" value={d.tkm} onChange={(e) => guardar({ ...d, tkm: Number(e.target.value) })} style={{ width: 90 }} /></label>
      </div>
      <div className="mu-moldura">
        <div className="mu-pag mu-metas" style={{ fontFamily: "Poppins, Arial, sans-serif" }}>
          <div className="mu-topo" style={{ background: d.cores.f2 }}><h1>METAS DA SEMANA {nomeMes(mes).split(" ")[0].toUpperCase()}</h1></div>
          <h2>INDICADORES E ACOMPANHAMENTO</h2>
          <table>
            <thead><tr><th>VENDEDORA</th><th>P.A. <i>(Meta: {fmt1(d.pa)})</i></th><th>TKM <i>(Meta: {brl(d.tkm)})</i></th><th>META SEMANAL</th><th>BOLINHA</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}><td>{l.nome}{l.loja && <small style={{ display: "block", fontWeight: 400, opacity: .7, fontSize: "0.7em" }}>{l.loja}</small>}</td><td>{l.pa != null ? fmt1(l.pa) : ""}</td><td>{l.tkm != null ? brl(l.tkm) : ""}</td><td>{l.semanal ? brl(l.semanal) : ""}</td>
                  <td><span className="mu-bola" style={l.b ? { background: COR_BOLA[l.b], borderColor: COR_BOLA[l.b] } : undefined} /></td></tr>
              ))}
              {Array.from({ length: vazias }, (_, i) => <tr key={`v${i}`}><td /><td /><td /><td /><td><span className="mu-bola" /></td></tr>)}
            </tbody>
          </table>
          <h3>LEGENDA DA BOLINHA</h3>
          <p className="mu-leg"><span><i style={{ background: COR_BOLA.verde }} />Verde: Superou PA e TKM</span><span><i style={{ background: COR_BOLA.amarela }} />Amarela: Bateu apenas um</span><span><i style={{ background: COR_BOLA.vermelha }} />Vermelha: Abaixo de ambos</span></p>
          {d.simbolo && <img className="mu-simb" src={d.simbolo} alt="" />}
        </div>
      </div>
      <p className="ajuda" style={{ marginBottom: 0 }}>P.A., TKM e a bolinha vêm do fechamento de caixa de cada vendedora. A meta semanal é a meta do mês dela no plano dividida pelas semanas do mês.</p>
    </div>
  );
}

/** Dia do conhecimento: toda semana uma pessoa do time apresenta um tema por 30 minutos, no primeiro horário do dia.
 *  A gestão define os temas do mês; o sorteio é na 1ª reunião do mês. A folha tem espaço para escrever o tema à mão. */
function DiaDoConhecimento({ portalId, loja, varias, d, guardar }: { portalId: string; loja: string; varias: boolean; d: DadosMural; guardar: (n: DadosMural) => void }) {
  const [mes, setMes] = useState(hoje().slice(0, 7));
  const [editar, setEditar] = useState(false);
  const { dados: time } = useDados(async () => {
    const { data } = await supabaseBrowser().from("loja_equipe").select("nome, loja").eq("portal_id", portalId).eq("ativo", true).order("nome");
    return ((data ?? []) as { nome: string; loja: string | null }[]).filter((p) => !varias || !p.loja || p.loja === loja).map((p) => p.nome.split(" ")[0]);
  }, [portalId, loja, varias]);
  const semanas = semanasDoMes(mes);
  const atual = d.conhecimento[mes] ?? { temas: [], semanas: {} };
  const [temas, setTemas] = useState(atual.temas.join("\n"));
  useEffect(() => { setTemas((d.conhecimento[mes]?.temas ?? []).join("\n")); }, [mes]); // eslint-disable-line react-hooks/exhaustive-deps
  const mudar = (c: typeof atual) => guardar({ ...d, conhecimento: { ...d.conhecimento, [mes]: c } });
  const listaTemas = temas.split("\n").map((x) => x.trim()).filter(Boolean);
  const ate = (s: string) => somaDias(s, 6);
  const dm = (x: string) => `${x.slice(8)}/${x.slice(5, 7)}`;
  return (
    <div className="card mb mu-folha" data-folha="conhec">
      <div className="linha entre mb" style={{ flexWrap: "wrap", gap: 8 }}>
        <b>Dia do conhecimento</b>
        <span className="linha" style={{ gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="btn s peq" onClick={() => setMes(somarMes(mes, -1))}>‹</button><span>{nomeMes(mes)}</span>
          <button type="button" className="btn s peq" onClick={() => setMes(somarMes(mes, 1))}>›</button>
          <button type="button" className="btn s peq" onClick={() => setEditar(!editar)}>{editar ? "Fechar" : "Temas e sorteio"}</button>
          <button type="button" className="btn p peq" onClick={() => imprimir("conhec", false)}>Imprimir esta folha</button>
        </span>
      </div>
      {editar && (
        <div className="card mb" style={{ background: "var(--fundo, #faf7f3)" }}>
          <label style={{ display: "block" }}><b>Temas do mês, definidos pela gestão (um por linha)</b>
            <textarea rows={5} value={temas} onChange={(e) => setTemas(e.target.value)} onBlur={() => mudar({ ...atual, temas: listaTemas })} placeholder={"Ex.: Como apresentar o crediário\nOs tecidos da coleção nova\nComo fazer o pós-venda"} style={{ width: "100%" }} /></label>
          <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn p peq" disabled={!listaTemas.length || !time?.length} onClick={() => {
              if (Object.values(atual.semanas).some((x) => x.tema || x.pessoa) && !confirm("Sortear de novo? O tema e o responsável de cada semana serão trocados.")) return;
              mudar({ temas: listaTemas, semanas: sortear(semanas, listaTemas, time ?? []) });
            }}>🎲 Sortear (1ª reunião do mês)</button>
            <small className="mudo">{time?.length ? `${time.length} pessoas no sorteio · ${semanas.length} semanas no mês` : "Cadastre o time em Minha equipe para sortear."}</small>
          </div>
          <div className="mt">
            {semanas.map((s) => {
              const x = atual.semanas[s] ?? { tema: "", pessoa: "" };
              const muda = (y: Partial<typeof x>) => mudar({ ...atual, semanas: { ...atual.semanas, [s]: { ...x, ...y } } });
              return (
                <div key={s} className="linha" style={{ gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  <small style={{ width: 90 }}><b>{dm(s)} a {dm(ate(s))}</b></small>
                  <input value={x.tema} onChange={(e) => muda({ tema: e.target.value })} placeholder="Tema" style={{ flex: 2, minWidth: 160 }} list="mu-temas" />
                  <select value={x.pessoa} onChange={(e) => muda({ pessoa: e.target.value })} style={{ flex: 1, minWidth: 120 }}>
                    <option value="">Responsável</option>{(time ?? []).map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <button type="button" className="btn s peq" aria-label="Limpar a semana" onClick={() => { if (confirm("Limpar o tema e o responsável desta semana?")) muda({ tema: "", pessoa: "" }); }}>✕</button>
                </div>
              );
            })}
            <datalist id="mu-temas">{listaTemas.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
        </div>
      )}
      <div className="mu-moldura">
        <div className="mu-pag mu-metas mu-conhec" style={{ fontFamily: "Poppins, Arial, sans-serif" }}>
          <div className="mu-topo" style={{ background: d.cores.f2 }}><h1>DIA DO CONHECIMENTO {nomeMes(mes).split(" ")[0].toUpperCase()}</h1></div>
          <h2>30 MINUTOS NO PRIMEIRO HORÁRIO DO DIA · UMA PESSOA DO TIME POR SEMANA</h2>
          <table>
            <thead><tr><th style={{ width: "18%" }}>SEMANA</th><th>TEMA</th><th style={{ width: "24%" }}>RESPONSÁVEL</th></tr></thead>
            <tbody>
              {semanas.map((s) => { const x = atual.semanas[s]; return (
                <tr key={s}><td>{dm(s)} a {dm(ate(s))}</td><td className="mu-tema">{x?.tema ?? ""}</td><td>{x?.pessoa ?? ""}</td></tr>
              ); })}
            </tbody>
          </table>
          <p className="mu-leg" style={{ marginTop: "2%" }}>Tema sorteado na 1ª reunião do mês, entre os temas definidos pela gestão.</p>
          {d.simbolo && <img className="mu-simb" src={d.simbolo} alt="" />}
        </div>
      </div>
      <p className="ajuda" style={{ marginBottom: 0 }}>A gestão escreve os temas do mês e sorteia na 1ª reunião. Dá para trocar o tema e o responsável de cada semana à mão. A folha impressa tem espaço para escrever o tema.</p>
    </div>
  );
}

function Calendario({ d, guardar }: { d: DadosMural; guardar: (n: DadosMural) => void }) {
  const [mes, setMes] = useState(hoje().slice(0, 7));
  const [dia, setDia] = useState<string | null>(null);
  const [txt, setTxt] = useState(""); const [cor, setCor] = useState(0);
  const grade = gradeDoMes(mes);
  const add = () => {
    if (!dia || !txt.trim()) return;
    guardar({ ...d, eventos: { ...d.eventos, [dia]: [...(d.eventos[dia] ?? []), { t: txt.trim(), c: cor }] } });
    setTxt("");
  };
  const tirar = (di: string, i: number) => {
    if (!confirm("Tirar este evento?")) return;
    const l = (d.eventos[di] ?? []).filter((_, k) => k !== i);
    const ev = { ...d.eventos }; if (l.length) ev[di] = l; else delete ev[di];
    guardar({ ...d, eventos: ev });
  };
  return (
    <div className="card mb mu-folha" data-folha="cal">
      <div className="linha entre mb" style={{ flexWrap: "wrap", gap: 8 }}>
        <b>Calendário de eventos</b>
        <span className="linha" style={{ gap: 6 }}>
          <button type="button" className="btn s peq" onClick={() => setMes(somarMes(mes, -1))}>‹</button><span>{nomeMes(mes)}</span>
          <button type="button" className="btn s peq" onClick={() => setMes(somarMes(mes, 1))}>›</button>
          <button type="button" className="btn p peq" onClick={() => imprimir("cal", false)}>Imprimir esta folha</button>
        </span>
      </div>
      <div className="mu-moldura">
        <div className="mu-pag mu-cal" style={{ fontFamily: "Poppins, Arial, sans-serif", background: d.cores.f3 }}>
          <h1>CALENDÁRIO DE EVENTOS</h1>
          <div className="mu-quadro">
            <div className="mu-sem">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((s) => <b key={s}>{s}</b>)}</div>
            <div className="mu-dias">
              {grade.flat().map((di, i) => (
                <div key={i} className={`mu-dia ${di && di === dia ? "sel" : ""}`} onClick={() => di && setDia(di)}>
                  {di && <span className="mu-n">{Number(di.slice(8))}</span>}
                  {di && (d.eventos[di] ?? []).map((e, k) => <em key={k} onClick={(ev) => { ev.stopPropagation(); tirar(di, k); }} title="Clique para tirar"><i style={{ background: CORES_EVENTO[e.c] }} />{e.t}</em>)}
                </div>
              ))}
            </div>
          </div>
          <div className="mu-legs">{d.legenda.map((l, i) => <span key={i}><i style={{ background: l.cor }} /><input value={l.nome} onChange={(e) => guardar({ ...d, legenda: d.legenda.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)) })} /></span>)}</div>
          {d.simbolo && <img className="mu-simb" src={d.simbolo} alt="" />}
        </div>
      </div>
      <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className="mudo">{dia ? `Dia ${dia.slice(8)}:` : "Clique em um dia para marcar um evento."}</span>
        {dia && <>
          <input placeholder="O que acontece" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1, minWidth: 160 }} />
          {CORES_EVENTO.map((cc, i) => <button key={cc} type="button" aria-label={`cor ${i + 1}`} onClick={() => setCor(i)} style={{ width: 22, height: 22, borderRadius: 11, background: cc, border: cor === i ? "3px solid #000" : "1px solid #999" }} />)}
          <button type="button" className="btn p peq" onClick={add}>Marcar</button>
        </>}
      </div>
      <p className="ajuda">Clique em um evento no calendário para tirar. O nome de cada cor da legenda você pode trocar.</p>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap');
.mu-moldura{overflow-x:auto}
.mu-pag{position:relative;width:100%;min-width:640px;aspect-ratio:1.414/1;overflow:hidden;background:#fff}
.mu-simb{position:absolute;left:2.5%;bottom:3%;height:11%;width:auto;filter:none}
.mu-mvv{display:flex;flex-direction:column}
.mu-faixa{flex:1;display:flex;align-items:center;gap:4%;padding:0 6% 0 9%}
.mu-ic{flex:0 0 22%;display:flex;flex-direction:column;align-items:center;gap:6px}
.mu-ic svg{width:62%;height:auto}.mu-ic b{font-size:clamp(12px,2.4vw,26px);letter-spacing:.02em}
.mu-faixa p{flex:1;font-weight:700;font-size:clamp(13px,2.7vw,32px);line-height:1.35;margin:0}
.mu-mvv .mu-simb{display:none}
.mu-verso{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 8%;gap:5%;color:#000}
.mu-verso p{font-weight:800;text-transform:uppercase;font-size:clamp(14px,3.6vw,44px);line-height:1.25;margin:0}
.mu-verso b{font-weight:700;text-transform:uppercase;font-size:clamp(12px,2.4vw,30px)}
.mu-cartaz{aspect-ratio:1/1.414;min-width:0;max-width:520px;margin:0 auto;display:flex;flex-direction:column;font-family:'DM Sans',Arial,sans-serif}
.mu-cartaz header{display:flex;align-items:center;justify-content:center;gap:5%;padding:6% 4%}
.mu-cartaz header img{height:9vw;max-height:70px;width:auto;object-fit:contain}
.mu-cartaz h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:clamp(20px,5vw,40px);letter-spacing:.06em;text-transform:uppercase;margin:0}
.mu-grade{flex:1;display:grid;grid-template-columns:1fr 1fr}
.mu-grade section{padding:5% 6%;display:flex;flex-direction:column;gap:6px;justify-content:center;border:0 solid;border-bottom-width:1px}
.mu-grade section:nth-child(odd){border-right-width:1px}
.mu-pre{margin:0;font-size:clamp(9px,1.6vw,14px)}
.mu-grade h2{align-self:flex-start;margin:0;padding:1px 8px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:clamp(14px,3vw,24px);letter-spacing:.04em}
.mu-d{margin:0;font-weight:700;font-size:clamp(9px,1.7vw,13px);line-height:1.35}
.mu-grade ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;font-size:clamp(8px,1.5vw,12px);line-height:1.3}
.mu-grade li{position:relative;padding-left:14px}
.mu-grade li::before{content:"";position:absolute;left:2px;top:.3em;width:4px;height:7px;border:solid currentColor;border-width:0 1.5px 1.5px 0;transform:rotate(40deg)}
.mu-cartaz footer{text-align:center;padding:4%;font-family:'Cormorant Garamond',Georgia,serif;letter-spacing:.2em;text-transform:uppercase;font-size:clamp(12px,2.6vw,20px)}
.mu-metas{padding:0 0 5%;color:#111}
.mu-topo{padding:2.5% 0;text-align:center;color:#fff;margin:2% 4% 0}
.mu-topo h1{margin:0;color:#fff!important;font-weight:800;font-size:clamp(14px,3.4vw,38px)}
.mu-metas h2{text-align:center;font-weight:800;font-size:clamp(11px,2.2vw,26px);margin:2% 0}
.mu-metas h3{text-align:center;font-weight:800;font-size:clamp(11px,2.4vw,28px);margin:2% 0 1%}
.mu-metas table{border-collapse:collapse;margin:0 6%;width:88%;table-layout:fixed}
.mu-metas th{background:#111;color:#fff;font-size:clamp(7px,1.4vw,17px);padding:1.2% 1%;border:1px solid #111}
.mu-metas th i{font-weight:400}
.mu-metas td{border:1px solid #111;height:clamp(18px,3.6vw,42px);text-align:center;font-size:clamp(9px,1.6vw,19px);font-weight:600}
.mu-bola{display:inline-block;width:clamp(12px,2.4vw,28px);height:clamp(12px,2.4vw,28px);border-radius:50%;border:1.5px dashed #555;vertical-align:middle}
.mu-leg{display:flex;justify-content:center;gap:4%;font-size:clamp(8px,1.5vw,18px);margin:0}
.mu-leg span{display:flex;align-items:center;gap:6px}.mu-leg i,.mu-legs i{display:inline-block;width:clamp(12px,2.4vw,28px);height:clamp(12px,2.4vw,28px);border-radius:50%}
.mu-conhec td{height:clamp(22px,4.2vw,52px);white-space:nowrap}
.mu-conhec .mu-topo h1{font-size:clamp(12px,2.8vw,32px)}
.mu-conhec h2{font-size:clamp(8px,1.5vw,18px)}
.mu-conhec td.mu-tema{text-align:left;padding:0 2%;font-size:clamp(9px,1.8vw,21px);white-space:normal}
.mu-cal{padding:2% 3% 4%;display:flex;flex-direction:column;color:#000}
.mu-cal h1{text-align:center;font-weight:800;font-size:clamp(16px,4vw,46px);margin:0 0 1.5%}
.mu-quadro{background:#fff;border-radius:22px;padding:1.5% 2%;flex:1;display:flex;flex-direction:column}
.mu-sem,.mu-dias{display:grid;grid-template-columns:repeat(7,1fr)}
.mu-sem b{text-align:center;font-size:clamp(9px,2vw,24px);font-weight:700}
.mu-dias{flex:1;border-top:1.5px solid #000;border-left:1.5px solid #000;grid-auto-rows:1fr}
.mu-dia{border-right:1.5px solid #000;border-bottom:1.5px solid #000;padding:2px 3px;cursor:pointer;overflow:hidden;min-height:34px}
.mu-dia.sel{background:#FFF3C4}
.mu-n{font-weight:700;font-size:clamp(8px,1.6vw,19px);background:#F3ECE4;border-radius:5px;padding:0 4px}
.mu-dia em{display:flex;align-items:center;gap:3px;font-style:normal;font-size:clamp(6px,1.1vw,13px);line-height:1.15;margin-top:2px}
.mu-dia em i{flex:0 0 auto;width:7px;height:7px;border-radius:50%}
.mu-legs{display:flex;justify-content:space-between;gap:2%;margin-top:1.5%;padding-left:8%;padding-right:2%}
.mu-legs span{display:flex;align-items:center;gap:6px;flex:1}
.mu-legs input{flex:1;min-width:0;border:0;border-bottom:1px solid #000;background:transparent;font-size:clamp(8px,1.4vw,16px);padding:0}
.mu-cal .mu-simb{left:1.5%;bottom:1%;height:6%}
@media print{
  body[data-imprimir] *{visibility:hidden!important}
  body[data-imprimir] .mu-folha[data-folha="__x"]{display:none}
  body[data-imprimir="mvv"] [data-folha="mvv"] .mu-moldura,body[data-imprimir="mvv"] [data-folha="mvv"] .mu-moldura *,
  body[data-imprimir="verso"] [data-folha="verso"] .mu-moldura,body[data-imprimir="verso"] [data-folha="verso"] .mu-moldura *,
  body[data-imprimir="cartaz"] [data-folha="cartaz"] .mu-moldura,body[data-imprimir="cartaz"] [data-folha="cartaz"] .mu-moldura *,
  body[data-imprimir="metas"] [data-folha="metas"] .mu-moldura,body[data-imprimir="metas"] [data-folha="metas"] .mu-moldura *,
  body[data-imprimir="conhec"] [data-folha="conhec"] .mu-moldura,body[data-imprimir="conhec"] [data-folha="conhec"] .mu-moldura *,
  body[data-imprimir="cal"] [data-folha="cal"] .mu-moldura,body[data-imprimir="cal"] [data-folha="cal"] .mu-moldura *{visibility:visible!important}
  body[data-imprimir] [data-folha] .mu-moldura{position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:visible}
  body[data-imprimir] .mu-pag{min-width:0;width:100vw;height:100vh;aspect-ratio:auto;max-width:none}
  body[data-imprimir] .mu-cartaz{max-width:none;margin:0}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;
