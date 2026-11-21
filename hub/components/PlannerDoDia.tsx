"use client";

// Planner do Meu dia (só a Camilla vê): Modo Zerar, alertas, fila de execução P1/P2/P3/Cobrar, agenda de hoje,
// acompanhamento de clientes com semáforo, posts do dia e fechamento. Visual preto + terracota neon da marca.
// Modo câmera: troca o nome de toda loja por "CLIENTE 01, 02…" para gravar a tela sem expor ninguém.
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useDados, useEquipe } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { hora as horaDe } from "@/lib/agenda";
import { AcoesPendencia } from "@/components/AcoesPendencia";
import { buscarPlanner, concluirItem, fecharDia, registrarCobranca, salvarRegistro, type ClientePlanner, type ItemFila, type Nivel, type Prioridade } from "@/lib/planner-dia";

const C = { bg: "#0B0B0B", card: "#161616", line: "#262626", line2: "#3a3a3a", txt: "#F5F1EA", mudo: "#A9A397", apagado: "#6f6a62", terra: "#BC4914", neon: "#FF5B1F" };
const FONTE = "Montserrat, var(--font), sans-serif";
const rotulo: CSSProperties = { fontSize: 10, letterSpacing: "0.3em", fontWeight: 700, color: C.mudo, textTransform: "uppercase" };
const cartao: CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 4, padding: 24 };
const h2: CSSProperties = { margin: 0, fontSize: 13, letterSpacing: "0.3em", fontWeight: 800, color: C.txt, textTransform: "uppercase" };
const pilula = (on: boolean): CSSProperties => ({ minHeight: 44, padding: "0 16px", borderRadius: 999, fontFamily: FONTE, fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", cursor: "pointer", background: on ? C.txt : "transparent", color: on ? C.bg : C.txt, border: `1px solid ${on ? C.txt : C.line2}` });

const ABAS: { id: Prioridade; rotulo: string; desc: string }[] = [
  { id: "p1", rotulo: "P1 · Agora", desc: "Vence hoje ou destrava uma reunião de hoje. Não passa para amanhã." },
  { id: "p2", rotulo: "P2 · Atrasadas", desc: "Já passaram do prazo combinado. Da mais antiga para a mais nova." },
  { id: "p3", rotulo: "P3 · Próximas", desc: "Vencem nos próximos 3 dias. Só entra aqui se P1 e P2 zerarem." },
  { id: "cobrar", rotulo: "Cobrar", desc: "Não é entrega sua: é da loja ou da Claudia. Cobrou? Toque em Cobrei: fica no histórico da loja." },
];
const NIVEIS: { id: Nivel | "prioridade" | "todos"; rotulo: string }[] = [
  { id: "prioridade", rotulo: "Prioridade" }, { id: "critico", rotulo: "Crítico" }, { id: "atencao", rotulo: "Atenção" },
  { id: "emdia", rotulo: "Em dia" }, { id: "semcontato", rotulo: "Sem contato" }, { id: "todos", rotulo: "Todos" },
];

function Ponto({ nivel, t = 11 }: { nivel: Nivel; t?: number }) {
  const base: CSSProperties = { display: "inline-block", width: t, height: t, borderRadius: "50%", boxSizing: "border-box", flex: "none" };
  if (nivel === "critico") return <span aria-hidden style={{ ...base, background: C.neon }} />;
  if (nivel === "atencao") return <span aria-hidden style={{ ...base, border: `2px solid ${C.terra}` }} />;
  if (nivel === "emdia") return <span aria-hidden style={{ ...base, border: `1px solid ${C.mudo}` }} />;
  return <span aria-hidden style={{ ...base, border: `1px dashed ${C.mudo}` }} />;
}

function prazoTexto(i: ItemFila) {
  if (i.atraso > 0) return `Atraso ${i.atraso} ${i.atraso === 1 ? "dia" : "dias"}`;
  if (i.atraso === 0) return "Vence hoje";
  if (i.atraso === -1) return "Amanhã";
  return i.prazo ? dataCurta(i.prazo) : "Sem data";
}
const minutosAgora = () => { const p = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" }).format(new Date()).split(":").map(Number); return p[0] * 60 + p[1]; };
const paraMin = (h: string) => { const m = h.match(/(\d{1,2})\s*[h:]\s*(\d{2})?/i); return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : null; };

export function PlannerDoDia() {
  const { userId, nome } = useEquipe();
  const { dados, recarregar } = useDados(() => buscarPlanner(userId), [userId]);
  const [cam, setCam] = useState(false);
  const [aba, setAba] = useState<Prioridade>("p1");
  const [nv, setNv] = useState<Nivel | "prioridade" | "todos">("prioridade");
  const [ocupado, setOcupado] = useState("");
  const [feitosHoje, setFeitosHoje] = useState<string[]>([]);
  const [foco, setFoco] = useState("");
  const [amanha, setAmanha] = useState("");
  const [vitoria, setVitoria] = useState("");
  const [aviso, setAviso] = useState("");
  const [agora, setAgora] = useState(minutosAgora());

  useEffect(() => { const t = setInterval(() => setAgora(minutosAgora()), 60_000); return () => clearInterval(t); }, []);
  // O nome das lojas aparece sempre: o modo câmera não fica lembrado, liga só no clique e desliga ao sair da tela.
  useEffect(() => { try { localStorage.removeItem("lm-planner-cam"); } catch { /* sem armazenamento */ } }, []);
  useEffect(() => {
    if (!dados) return;
    setFoco(dados.registro?.foco ?? ""); setAmanha(dados.registro?.amanha ?? ""); setVitoria(dados.registro?.vitoria ?? "");
    try { const s = JSON.parse(localStorage.getItem(`lm-planner-feitos-${dados.dia}`) ?? "[]"); if (Array.isArray(s)) setFeitosHoje(s); } catch { /* sem armazenamento */ }
  }, [dados]);

  // Modo câmera: apelido estável por loja enquanto a tela está aberta.
  const apelido = useMemo(() => {
    const m = new Map<string, string>();
    (dados?.clientes ?? []).forEach((c, i) => m.set(c.loja, `Cliente ${String(i + 1).padStart(2, "0")}`));
    return m;
  }, [dados]);
  const nm = (loja: string) => (!cam || !loja || loja === "Lembrete" ? loja : apelido.get(loja) ?? "Cliente");
  const esconder = (txt: string) => { if (!cam) return txt; let t = txt; apelido.forEach((a, l) => { t = t.replace(new RegExp(l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), a); }); return t; };

  if (!dados) return <div style={{ ...cartao, background: C.bg, color: C.mudo, fontFamily: FONTE, marginBottom: 20 }}>Montando o seu dia…</div>;

  const trocarCam = () => setCam(!cam);
  const lembrarFeito = (id: string) => { const n = [...new Set([...feitosHoje, id])]; setFeitosHoje(n); try { localStorage.setItem(`lm-planner-feitos-${dados.dia}`, JSON.stringify(n)); } catch { /* sem armazenamento */ } };

  const minhas = dados.fila.filter((i) => i.prioridade !== "cobrar");
  const cobrar = dados.fila.filter((i) => i.prioridade === "cobrar" && !i.cobradoHoje);
  const conta = { p1: 0, p2: 0, p3: 0, cobrar: cobrar.length } as Record<Prioridade, number>;
  minhas.forEach((i) => { conta[i.prioridade]++; });
  const atrasadas = minhas.filter((i) => i.atraso > 0).length;
  const venceHoje = minhas.filter((i) => i.atraso === 0).length;
  const entregues = feitosHoje.filter((id) => !dados.fila.some((i) => i.id === id)).length;
  const totalDia = entregues + conta.p1 + conta.p2;
  const pct = totalDia ? Math.round((entregues / totalDia) * 100) : 100;
  const lista = aba === "cobrar" ? cobrar : minhas.filter((i) => i.prioridade === aba);

  const concluir = async (i: ItemFila) => {
    setOcupado(i.id);
    try {
      if (i.prioridade === "cobrar") await registrarCobranca(i, nome);
      else { await concluirItem(i, true); lembrarFeito(i.id); }
      recarregar();
    } catch (e) { alert((e as Error).message); }
    setOcupado("");
  };

  // Alertas: só o que pede ação hoje.
  const reuniaoHojeAtraso = dados.clientes.filter((c) => c.proximaReuniao && new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date(c.proximaReuniao)) === dados.dia && c.meusAtrasos);
  const porLojaHoje = new Map<string, number>();
  minhas.filter((i) => i.atraso === 0 && i.loja !== "Lembrete").forEach((i) => porLojaHoje.set(i.loja, (porLojaHoje.get(i.loja) ?? 0) + 1));
  const lojaMaisHoje = [...porLojaHoje.entries()].sort((a, b) => b[1] - a[1])[0];
  const diaTodoCliente = dados.eventos.filter((e) => e.dia_inteiro && /presencial|visita/i.test(e.titulo));
  const semContato = dados.clientes.filter((c) => c.nivel === "semcontato");
  const maisAntiga = minhas.filter((i) => i.atraso > 0).sort((a, b) => b.atraso - a.atraso)[0];
  const alertas: { nivel: "critico" | "hoje" | "info"; tag: string; titulo: string; acao: string }[] = [];
  if (atrasadas) alertas.push({ nivel: "critico", tag: "Crítico", titulo: `${atrasadas} ${atrasadas === 1 ? "entrega sua atrasada" : "entregas suas atrasadas"}`, acao: maisAntiga ? `A mais antiga tem ${maisAntiga.atraso} dias (${nm(maisAntiga.loja)}).` : "" });
  reuniaoHojeAtraso.forEach((c) => alertas.push({ nivel: "critico", tag: `Reunião às ${horaDe(c.proximaReuniao as string)}`, titulo: `${nm(c.loja)}: ${c.meusAtrasos} ${c.meusAtrasos === 1 ? "entrega sua pendente" : "entregas suas pendentes"}`, acao: "Chegue com elas prontas. Estão no topo do P1." }));
  if (lojaMaisHoje) alertas.push({ nivel: "hoje", tag: "Vence hoje", titulo: `${nm(lojaMaisHoje[0])}: ${lojaMaisHoje[1]} ${lojaMaisHoje[1] === 1 ? "entrega" : "entregas"} para hoje`, acao: venceHoje > lojaMaisHoje[1] ? `Mais ${venceHoje - lojaMaisHoje[1]} de outras lojas.` : "Reserve um bloco só para essa loja." });
  diaTodoCliente.forEach((e) => alertas.push({ nivel: "hoje", tag: "Agenda", titulo: `${esconder(e.titulo)} está como dia todo`, acao: "Confirme o horário real para planejar os blocos." }));
  if (cobrar.length) alertas.push({ nivel: "info", tag: "Cobrar", titulo: `${cobrar.length} ${cobrar.length === 1 ? "combinado vencido" : "combinados vencidos"} da loja ou da Claudia`, acao: "Uma rodada de cobrança no fim do dia." });
  if (semContato.length) alertas.push({ nivel: "info", tag: "Sem contato", titulo: `${semContato.length} ${semContato.length === 1 ? "cliente sem reunião nem contato" : "clientes sem reunião nem contato"} há mais de 45 dias`, acao: "Uma mensagem de retomada para cada." });

  // Agenda de hoje: eventos do Google Agenda + horários dos posts, na ordem do relógio.
  const linhas = [
    ...dados.eventos.filter((e) => !e.dia_inteiro).map((e) => ({ min: paraMin(horaDe(e.inicio)) ?? 0, hora: horaDe(e.inicio), titulo: esconder(e.titulo), tipo: e.loja ? "Cliente" : "Agenda", evento: true, link: e.reuniaoUrl, portalId: e.portal_id, postId: null as string | null })),
    ...dados.posts.map((p) => ({ min: paraMin(p.horario ?? "") ?? 24 * 60, hora: (p.horario ?? "").replace(/h$/i, ":00").padStart(5, "0"), titulo: `Post · ${p.titulo ?? p.formato ?? ""}`, tipo: p.status === "Postado" ? "Postado" : p.formato ?? "Conteúdo", evento: false, link: null as string | null, portalId: null as string | null, postId: p.id })),
  ].filter((l) => l.min < 24 * 60).sort((a, b) => a.min - b.min);
  let agoraIdx = -1;
  linhas.forEach((l, i) => { if (l.min <= agora) agoraIdx = i; });
  const diaTodo = dados.eventos.filter((e) => e.dia_inteiro);

  const clientes = dados.clientes.filter((c) => nv === "todos" ? true : nv === "prioridade" ? c.nivel === "critico" || c.nivel === "atencao" : c.nivel === nv);
  const contaNv = (id: Nivel | "prioridade" | "todos") => dados.clientes.filter((c) => id === "todos" ? true : id === "prioridade" ? c.nivel === "critico" || c.nivel === "atencao" : c.nivel === id).length;

  const dataTopo = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", weekday: "long", day: "2-digit", month: "long" }).formatToParts(new Date());
  const semana = (dataTopo.find((p) => p.type === "weekday")?.value ?? "").replace("-feira", "").toUpperCase();
  const diaMes = `${dataTopo.find((p) => p.type === "day")?.value ?? ""} · ${(dataTopo.find((p) => p.type === "month")?.value ?? "").toUpperCase()}`;

  const salvarFoco = async () => { try { await salvarRegistro(dados.dia, { foco }); } catch (e) { setAviso((e as Error).message); } };
  const fechar = async () => {
    try { const n = await fecharDia(dados.dia, amanha, vitoria, nome); setAmanha(""); setAviso(n ? `Dia fechado. ${n} ${n === 1 ? "lembrete criado" : "lembretes criados"} para amanhã.` : "Dia fechado."); recarregar(); }
    catch (e) { setAviso((e as Error).message); }
  };

  return (
    <section aria-label="Planner do dia" style={{ background: C.bg, color: C.txt, fontFamily: FONTE, borderRadius: "var(--radius)", padding: "clamp(16px, 3vw, 32px)", marginBottom: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800;900&display=swap" />

      {/* Barra */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: `1px solid ${C.line}`, paddingBottom: 16 }}>
        <div style={{ ...rotulo, color: C.txt, fontWeight: 800 }}>Magnética.hub <span style={{ color: C.neon }}>/ Meu dia</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={trocarCam} aria-pressed={cam} style={{ ...pilula(false), display: "flex", alignItems: "center", gap: 10, borderColor: cam ? C.neon : C.line2 }}>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
            {cam ? "Modo câmera ativo" : "Modo câmera"}
          </button>
          <button type="button" onClick={() => recarregar()} style={pilula(false)}>Atualizar</button>
          <Link href="/equipe/conversas" style={{ ...pilula(false), background: C.neon, borderColor: C.neon, color: C.bg, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>+ Lembrete</Link>
        </div>
      </div>

      {/* Capa + Modo Zerar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "stretch" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div style={{ ...rotulo, color: C.neon }}>Bom dia{nome ? `, ${nome.split(" ")[0]}` : ""}</div>
          <div style={{ marginTop: 10, fontSize: "clamp(44px, 6vw, 84px)", lineHeight: 0.9, fontWeight: 900, letterSpacing: "0.02em" }}>{semana}</div>
          <div style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, letterSpacing: "0.16em", marginTop: 4 }}>{diaMes}</div>
        </div>
        <div style={{ ...cartao, flex: "999 1 480px", border: `1px solid ${C.neon}`, display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <label style={{ ...rotulo, color: C.neon, display: "block" }} htmlFor="foco-dia">Modo Zerar · foco de hoje</label>
            <input id="foco-dia" value={foco} onChange={(e) => setFoco(e.target.value)} onBlur={salvarFoco} placeholder="Escreva o único foco de hoje"
              style={{ marginTop: 8, width: "100%", background: "transparent", border: 0, borderBottom: `1px solid ${C.line2}`, color: C.txt, fontFamily: FONTE, fontSize: 20, fontWeight: 800, padding: "6px 0" }} />
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div><div style={rotulo}>Entregues</div><div style={{ fontSize: 38, fontWeight: 900, color: C.neon, lineHeight: 1.05 }}>{entregues}<span style={{ fontWeight: 300, color: C.mudo, fontSize: 24 }}> / {totalDia}</span></div></div>
            <div><div style={rotulo}>Atrasadas</div><div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05 }}>{atrasadas}</div></div>
            <div><div style={rotulo}>Vencem hoje</div><div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05 }}>{venceHoje}</div></div>
          </div>
          <div style={{ flex: "1 1 100%", height: 3, background: C.line, borderRadius: 2, position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: 3, borderRadius: 2, background: C.neon, width: `${pct}%`, transition: "width .3s" }} />
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          {alertas.map((a, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 4, padding: "16px 18px", border: `1px solid ${a.nivel === "critico" ? C.neon : a.nivel === "hoje" ? C.terra : C.line2}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: a.nivel === "info" ? C.mudo : C.neon }}>
                <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                <span style={{ fontSize: 10, letterSpacing: "0.28em", fontWeight: 800, textTransform: "uppercase" }}>{a.tag}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{a.titulo}</div>
              {a.acao && <div style={{ marginTop: 4, fontSize: 12, color: C.mudo, lineHeight: 1.45 }}>{a.acao}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Fila + Agenda */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <div style={{ ...cartao, flex: "999 1 520px", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <h2 style={h2}>Fila de <span style={{ fontWeight: 300 }}>execução</span></h2>
            <span style={rotulo}>Combinados + lembretes · só seus</span>
          </div>
          <div role="tablist" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ABAS.map((a) => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)} style={pilula(aba === a.id)}>{a.rotulo} <span style={{ fontWeight: 300 }}>{conta[a.id]}</span></button>)}
          </div>
          <p style={{ fontSize: 12, color: C.mudo, margin: "12px 0 4px", lineHeight: 1.5 }}>{ABAS.find((a) => a.id === aba)?.desc}</p>
          {lista.length === 0 && <div style={{ padding: "36px 0", textAlign: "center" }}><div style={{ fontSize: 26, fontWeight: 900, color: C.neon, letterSpacing: "0.06em" }}>ZERADO.</div><div style={{ fontSize: 12, color: C.mudo, marginTop: 4 }}>Nada pendente nesta aba.</div></div>}
          {lista.map((i) => (
            <div key={i.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
              <button type="button" disabled={ocupado === i.id} onClick={() => concluir(i)} aria-label={i.prioridade === "cobrar" ? "Marcar como cobrado" : "Marcar como entregue"}
                style={{ flex: "none", width: 44, height: 44, margin: "-11px -11px 0", background: "transparent", border: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${ocupado === i.id ? C.neon : C.apagado}`, boxSizing: "border-box", background: ocupado === i.id ? C.neon : "transparent" }} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {i.portalId ? <Link href={`/equipe/loja?id=${i.portalId}`} style={{ fontSize: 10, letterSpacing: "0.22em", fontWeight: 800, color: C.txt, textTransform: "uppercase", textDecoration: "none" }}>{nm(i.loja)}</Link>
                    : <span style={{ fontSize: 10, letterSpacing: "0.22em", fontWeight: 800, textTransform: "uppercase" }}>{i.loja}</span>}
                  <span style={{ fontSize: 9, letterSpacing: "0.2em", fontWeight: 800, padding: "4px 8px", borderRadius: 999, textTransform: "uppercase", ...(i.atraso > 0 ? { background: C.neon, color: C.bg } : i.atraso === 0 ? { border: `1px solid ${C.neon}`, color: C.neon } : { border: `1px solid ${C.line2}`, color: C.mudo }) }}>{prazoTexto(i)}</span>
                  {i.nota && <span style={{ fontSize: 9, letterSpacing: "0.2em", fontWeight: 700, color: C.mudo, textTransform: "uppercase" }}>{i.nota}</span>}
                  {i.quem && <span style={{ fontSize: 9, letterSpacing: "0.2em", fontWeight: 700, color: C.terra, textTransform: "uppercase" }}>{i.quem === "loja" ? "A loja" : "Claudia"}</span>}
                </div>
                <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.45, fontWeight: 600 }}>{esconder(i.texto)}</div>
                <AcoesPendencia escuro semFeito cobrar={i.prioridade === "cobrar"} mudou={() => recarregar()}
                  p={{ id: i.id, origem: i.origem, texto: i.texto, link: i.link, portalId: i.portalId, whatsapp: i.whatsapp }} />
              </div>
              {i.prioridade === "cobrar" && <button type="button" disabled={ocupado === i.id} onClick={() => concluir(i)} style={{ ...pilula(false), minHeight: 36, padding: "0 12px", fontSize: 9 }}>Cobrei</button>}
            </div>
          ))}
        </div>

        <div style={{ ...cartao, flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <h2 style={h2}>Agenda <span style={{ fontWeight: 300 }}>de hoje</span></h2>
            <Link href="/equipe/agenda" style={{ ...rotulo, color: C.neon, textDecoration: "none" }}>Abrir agenda →</Link>
          </div>
          {diaTodo.map((e) => (
            <div key={e.gcal_id} style={{ padding: "10px 12px", border: `1px dashed ${C.line2}`, borderRadius: 4, marginBottom: 8, fontSize: 13, fontWeight: 700 }}><span style={{ ...rotulo, marginRight: 8 }}>Dia todo</span>{esconder(e.titulo)}
              {(e.reuniaoUrl || e.portal_id) && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {e.reuniaoUrl && <a href={e.reuniaoUrl} target="_blank" rel="noopener" style={{ ...pilula(false), minHeight: 32, padding: "0 10px", fontSize: 9, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Link da reunião ↗</a>}
                {e.portal_id && <Link href={`/equipe/loja?id=${e.portal_id}`} style={{ ...pilula(false), minHeight: 32, padding: "0 10px", fontSize: 9, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Abrir a loja</Link>}
              </div>}
            </div>
          ))}
          {!linhas.length && !diaTodo.length && <p style={{ color: C.mudo, fontSize: 13 }}>Nada na agenda hoje.</p>}
          {linhas.map((l, i) => {
            const on = i === agoraIdx; const passou = i < agoraIdx;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "50px 14px minmax(0, 1fr)", gap: 10, opacity: passou ? 0.5 : 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }}>{l.hora}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 1, flex: "0 0 14px", background: C.line }} />
                  <div style={on ? { width: 11, height: 11, borderRadius: "50%", background: C.neon, boxShadow: "0 0 0 4px rgba(255,91,31,.18)" } : l.evento ? { width: 9, height: 9, borderRadius: "50%", background: C.txt } : { width: 9, height: 9, borderRadius: "50%", border: `1px solid ${C.mudo}`, boxSizing: "border-box" }} />
                  <div style={{ width: 1, flex: "1 1 auto", background: C.line }} />
                </div>
                <div style={{ padding: "6px 0" }}>
                  <div style={{ padding: "10px 12px", borderRadius: 4, border: `1px solid ${on ? C.neon : C.line}`, background: on ? C.bg : "transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{l.titulo}</span>
                      <span style={{ fontSize: 9, letterSpacing: "0.2em", fontWeight: 700, color: C.mudo, textTransform: "uppercase" }}>{l.tipo}</span>
                    </div>
                    {on && <div style={{ marginTop: 4, fontSize: 9, letterSpacing: "0.3em", fontWeight: 800, color: C.neon }}>AGORA</div>}
                    {(l.link || l.portalId || l.postId) && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {l.link && <a href={l.link} target="_blank" rel="noopener" style={{ ...pilula(false), minHeight: 32, padding: "0 10px", fontSize: 9, background: C.neon, borderColor: C.neon, color: C.bg, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Entrar na reunião ↗</a>}
                        {l.portalId && <Link href={`/equipe/loja?id=${l.portalId}&aba=reunioes`} style={{ ...pilula(false), minHeight: 32, padding: "0 10px", fontSize: 9, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Abrir a loja</Link>}
                        {l.postId && <Link href={`/empresa/conteudo/post?id=${l.postId}`} style={{ ...pilula(false), minHeight: 32, padding: "0 10px", fontSize: 9, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Abrir o post →</Link>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clientes */}
      <div style={cartao}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <h2 style={h2}>Acompanhamento <span style={{ fontWeight: 300 }}>de clientes</span></h2>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", ...rotulo }}>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Ponto nivel="critico" t={9} />Crítico</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Ponto nivel="atencao" t={9} />Atenção</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Ponto nivel="emdia" t={9} />Em dia</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Ponto nivel="semcontato" t={9} />Sem contato</span>
          </div>
        </div>
        <div role="tablist" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {NIVEIS.map((n) => <button key={n.id} type="button" role="tab" aria-selected={nv === n.id} onClick={() => setNv(n.id)} style={pilula(nv === n.id)}>{n.rotulo} <span style={{ fontWeight: 300 }}>{contaNv(n.id)}</span></button>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 10 }}>
          {clientes.map((c) => <CartaoCliente key={c.id} c={c} nome={nm(c.loja)} passo={esconder(c.passo)} />)}
        </div>
        {!clientes.length && <p style={{ color: C.mudo, fontSize: 13 }}>Nenhuma loja aqui.</p>}
      </div>

      {/* Posts + Fechamento */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, alignItems: "start" }}>
        <div style={cartao}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <h2 style={h2}>Conteúdo <span style={{ fontWeight: 300 }}>de hoje</span></h2>
            <Link href="/empresa/conteudo" style={{ ...rotulo, color: C.neon, textDecoration: "none" }}>Calendário →</Link>
          </div>
          {!dados.posts.length && <p style={{ color: C.mudo, fontSize: 13 }}>Nenhum post para hoje.</p>}
          {dados.posts.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ flex: "0 0 38px", fontSize: 11, fontWeight: 800 }}>{p.horario}</span>
              <Link href={`/empresa/conteudo/post?id=${p.id}`} style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: C.txt, textDecoration: "none" }}>{p.titulo} <span style={{ color: C.neon }}>→</span><span style={{ display: "block", ...rotulo, fontSize: 8, marginTop: 2 }}>{p.formato}</span></Link>
              <span style={{ flex: "none", fontSize: 8, letterSpacing: "0.2em", fontWeight: 800, padding: "4px 8px", borderRadius: 999, textTransform: "uppercase", ...(p.status === "Postado" || p.status === "Gravado ou arte pronta" ? { background: C.txt, color: C.bg } : p.status === "Roteiro pronto" ? { border: `1px solid ${C.neon}`, color: C.neon } : { border: `1px solid ${C.line2}`, color: C.mudo }) }}>{p.status === "Gravado ou arte pronta" ? "Pronto" : p.status}</span>
            </div>
          ))}
        </div>

        <div style={cartao}>
          <h2 style={{ ...h2, marginBottom: 14 }}>Fechamento <span style={{ fontWeight: 300 }}>do dia</span></h2>
          {dados.registro?.fechado_em && <p style={{ fontSize: 12, color: C.neon, marginTop: 0 }}>Dia fechado às {horaDe(dados.registro.fechado_em)}.</p>}
          <label style={{ ...rotulo, display: "flex", flexDirection: "column", gap: 8 }}>O que fica para amanhã
            <textarea rows={3} value={amanha} onChange={(e) => setAmanha(e.target.value)} placeholder="Uma pendência por linha: cada uma vira lembrete seu para amanhã"
              style={{ background: C.bg, border: `1px solid ${C.line2}`, borderRadius: 4, color: C.txt, fontFamily: FONTE, fontSize: 13, letterSpacing: 0, textTransform: "none", padding: 12, resize: "vertical" }} /></label>
          <label style={{ ...rotulo, display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>Uma vitória de hoje
            <textarea rows={2} value={vitoria} onChange={(e) => setVitoria(e.target.value)} placeholder="Pequena ou grande"
              style={{ background: C.bg, border: `1px solid ${C.line2}`, borderRadius: 4, color: C.txt, fontFamily: FONTE, fontSize: 13, letterSpacing: 0, textTransform: "none", padding: 12, resize: "vertical" }} /></label>
          <button type="button" onClick={fechar} style={{ ...pilula(false), width: "100%", marginTop: 14, borderColor: C.neon, color: C.neon }}>Fechar o dia</button>
          {aviso && <p style={{ fontSize: 12, color: C.mudo, marginBottom: 0 }}>{aviso}</p>}
        </div>
      </div>
    </section>
  );
}

function CartaoCliente({ c, nome, passo }: { c: ClientePlanner; nome: string; passo: string }) {
  const dt = (iso: string | null) => (iso ? dataCurta(iso) : "—");
  return (
    <Link href={`/equipe/loja?id=${c.id}`} style={{ display: "block", textDecoration: "none", color: C.txt, background: C.bg, borderRadius: 4, padding: 16, border: `1px solid ${c.nivel === "critico" ? "#5a2410" : C.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>{nome}</div>
          <div style={{ ...rotulo, fontSize: 9, marginTop: 3 }}>{c.tipo}</div>
        </div>
        <span style={{ marginTop: 3 }}><Ponto nivel={c.nivel} t={12} /></span>
      </div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
        <div><div style={{ ...rotulo, fontSize: 8 }}>Contato</div><div style={{ marginTop: 4, fontSize: 12, fontWeight: 700 }}>{c.ultimoContato ? dt(c.ultimoContato) : "Sem registro"}</div></div>
        <div><div style={{ ...rotulo, fontSize: 8 }}>Reunião</div><div style={{ marginTop: 4, fontSize: 12, fontWeight: 700 }}>{c.proximaReuniao ? dt(c.proximaReuniao) : c.ultimaReuniao ? `Últ. ${dt(c.ultimaReuniao)}` : "Nenhuma"}</div></div>
        <div><div style={{ ...rotulo, fontSize: 8 }}>Seus atrasos</div><div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: c.meusAtrasos ? C.neon : C.mudo }}>{c.meusAtrasos}</div></div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45 }}><span style={{ fontSize: 9, letterSpacing: "0.22em", fontWeight: 800, color: C.neon }}>PRÓXIMO PASSO · </span>{passo}</div>
    </Link>
  );
}
