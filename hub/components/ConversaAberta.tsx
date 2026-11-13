"use client";

// A conversa da equipe sempre aberta na Central do Cliente, como um chat de WhatsApp no canto da tela.
// Só a Camilla e a CS veem. Dá para recolher, e ela lembra se estava aberta ou fechada.
import { TextoComLinks } from "@/components/TextoComLinks";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEquipe } from "@/lib/hub";
import { buscarMensagens, buscarPessoas, buscarResumo, enviarMensagem, subirAnexo, type Mensagem, type Pessoa, type Resumo } from "@/lib/conversas";
import { AnexoDaMensagem } from "@/components/AnexoDaMensagem";
import { AcoesDaMensagem } from "@/components/AcoesDaMensagem";
import { ConfirmarReuniao } from "@/components/ConfirmarReuniao";
import { suportaDitado, useDitado } from "@/lib/ditado";
import { ativarAvisos, situacaoAvisos, type SituacaoAvisos } from "@/lib/novidades";

const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const ler = (k: string, padrao: string) => { try { return localStorage.getItem(k) ?? padrao; } catch { return padrao; } };
const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
/** Hora se for hoje, "ontem", ou a data, como na lista do WhatsApp. */
const quando = (iso: string) => {
  const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(d);
  const hoje = dia(new Date()), ontem = dia(new Date(Date.now() - 86_400_000)), d = dia(new Date(iso));
  return d === hoje ? hora(iso) : d === ontem ? "ontem" : new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit" }).format(new Date(iso));
};
const diaRotulo = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(iso));

/** `cheia`: a tela inteira do app do celular (sem recolher). Sem `cheia`: o chat no canto da tela do computador. */
export function ConversaAberta({ cheia = false }: { cheia?: boolean }) {
  const { userId, nome } = useEquipe();
  // Já nasce com o que ficou salvo (aberto ou recolhido): senão a primeira tela marcaria tudo como visto.
  const [aberto, setAberto] = useState(() => cheia || ler("lm_conversa_aberta", "1") === "1");
  // Aviso do celular abre direto na conversa da loja (?loja=); sem ele, o app abre na lista, como o WhatsApp.
  const daUrl = (() => { try { return new URLSearchParams(window.location.search).get("loja"); } catch { return null; } })();
  const [loja, setLoja] = useState(() => daUrl ?? ler("lm_conversa_loja", "geral"));
  const [vendo, setVendo] = useState<"lista" | "chat">(() => (daUrl || (!cheia && ler("lm_conversa_vendo", "chat") === "chat") ? "chat" : "lista"));
  const [resumo, setResumo] = useState<Resumo[]>([]);
  const [filtro, setFiltro] = useState<"todas" | "novas" | "abertas">("todas");
  const [busca, setBusca] = useState("");
  const [lojas, setLojas] = useState<{ id: string; loja: string }[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [acoes, setAcoes] = useState<string | null>(null);
  const [novas, setNovas] = useState(0);
  const [falado, setFalado] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const seletor = useRef<HTMLInputElement>(null);
  const [avisos, setAvisos] = useState<SituacaoAvisos | null>(null);
  useEffect(() => { situacaoAvisos().then(setAvisos).catch(() => setAvisos("sem-suporte")); }, []);
  const ditado = useDitado((t) => { setTexto(t); setFalado(true); });
  const fim = useRef<HTMLDivElement>(null);
  const chaveVisto = `lm_conversa_visto_${userId}`;
  // O que já vi em cada conversa (neste aparelho). Conversa sem registro usa a marca antiga, geral.
  const chaveVistos = `lm_conversa_vistos_${userId}`;
  const vistos = (): Record<string, string> => { try { return JSON.parse(ler(chaveVistos, "{}")); } catch { return {}; } };
  const vistoDe = (k: string) => vistos()[k] ?? ler(chaveVisto, "1970-01-01T00:00:00Z");
  const marcarVisto = (k: string) => guardar(chaveVistos, JSON.stringify({ ...vistos(), [k]: new Date().toISOString() }));

  useEffect(() => {
    supabaseBrowser().from("portais").select("id, loja").eq("ativo", true).order("loja").then(({ data }) => setLojas((data ?? []) as { id: string; loja: string }[]));
    buscarPessoas().then(setPessoas);
  }, []);

  const carregar = async () => {
    const [m, r] = await Promise.all([vendo === "chat" ? buscarMensagens(loja === "geral" ? null : loja) : Promise.resolve(null), buscarResumo()]);
    if (m) setMsgs(m);
    setResumo(r);
  };
  useEffect(() => { carregar(); const t = setInterval(carregar, 15000); return () => clearInterval(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [loja, userId, vendo]);
  // Conversa aberta na tela = conversa vista.
  useEffect(() => { if (aberto && vendo === "chat") { marcarVisto(loja); fim.current?.scrollIntoView({ block: "end" }); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [aberto, vendo, loja, msgs.length]);

  // A lista, como no WhatsApp: quem tem mensagem nova sobe; depois, a conversa mais recente.
  const itens = [{ id: "geral", loja: "Conversa geral" }, ...lojas].map((l) => {
    const daqui = resumo.filter((x) => (x.portal_id ?? "geral") === l.id);
    const visto = vistoDe(l.id);
    return {
      ...l, ultima: daqui[0] ?? null,
      novas: daqui.filter((x) => x.autor !== userId && x.created_at > visto).length,
      abertas: daqui.filter((x) => x.status === "aberta").length,
    };
  });
  const totalNovas = itens.reduce((t, i) => t + i.novas, 0);
  useEffect(() => { setNovas(vendo === "chat" ? itens.filter((i) => i.id !== loja).reduce((t, i) => t + i.novas, 0) : totalNovas); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [resumo, vendo, loja]);
  const termo = busca.trim().toLowerCase();
  const lista = itens
    .filter((i) => (filtro === "novas" ? i.novas > 0 : filtro === "abertas" ? i.abertas > 0 : true) && (!termo || i.loja.toLowerCase().includes(termo)))
    .sort((a, b) => (b.novas > 0 ? 1 : 0) - (a.novas > 0 ? 1 : 0) || (b.ultima?.created_at ?? "").localeCompare(a.ultima?.created_at ?? "") || a.loja.localeCompare(b.loja));
  const abrir = (k: string) => { setLoja(k); guardar("lm_conversa_loja", k); setMsgs([]); setAcoes(null); setVendo("chat"); guardar("lm_conversa_vendo", "chat"); };
  const voltar = () => { setVendo("lista"); guardar("lm_conversa_vendo", "lista"); setAcoes(null); try { if (daUrl) window.history.replaceState(null, "", window.location.pathname); } catch { /* sem histórico */ } };
  const nomeDe = (k: string) => (k === "geral" ? "Conversa geral" : lojas.find((l) => l.id === k)?.loja ?? "Conversa");

  const mudarAberto = (v: boolean) => { setAberto(v); guardar("lm_conversa_aberta", v ? "1" : "0"); };
  // O ícone do cabeçalho abre e fecha o chat; o número de novas mensagens vai para o ícone.
  useEffect(() => {
    const alternar = () => setAberto((v) => { const n = !v; guardar("lm_conversa_aberta", n ? "1" : "0"); return n; });
    window.addEventListener("lm-conversa-alternar", alternar);
    return () => window.removeEventListener("lm-conversa-alternar", alternar);
  }, []);
  useEffect(() => { window.dispatchEvent(new CustomEvent("lm-conversa-novas", { detail: aberto ? 0 : novas })); }, [novas, aberto]);
  const enviar = async () => {
    if ((!texto.trim() && !anexos.length) || enviando) return;
    setEnviando(true);
    try {
      const subidos = await Promise.all(anexos.map((f) => subirAnexo(f, userId)));
      await enviarMensagem(loja === "geral" ? null : loja, urgente ? "Urgente" : "Alinhamento", texto.trim() ? (falado ? "🎙 " : "") + texto : "", { id: userId, nome: nome.split(" ")[0] }, null, subidos);
      setTexto(""); setUrgente(false); setFalado(false); setAnexos([]); carregar();
    } catch (e) { alert((e as Error).message); }
    setEnviando(false);
  };

  if (!aberto && !cheia) {
    return (
      <button type="button" onClick={() => mudarAberto(true)} aria-label="Abrir as conversas da equipe"
        style={{ position: "fixed", right: 16, bottom: 16, zIndex: 60, width: 56, height: 56, borderRadius: "50%", border: 0, background: "var(--red)", color: "#fff", fontSize: 24, boxShadow: "0 6px 20px rgba(0,0,0,.25)", cursor: "pointer" }}>
        💬{novas > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#141210", color: "#fff", borderRadius: 12, fontSize: 12, fontWeight: 800, padding: "2px 7px" }}>{novas}</span>}
      </button>
    );
  }
  let diaAnterior = "";
  return (
    <div style={cheia ? { position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", background: "var(--card)", overflow: "hidden" } : { position: "fixed", right: 16, bottom: 16, zIndex: 60, width: "min(380px, calc(100vw - 32px))", height: "min(560px, calc(100vh - 100px))", display: "flex", flexDirection: "column", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "0 10px 34px rgba(0,0,0,.22)", overflow: "hidden" }}>
      <div style={{ background: "var(--ink)", color: "#fff", padding: "10px 12px", display: "flex", gap: 8, alignItems: "center" }}>
        {vendo === "chat"
          ? <>
              <button type="button" onClick={voltar} aria-label="Voltar para a lista de conversas" style={{ background: "transparent", border: 0, color: "#fff", fontSize: 22, cursor: "pointer", padding: "0 4px", position: "relative" }}>
                ←{novas > 0 && <span style={{ position: "absolute", top: -6, right: -10, background: "var(--red)", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 800, padding: "1px 6px" }}>{novas}</span>}
              </button>
              <b style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeDe(loja)}</b>
            </>
          : <><span aria-hidden>💬</span><b style={{ flex: 1 }}>Conversas{totalNovas > 0 ? ` (${totalNovas})` : ""}</b></>}
        {!cheia && <Link href="/equipe/conversas" style={{ color: "#fff", fontSize: 12, textDecoration: "underline" }}>abrir</Link>}
        {!cheia && <button type="button" onClick={() => mudarAberto(false)} aria-label="Recolher" style={{ background: "transparent", border: 0, color: "#fff", fontSize: 18, cursor: "pointer" }}>–</button>}
      </div>
      {avisos && avisos !== "ativo" && avisos !== "sem-suporte" && (
        <div className="aviso" style={{ margin: 0, borderRadius: 0, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {avisos === "instalar" ? <span>Para receber aviso no celular, instale este app: Compartilhar › Adicionar à Tela de Início.</span>
            : avisos === "bloqueado" ? <span>Os avisos estão bloqueados. Libere nas configurações do aparelho.</span>
            : <><span>Receba o aviso com som quando chegar mensagem.</span><button type="button" className="btn p peq" onClick={async () => { try { await ativarAvisos(); setAvisos("ativo"); } catch (e) { alert((e as Error).message); } }}>Ativar avisos</button></>}
        </div>
      )}
      {vendo === "lista" ? (
        <>
          <div style={{ padding: "8px 10px 4px", display: "grid", gap: 8 }}>
            <input id="conversa-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar loja" aria-label="Buscar loja" />
            <div className="chips" role="group" aria-label="Filtrar conversas">
              {([["todas", "Todas"], ["novas", `Não lidas${totalNovas ? ` ${totalNovas}` : ""}`], ["abertas", "Em aberto"]] as const).map(([k, r]) => (
                <button key={k} type="button" className={`chip${filtro === k ? " escolhido" : ""}`} onClick={() => setFiltro(k)}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {lista.length === 0 && <p className="mudo" style={{ textAlign: "center", marginTop: 20 }}>{filtro === "novas" ? "Nenhuma mensagem nova." : filtro === "abertas" ? "Nenhuma mensagem em aberto." : "Nenhuma loja encontrada."}</p>}
            {lista.map((i) => (
              <button key={i.id} type="button" onClick={() => abrir(i.id)}
                style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", textAlign: "left", background: "transparent", border: 0, borderBottom: "1px solid var(--line)", padding: "10px 12px", cursor: "pointer", color: "inherit" }}>
                <span aria-hidden style={{ flex: "0 0 42px", height: 42, borderRadius: "50%", background: i.id === "geral" ? "var(--ink)" : "var(--soft)", color: i.id === "geral" ? "#fff" : "var(--ink)", display: "grid", placeItems: "center", fontWeight: 800 }}>{i.id === "geral" ? "💬" : i.loja.trim().charAt(0).toUpperCase()}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <b style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.loja}</b>
                    {i.ultima && <small style={{ color: i.novas ? "var(--green)" : "var(--muted)", fontWeight: i.novas ? 800 : 400 }}>{quando(i.ultima.created_at)}</small>}
                  </span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <small className="mudo" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {i.ultima ? `${i.ultima.autor === userId ? "Você" : i.ultima.autor_nome ?? "Equipe"}: ${i.ultima.texto || "📎 arquivo"}` : "Sem mensagens"}
                    </small>
                    {i.abertas > 0 && <small title="Mensagens em aberto" style={{ color: "var(--muted)" }}>📌 {i.abertas}</small>}
                    {i.novas > 0 && <span style={{ background: "var(--green)", color: "#fff", borderRadius: 12, fontSize: 12, fontWeight: 800, padding: "1px 8px" }}>{i.novas}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (<>
      <div style={{ flex: 1, overflowY: "auto", padding: 12, background: "var(--soft)" }}>
        {msgs.length === 0 && <p className="mudo" style={{ textAlign: "center", marginTop: 20 }}>Nenhuma mensagem aqui ainda.</p>}
        {msgs.map((m) => {
          const minha = m.autor === userId;
          const rotulo = diaRotulo(m.created_at);
          const mostrarDia = rotulo !== diaAnterior; diaAnterior = rotulo;
          return (
            <div key={m.id}>
              {mostrarDia && <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", margin: "10px 0 6px", textTransform: "capitalize" }}>{rotulo}</div>}
              <div style={{ display: "flex", justifyContent: minha ? "flex-end" : "flex-start", margin: "4px 0" }}>
                <div onClick={() => setAcoes(acoes === m.id ? null : m.id)} style={{ maxWidth: "85%", background: minha ? "var(--orange-soft)" : "var(--card)", border: m.tipo === "Urgente" ? "1px solid var(--red)" : "1px solid var(--line)", borderRadius: 12, padding: "6px 10px", cursor: "pointer", opacity: m.status === "concluida" ? 0.6 : 1 }}>
                  {!minha && <div style={{ fontSize: 11, fontWeight: 800, color: "var(--red)" }}>{m.autor_nome}</div>}
                  {m.texto && <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{m.tipo === "Urgente" ? "❗ " : ""}<TextoComLinks texto={m.texto} /></div>}
                  {(m.arquivos ?? []).map((a) => <AnexoDaMensagem key={a.caminho} a={a} />)}
                  {m.acao?.tipo === "confirmar_reuniao" && <ConfirmarReuniao id={m.id} acao={m.acao} aoFeito={carregar} />}
                  <div style={{ fontSize: 10.5, color: "var(--muted)", textAlign: "right" }}>{hora(m.created_at)}{m.status === "concluida" ? " · concluída" : ""}</div>
                  {acoes === m.id && <div onClick={(e) => e.stopPropagation()}><AcoesDaMensagem m={m} pessoas={pessoas} por={nome.split(" ")[0]} aoFeito={carregar} /></div>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>
      {ditado.erro && <div className="aviso" style={{ margin: 0, borderRadius: 0 }}>{ditado.erro}</div>}
      {anexos.length > 0 && (
        <div style={{ padding: "6px 8px", borderTop: "1px solid var(--line)", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {anexos.map((f, i) => <span key={i} className="chip" style={{ fontSize: 12 }}>📎 {f.name} <button type="button" aria-label={`Tirar ${f.name}`} onClick={() => setAnexos((l) => l.filter((_, j) => j !== i))} style={{ border: 0, background: "transparent", cursor: "pointer" }}>✕</button></span>)}
        </div>
      )}
      <input ref={seletor} type="file" multiple hidden onChange={(e) => { setAnexos((l) => [...l, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
      <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid var(--line)", alignItems: "center" }}>
        <button type="button" onClick={() => seletor.current?.click()} aria-label="Anexar arquivo" title="Anexar foto, PDF ou arquivo" style={{ border: 0, background: "var(--soft)", borderRadius: 10, width: 34, height: 34, cursor: "pointer" }}>📎</button>
        <button type="button" onClick={() => setUrgente(!urgente)} title="Marcar como urgente" style={{ border: 0, background: urgente ? "var(--red)" : "var(--soft)", color: urgente ? "#fff" : "inherit", borderRadius: 10, width: 34, height: 34, cursor: "pointer" }}>❗</button>
        <button type="button" onClick={() => (ditado.gravando ? ditado.parar() : ditado.iniciar(texto))} aria-label={ditado.gravando ? "Parar de gravar" : "Gravar áudio"} title={suportaDitado() ? "Falar a mensagem: vira texto" : "Use o microfone do teclado"} style={{ border: 0, background: ditado.gravando ? "var(--red)" : "var(--soft)", color: ditado.gravando ? "#fff" : "inherit", borderRadius: 10, width: 34, height: 34, cursor: "pointer" }}>{ditado.gravando ? "■" : "🎙"}</button>
        <input type="text" value={texto} onChange={(e) => { setTexto(e.target.value); if (!e.target.value) setFalado(false); }} onKeyDown={(e) => e.key === "Enter" && enviar()} placeholder={ditado.gravando ? "Ouvindo… fale agora" : "Escreva uma mensagem"} style={{ flex: 1 }} />
        <button type="button" className="btn p peq" disabled={enviando} onClick={enviar}>{enviando ? "…" : "Enviar"}</button>
      </div>
      </>)}
    </div>
  );
}
