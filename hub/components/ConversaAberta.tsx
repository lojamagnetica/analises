"use client";

// A conversa da equipe sempre aberta na Central do Cliente, como um chat de WhatsApp no canto da tela.
// Só a Camilla e a CS veem. Dá para recolher, e ela lembra se estava aberta ou fechada.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEquipe } from "@/lib/hub";
import { buscarMensagens, buscarPessoas, enviarMensagem, type Mensagem, type Pessoa } from "@/lib/conversas";
import { AcoesDaMensagem } from "@/components/AcoesDaMensagem";

const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const ler = (k: string, padrao: string) => { try { return localStorage.getItem(k) ?? padrao; } catch { return padrao; } };
const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const diaRotulo = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(iso));

export function ConversaAberta() {
  const { userId, nome } = useEquipe();
  const [aberto, setAberto] = useState(true);
  const [loja, setLoja] = useState("geral");
  const [lojas, setLojas] = useState<{ id: string; loja: string }[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [acoes, setAcoes] = useState<string | null>(null);
  const [novas, setNovas] = useState(0);
  const fim = useRef<HTMLDivElement>(null);
  const chaveVisto = `lm_conversa_visto_${userId}`;

  useEffect(() => {
    setAberto(ler("lm_conversa_aberta", "1") === "1");
    setLoja(ler("lm_conversa_loja", "geral"));
    supabaseBrowser().from("portais").select("id, loja").eq("ativo", true).order("loja").then(({ data }) => setLojas((data ?? []) as { id: string; loja: string }[]));
    buscarPessoas().then(setPessoas);
  }, []);

  const carregar = async () => {
    const m = await buscarMensagens(loja === "geral" ? null : loja);
    setMsgs(m);
    // Mensagens da outra pessoa, de qualquer conversa, que ainda não vi.
    const visto = ler(chaveVisto, "1970-01-01T00:00:00Z");
    const { data } = await supabaseBrowser().from("equipe_conversas").select("id").neq("autor", userId).gt("created_at", visto);
    setNovas((data ?? []).length);
  };
  useEffect(() => { carregar(); const t = setInterval(carregar, 15000); return () => clearInterval(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [loja, userId]);
  useEffect(() => { if (aberto) { guardar(chaveVisto, new Date().toISOString()); setNovas(0); fim.current?.scrollIntoView({ block: "end" }); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [aberto, msgs.length]);

  const mudarAberto = (v: boolean) => { setAberto(v); guardar("lm_conversa_aberta", v ? "1" : "0"); };
  const enviar = async () => {
    if (!texto.trim()) return;
    try { await enviarMensagem(loja === "geral" ? null : loja, urgente ? "Urgente" : "Alinhamento", texto, { id: userId, nome: nome.split(" ")[0] }, null); setTexto(""); setUrgente(false); carregar(); } catch (e) { alert((e as Error).message); }
  };

  if (!aberto) {
    return (
      <button type="button" onClick={() => mudarAberto(true)} aria-label="Abrir as conversas da equipe"
        style={{ position: "fixed", right: 16, bottom: 16, zIndex: 60, width: 56, height: 56, borderRadius: "50%", border: 0, background: "var(--red)", color: "#fff", fontSize: 24, boxShadow: "0 6px 20px rgba(0,0,0,.25)", cursor: "pointer" }}>
        💬{novas > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#141210", color: "#fff", borderRadius: 12, fontSize: 12, fontWeight: 800, padding: "2px 7px" }}>{novas}</span>}
      </button>
    );
  }
  let diaAnterior = "";
  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 60, width: "min(380px, calc(100vw - 32px))", height: "min(560px, calc(100vh - 100px))", display: "flex", flexDirection: "column", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "0 10px 34px rgba(0,0,0,.22)", overflow: "hidden" }}>
      <div style={{ background: "var(--ink)", color: "#fff", padding: "10px 12px", display: "flex", gap: 8, alignItems: "center" }}>
        <span aria-hidden>💬</span>
        <select value={loja} onChange={(e) => { setLoja(e.target.value); guardar("lm_conversa_loja", e.target.value); setAcoes(null); }} style={{ flex: 1, background: "transparent", color: "#fff", border: 0, fontWeight: 700 }}>
          <option value="geral" style={{ color: "#000" }}>Conversa geral</option>
          {lojas.map((l) => <option key={l.id} value={l.id} style={{ color: "#000" }}>{l.loja}</option>)}
        </select>
        <Link href="/equipe/conversas" style={{ color: "#fff", fontSize: 12, textDecoration: "underline" }}>abrir</Link>
        <button type="button" onClick={() => mudarAberto(false)} aria-label="Recolher" style={{ background: "transparent", border: 0, color: "#fff", fontSize: 18, cursor: "pointer" }}>–</button>
      </div>
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
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{m.tipo === "Urgente" ? "❗ " : ""}{m.texto}</div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", textAlign: "right" }}>{hora(m.created_at)}{m.status === "concluida" ? " · concluída" : ""}</div>
                  {acoes === m.id && <div onClick={(e) => e.stopPropagation()}><AcoesDaMensagem m={m} pessoas={pessoas} por={nome.split(" ")[0]} aoFeito={carregar} /></div>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>
      <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid var(--line)", alignItems: "center" }}>
        <button type="button" onClick={() => setUrgente(!urgente)} title="Marcar como urgente" style={{ border: 0, background: urgente ? "var(--red)" : "var(--soft)", color: urgente ? "#fff" : "inherit", borderRadius: 10, width: 34, height: 34, cursor: "pointer" }}>❗</button>
        <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()} placeholder="Escreva uma mensagem" style={{ flex: 1 }} />
        <button type="button" className="btn p peq" onClick={enviar}>Enviar</button>
      </div>
    </div>
  );
}
