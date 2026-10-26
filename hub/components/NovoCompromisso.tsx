"use client";

import { useState } from "react";
import { hojeChave } from "@/lib/agenda";

/** Link do Google Agenda para criar o evento já preenchido (a Agenda do Hub só lê; o evento aparece aqui na próxima leitura). */
export function linkNovoEvento(d: { titulo: string; dia: string; inicio: string; fim: string; convidados: string; detalhes: string; local: string }) {
  const junta = (dia: string, h: string) => `${dia.replace(/-/g, "")}T${h.replace(":", "")}00`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: d.titulo,
    ctz: "America/Recife",
  });
  if (d.detalhes.trim()) q.set("details", d.detalhes.trim());
  if (d.local.trim()) q.set("location", d.local.trim());
  const convidados = d.convidados.split(/[,;\s]+/).map((x) => x.trim()).filter((x) => x.includes("@"));
  if (convidados.length) q.set("add", convidados.join(","));
  // As datas vão sem codificar a barra, como o Google espera.
  return `https://calendar.google.com/calendar/render?${q.toString()}&dates=${junta(d.dia, d.inicio)}/${junta(d.dia, d.fim)}`;
}

const somaHora = (h: string, min: number) => {
  const [a, b] = h.split(":").map(Number);
  const t = Math.min(23 * 60 + 59, a * 60 + b + min);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** Botão e formulário de novo compromisso na Agenda. Abre o Google Agenda preenchido para salvar lá. */
export function NovoCompromisso() {
  const [aberto, setAberto] = useState(false);
  const [d, setD] = useState({ titulo: "", dia: hojeChave(), inicio: "10:00", fim: "11:00", convidados: "", detalhes: "", local: "" });
  const muda = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  if (!aberto) return <button type="button" className="btn p" onClick={() => setAberto(true)}>+ Novo compromisso</button>;
  return (
    <form className="card mb" style={{ maxWidth: 720 }} onSubmit={(e) => {
      e.preventDefault();
      window.open(linkNovoEvento(d), "_blank", "noopener");
      setAberto(false);
    }}>
      <h3 style={{ marginTop: 0 }}>Novo compromisso</h3>
      <label className="rotulo">Título</label>
      <input required value={d.titulo} onChange={muda("titulo")} placeholder="Ex.: Reunião de plano · Traz Brechó" />
      <div className="grade g3" style={{ gap: 12 }}>
        <div><label className="rotulo">Dia</label><input type="date" required value={d.dia} onChange={muda("dia")} /></div>
        <div><label className="rotulo">Começa</label><input type="time" required value={d.inicio} onChange={(e) => setD({ ...d, inicio: e.target.value, fim: somaHora(e.target.value, 60) })} /></div>
        <div><label className="rotulo">Termina</label><input type="time" required value={d.fim} onChange={muda("fim")} /></div>
      </div>
      <label className="rotulo">Convidados (e-mails, separados por vírgula)</label>
      <input value={d.convidados} onChange={muda("convidados")} placeholder="cliente@loja.com, claudia@…" />
      <label className="rotulo">Local ou link</label>
      <input value={d.local} onChange={muda("local")} placeholder="Opcional" />
      <label className="rotulo">Descrição</label>
      <textarea value={d.detalhes} onChange={muda("detalhes")} rows={3} placeholder="Pauta, observações…" />
      <p className="ajuda">Abre o Google Agenda já preenchido: confira, escolha a agenda, marque o Google Meet se precisar e clique em Salvar. O compromisso aparece aqui na próxima atualização.</p>
      <div className="linha" style={{ gap: 8 }}>
        <button className="btn p" type="submit">Criar no Google Agenda →</button>
        <button className="btn s" type="button" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
