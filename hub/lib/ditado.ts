"use client";

// Ditado por voz do navegador (pt-BR): fala e vira texto no campo da mensagem. Funciona no Chrome (Android e computador) e no Safari
// do iPhone; no app instalado do iPhone o navegador pode não deixar. Nesse caso, o microfone do teclado faz o mesmo.
import { useRef, useState } from "react";

type Reconhecimento = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e?: { error?: string }) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};

export function suportaDitado() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

/** `aoTexto` recebe o texto falado até agora (já com o que estava escrito antes). */
export function useDitado(aoTexto: (texto: string) => void) {
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState("");
  const fala = useRef<Reconhecimento | null>(null);
  const base = useRef("");

  const iniciar = (atual: string) => {
    setErro("");
    const w = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
    const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!R) { setErro("Este aparelho não transcreve por aqui. Use o microfone do teclado."); return; }
    const r = new R();
    r.lang = "pt-BR"; r.continuous = true; r.interimResults = true;
    base.current = atual.trim() ? atual.trim() + " " : "";
    let finais = "";
    r.onresult = (e) => {
      let parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finais += t; else parcial += t;
      }
      aoTexto((base.current + finais + parcial).replace(/\s+/g, " ").trimStart());
    };
    r.onerror = (ev) => { setErro(ev?.error === "not-allowed" ? "Libere o microfone no navegador para gravar." : "Não consegui ouvir. Tente de novo."); setGravando(false); };
    r.onend = () => setGravando(false);
    fala.current = r;
    try { r.start(); setGravando(true); } catch { setErro("Não consegui começar a gravar."); }
  };
  const parar = () => { fala.current?.stop(); setGravando(false); };
  return { gravando, erro, iniciar, parar };
}
